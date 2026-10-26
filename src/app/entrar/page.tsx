import Link from "next/link";
import { Suspense } from "react";
import { LoginForm } from "@/components/LoginForm";
import { SeletorTema } from "@/components/SeletorTema";
import { contarUsuarios, PAPEIS } from "@/lib/auth";
import { ESCOLA } from "@/lib/escola";

export const dynamic = "force-dynamic";

export default async function EntrarPage() {
  // Se o banco oscilar, a tela continua abrindo com o formulário de login.
  let primeiroAcesso = false;
  let bancoIndisponivel = false;
  try {
    const existentes = await contarUsuarios();
    primeiroAcesso = existentes === 0;
  } catch {
    bancoIndisponivel = true;
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      {/* ================= APRESENTAÇÃO (tons claros) ================= */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-teal-50 via-white to-indigo-50 p-10 lg:flex">
        {/* formas suaves decorativas */}
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-teal-200/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 -left-20 h-80 w-80 rounded-full bg-indigo-200/30 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-teal-500 text-xs font-bold text-white shadow-md">
            {ESCOLA.sigla}
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-900">{ESCOLA.nome}</p>
            <p className="text-[11px] text-slate-500">{ESCOLA.sistema}</p>
          </div>
        </div>

        <div className="relative">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 text-[11px] font-semibold text-teal-700 ring-1 ring-teal-200">
            <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
            Gestão escolar organizada
          </span>

          <h1 className="mt-4 text-3xl font-semibold leading-tight tracking-tight text-slate-900 text-balance-tight">
            Agenda de compromissos da gestão escolar
          </h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-600">
            Área de acesso da direção, vice-direção, coordenação de gestão pedagógica geral e
            gerência de organização escolar. Organize orientações pedagógicas, reuniões colegiadas e a
            agenda do corpo docente — com despertador de compromissos e consulta online.
          </p>

          <div className="mt-7 space-y-2.5">
            {PAPEIS.map((papel) => (
              <div
                key={papel.key}
                className="flex gap-3 rounded-xl bg-white/80 p-3.5 shadow-sm ring-1 ring-slate-200/80 backdrop-blur"
              >
                <span className="mt-0.5 text-sm">
                  {papel.key === "ADMIN"
                    ? "🛡️"
                    : papel.key === "GESTAO"
                      ? "🗂️"
                      : papel.key === "PROFESSOR"
                        ? "👩‍🏫"
                        : "👁️"}
                </span>
                <div>
                  <p className="text-xs font-semibold text-slate-800">{papel.label}</p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">
                    {papel.descricao}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative space-y-3">
          <div className="rounded-xl bg-white/70 px-3.5 py-3 ring-1 ring-slate-200/80">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Cor de fundo das telas
            </p>
            <div className="mt-2">
              <SeletorTema compacto tom="claro" />
            </div>
          </div>
          <p className="text-[11px] text-slate-400">{ESCOLA.usoExclusivo}</p>
        </div>
      </div>

      {/* ================= FORMULÁRIO ================= */}
      <div className="flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-6 flex items-center gap-3 lg:hidden">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-teal-500 text-[10px] font-bold text-white">
              {ESCOLA.sigla}
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-900">{ESCOLA.nome}</p>
              <p className="text-[11px] text-slate-500">{ESCOLA.sistema}</p>
            </div>
          </div>

          <div className="card-surface p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-600">
              {primeiroAcesso ? "Configuração inicial" : "Acesso da gestão"}
            </p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">
              {primeiroAcesso ? "Criar primeiro administrador" : "Entrar no sistema"}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {primeiroAcesso
                ? "Esta tela aparece apenas uma vez, enquanto não houver usuários cadastrados."
                : "Use o e-mail e a senha cadastrados pela administração da escola."}
            </p>

            {bancoIndisponivel ? (
              <p className="mt-4 rounded-xl bg-amber-50 px-3.5 py-2.5 text-[11px] font-medium leading-relaxed text-amber-800 ring-1 ring-amber-200">
                Instabilidade momentânea na conexão com o banco de dados. Tente entrar novamente em
                alguns segundos — se persistir, verifique a página de diagnóstico.
              </p>
            ) : null}

            <div className="mt-5">
              <Suspense fallback={<p className="text-xs text-slate-500">Carregando…</p>}>
                <LoginForm primeiroAcesso={primeiroAcesso} />
              </Suspense>
            </div>
          </div>

          <div className="mt-5 space-y-2 rounded-xl bg-white p-4 ring-1 ring-slate-200">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Acesso do professor
            </p>
            <p className="text-[11px] leading-relaxed text-slate-600">
              O professor entra <strong>por aqui também</strong>, com o e-mail e a senha criados pela
              gestão em <em>Professores → 🔑 Criar acesso</em>. Ele visualiza somente a própria
              agenda e os compromissos coletivos da escola.
            </p>
            <Link
              href="/consulta"
              className="inline-block text-[11px] font-semibold text-indigo-600 hover:text-indigo-700"
            >
              Consulta pública da escola →
            </Link>
          </div>

          <div className="mt-4 flex items-center justify-center gap-2 lg:hidden">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Fundo
            </span>
            <SeletorTema compacto tom="claro" />
          </div>
        </div>
      </div>
    </div>
  );
}
