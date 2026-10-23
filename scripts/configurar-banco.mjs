#!/usr/bin/env node
/**
 * CONFIGURADOR DO BANCO DE DADOS
 * ------------------------------------------------------------------
 * Grava as credenciais do Supabase nos arquivos que a aplicação lê e testa
 * a conexão na hora. Resolve o erro "banco de dados não respondeu" quando o
 * arquivo config/producao.json não existe (ele é ignorado pelo Git).
 *
 * Uso:
 *   node scripts/configurar-banco.mjs
 *       Usa a URL do argumento, de SUPABASE_DB_URL ou de config/producao.json.
 *
 *   node scripts/configurar-banco.mjs "postgresql://postgres.PROJETO:SENHA@HOST:6543/postgres"
 *       Configura explicitamente e testa a conexão.
 *
 *   node scripts/configurar-banco.mjs --testar
 *       Apenas testa a configuração atual.
 */
import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync, existsSync, chmodSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "pg";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const arquivoConfig = join(raiz, "config", "producao.json");
const arquivoEnv = join(raiz, ".env.local");

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

const args = process.argv.slice(2);
const apenasTestar = args.includes("--testar");
const urlArgumento = args.find((a) => a.startsWith("postgresql://") || a.startsWith("postgres://"));

function lerConfig() {
  if (!existsSync(arquivoConfig)) return null;
  try {
    return JSON.parse(readFileSync(arquivoConfig, "utf8"));
  } catch {
    return null;
  }
}

function mascarar(url) {
  return url.replace(/(:\/\/[^:]+:)[^@]+@/, "$1***@");
}

function normalizarPorta(url) {
  // A aplicação precisa do transaction pooler (6543) para não esgotar conexões.
  if (/pooler\.supabase\.com:5432/.test(url)) {
    console.log("ℹ️  Porta 5432 detectada (session pooler, limite de 15 conexões).");
    console.log("   Convertendo para 6543 (transaction pooler) — recomendado para a aplicação.\n");
    return url.replace(/pooler\.supabase\.com:5432/, "pooler.supabase.com:6543");
  }
  return url;
}

async function testar(url) {
  const remoto = !/localhost|127\.0\.0\.1/.test(url);
  const cliente = new Client({
    connectionString: url,
    ssl: remoto ? { rejectUnauthorized: false } : undefined,
    connectionTimeoutMillis: 15000,
  });

  console.log("🔌 Testando conexão com:", mascarar(url), "\n");
  const inicio = Date.now();
  try {
    await cliente.connect();
    const versao = await cliente.query("select version() as v");
    console.log("✅ Conectado:", versao.rows[0].v.split(" on ")[0]);
    console.log(`   Latência: ${Date.now() - inicio} ms`);

    const existentes = await cliente.query(
      "select tablename from pg_tables where schemaname = 'public'",
    );
    const lista = existentes.rows.map((r) => r.tablename);
    const faltando = TABELAS.filter((t) => !lista.includes(t));

    if (faltando.length > 0) {
      console.log("\n⚠️  Estrutura incompleta. Faltam as tabelas:");
      console.log("   " + faltando.join(", "));
      console.log("\n   Execute o arquivo supabase/schema.sql no SQL Editor do Supabase");
      console.log("   ou rode: npx drizzle-kit push\n");
      return false;
    }
    console.log("✅ Estrutura completa: 8 tabelas encontradas");

    const usuarios = await cliente.query("select count(*)::int as total from usuarios");
    const total = usuarios.rows[0].total;
    console.log(`✅ Usuários cadastrados: ${total}`);
    if (total === 0) {
      console.log("   Nenhum usuário ainda: abra /entrar para criar o primeiro administrador.");
    }
    return true;
  } catch (erro) {
    console.log("❌ Falha na conexão:", erro.message);
    if (/password authentication failed/i.test(erro.message)) {
      console.log("\n→ A senha do banco está incorreta.");
      console.log("  Se você redefiniu a senha no Supabase, copie a nova connection string");
      console.log("  em Project Settings → Database e rode este script novamente.");
    } else if (/ENOTFOUND|getaddrinfo/i.test(erro.message)) {
      console.log("\n→ Host não encontrado. Confira o endereço do projeto no Supabase.");
    } else if (/timeout|ETIMEDOUT/i.test(erro.message)) {
      console.log("\n→ Tempo esgotado. Verifique a internet e use a porta 6543.");
    } else if (/EMAXCONNSESSION|max clients/i.test(erro.message)) {
      console.log("\n→ Conexões esgotadas no modo sessão. Use a porta 6543.");
    }
    return false;
  } finally {
    await cliente.end().catch(() => {});
  }
}

async function main() {
  const config = lerConfig();
  const url =
    urlArgumento ??
    process.env.SUPABASE_DB_URL ??
    config?.SUPABASE_DB_URL ??
    (existsSync(arquivoEnv)
      ? readFileSync(arquivoEnv, "utf8").match(/SUPABASE_DB_URL=(.+)/)?.[1]?.trim()
      : undefined);

  if (!url) {
    console.log(`
⚠️  Nenhuma credencial encontrada.

Isso explica o erro "o banco de dados não respondeu": sem SUPABASE_DB_URL, a
aplicação tenta o PostgreSQL local (DATABASE_URL) e não encontra nada.

Como resolver (escolha uma opção):

  1) Rodar este script com a URL do Supabase:
     node scripts/configurar-banco.mjs "postgresql://postgres.PROJETO:SENHA@aws-0-REGIAO.pooler.supabase.com:6543/postgres"

  2) Copiar o modelo e preencher manualmente:
     cp config/producao.example.json config/producao.json
     (edite SUPABASE_DB_URL e SESSION_SECRET)

A URL está em: Supabase → Project Settings → Database → Connection string (URI).
Use a porta 6543 (transaction pooler).
`);
    process.exit(1);
  }

  const urlFinal = normalizarPorta(url);
  const ok = await testar(urlFinal);
  if (apenasTestar) process.exit(ok ? 0 : 1);
  if (!ok) {
    console.log("\n⚠️  Configuração NÃO foi gravada porque o teste falhou.\n");
    process.exit(1);
  }

  const segredo = config?.SESSION_SECRET ?? randomBytes(32).toString("hex");
  const dados = {
    _comentario:
      "Configuração de produção da Agenda da Gestão Escolar — EE PROFA. MARLENE FRATTINI. Gerado por scripts/configurar-banco.mjs.",
    SUPABASE_DB_URL: urlFinal,
    SESSION_SECRET: segredo,
    NEXT_PUBLIC_ESCOLA_NOME: "EE PROFA. MARLENE FRATTINI",
    NEXT_PUBLIC_ESCOLA_NOME_COMPLETO: "Escola Estadual Professora Marlene Frattini",
    NEXT_PUBLIC_ESCOLA_SIGLA: "EE PMF",
  };

  writeFileSync(arquivoConfig, JSON.stringify(dados, null, 2) + "\n", "utf8");
  try {
    chmodSync(arquivoConfig, 0o600);
  } catch {
    /* Windows não aplica permissões POSIX */
  }

  writeFileSync(
    arquivoEnv,
    `# Gerado por scripts/configurar-banco.mjs
SUPABASE_DB_URL=${urlFinal}
SESSION_SECRET=${segredo}
NEXT_PUBLIC_ESCOLA_NOME="${dados.NEXT_PUBLIC_ESCOLA_NOME}"
`,
    "utf8",
  );

  console.log("\n✅ Configuração gravada:");
  console.log("   • config/producao.json  (lido pela aplicação, inclusive no build)");
  console.log("   • .env.local            (usado pelo next dev/start)");
  console.log("\nPróximo passo: reinicie o servidor (npm run dev) e abra /entrar.\n");
}

main().catch((erro) => {
  console.error("Erro inesperado:", erro.message);
  process.exit(1);
});
