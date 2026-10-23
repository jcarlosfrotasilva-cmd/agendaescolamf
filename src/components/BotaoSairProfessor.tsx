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
      className="rounded-xl bg-white/10 px-3.5 py-2 text-[11px] font-semibold text-white ring-1 ring-white/20 transition hover:bg-white/20 disabled:opacity-60"
    >
      {saindo ? "Saindo…" : "Sair da conta"}
    </button>
  );
}
