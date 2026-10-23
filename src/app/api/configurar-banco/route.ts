import type { NextRequest } from "next/server";
import { readFileSync, writeFileSync, mkdirSync, existsSync, chmodSync } from "node:fs";
import { join, dirname } from "node:path";
import { randomBytes } from "node:crypto";
import { Client } from "pg";
import { configuracaoAusente } from "@/db";
import { badRequest, json, serverError } from "@/lib/api";
import { getSessao, podeAdministrar } from "@/lib/auth";

export const dynamic = "force-dynamic";

const TABELAS = [
  "usuarios",
  "gestores",
  "professores",
  "compromissos",
  "compromisso_professores",
  "mensagens_whatsapp",
  "auditoria",
  "api_tokens",
];

/** SQL de criação da estrutura: usa o arquivo do projeto (completo) ou o embed. */
async function schemaSql(): Promise<string> {
  try {
    const caminho = join(process.cwd(), "supabase", "schema.sql");
    if (existsSync(caminho)) {
      // Remove os TRUNCATE (limpeza de instalação) para não apagar dados reais.
      return readFileSync(caminho, "utf8")
        .split("\n")
        .filter((linha) => !/^\s*truncate\s+table/i.test(linha))
        .join("\n");
    }
  } catch {
    /* segue para o embed */
  }
  const { SCHEMA_SQL } = await import("@/lib/schema-sql");
  return SCHEMA_SQL;
}

function normalizarUrl(entrada: string): string | null {
  const url = entrada.trim().replace(/^["']|["']$/g, "");
  if (!/^postgres(ql)?:\/\//i.test(url)) return null;
  try {
    new URL(url);
  } catch {
    return null;
  }
  return url;
}

/**
 * CONFIGURAÇÃO DO BANCO PELA INTERFACE
 * Testa a conexão, cria as tabelas que faltam e grava config/producao.json +
 * .env.local. Liberado sem login apenas quando o sistema ainda não tem
 * configuração (primeira execução, típico da máquina do desenvolvedor).
 */
export async function POST(request: NextRequest) {
  try {
    if (!configuracaoAusente) {
      const sessao = await getSessao();
      if (!sessao || !podeAdministrar(sessao.papel)) {
        return json(
          {
            ok: false,
            error:
              "O sistema já está configurado. Apenas administradores podem alterar a conexão do banco.",
          },
          { status: 403 },
        );
      }
    }

    const body = (await request.json()) as { url?: string; criarTabelas?: boolean };
    const informada = normalizarUrl(body.url ?? "");
    if (!informada) {
      return badRequest(
        "Informe a connection string completa, começando com postgresql:// (Supabase → Project Settings → Database).",
      );
    }

    // A aplicação precisa do transaction pooler (6543) para não esgotar conexões.
    const url = informada.replace(/pooler\.supabase\.com:5432/, "pooler.supabase.com:6543");
    const converteuPorta = url !== informada;
    const remoto = !/localhost|127\.0\.0\.1/.test(url);

    const cliente = new Client({
      connectionString: url,
      ssl: remoto ? { rejectUnauthorized: false } : undefined,
      connectionTimeoutMillis: 15000,
    });

    const inicio = Date.now();
    try {
      await cliente.connect();
    } catch (erro) {
      const mensagem = erro instanceof Error ? erro.message : String(erro);
      const dica = /password authentication failed/i.test(mensagem)
        ? "Senha do banco incorreta. Copie novamente a connection string no Supabase (Database → Connection string)."
        : /ENOTFOUND|getaddrinfo/i.test(mensagem)
          ? "Host não encontrado. Verifique se o projeto do Supabase está ativo e copie a URL novamente."
          : /timeout|ETIMEDOUT/i.test(mensagem)
            ? "Tempo esgotado. Confira sua internet e tente a porta 6543."
            : mensagem;
      return json({ ok: false, error: dica, etapa: "conexao" }, { status: 400 });
    }

    try {
      const latencia = Date.now() - inicio;
      const existentes = await cliente.query<{ tablename: string }>(
        "select tablename from pg_tables where schemaname = 'public'",
      );
      let lista = existentes.rows.map((r) => r.tablename);
      let faltando = TABELAS.filter((t) => !lista.includes(t));
      let criouTabelas = false;

      // Cria a estrutura quando faltar algo e o usuário autorizar.
      if (faltando.length > 0 && body.criarTabelas !== false) {
        const sql = await schemaSql();
        await cliente.query(sql);
        const depois = await cliente.query<{ tablename: string }>(
          "select tablename from pg_tables where schemaname = 'public'",
        );
        lista = depois.rows.map((r) => r.tablename);
        faltando = TABELAS.filter((t) => !lista.includes(t));
        criouTabelas = true;
      }

      let usuarios = 0;
      if (faltando.length === 0) {
        const contagem = await cliente.query<{ total: number }>(
          "select count(*)::int as total from usuarios",
        );
        usuarios = contagem.rows[0]?.total ?? 0;
      }

      // Grava a configuração somente após validar a conexão.
      const raiz = process.cwd();
      const pastaConfig = join(raiz, "config");
      mkdirSync(pastaConfig, { recursive: true });

      const arquivoConfig = join(pastaConfig, "producao.json");
      let segredo = randomBytes(32).toString("hex");
      try {
        if (existsSync(arquivoConfig)) {
          const atual = JSON.parse(readFileSync(arquivoConfig, "utf8")) as {
            SESSION_SECRET?: string;
          };
          if (atual.SESSION_SECRET) segredo = atual.SESSION_SECRET;
        }
      } catch {
        /* usa o segredo novo */
      }

      const dados = {
        _comentario:
          "Configuração de produção — EE PROFA. MARLENE FRATTINI. Gerado pela interface de configuração.",
        SUPABASE_DB_URL: url,
        SESSION_SECRET: segredo,
        NEXT_PUBLIC_ESCOLA_NOME: "EE PROFA. MARLENE FRATTINI",
        NEXT_PUBLIC_ESCOLA_NOME_COMPLETO: "Escola Estadual Professora Marlene Frattini",
        NEXT_PUBLIC_ESCOLA_SIGLA: "EE PMF",
      };

      writeFileSync(arquivoConfig, JSON.stringify(dados, null, 2) + "\n", "utf8");
      try {
        chmodSync(arquivoConfig, 0o600);
      } catch {
        /* Windows */
      }
      writeFileSync(
        join(raiz, ".env.local"),
        [
          "# Gerado pela interface de configuração do banco",
          `SUPABASE_DB_URL=${url}`,
          `SESSION_SECRET=${segredo}`,
          `NEXT_PUBLIC_ESCOLA_NOME="${dados.NEXT_PUBLIC_ESCOLA_NOME}"`,
          "",
        ].join("\n"),
        "utf8",
      );

      return json({
        ok: true,
        latencia,
        portaConvertida: converteuPorta,
        criouTabelas,
        tabelasFaltando: faltando,
        usuarios,
        host: url.split("@").pop(),
        mensagem:
          faltando.length === 0
            ? "Conexão validada e configuração gravada. Reinicie o servidor para aplicar."
            : "Configuração gravada, mas ainda faltam tabelas. Execute supabase/schema.sql no Supabase.",
        reiniciar: true,
      });
    } finally {
      await cliente.end().catch(() => {});
    }
  } catch (error) {
    console.error("POST /api/configurar-banco", error);
    return serverError(
      error instanceof Error ? error.message : "Falha ao configurar o banco de dados.",
    );
  }
}
