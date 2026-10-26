"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PAPEIS } from "@/lib/constants-acesso";

export function BotaoSair({ papel }: { papel: string }) {
  const router = useRouter();
  const [saindo, setSaindo] = useState(false);
  const info = PAPEIS.find((p) => p.key === papel);

  async function sair() {
    setSaindo(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/entrar");
    router.refresh();
  }

  return (
    <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-white/10 pt-2.5">
      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
        {info?.label ?? papel}
      </span>
      <button
        type="button"
        onClick={() => void sair()}
        disabled={saindo}
        className="rounded-lg bg-slate-900 px-2.5 py-1 text-[10px] font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
      >
        {saindo ? "saindo…" : "Sair"}
      </button>
    </div>
  );
}
