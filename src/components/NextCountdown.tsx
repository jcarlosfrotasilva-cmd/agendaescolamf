"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { cargoInfo, prioridadeInfo, tipoLabel } from "@/lib/constants";
import { fmtCountdown, fmtLong, toLocalDate } from "@/lib/datetime";

export type ProximoCompromisso = {
  id: number;
  titulo: string;
  assunto: string;
  tipo: string;
  cargoResponsavel: string;
  local: string;
  dataInicio: string;
  dataFim: string;
  horaInicio: string;
  horaFim: string;
  prioridade: string;
  status: string;
  gestorNome: string | null;
  participantes: string | null;
};

export function NextCountdown({ item }: { item: ProximoCompromisso }) {
  const [agora, setAgora] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setAgora(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const inicio = toLocalDate(item.dataInicio, item.horaInicio).getTime();
  const fim = toLocalDate(item.dataFim, item.horaFim).getTime();
  const diff = inicio - agora;
  const emAndamento = diff <= 0 && agora < fim;
  const info = cargoInfo(item.cargoResponsavel);
  const prioridade = prioridadeInfo(item.prioridade);

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-50 via-white to-teal-50 p-5 shadow-sm ring-1 ring-slate-200">
      <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-indigo-200/40 blur-3xl" />
      <div className="relative">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-teal-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-teal-700 ring-1 ring-teal-200">
            Próximo compromisso
          </span>
          <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200">
            {tipoLabel(item.tipo)}
          </span>
          {item.prioridade !== "NORMAL" ? (
            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800 ring-1 ring-amber-200">
              Prioridade {prioridade.label}
            </span>
          ) : null}
        </div>

        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold leading-tight tracking-tight text-slate-900">
              {item.titulo}
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">{item.assunto}</p>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-600">
              <span className="inline-flex items-center gap-1.5 font-semibold text-slate-800">
                <span className={`h-2 w-2 rounded-full ${info.dot}`} />
                {info.label}
              </span>
              <span>🏫 {item.local}</span>
              <span>
                🗓️ {fmtLong(item.dataInicio)} · {item.horaInicio} → {item.horaFim}
              </span>
              {item.gestorNome ? <span>👤 {item.gestorNome}</span> : null}
              {item.participantes ? <span>👥 {item.participantes}</span> : null}
            </div>
          </div>

          <div className="text-right">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
              {emAndamento ? "Em andamento" : "Inicia em"}
            </p>
            <p className="font-mono text-3xl font-semibold tracking-tight text-teal-700">
              {emAndamento ? "agora" : fmtCountdown(diff)}
            </p>
            <Link
              href={`/compromissos/${item.id}`}
              className="mt-3 inline-flex items-center gap-1 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
            >
              Abrir compromisso →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
