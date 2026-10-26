import Link from "next/link";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { professores } from "@/db/schema";
import { AgendaSemanaProfessor } from "@/components/AgendaSemanaProfessor";
import { CompromissoLista } from "@/components/CompromissoLista";
import { BotaoSairProfessor } from "@/components/BotaoSairProfessor";
import { Card, StatCard } from "@/components/ui";
import { origemInfo, turnoInfo } from "@/lib/constants";
import { fmtLong, isoToday } from "@/lib/datetime";
import { ESCOLA } from "@/lib/escola";
import { getSessao } from "@/lib/auth";
import { listarAgendaDaEscola, listarCompromissos } from "@/lib/repo";

export const dynamic = "force-dynamic";

/**
 * AGENDA DO PROFESSOR (com login próprio)
 * Mostra apenas: (1) convocações nominais deste docente e (2) os compromissos
 * coletivos da escola. Nunca a agenda de outro professor nem dados da gestão.
 */
export default async function MinhaAgendaPage() {
  const sessao = await getSessao();
  if (!sessao) redirect("/entrar");

  // Gestão e consulta também podem abrir esta visão, mas precisam informar o professor.
  if (sessao.papel !== "PROFESSOR" || !sessao.professorId) {
    redirect("/professores");
  }

  const linhas = await db
    .select()
    .from(professores)
    .where(eq(professores.id, sessao.professorId))
    .limit(1);
  const professor = linhas[0];
  if (!professor) {
    return (
      <div className="card-surface p-6 text-center">
        <p className="text-sm font-semibold text-slate-800">
          Seu cadastro de professor não foi localizado
        </p>
        <p className="mt-1 text-xs text-slate-600">
          Peça à gestão da escola para verificar seu cadastro em Professores.
        </p>
      </div>
    );
  }

  const hoje = isoToday();
  const [meus, agendaEscola] = await Promise.all([
    listarCompromissos({
      professorId: professor.id,
      periodo: "TODOS",
      incluirCancelados: false,
      ordenar: "DATA",
      limite: 400,
    }),
    listarAgendaDaEscola(120),
  ]);

  const proximos = meus.filter((i) => i.dataFim >= hoje);
  const externas = proximos.filter((i) => i.origem && i.origem !== "ESCOLA");
  const historico = meus.filter((i) => i.dataFim < hoje).slice(-8).reverse();
  const hojeLista = meus.filter((i) => i.dataInicio <= hoje && i.dataFim >= hoje);
  const turno = turnoInfo(professor.turno);

  return (
    <div className="space-y-5">
      <header className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-50 via-white to-indigo-50 p-5 shadow-sm ring-1 ring-slate-200">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-teal-200/40 blur-3xl" />
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="relative text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-700">
              {ESCOLA.nome} · Agenda do professor
            </p>
            <h1 className="relative mt-1 text-2xl font-semibold tracking-tight text-slate-900">{professor.nome}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
              <span className={`rounded-full px-2.5 py-1 font-semibold ${turno.chip}`}>
                Turno {turno.label}
              </span>
              {professor.disciplina ? (
                <span className="rounded-full bg-white/70 px-2.5 py-1 font-semibold text-slate-700 ring-1 ring-slate-200">
                  📚 {professor.disciplina}
                </span>
              ) : null}
              {professor.turmas ? (
                <span className="rounded-full bg-white/70 px-2.5 py-1 font-semibold text-slate-700 ring-1 ring-slate-200">
                  🏫 {professor.turmas}
                </span>
              ) : null}
              <span className="rounded-full bg-white/70 px-2.5 py-1 font-semibold text-slate-600 ring-1 ring-slate-200">
                Sessão: {sessao.email}
              </span>
            </div>
          </div>
          <div className="relative flex flex-col items-end gap-2">
            <BotaoSairProfessor />
            <Link
              href="/minha-senha"
              className="text-[11px] font-semibold text-teal-700 hover:text-teal-800"
            >
              🔑 Alterar minha senha
            </Link>
          </div>
        </div>
      </header>

      {externas.length > 0 ? (
        <Card className="border-l-4 border-l-amber-500 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                ⚑ {externas.length} convocação(ões) recebida(s) de outro órgão
              </p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-slate-600">
                A gestão da escola registrou estas ações convocadas pela URE/órgão central e indicou
                você como participante. O despertador está ativo com a antecedência definida.
              </p>
            </div>
            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800 ring-1 ring-inset ring-amber-200">
              participação designada
            </span>
          </div>

          <ul className="mt-3 space-y-2">
            {externas.map((item) => {
              const origem = origemInfo(item.origem);
              return (
                <li
                  key={item.id}
                  className="rounded-xl bg-amber-50/60 p-3 ring-1 ring-amber-200"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset ${origem.chip}`}
                    >
                      {origem.sigla}
                    </span>
                    <p className="text-xs font-semibold text-slate-900">{item.titulo}</p>
                    <span className="ml-auto rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600 ring-1 ring-slate-200">
                      ⏰ despertador {item.lembreteMinutos >= 1440
                        ? "1 dia antes"
                        : item.lembreteMinutos >= 60
                          ? `${item.lembreteMinutos / 60}h antes`
                          : `${item.lembreteMinutos} min antes`}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-700">
                    {origem.label}
                    {item.orgaoConvocante ? ` — ${item.orgaoConvocante}` : ""}
                  </p>
                  <p className="text-[11px] text-slate-600">
                    🗓️ {fmtLong(item.dataInicio)} · {item.horaInicio} às {item.horaFim} · 📍{" "}
                    {item.local}
                  </p>
                  {item.documentoReferencia ? (
                    <p className="text-[11px] text-slate-600">
                      📄 Documento: {item.documentoReferencia}
                    </p>
                  ) : null}
                  {item.descricao ? (
                    <p className="mt-1 whitespace-pre-line text-[11px] leading-relaxed text-slate-600">
                      {item.descricao}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Compromissos de hoje" value={hojeLista.length} hint={fmtLong(hoje)} icon="📌" />
        <StatCard label="Minhas convocações futuras" value={proximos.length} accent="emerald" icon="📣" />
        <StatCard
          label="Agenda da escola"
          value={agendaEscola.length}
          accent="brand"
          hint="Compromissos coletivos da gestão"
          icon="🏫"
        />
      </div>

      {proximos.length > 0 ? (
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Seu próximo compromisso</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Registrado pela gestão da escola para você.
              </p>
            </div>
            <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-700">
              {proximos[0].local}
            </span>
          </div>
          <div className="mt-3 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <p className="text-sm font-semibold text-slate-900">{proximos[0].titulo}</p>
            <p className="mt-1 text-xs text-slate-600">{proximos[0].assunto}</p>
            <p className="mt-2 text-[11px] text-slate-600">
              🗓️ {fmtLong(proximos[0].dataInicio)} · {proximos[0].horaInicio} às{" "}
              {proximos[0].horaFim}
            </p>
            {proximos[0].descricao ? (
              <p className="mt-2 whitespace-pre-line border-t border-slate-200 pt-2 text-[11px] leading-relaxed text-slate-600">
                {proximos[0].descricao}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      <Card className="p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-200">
            Minha agenda
          </span>
          <span className="text-[11px] text-slate-500">
            Convocações dirigidas especificamente a você
          </span>
        </div>
        <h2 className="mt-2 text-sm font-semibold text-slate-900">Minha semana</h2>
        <div className="mt-4">
          <AgendaSemanaProfessor itens={proximos} />
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="text-sm font-semibold text-slate-900">Minhas convocações</h2>
        <div className="mt-4">
          <CompromissoLista
            itens={proximos}
            agrupamento="DATA"
            compacto
            tituloVazio="Nenhuma convocação nominal no momento"
            descricaoVazio="Quando a gestão convocar você para uma orientação, HTPC ou reunião, o compromisso aparece aqui."
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
        <div className="mt-4">
          <CompromissoLista
            itens={agendaEscola}
            agrupamento="DATA"
            compacto
            tituloVazio="Nenhum compromisso coletivo publicado"
            descricaoVazio="Reuniões colegiadas, formações abertas e eventos aparecem aqui."
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
        <h2 className="text-sm font-semibold text-slate-900">Sobre o seu acesso</h2>
        <ul className="mt-3 space-y-2 text-[11px] leading-relaxed text-slate-600">
          <li>
            • Você entra com o <strong>seu e-mail e a sua senha</strong> e vê{" "}
            <strong>apenas a sua agenda</strong> e os <strong>compromissos coletivos da escola</strong>.
          </li>
          <li>• A agenda de outros professores não é exibida, nem dados administrativos da gestão.</li>
          <li>
            • Para alterar algo no compromisso, fale com a gestão da escola. Sua senha pode ser
            trocada em <strong>🔑 Alterar minha senha</strong>.
          </li>
        </ul>
      </Card>
    </div>
  );
}
