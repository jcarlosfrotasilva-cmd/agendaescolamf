import Link from "next/link";
import { CompromissoForm } from "@/components/CompromissoForm";
import { Card } from "@/components/ui";
import { ORIGENS } from "@/lib/constants";
import { isoToday } from "@/lib/datetime";
import { listarGestores, listarProfessores } from "@/lib/repo";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/**
 * REGISTRAR CONVOCAÇÃO RECEBIDA (URE / órgão central)
 * Fluxo guiado: dados da convocação → designação do docente → aviso ao professor.
 */
export default async function NovaConvocacaoPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const [gestores, docentes, sp] = await Promise.all([
    listarGestores(),
    listarProfessores({ ativo: true }),
    searchParams,
  ]);

  const origemParam = Array.isArray(sp.origem) ? sp.origem[0] : sp.origem;
  const origemSelecionada =
    ORIGENS.find((o) => o.key === origemParam && o.key !== "ESCOLA")?.key ?? "URE";
  const hoje = isoToday();

  return (
    <div className="space-y-5">
      <nav className="text-[11px] text-slate-500">
        <Link href="/" className="hover:text-indigo-600">
          Painel
        </Link>{" "}
        /{" "}
        <Link href="/convocacoes" className="hover:text-indigo-600">
          Convocações externas
        </Link>{" "}
        / <span className="font-semibold text-slate-700">Registrar convocação</span>
      </nav>

      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-600">
          Convocação recebida de outro órgão
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
          Registrar ação formativa e designar o docente
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">
          Use esta tela quando a <strong>URE</strong> ou o <strong>órgão central</strong> convocar uma
          formação ou reunião. Registre os dados da convocação, escolha o professor participante e o
          sistema entrega a convocação na área dele, com despertador e aviso por WhatsApp.
        </p>
      </header>

      <Card className="border-l-4 border-l-amber-500 p-4">
        <div className="flex flex-wrap items-start gap-3">
          <span className="text-xl">⚑</span>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-900">
              Os três passos já estão preparados nesta tela
            </p>
            <ol className="mt-1 space-y-0.5 text-[11px] leading-relaxed text-slate-600">
              <li>
                <strong>1.</strong> Em “Quem está convocando?”, confirme a origem (URE ou órgão
                central) e informe o órgão e o documento.
              </li>
              <li>
                <strong>2.</strong> Preencha título, datas, horário, local e pauta da ação formativa.
              </li>
              <li>
                <strong>3.</strong> Em “Quem participa”, marque o <strong>docente designado</strong> —
                apenas ele verá a convocação na própria área.
              </li>
            </ol>
          </div>
        </div>
      </Card>

      <CompromissoForm
        modo="criar"
        publicoInicial="DOCENTES"
        gestores={gestores.map((g) => ({ id: g.id, nome: g.nome, cargo: g.cargo }))}
        professores={docentes.map((p) => ({
          id: p.id,
          nome: p.nome,
          disciplina: p.disciplina,
          turmas: p.turmas,
          turno: p.turno,
        }))}
        inicial={{
          origem: origemSelecionada,
          cargoResponsavel: "ORGAO_EXTERNO",
          tipo: "FORMACAO",
          titulo: "Ação Formativa URE",
          assunto: "Formação convocada pela Unidade Regional de Ensino",
          dataInicio: hoje,
          dataFim: hoje,
          horaInicio: "08:00",
          horaFim: "17:00",
          local: "Auditório da URE",
          prioridade: "ALTA",
          lembreteMinutos: "1440",
          despertadorAtivo: true,
        }}
      />
    </div>
  );
}
