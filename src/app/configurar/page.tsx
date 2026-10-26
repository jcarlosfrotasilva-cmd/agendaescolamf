import Link from "next/link";
import { configuracaoAusente, databaseHost } from "@/db";
import { ConfigurarBancoForm } from "@/components/ConfigurarBancoForm";
import { CopyBlock } from "@/components/CopyBlock";
import { diagnosticarBanco } from "@/lib/db-diagnostico";
import { ESCOLA } from "@/lib/escola";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

export default async function ConfigurarPage() {
  const estado = await diagnosticarBanco();
  const jaConfigurado = !configuracaoAusente;

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-gradient-to-br from-indigo-50 via-white to-teal-50 px-4 py-8 sm:px-8">
        <div className="mx-auto max-w-[900px]">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-indigo-400 to-emerald-400 text-[10px] font-bold text-slate-900">
              {ESCOLA.sigla}
            </span>
            <div>
              <p className="text-xs font-semibold text-slate-900">{ESCOLA.nome}</p>
              <p className="text-[11px] text-slate-500">Configuração do banco de dados</p>
            </div>
          </div>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight text-slate-900">
            Conectar ao Supabase em uma tela
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Cole a connection string do projeto, teste a conexão e crie as tabelas automaticamente.
            A configuração é gravada no servidor — sem precisar de terminal.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-[900px] space-y-5 px-4 py-6 sm:px-8">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className={`rounded-xl bg-white p-4 shadow-sm ring-1 ${jaConfigurado ? "ring-emerald-200" : "ring-amber-200"}`}>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              Configuração atual
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              {jaConfigurado ? "Existente" : "Ausente"}
            </p>
            <p className="mt-0.5 break-all font-mono text-[10px] text-slate-500">
              {databaseHost()}
            </p>
          </div>
          <div className={`rounded-xl bg-white p-4 shadow-sm ring-1 ${estado.conectado ? "ring-emerald-200" : "ring-rose-200"}`}>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              Conexão
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              {estado.conectado ? "Ativa" : "Sem conexão"}
            </p>
            <p className="mt-0.5 text-[10px] text-slate-500">
              {estado.conectado ? estado.provedor : (estado.codigoErro ?? "não configurado")}
            </p>
          </div>
          <div className={`rounded-xl bg-white p-4 shadow-sm ring-1 ${estado.schemaPronto ? "ring-emerald-200" : "ring-rose-200"}`}>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              Tabelas / usuários
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              {estado.schemaPronto ? `${estado.usuarios} usuário(s)` : "pendente"}
            </p>
            <p className="mt-0.5 text-[10px] text-slate-500">
              {estado.schemaPronto ? "estrutura completa" : (estado.tabelasFaltando.join(", ") || "—")}
            </p>
          </div>
        </div>

        <section className="card-surface p-5">
          <h2 className="text-sm font-semibold text-slate-900">Dados do projeto Supabase</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            O teste é feito antes de gravar: se a senha estiver errada, nada é alterado.
          </p>
          <div className="mt-4">
            <ConfigurarBancoForm jaConfigurado={jaConfigurado} />
          </div>
        </section>

        <section className="card-surface p-5">
          <h2 className="text-sm font-semibold text-slate-900">Onde encontrar a string</h2>
          <ol className="mt-2 space-y-2 text-xs leading-relaxed text-slate-600">
            <li>
              <strong>1.</strong> Abra o projeto no <strong>supabase.com</strong>.
            </li>
            <li>
              <strong>2.</strong> Vá em <strong>Project Settings → Database</strong>.
            </li>
            <li>
              <strong>3.</strong> Em <strong>Connection string</strong>, escolha a aba{" "}
              <strong>URI</strong> e copie. Se pedir a senha, use a do banco (definida na criação do
              projeto).
            </li>
            <li>
              <strong>4.</strong> Prefira a porta <strong>6543</strong> (transaction pooler). Se
              copiar com 5432, o sistema converte sozinho.
            </li>
          </ol>
          <div className="mt-3">
            <CopyBlock
              titulo="formato esperado"
              linhas={2}
              conteudo={
                "postgresql://postgres.SEU_PROJETO:SUA_SENHA@aws-0-REGIAO.pooler.supabase.com:6543/postgres"
              }
            />
          </div>
        </section>

        <section className="card-surface p-5">
          <h2 className="text-sm font-semibold text-slate-900">Não consegue pela interface?</h2>
          <p className="mt-1 text-xs text-slate-600">
            Use o configurador por terminal — faz as mesmas verificações:
          </p>
          <div className="mt-2">
            <CopyBlock
              titulo="terminal, na pasta do projeto"
              linhas={2}
              conteudo={
                'node scripts/configurar-banco.mjs "postgresql://postgres.PROJETO:SENHA@aws-0-REGIAO.pooler.supabase.com:6543/postgres"'
              }
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href="/diagnostico"
              className="rounded-xl bg-white px-4 py-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50"
            >
              Ver diagnóstico
            </Link>
            <Link
              href="/entrar"
              className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
            >
              Ir para o login
            </Link>
          </div>
        </section>

        <p className="pb-6 text-center text-[11px] text-slate-400">
          {ESCOLA.nomeCompleto} · a senha do banco é gravada apenas no servidor, nunca no navegador
        </p>
      </main>
    </div>
  );
}
