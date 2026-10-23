import Link from "next/link";
import { ProfessorManager } from "@/components/ProfessorManager";
import { Card, StatCard } from "@/components/ui";
import { TURNOS } from "@/lib/constants";
import { listarProfessores, resumoProfessores } from "@/lib/repo";

export const dynamic = "force-dynamic";

export default async function ProfessoresPage() {
  const [professores, resumo] = await Promise.all([
    listarProfessores({ ativo: undefined }),
    resumoProfessores(),
  ]);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-600">
            Corpo docente
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
            Professores e agenda docente
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">
            Cadastre os professores por disciplina, turmas e turno. Cada docente passa a ter{" "}
            <strong className="font-semibold text-slate-800">agenda própria</strong>: você o convoca
            para orientações pedagógicas, HTPC, conselhos de classe e reuniões de pais, e ele recebe
            o compromisso na agenda dele (feed iCalendar) e por WhatsApp.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/compromissos/novo?tipo=HTPC"
            className="rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700"
          >
            ＋ Agendar HTPC / formação
          </Link>
          <Link
            href="/agenda?tipo=AULA&periodo=TODOS"
            className="rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-300 transition hover:bg-slate-50"
          >
            Ver aulas na agenda
          </Link>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Professores cadastrados" value={resumo.total} icon="👩‍🏫" />
        <StatCard label="Ativos" value={resumo.ativos} accent="emerald" icon="✅" />
        <StatCard
          label="Convocações"
          value={resumo.convocacoes}
          accent="brand"
          hint={`${resumo.comCompromissos} professor(es) com agenda ativa`}
          icon="📣"
        />
        <StatCard
          label="Disciplinas mapeadas"
          value={resumo.disciplinas}
          accent="amber"
          hint={TURNOS.map((t) => t.label).join(" · ")}
          icon="📚"
        />
      </div>

      <ProfessorManager
        professores={professores.map((p) => ({
          id: p.id,
          nome: p.nome,
          disciplina: p.disciplina,
          turmas: p.turmas,
          turno: p.turno,
          email: p.email,
          telefone: p.telefone,
          observacoes: p.observacoes,
          ativo: p.ativo,
          totalCompromissos: p.totalCompromissos,
          temAcesso: p.temAcesso,
          ultimoAcesso: p.ultimoAcesso ?? null,
        }))}
      />

      <Card className="p-5">
        <h2 className="text-sm font-semibold text-slate-900">Como o professor acessa</h2>
        <div className="mt-2 rounded-xl bg-amber-50 px-3.5 py-3 text-[11px] leading-relaxed text-amber-900 ring-1 ring-amber-200">
          O professor <strong>não usa e-mail nem senha</strong>. O e-mail do cadastro serve apenas
          para contato. O acesso é por um <strong>link pessoal</strong>{" "}
          (<code>/professor/&lt;código&gt;</code>), copiado no botão{" "}
          <strong>🔗 Copiar link</strong> ao lado do nome — envie por WhatsApp. O botão{" "}
          <strong>↻</strong> renova o link e invalida o anterior.
        </div>
        <h2 className="mt-5 text-sm font-semibold text-slate-900">
          Como a agenda do professor funciona
        </h2>
        <div className="mt-3 grid gap-4 lg:grid-cols-3">
          <div className="rounded-xl bg-slate-50 p-3.5 ring-1 ring-slate-200">
            <p className="text-xs font-semibold text-slate-800">1. A gestão convoca</p>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
              Ao agendar um compromisso, a gestão seleciona os professores envolvidos (por
              disciplina, turma ou turno). Eles aparecem como convocados no compromisso.
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3.5 ring-1 ring-slate-200">
            <p className="text-xs font-semibold text-slate-800">2. O professor acompanha</p>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
              Cada professor tem sua página com <strong>duas seções</strong>: a{" "}
              <strong>sua agenda</strong> (convocações nominais) e a{" "}
              <strong>agenda da escola</strong> (compromissos coletivos da gestão). A agenda de outro
              professor nunca é exibida. Somente leitura.
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3.5 ring-1 ring-slate-200">
            <p className="text-xs font-semibold text-slate-800">3. Recebe e sincroniza</p>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
              O professor assina o feed <code>.ics</code> da própria agenda no celular (Google
              Agenda/Outlook) e recebe os avisos por WhatsApp — convite, lembrete do despertador e
              alterações.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
