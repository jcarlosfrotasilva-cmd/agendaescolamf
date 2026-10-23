import { sql } from "drizzle-orm";
import { db, databaseHost, isLocalDatabase, isSupabase } from "@/db";
import { readFileSync } from "node:fs";
import { join } from "node:path";

export type DiagnosticoBanco = {
  configurado: boolean;
  origemConfiguracao: "env" | "arquivo-producao" | "nenhuma";
  host: string;
  provedor: "supabase" | "local" | "postgres-externo";
  conectado: boolean;
  schemaPronto: boolean;
  tabelasFaltando: string[];
  usuarios: number;
  erro?: string;
  codigoErro?: string;
  dica?: string;
};

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

/** Percorre a cadeia de causas (Drizzle embrulha o erro original do driver). */
function extrairCausa(erro: unknown, profundidade = 0): { mensagem: string; codigo?: string } {
  if (!erro || profundidade > 5) return { mensagem: String(erro) };
  const alvo = erro as { message?: string; code?: string; cause?: unknown; detail?: string };
  const mensagem = [alvo.message, alvo.detail].filter(Boolean).join(" · ") || String(erro);
  if (alvo.cause) {
    const interna = extrairCausa(alvo.cause, profundidade + 1);
    return {
      mensagem: `${mensagem} | ${interna.mensagem}`,
      codigo: alvo.code ?? interna.codigo,
    };
  }
  return { mensagem, codigo: alvo.code };
}

/** Traduz erros técnicos do PostgreSQL/conexão em orientação prática. */
export function explicarErroBanco(erro: unknown): { codigo?: string; dica: string } {
  const causa = extrairCausa(erro);
  const mensagem = causa.mensagem;
  const codigo = causa.codigo;

  if (/EMAXCONNSESSION|max clients reached/i.test(mensagem)) {
    return {
      codigo: "EMAXCONNSESSION",
      dica:
        "O pooler do Supabase esgotou as conexões. Use a porta 6543 (transaction pooler) na SUPABASE_DB_URL e reinicie a aplicação.",
    };
  }
  if (/ECONNREFUSED|connect ECONNREFUSED/i.test(mensagem)) {
    return {
      codigo: "ECONNREFUSED",
      dica:
        "Não há banco de dados atendendo no endereço configurado. No seu computador, inicie o PostgreSQL local ou configure a SUPABASE_DB_URL no arquivo .env.local.",
    };
  }
  if (codigo === "42P01" || /relation .* does not exist/i.test(mensagem)) {
    return {
      codigo: "42P01",
      dica:
        "As tabelas não existem neste banco. Execute o script supabase/schema.sql no SQL Editor do Supabase (ou npx drizzle-kit push apontando para o banco correto).",
    };
  }
  if (codigo === "28P01" || /password authentication failed/i.test(mensagem)) {
    return {
      codigo: "28P01",
      dica:
        "Usuário ou senha do banco incorretos. Confira a SUPABASE_DB_URL (se você redefiniu a senha no Supabase, atualize o arquivo config/producao.json).",
    };
  }
  if (/password authentication failed|autenticação|SASL|SCRAM/i.test(mensagem)) {
    return {
      codigo: "28P01",
      dica:
        "A senha do banco foi recusada. Se você redefiniu a senha no Supabase, atualize a SUPABASE_DB_URL em config/producao.json e reinicie a aplicação.",
    };
  }
  if (/ENOTFOUND|getaddrinfo|nome ou serviço desconhecido/i.test(mensagem)) {
    return {
      codigo: "ENOTFOUND",
      dica:
        "Host do banco não encontrado. Confira o endereço na SUPABASE_DB_URL (formato postgresql://usuario.senha@HOST:6543/postgres).",
    };
  }
  if (/timeout|ETIMEDOUT|timeout exceeded/i.test(mensagem)) {
    return {
      codigo: "TIMEOUT",
      dica:
        "Tempo esgotado ao contactar o banco. Verifique a conexão de internet e use a porta 6543 do pooler do Supabase.",
    };
  }
  if (/ENOTFOUND|getaddrinfo/i.test(mensagem)) {
    return {
      codigo: "ENOTFOUND",
      dica: "Endereço do banco não encontrado. Revise o host informado na SUPABASE_DB_URL.",
    };
  }
  return {
    dica:
      "Falha ao consultar o banco de dados. Veja o detalhe técnico abaixo e confirme as credenciais em config/producao.json.",
  };
}

function origemDaConfiguracao(): DiagnosticoBanco["origemConfiguracao"] {
  if (process.env.SUPABASE_DB_URL) return "env";
  try {
    const bruto = readFileSync(join(process.cwd(), "config", "producao.json"), "utf8");
    const dados = JSON.parse(bruto) as Record<string, string>;
    if (dados.SUPABASE_DB_URL) return "arquivo-producao";
  } catch {
    /* sem arquivo */
  }
  return "nenhuma";
}

/** Verificação completa usada pela página pública de diagnóstico. */
export async function diagnosticarBanco(): Promise<DiagnosticoBanco> {
  const base: DiagnosticoBanco = {
    configurado: Boolean(databaseHost() && databaseHost() !== "indefinido"),
    origemConfiguracao: origemDaConfiguracao(),
    host: databaseHost(),
    provedor: isSupabase() ? "supabase" : isLocalDatabase() ? "local" : "postgres-externo",
    conectado: false,
    schemaPronto: false,
    tabelasFaltando: [],
    usuarios: 0,
  };

  try {
    await db.execute(sql`select 1`);
    base.conectado = true;

    const existentes = await db.execute<{ tabela: string }>(sql`
      select tablename as tabela from pg_tables where schemaname = 'public'
    `);
    const lista = existentes.rows.map((r) => r.tabela);
    base.tabelasFaltando = TABELAS.filter((t) => !lista.includes(t));
    base.schemaPronto = base.tabelasFaltando.length === 0;

    if (base.schemaPronto) {
      const contagem = await db.execute<{ total: number }>(sql`
        select count(*)::int as total from usuarios
      `);
      base.usuarios = contagem.rows[0]?.total ?? 0;
    }
    return base;
  } catch (erro) {
    const explicacao = explicarErroBanco(erro);
    const causa = extrairCausa(erro);
    base.erro = causa.mensagem;
    base.codigoErro = explicacao.codigo;
    base.dica = explicacao.dica;
    return base;
  }
}
