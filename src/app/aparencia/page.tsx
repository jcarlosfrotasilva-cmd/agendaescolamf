import Link from "next/link";
import { SeletorTema } from "@/components/SeletorTema";
import { Card } from "@/components/ui";

export const dynamic = "force-dynamic";

export default function AparenciaPage() {
  return (
    <div className="space-y-5">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-600">
          Aparência
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
          Cor de fundo das telas
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">
          Escolha o tom de fundo mais agradável para o seu uso diário. A preferência fica salva neste
          navegador e não altera os dados nem a agenda da escola.
        </p>
      </header>

      <Card className="p-5">
        <h2 className="text-sm font-semibold text-slate-900">Paletas disponíveis</h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Todas mantêm contraste alto nos textos e destaque dos cartões brancos. Clique para aplicar
          na hora.
        </p>
        <div className="mt-4">
          <SeletorTema />
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-slate-900">Prévia dos componentes</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Veja como cards, badges e botões ficam no tom escolhido.
          </p>
          <div className="mt-4 space-y-3">
            <div className="rounded-xl bg-white p-3.5 ring-1 ring-slate-200">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                  Confirmado
                </span>
                <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800 ring-1 ring-inset ring-amber-200">
                  ⚑ URE
                </span>
                <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-200">
                  Orientação Pedagógica
                </span>
              </div>
              <p className="mt-2 text-sm font-semibold text-slate-900">
                HTPC — Planejamento coletivo
              </p>
              <p className="text-[11px] text-slate-500">
                Sala dos Professores · 15:00 às 17:00 · Coordenação Pedagógica
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white">
                Agendar compromisso
              </span>
              <span className="rounded-xl bg-white px-4 py-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-300">
                Cancelar
              </span>
              <span className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white">
                ＋ Convocar docentes
              </span>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-sm font-semibold text-slate-900">Sobre a escolha</h2>
          <ul className="mt-2 space-y-2 text-xs leading-relaxed text-slate-600">
            <li>
              • A cor afeta apenas o <strong>fundo das páginas</strong>. Cartões, textos e a barra
              lateral escura continuam como estão, garantindo leitura confortável.
            </li>
            <li>
              • A preferência é salva no navegador — cada pessoa da equipe pode usar a sua (ex.: um
              monitor mais claro e outro mais quente).
            </li>
            <li>
              • Tons neutros costumam cansar menos em uso prolongado; se a sala tiver muita luz, o
              “Azul sereno” favorece o contraste.
            </li>
            <li>
              • Não há impacto em desempenho, impressão ou no banco de dados.
            </li>
          </ul>
          <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
            <Link
              href="/"
              className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700"
            >
              Voltar ao painel
            </Link>
            <Link
              href="/agenda"
              className="rounded-xl bg-white px-4 py-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-300 transition hover:bg-slate-50"
            >
              Abrir agenda
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
