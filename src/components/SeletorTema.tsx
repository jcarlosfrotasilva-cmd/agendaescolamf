"use client";

import { useEffect, useState } from "react";

const CHAVE = "agenda:tema";

export const TEMAS = [
  {
    key: "nevoa",
    label: "Névoa",
    descricao: "Verde-azulado suave (padrão)",
    cor: "#f4f7f6",
    borda: "#d9e6e2",
  },
  {
    key: "azul",
    label: "Azul sereno",
    descricao: "Clássico e institucional",
    cor: "#f1f5fa",
    borda: "#d7e3f0",
  },
  {
    key: "areia",
    label: "Areia",
    descricao: "Neutro quente, descansa a vista",
    cor: "#f8f5ef",
    borda: "#e9e0d1",
  },
  {
    key: "lavanda",
    label: "Lavanda",
    descricao: "Lilás discreto",
    cor: "#f5f3fb",
    borda: "#e2dcf3",
  },
  {
    key: "branco",
    label: "Branco puro",
    descricao: "Máximo contraste e sobriedade",
    cor: "#f7f8f9",
    borda: "#e3e6e8",
  },
] as const;

export type TemaKey = (typeof TEMAS)[number]["key"];

function aplicar(tema: string) {
  document.documentElement.setAttribute("data-tema", tema);
}

/** Aplica o tema salvo antes da hidratação (evita "piscar" a cor errada). */
export function ScriptTema() {
  const codigo = `(function(){try{var t=localStorage.getItem('${CHAVE}')||'nevoa';document.documentElement.setAttribute('data-tema',t);}catch(e){}})();`;
  return <script dangerouslySetInnerHTML={{ __html: codigo }} />;
}

export function SeletorTema({
  compacto = false,
  tom = "escuro",
}: {
  compacto?: boolean;
  /** `escuro` para o menu lateral, `claro` para fundos claros. */
  tom?: "claro" | "escuro";
}) {
  const [tema, setTema] = useState<string>("nevoa");

  useEffect(() => {
    const salvo = window.localStorage.getItem(CHAVE) ?? "nevoa";
    setTema(salvo);
    aplicar(salvo);
  }, []);

  function escolher(novo: string) {
    setTema(novo);
    aplicar(novo);
    try {
      window.localStorage.setItem(CHAVE, novo);
    } catch {
      /* modo privado */
    }
  }

  if (compacto) {
    return (
      <div className="flex flex-wrap gap-1.5">
        {TEMAS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => escolher(t.key)}
            title={`${t.label} — ${t.descricao}`}
            aria-pressed={tema === t.key}
            className={`h-6 w-6 rounded-full ring-1 transition ${
              tema === t.key
                ? tom === "claro"
                  ? "ring-2 ring-indigo-500"
                  : "ring-2 ring-white"
                : tom === "claro"
                  ? "ring-slate-300 hover:ring-slate-400"
                  : "ring-white/30 hover:ring-white/60"
            }`}
            style={{ backgroundColor: t.cor, border: `2px solid ${t.borda}` }}
          >
            <span className="sr-only">{t.label}</span>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {TEMAS.map((t) => {
        const ativo = tema === t.key;
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => escolher(t.key)}
            aria-pressed={ativo}
            className={`flex items-center gap-3 rounded-xl p-3 text-left transition ring-1 ${
              ativo
                ? "bg-white ring-2 ring-indigo-500"
                : "bg-white ring-slate-200 hover:ring-indigo-300"
            }`}
          >
            <span
              className="h-10 w-10 shrink-0 rounded-lg ring-1 ring-slate-200"
              style={{ backgroundColor: t.cor, border: `1px solid ${t.borda}` }}
            />
            <span className="min-w-0">
              <span className="block text-xs font-semibold text-slate-900">
                {t.label}
                {ativo ? <span className="ml-1.5 text-[10px] text-indigo-600">· em uso</span> : null}
              </span>
              <span className="block text-[11px] text-slate-500">{t.descricao}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
