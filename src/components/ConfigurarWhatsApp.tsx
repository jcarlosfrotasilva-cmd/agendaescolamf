"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Campo = { chave: string; label: string; dica: string };
type Provedor = {
  key: string;
  label: string;
  descricao: string;
  variaveis: string[];
  campos: Campo[];
  preenchidos: string[];
};

const inputClass =
  "w-full rounded-lg border-0 bg-white px-3 py-2.5 font-mono text-[11px] text-slate-900 ring-1 ring-inset ring-slate-300 outline-none transition placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500";

export function ConfigurarWhatsApp({
  provedores,
  ativoAtual,
  descricaoAtual,
  podeEditar,
}: {
  provedores: Provedor[];
  ativoAtual: string | null;
  descricaoAtual: string;
  podeEditar: boolean;
}) {
  const router = useRouter();
  // Z-API é o padrão: é o mais simples (número comum por QR Code).
  const [provedor, setProvedor] = useState<string>(ativoAtual ?? "zapi");
  const [valores, setValores] = useState<Record<string, string>>({});
  const [resultado, setResultado] = useState<{
    ok: boolean;
    mensagem: string;
    conectado?: boolean;
  } | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [testeTelefone, setTesteTelefone] = useState("");
  const [testeResultado, setTesteResultado] = useState<string | null>(null);
  const [testando, setTestando] = useState(false);

  const selecionado = provedores.find((p) => p.key === provedor);

  async function ativar(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setOcupado(true);
    setResultado(null);
    setTesteResultado(null);
    try {
      const res = await fetch("/api/whatsapp/configurar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provedor, valores }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        mensagem?: string;
        error?: string;
        conectado?: boolean;
      };
      setResultado({
        ok: Boolean(data.ok),
        mensagem: data.mensagem ?? data.error ?? "Erro desconhecido.",
        conectado: data.conectado,
      });
      if (data.ok) {
        setValores({});
        router.refresh();
      }
    } catch {
      setResultado({ ok: false, mensagem: "Falha de comunicação com o servidor." });
    } finally {
      setOcupado(false);
    }
  }

  async function testar() {
    setTestando(true);
    setTesteResultado(null);
    try {
      const res = await fetch("/api/whatsapp/teste", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telefone: testeTelefone }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string; erro?: string };
      setTesteResultado(
        data.ok
          ? "✅ Mensagem enviada! Confira o WhatsApp informado."
          : `❌ ${data.error ?? data.erro ?? "Não foi possível enviar."}`,
      );
    } catch {
      setTesteResultado("❌ Falha de comunicação com o servidor.");
    } finally {
      setTestando(false);
    }
  }

  async function desativar() {
    if (!globalThis.confirm("Desativar o envio automático e voltar ao link manual?")) return;
    setOcupado(true);
    await fetch("/api/whatsapp/configurar", { method: "DELETE" });
    setOcupado(false);
    setResultado({ ok: true, mensagem: "Envio automático desativado." });
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div
        className={`rounded-xl px-4 py-3 ring-1 ${
          ativoAtual
            ? "bg-emerald-50 text-emerald-900 ring-emerald-200"
            : "bg-amber-50 text-amber-900 ring-amber-200"
        }`}
      >
        <p className="text-xs font-semibold">
          {ativoAtual ? "✅ Envio automático ATIVO" : "⚠️ Envio automático desligado"}
        </p>
        <p className="mt-0.5 text-[11px] leading-relaxed">
          {ativoAtual
            ? `Provedor em uso: ${descricaoAtual}. Convites e lembretes saem sem clique.`
            : "Hoje o envio é manual assistido (o sistema abre o WhatsApp com o texto pronto). Configure abaixo para enviar sozinho."}
        </p>
        {ativoAtual && podeEditar ? (
          <button
            type="button"
            onClick={() => void desativar()}
            className="mt-2 rounded-lg bg-white px-3 py-1.5 text-[11px] font-semibold text-rose-700 ring-1 ring-rose-200 hover:bg-rose-50"
          >
            Desativar envio automático
          </button>
        ) : null}
      </div>

      {/* Escolha do provedor */}
      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          1. Escolha o provedor
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {provedores.map((p) => {
            const escolhido = provedor === p.key;
            const recomendado = p.key === "zapi";
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => {
                  setProvedor(p.key);
                  setValores({});
                  setResultado(null);
                }}
                className={`rounded-xl p-3 text-left ring-1 transition ${
                  escolhido
                    ? "bg-indigo-50 ring-2 ring-indigo-500"
                    : "bg-white ring-slate-200 hover:ring-indigo-300"
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-slate-900">{p.label}</span>
                  {recomendado ? (
                    <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-emerald-700">
                      mais fácil
                    </span>
                  ) : null}
                  {ativoAtual === p.key ? (
                    <span className="rounded-full bg-indigo-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-indigo-700">
                      em uso
                    </span>
                  ) : null}
                </span>
                <span className="mt-1 block text-[11px] leading-relaxed text-slate-500">
                  {p.descricao}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Formulário */}
      {selecionado ? (
        <form onSubmit={ativar} className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            2. Cole os dados do {selecionado.label}
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {selecionado.campos.map((campo) => (
              <label key={campo.chave} className="block">
                <span className="mb-1 block text-[11px] font-semibold text-slate-700">
                  {campo.label}
                </span>
                <input
                  className={inputClass}
                  value={valores[campo.chave] ?? ""}
                  onChange={(event) =>
                    setValores((prev) => ({ ...prev, [campo.chave]: event.target.value }))
                  }
                  placeholder={campo.chave}
                  autoComplete="off"
                  spellCheck={false}
                  required={!/opcional/i.test(campo.label)}
                />
                <span className="mt-1 block text-[10px] leading-relaxed text-slate-500">
                  {campo.dica}
                  {selecionado.preenchidos.includes(campo.chave) ? (
                    <strong className="ml-1 text-emerald-700">· já salvo</strong>
                  ) : null}
                </span>
              </label>
            ))}
          </div>

          <button
            type="submit"
            disabled={ocupado || !podeEditar}
            className="mt-4 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
          >
            {ocupado ? "Validando com o provedor…" : "3. Validar e ativar envio automático"}
          </button>
          {!podeEditar ? (
            <p className="mt-2 text-[11px] font-medium text-amber-700">
              Apenas administradores podem alterar esta configuração.
            </p>
          ) : null}
        </form>
      ) : null}

      {resultado ? (
        <div
          className={`rounded-xl px-4 py-3 ring-1 ${
            resultado.ok
              ? "bg-emerald-50 text-emerald-900 ring-emerald-200"
              : "bg-rose-50 text-rose-900 ring-rose-200"
          }`}
        >
          <p className="text-xs font-semibold">
            {resultado.ok ? "✅ Configuração aceita" : "❌ Não foi possível ativar"}
          </p>
          <p className="mt-0.5 text-[11px] leading-relaxed">{resultado.mensagem}</p>
        </div>
      ) : null}

      {/* Teste */}
      {ativoAtual ? (
        <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            4. Testar o envio
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input
              value={testeTelefone}
              onChange={(event) => setTesteTelefone(event.target.value)}
              placeholder="(16) 99743-1312"
              inputMode="tel"
              className="w-[200px] rounded-lg border-0 bg-white px-3 py-2 text-sm ring-1 ring-inset ring-slate-300 outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="button"
              onClick={() => void testar()}
              disabled={testando || !testeTelefone.trim()}
              className="rounded-lg bg-slate-900 px-3.5 py-2 text-[11px] font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
            >
              {testando ? "Enviando…" : "Enviar mensagem de teste"}
            </button>
          </div>
          {testeResultado ? (
            <p className="mt-2 text-[11px] font-medium text-slate-700">{testeResultado}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
