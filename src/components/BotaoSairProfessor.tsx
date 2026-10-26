"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function BotaoSairProfessor() {
  const router = useRouter();
  const [saindo, setSaindo] = useState(false);

  async function sair() {
    setSaindo(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/entrar");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={() => void sair()}
      disabled={saindo}
      className="rounded-xl bg-white px-3.5 py-2 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-300 transition hover:bg-slate-50 disabled:opacity-60"
    >
      {saindo ? "Saindo…" : "Sair da conta"}
    </button>
  );
}
