import Link from "next/link";
import { Card, EmptyState, StatCard, StatusBadge } from "@/components/ui";
import { ORIGENS, origemInfo } from "@/lib/constants";
import { fmtShort, isoToday } from "@/lib/datetime";
import { listarConvocacoesExternas } from "@/lib/repo";

export const dynamic = "force-dynamic";

/**
 * CONVOCAÇÕES EXTERNAS
 * Ações formativas e reuniões convocadas pela URE, órgão central ou outras
 * instituições, que a gestão registra e designa o docente participante.
 */
export default async function ConvocacoesPage() {
  const convocacoes = await listarConvocacoesExternas();
  const hoje = isoToday();

  const futuras = convocacoes.filter((c) => c.dataFim >= hoje && c.status !== "CANCELADO");
  const semDocente = futuras.filter((c) => c.totalDocentes === 0);
  const pendentesNotificacao = futuras.filter(
    (c) => c.totalDocentes > 0 && c.notificados < c.totalDocentes,
  );

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-600">
            Convocação recebida · URE e órgão central
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
            Ações formativas convocadas de fora
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">
            Quando a <strong>URE</strong> ou o <strong>órgão central</strong> convoca uma ação
            formativa, a gestão registra aqui, <strong>indica o docente participante</strong> e o
            sistema avisa o professor por WhatsApp. O compromisso aparece na área dele, com
            despertador.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/convocacoes/nova"
            className="rounded-xl bg-amber-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-amber-700"
          >
            ＋ Registrar convocação recebida
          </Link>
          <Link
            href="/agenda?periodo=TODOS"
            className="rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-300 transition hover:bg-slate-50"
          >
            Ver agenda completa
          </Link>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Convocações externas" value={convocacoes.length} icon="⚑" />
        <StatCard
          label="Ações futuras"
          value={futuras.length}
          accent="emerald"
          hint="Ainda vão acontecer"
          icon="⏭️"
        />
        <StatCard
          label="Sem docente designado"
          value={semDocente.length}
          accent={semDocente.length > 0 ? "rose" : "emerald"}
          hint="Escolha quem vai participar"
          icon="⚠️"
        />
        <StatCard
          label="Docentes a notificar"
          value={pendentesNotificacao.length}
          accent="amber"
          hint="Aviso de WhatsApp pendente"
          icon="💬"
        />
      </div>

      <Card className="p-5">
        <h2 className="text-sm font-semibold text-slate-900">Como o fluxo funciona</h2>
        <div className="mt-3 grid gap-3 lg:grid-cols-4">
          {[
            {
              n: "1",
              titulo: "A escola recebe",
              texto: "A URE/órgão central envia a convocação (ofício, circular, e-mail).",
            },
            {
              n: "2",
              titulo: "A gestão registra",
              texto:
                "Clique em “Registrar convocação recebida”, informe o órgão, o documento e os dados da ação.",
            },
            {
              n: "3",
              titulo: "Escolhe o docente",
              texto: "Marque qual(is) professor(es) vão participar. Só eles verão a convocação.",
            },
            {
              n: "4",
              titulo: "O docente recebe",
              texto:
                "Aparece na área dele com despertador, aviso por WhatsApp e identificação da URE.",
            },
          ].map((etapa) => (
            <div key={etapa.n} className="rounded-xl bg-slate-50 p-3.5 ring-1 ring-slate-200">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-amber-100 text-[11px] font-bold text-amber-800">
                {etapa.n}
              </span>
              <p className="mt-2 text-xs font-semibold text-slate-800">{etapa.titulo}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-600">{etapa.texto}</p>
            </div>
          ))}
        </div>
      </Card>

      {convocacoes.length === 0 ? (
        <Card className="p-6">
          <EmptyState
            title="Nenhuma convocação externa registrada"
            description="Quando a URE ou o órgão central convocar uma ação formativa, registre aqui: você escolhe o docente participante e o sistema cuida do aviso, da agenda e do despertador."
            action={
              <Link
                href="/convocacoes/nova"
                className="mt-1 rounded-xl bg-amber-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-amber-700"
              >
                ＋ Registrar primeira convocação
              </Link>
            }
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {convocacoes.map((item) => {
            const origem = origemInfo(item.origem);
            const futura = item.dataFim >= hoje && item.status !== "CANCELADO";
            return (
              <Card key={item.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset ${origem.chip}`}
                      >
                        ⚑ {origem.sigla}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                        {origem.label}
                      </span>
                      <StatusBadge status={item.status} />
                      {item.totalDocentes === 0 ? (
                        <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700 ring-1 ring-inset ring-rose-200">
                          escolher docente
                        </span>
                      ) : item.notificados < item.totalDocentes ? (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800 ring-1 ring-inset ring-amber-200">
                          aviso pendente
                        </span>
                      ) : (
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                          docente avisado
                        </span>
                      )}
                    </div>

                    <h3 className="mt-2 text-sm font-semibold text-slate-900">
                      <Link href={`/compromissos/${item.id}`} className="hover:text-indigo-700">
                        {item.titulo}
                      </Link>
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-600">{item.assunto}</p>

                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
                      <span>
                        🗓️ {fmtShort(item.dataInicio)}
                        {item.dataFim !== item.dataInicio ? ` → ${fmtShort(item.dataFim)}` : ""} ·{" "}
                        {item.horaInicio} às {item.horaFim}
                      </span>
                      <span>📍 {item.local}</span>
                      {item.orgaoConvocante ? <span>🏛️ {item.orgaoConvocante}</span> : null}
                      {item.documentoReferencia ? (
                        <span>📄 {item.documentoReferencia}</span>
                      ) : null}
                    </div>

                    <p className="mt-2 rounded-lg bg-slate-50 px-2.5 py-1.5 text-[11px] text-slate-600 ring-1 ring-slate-200">
                      <strong>Docente(s) designado(s):</strong>{" "}
                      {item.docentes ?? "nenhum — a gestão ainda não indicou o participante"}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Link
                        href={`/compromissos/${item.id}/editar`}
                        className="rounded-lg bg-indigo-600 px-2.5 py-1.5 text-[11px] font-semibold text-white transition hover:bg-indigo-700"
                      >
                        {item.totalDocentes === 0 ? "Designar docente" : "Alterar docente"}
                      </Link>
                      <Link
                        href={`/compromissos/${item.id}#whatsapp`}
                        className="rounded-lg bg-[#25D366]/12 px-2.5 py-1.5 text-[11px] font-semibold text-[#128C7E] ring-1 ring-[#25D366]/30 transition hover:bg-[#25D366]/20"
                      >
                        💬 Avisar
                      </Link>
                      <Link
                        href={`/compromissos/${item.id}`}
                        className="rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50"
                      >
                        Detalhes
                      </Link>
                    </div>
                    {futura ? (
                      <span className="text-[10px] text-slate-400">
                        {item.notificados} de {item.totalDocentes} docente(s) notificado(s)
                      </span>
                    ) : null}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Card className="p-5">
        <h2 className="text-sm font-semibold text-slate-900">Origens reconhecidas</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {ORIGENS.map((origem) => (
            <div key={origem.key} className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
              <span
                className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset ${origem.chip}`}
              >
                {origem.sigla}
              </span>
              <p className="mt-1.5 text-[11px] font-semibold text-slate-800">{origem.label}</p>
              <p className="mt-0.5 text-[10px] leading-relaxed text-slate-500">{origem.descricao}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
