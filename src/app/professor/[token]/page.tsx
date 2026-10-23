import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { professores } from "@/db/schema";
import { AgendaSemanaProfessor } from "@/components/AgendaSemanaProfessor";
import { CompromissoLista } from "@/components/CompromissoLista";
import { Card, StatCard } from "@/components/ui";
import { cargoInfo, turnoInfo } from "@/lib/constants";
import { fmtLong, isoToday } from "@/lib/datetime";
import { ESCOLA } from "@/lib/escola";
import { listarAgendaDaEscola, listarCompromissos } from "@/lib/repo";

export const dynamic = "force-dynamic";

/**
 * ACESSO DO PROFESSOR (link pessoal, sem senha)
 * Mostra apenas a agenda do próprio docente, em modo leitura: sem telefones de
 * terceiros, sem botões de edição e sem dados de outros professores.
 */
export default async function AcessoProfessorPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!token || token.length < 20) notFound();

  const linhas = await db
    .select()
    .from(professores)
    .where(and(eq(professores.tokenAcesso, token), eq(professores.ativo, true)))
    .limit(1);

  const professor = linhas[0];

  // Link inválido, revogado ou substituído por uma renovação.
  if (!professor) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="card-surface w-full max-w-lg p-7 text-center">
          <span className="text-4xl">🔗</span>
          <h1 className="mt-3 text-xl font-semibold tracking-tight text-slate-900">
            Este link de acesso não está mais válido
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            O endereço pode ter sido substituído por um link mais recente, o cadastro pode estar
            inativo, ou o link foi copiado incompleto.
          </p>
          <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-[11px] leading-relaxed text-slate-600 ring-1 ring-slate-200">
            <strong>O que fazer:</strong> peça à gestão da escola o link atual — ele é gerado em
            <em> Professores → 🔗 Copiar link</em>. Se o link anterior foi renovado, somente o novo
            funciona.
          </p>
          <p className="mt-3 text-[11px] text-slate-400">
            {ESCOLA.nomeCompleto} · Agenda de Compromissos da Gestão Escolar
          </p>
        </div>
      </div>
    );
  }

  const hoje = isoToday();
  const [todos, agendaEscola] = await Promise.all([
    listarCompromissos({
      professorId: professor.id,
      periodo: "TODOS",
      incluirCancelados: false,
      ordenar: "DATA",
      limite: 400,
    }),
    // Agenda institucional: a escola vê a gestão; nunca a de outro professor.
    listarAgendaDaEscola(120),
  ]);

  const proximos = todos.filter((i) => i.dataFim >= hoje);
  const historico = todos.filter((i) => i.dataFim < hoje).slice(-8).reverse();
  const hojeLista = todos.filter((i) => i.dataInicio <= hoje && i.dataFim >= hoje);
  const turno = turnoInfo(professor.turno);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950 px-4 py-6 text-white sm:px-8">
        <div className="mx-auto max-w-[1100px]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-indigo-400 to-emerald-400 text-[10px] font-bold text-slate-900">
                {ESCOLA.sigla}
              </span>
              <div>
                <p className="text-xs font-semibold">{ESCOLA.nome}</p>
                <p className="text-[11px] text-slate-400">Agenda individual do professor</p>
              </div>
            </div>
            <span className="rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-emerald-300">
              Acesso somente leitura
            </span>
          </div>

          <div className="mt-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
              Olá, professor(a)
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
              {professor.nome}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
              <span className={`rounded-full px-2.5 py-1 font-semibold ${turno.chip}`}>
                Turno {turno.label}
              </span>
              {professor.disciplina ? (
                <span className="rounded-full bg-white/10 px-2.5 py-1 font-semibold">
                  📚 {professor.disciplina}
                </span>
              ) : null}
              {professor.turmas ? (
                <span className="rounded-full bg-white/10 px-2.5 py-1 font-semibold">
                  🏫 {professor.turmas}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1100px] space-y-5 px-4 py-6 sm:px-8">
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Compromissos de hoje" value={hojeLista.length} hint={fmtLong(hoje)} icon="📌" />
          <StatCard label="Próximos compromissos" value={proximos.length} accent="emerald" icon="⏭️" />
          <StatCard
            label="Registros no histórico"
            value={todos.length}
            accent="slate"
            hint="Orientações, HTPC, conselhos e reuniões"
            icon="🗂️"
          />
        </div>

        {proximos.length > 0 ? (
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Seu próximo compromisso</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  A gestão da escola registrou as informações abaixo para você.
                </p>
              </div>
              <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-700">
                {cargoInfo(proximos[0].cargoResponsavel).short} · responsável
              </span>
            </div>
            <div className="mt-3 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
              <p className="text-sm font-semibold text-slate-900">{proximos[0].titulo}</p>
              <p className="mt-1 text-xs text-slate-600">{proximos[0].assunto}</p>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-600">
                <span>
                  🗓️ {fmtLong(proximos[0].dataInicio)} · {proximos[0].horaInicio} às{" "}
                  {proximos[0].horaFim}
                </span>
                <span>📍 {proximos[0].local}</span>
              </div>
              {proximos[0].descricao ? (
                <p className="mt-2 whitespace-pre-line border-t border-slate-200 pt-2 text-[11px] leading-relaxed text-slate-600">
                  {proximos[0].descricao}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        <Card className="p-5">
          <h2 className="text-sm font-semibold text-slate-900">Sua semana</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Aulas, HTPC, orientações pedagógicas, conselhos de classe e reuniões de pais.
          </p>
          <div className="mt-4">
            <AgendaSemanaProfessor itens={proximos} />
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-200">
              Minha agenda
            </span>
            <span className="text-[11px] text-slate-500">
              Convocações dirigidas especificamente a você
            </span>
          </div>
          <h2 className="mt-2 text-sm font-semibold text-slate-900">Meus próximos compromissos</h2>
          <div className="mt-4">
            <CompromissoLista
              itens={proximos}
              agrupamento="DATA"
              compacto
              tituloVazio="Nenhuma convocação nominal no momento"
              descricaoVazio="Quando a gestão convocar você para uma orientação, HTPC ou reunião, o compromisso aparece aqui automaticamente."
            />
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
              Agenda da escola
            </span>
            <span className="text-[11px] text-slate-500">
              Compromissos coletivos da gestão — sem dados de outros professores
            </span>
          </div>
          <h2 className="mt-2 text-sm font-semibold text-slate-900">
            Agenda da gestão e eventos da escola
          </h2>
          <p className="mt-0.5 text-xs text-slate-600">
            {agendaEscola.length} compromisso(s) institucional(is): reuniões colegiadas, formações
            abertas, eventos, conselhos de classe e reuniões de pais.
          </p>
          <div className="mt-4">
            <CompromissoLista
              itens={agendaEscola}
              agrupamento="DATA"
              compacto
              tituloVazio="Nenhum compromisso coletivo publicado"
              descricaoVazio="Quando a gestão publicar eventos ou reuniões abertas à comunidade escolar, eles aparecem aqui."
            />
          </div>
        </Card>

        {historico.length > 0 ? (
          <Card className="p-5">
            <h2 className="text-sm font-semibold text-slate-900">Histórico recente</h2>
            <div className="mt-4">
              <CompromissoLista itens={historico} agrupamento="TIPO" mostrarData compacto />
            </div>
          </Card>
        ) : null}

        <Card className="p-5">
          <h2 className="text-sm font-semibold text-slate-900">Sobre este acesso</h2>
          <ul className="mt-3 space-y-2 text-[11px] leading-relaxed text-slate-600">
            <li>• Este link é pessoal e intransferível — não compartilhe com outras pessoas.</li>
            <li>
              • Você enxerga <strong>a sua agenda</strong> e a <strong>agenda da escola</strong>{" "}
              (compromissos coletivos da gestão). A agenda de outros professores{" "}
              <strong>não é exibida</strong>.
            </li>
            <li>
              • A agenda é <strong>somente leitura</strong>: para pedir alteração, ajuste ou
              justificativa, fale com a gestão da escola.
            </li>
            <li>
              • Os avisos de convite, lembrete e alteração chegam por WhatsApp no número cadastrado
              pela gestão.
            </li>
          </ul>
          <p className="mt-3 border-t border-slate-100 pt-3 text-[11px] text-slate-400">
            {ESCOLA.nomeCompleto} · Agenda de Compromissos da Gestão Escolar
          </p>
        </Card>
      </main>
    </div>
  );
}
