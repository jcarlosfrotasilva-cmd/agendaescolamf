"use client";

import { useState } from "react";

type Resultado = {
  ok: boolean;
  error?: string;
  etapa?: string;
  latencia?: number;
  portaConvertida?: boolean;
  criouTabelas?: boolean;
  tabelasFaltando?: string[];
  usuarios?: number;
  host?: string;
  mensagem?: string;
  reiniciar?: boolean;
};

const inputClass =
  "w-full rounded-lg border-0 bg-white px-3 py-2.5 font-mono text-[11px] text-slate-900 ring-1 ring-inset ring-slate-300 outline-none transition placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500";

export function ConfigurarBancoForm({ jaConfigurado }: { jaConfigurado: boolean }) {
  const [url, setUrl] = useState("");
  const [criarTabelas, setCriarTabelas] = useState(true);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [copiado, setCopiado] = useState(false);

  async function salvar(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEnviando(true);
    setResultado(null);
    try {
      const res = await fetch("/api/configurar-banco", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, criarTabelas }),
      });
      const data = (await res.json()) as Resultado;
      setResultado(data);
    } catch {
      setResultado({ ok: false, error: "Falha de comunicação com o servidor." });
    } finally {
      setEnviando(false);
    }
  }

  const sucesso = resultado?.ok === true;

  return (
    <div className="space-y-4">
      <form onSubmit={salvar} className="space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Connection string do Supabase
          </span>
          <input
            className={inputClass}
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="postgresql://postgres.SEU_PROJETO:SENHA@aws-0-REGIAO.pooler.supabase.com:6543/postgres"
            autoComplete="off"
            spellCheck={false}
            required
          />
          <span className="mt-1 block text-[11px] text-slate-500">
            Supabase → <strong>Project Settings → Database → Connection string (URI)</strong>. A porta
            5432 é convertida automaticamente para 6543 (recomendada).
          </span>
        </label>

        <label className="flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2.5 ring-1 ring-slate-200">
          <input
            type="checkbox"
            checked={criarTabelas}
            onChange={(event) => setCriarTabelas(event.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600"
          />
          <span className="text-[11px] leading-relaxed text-slate-600">
            <strong> Criar as tabelas automaticamente</strong> se estiverem faltando (executa a
            estrutura do sistema no banco). Não apaga dados existentes.
          </span>
        </label>

        {jaConfigurado ? (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-800 ring-1 ring-amber-200">
            Este ambiente <strong>já está configurado</strong>. Alterar a conexão exige sessão de
            administrador e afeta o banco em uso.
          </p>
        ) : null}

        <button
          type="submit"
          disabled={enviando}
          className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60"
        >
          {enviando ? "Testando conexão…" : "Testar, criar tabelas e salvar configuração"}
        </button>
      </form>

      {resultado ? (
        sucesso ? (
          <div className="rounded-xl bg-emerald-50 p-4 ring-1 ring-emerald-200">
            <p className="text-sm font-semibold text-emerald-800">
              ✅ Conexão validada e configuração gravada
            </p>
            <ul className="mt-2 space-y-1 text-[11px] text-emerald-800">
              <li>• Banco: {resultado.host}</li>
              <li>• Latência: {resultado.latencia} ms</li>
              <li>
                • Tabelas:{" "}
                {resultado.tabelasFaltando && resultado.tabelasFaltando.length > 0
                  ? `faltando ${resultado.tabelasFaltando.join(", ")}`
                  : resultado.criouTabelas
                    ? "criadas agora"
                    : "já existentes"}
              </li>
              <li>• Usuários cadastrados: {resultado.usuarios}</li>
              {resultado.portaConvertida ? (
                <li>• Porta 5432 convertida para 6543 (transaction pooler)</li>
              ) : null}
            </ul>
            <p className="mt-2 rounded-lg bg-white/70 px-3 py-2 text-[11px] font-medium text-emerald-900">
              Reinicie o servidor (<code>npm run dev</code>) e abra{" "}
              <a href="/entrar" className="font-semibold underline">
                /entrar
              </a>
              . {resultado.usuarios === 0 ? "Como não há usuários, a tela criará o administrador." : ""}
            </p>
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(url);
                  setCopiado(true);
                  globalThis.setTimeout(() => setCopiado(false), 2000);
                } catch {
                  /* ignora */
                }
              }}
              className="mt-2 rounded-lg bg-white px-3 py-1.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-300 hover:bg-emerald-100"
            >
              {copiado ? "✓ Copiado" : "Copiar URL usada"}
            </button>
          </div>
        ) : (
          <div className="rounded-xl bg-rose-50 p-4 ring-1 ring-rose-200">
            <p className="text-sm font-semibold text-rose-800">Não foi possível configurar</p>
            <p className="mt-1 text-[11px] leading-relaxed text-rose-700">
              {resultado.error}
              {resultado.etapa === "conexao" ? " (falha na conexão)" : ""}
            </p>
          </div>
        )
      ) : null}
    </div>
  );
}
