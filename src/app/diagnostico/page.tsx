import Link from "next/link";
import { CopyBlock } from "@/components/CopyBlock";
import { Card } from "@/components/ui";
import { diagnosticarBanco } from "@/lib/db-diagnostico";
import { ESCOLA } from "@/lib/escola";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

/**
 * Página pública de diagnóstico — permite entender e corrigir a conexão com o
 * banco mesmo quando o login está falhando (é o primeiro lugar a abrir).
 */
export default async function DiagnosticoPage() {
  const banco = await diagnosticarBanco();
  const pronto = banco.conectado && banco.schemaPronto;

  const itens = [
    {
      titulo: "Configuração localizada",
      ok: banco.configurado,
      detalhe:
        banco.origemConfiguracao === "env"
          ? "Variável de ambiente SUPABASE_DB_URL"
          : banco.origemConfiguracao === "arquivo-producao"
            ? "Arquivo config/producao.json"
            : "Nenhuma configuração encontrada",
    },
    {
      titulo: "Conexão com o banco",
      ok: banco.conectado,
      detalhe: banco.conectado
        ? `${banco.provedor} · ${banco.host}`
        : (banco.codigoErro ?? "sem resposta do banco"),
    },
    {
      titulo: "Estrutura de tabelas",
      ok: banco.schemaPronto,
      detalhe: banco.schemaPronto
        ? "8 tabelas do sistema encontradas"
        : banco.tabelasFaltando.length > 0
          ? `Faltando: ${banco.tabelasFaltando.join(", ")}`
          : "não foi possível verificar",
    },
    {
      titulo: "Usuários cadastrados",
      ok: banco.usuarios > 0,
      detalhe:
        banco.usuarios > 0
          ? `${banco.usuarios} usuário(s) — o login está liberado`
          : "nenhum — o primeiro acesso cria o administrador",
    },
  ];

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
              <p className="text-[11px] text-slate-500">Diagnóstico da instalação</p>
            </div>
          </div>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight text-slate-900">
            {pronto ? "Sistema conectado e pronto" : "Encontramos um problema na conexão"}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Esta página não exige login. Use-a quando a tela de acesso apresentar erro para descobrir
            qual é a causa e como corrigir.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-[900px] space-y-5 px-4 py-6 sm:px-8">
        <div className="grid gap-3 sm:grid-cols-2">
          {itens.map((item) => (
            <div
              key={item.titulo}
              className={`rounded-xl bg-white p-4 shadow-sm ring-1 ${
                item.ok ? "ring-emerald-200" : "ring-rose-200"
              }`}
            >
              <div className="flex items-start gap-2">
                <span className="text-base">{item.ok ? "✅" : "⚠️"}</span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-900">{item.titulo}</p>
                  <p className="mt-0.5 break-words text-[11px] leading-relaxed text-slate-600">
                    {item.detalhe}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {!banco.configurado || banco.origemConfiguracao === "nenhuma" ? (
          <Card className="p-5">
            <h2 className="text-sm font-semibold text-slate-900">
              Configuração do banco não encontrada
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              A aplicação não encontrou <code>SUPABASE_DB_URL</code>. Sem ela, tenta o PostgreSQL
              local padrão e falha com “o banco de dados não respondeu”. Rode o configurador no
              terminal do projeto — ele grava os arquivos e testa a conexão:
            </p>
            <div className="mt-3">
              <CopyBlock
                titulo="terminal (na pasta do projeto)"
                linhas={3}
                conteudo={'node scripts/configurar-banco.mjs "postgresql://postgres.PROJETO:SENHA@aws-0-REGIAO.pooler.supabase.com:6543/postgres"'}
              />
            </div>
            <p className="mt-2 text-[11px] text-slate-500">
              Ou crie manualmente o arquivo <code>config/producao.json</code>:
            </p>
            <div className="mt-2">
              <CopyBlock
                titulo="config/producao.json"
                linhas={8}
                conteudo={`{
  "SUPABASE_DB_URL": "postgresql://postgres.PROJETO:SENHA@aws-0-REGIAO.pooler.supabase.com:6543/postgres",
  "SESSION_SECRET": "gere com: openssl rand -hex 32",
  "NEXT_PUBLIC_ESCOLA_NOME": "EE PROFA. MARLENE FRATTINI"
}`}
              />
            </div>
            <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-800 ring-1 ring-amber-200">
              Por conter senha, esse arquivo é ignorado pelo Git: ao clonar ou atualizar o projeto em
              outra máquina, ele precisa ser criado novamente com o comando acima.
            </p>
          </Card>
        ) : null}

        {!pronto ? (
          <Card className="p-5">
            <h2 className="text-sm font-semibold text-slate-900">Como resolver</h2>
            <ol className="mt-3 space-y-2 text-xs leading-relaxed text-slate-600">
              {!banco.conectado ? (
                <>
                  <li>
                    <strong>1.</strong> {banco.dica}
                  </li>
                  <li>
                    <strong>2.</strong> Confirme no Supabase (Project Settings → Database →
                    Connection string) a string na porta <strong>6543</strong> e coloque-a em{" "}
                    <code>config/producao.json</code>:
                    <code className="mt-1 block break-all rounded bg-slate-100 px-2 py-1 font-mono text-[10px]">
                      &quot;SUPABASE_DB_URL&quot;: &quot;postgresql://postgres.SEU_PROJETO:SENHA@aws-0-REGIAO.pooler.supabase.com:6543/postgres&quot;
                    </code>
                  </li>
                </>
              ) : null}

              {banco.conectado && !banco.schemaPronto ? (
                <>
                  <li>
                    <strong>1.</strong> Abra o Supabase → SQL Editor → New query.
                  </li>
                  <li>
                    <strong>2.</strong> Cole o conteúdo de <code>supabase/schema.sql</code> (está no
                    projeto) e clique em Run.
                  </li>
                  <li>
                    <strong>3.</strong> Recarregue esta página — as 8 tabelas devem aparecer como
                    encontradas.
                  </li>
                </>
              ) : null}

              {pronto && banco.usuarios === 0 ? (
                <li>
                  <strong>1.</strong> Nenhum usuário existe ainda: abra{" "}
                  <Link href="/entrar" className="font-semibold text-indigo-600">
                    /entrar
                  </Link>{" "}
                  e crie o administrador da escola.
                </li>
              ) : null}
            </ol>

            {banco.erro ? (
              <div className="mt-4">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Detalhe técnico
                </p>
                <CopyBlock titulo="mensagem do banco" conteudo={banco.erro} linhas={4} />
              </div>
            ) : null}
          </Card>
        ) : null}

        <Card className="p-5">
          <h2 className="text-sm font-semibold text-slate-900">
            Qual porta usar no Supabase?
          </h2>
          <p className="mt-1 text-xs text-slate-600">
            O Supabase oferece três formas de conexão. Para esta aplicação (Next.js em ambiente
            serverless, com muitas instâncias curtas), a porta ideal é a <strong>6543</strong>.
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-xs">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-semibold">Conexão</th>
                  <th className="px-3 py-2 font-semibold">Porta</th>
                  <th className="px-3 py-2 font-semibold">Quando usar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr className={banco.host.includes(":6543") ? "bg-emerald-50/60" : "bg-white"}>
                  <td className="px-3 py-2 font-semibold text-slate-800">
                    Transaction pooler {banco.host.includes(":6543") ? "· em uso" : ""}
                  </td>
                  <td className="px-3 py-2 font-mono text-slate-700">6543</td>
                  <td className="px-3 py-2 text-slate-600">
                    <strong>Recomendado para produção.</strong> Multiplexa conexões, não tem o teto
                    de 15 clientes e evita o erro <code>EMAXCONNSESSION</code>.
                  </td>
                </tr>
                <tr className={banco.host.includes(":5432") ? "bg-amber-50/60" : "bg-white"}>
                  <td className="px-3 py-2 font-semibold text-slate-800">Session pooler</td>
                  <td className="px-3 py-2 font-mono text-slate-700">5432</td>
                  <td className="px-3 py-2 text-slate-600">
                    Até <strong>15 clientes</strong> por projeto. Serve para scripts pontuais,
                    migrações e ferramentas administrativas — não para o servidor da aplicação.
                  </td>
                </tr>
                <tr className="bg-white">
                  <td className="px-3 py-2 font-semibold text-slate-800">Direct connection</td>
                  <td className="px-3 py-2 font-mono text-slate-700">5432 (db.*.supabase.co)</td>
                  <td className="px-3 py-2 text-slate-600">
                    Requer IPv6 na rede. Use apenas para migrações com <code>drizzle-kit push</code>.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-[11px] leading-relaxed text-slate-600 ring-1 ring-slate-200">
            Resumo: <strong>aplicação → 6543</strong> · <strong>scripts/migrações → 5432 ou 6543</strong>.
            Neste ambiente está configurado:{" "}
            <code className="font-mono">{banco.host || "não configurado"}</code>.
          </p>
        </Card>

        <Card className="p-5">
          <h2 className="text-sm font-semibold text-slate-900">Preparar o banco em 3 passos</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-slate-50 p-3.5 ring-1 ring-slate-200">
              <p className="text-xs font-semibold text-slate-800">1. Credenciais</p>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
                Copie a connection string do Supabase (porta 6543) em{" "}
                <code>config/producao.json</code>. Este arquivo não é apagado pelas atualizações.
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3.5 ring-1 ring-slate-200">
              <p className="text-xs font-semibold text-slate-800">2. Tabelas</p>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
                Rode <code>supabase/schema.sql</code> no SQL Editor do Supabase.
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3.5 ring-1 ring-slate-200">
              <p className="text-xs font-semibold text-slate-800">3. Acesso</p>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
                Abra <code>/entrar</code> e crie o administrador — a tela aparece uma única vez.
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/configurar"
              className="rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-emerald-700"
            >
              Configurar o banco pela interface
            </Link>
            <Link
              href="/entrar"
              className="rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-indigo-700"
            >
              Ir para a tela de acesso
            </Link>
            <Link
              href="/api/diagnostico"
              className="rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-300 transition hover:bg-slate-50"
            >
              Ver diagnóstico em JSON
            </Link>
            <Link
              href="/api/health"
              className="rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-300 transition hover:bg-slate-50"
            >
              Healthcheck
            </Link>
          </div>
        </Card>

        <p className="pb-6 text-center text-[11px] text-slate-400">
          {ESCOLA.nomeCompleto} · diagnóstico somente leitura, sem exposição de credenciais
        </p>
      </main>
    </div>
  );
}
