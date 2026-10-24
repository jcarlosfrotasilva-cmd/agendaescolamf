"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { TIPOS_DOCENTES, TURNOS, tipoInfo } from "@/lib/constants";
import { Field, inputClass, selectClass } from "./ui";

export type ProfessorItem = {
  id: number;
  nome: string;
  disciplina: string | null;
  turmas: string | null;
  turno: string;
  email: string | null;
  telefone: string | null;
  observacoes: string | null;
  ativo: boolean;
  totalCompromissos: number;
  /** Login já criado? */
  temAcesso: boolean;
  ultimoAcesso: string | null;
};

const vazio = {
  id: 0,
  nome: "",
  disciplina: "",
  turmas: "",
  turno: "MANHA",
  email: "",
  telefone: "",
  observacoes: "",
  ativo: true,
};

type Credenciais = { email: string; senha: string | null; nome: string; telefone: string | null };

export function ProfessorManager({ professores }: { professores: ProfessorItem[] }) {
  const router = useRouter();
  const [form, setForm] = useState({ ...vazio });
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [copiado, setCopiado] = useState<number | null>(null);
  const [credenciais, setCredenciais] = useState<Credenciais | null>(null);
  const [copiaOk, setCopiaOk] = useState(false);
  const editando = form.id > 0;

  async function salvar(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro(null);
    setOcupado(true);
    const res = await fetch("/api/professores", {
      method: editando ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editando ? form.id : undefined,
        nome: form.nome,
        disciplina: form.disciplina,
        turmas: form.turmas,
        turno: form.turno,
        email: form.email,
        telefone: form.telefone,
        observacoes: form.observacoes,
        ativo: form.ativo,
      }),
    });
    const data = (await res.json()) as { ok: boolean; error?: string };
    setOcupado(false);
    if (!res.ok || !data.ok) {
      setErro(data.error ?? "Não foi possível salvar o cadastro.");
      return;
    }
    setForm({ ...vazio });
    setAviso("Cadastro salvo. Crie o acesso do professor em “🔑 Criar acesso”.");
    router.refresh();
  }

  async function excluir(id: number) {
    if (!globalThis.confirm("Excluir este professor? O login de acesso também será removido.")) {
      return;
    }
    setOcupado(true);
    await fetch(`/api/professores/${id}`, { method: "DELETE" });
    setOcupado(false);
    router.refresh();
  }

  function editar(item: ProfessorItem) {
    setErro(null);
    setAviso(null);
    setForm({
      id: item.id,
      nome: item.nome,
      disciplina: item.disciplina ?? "",
      turmas: item.turmas ?? "",
      turno: item.turno,
      email: item.email ?? "",
      telefone: item.telefone ?? "",
      observacoes: item.observacoes ?? "",
      ativo: item.ativo,
    });
    globalThis.scrollTo({ top: 0, behavior: "smooth" });
  }

  function emailSugerido(item: ProfessorItem) {
    if (item.email) return item.email;
    const base = item.nome
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z\s]/g, "")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .join(".");
    return `${base || "professor"}@marlenefrattini.edu.br`;
  }

  /** Cria ou redefine o login (e-mail + senha) do professor. */
  async function criarAcesso(item: ProfessorItem) {
    const email = globalThis.prompt(
      `E-mail de acesso de ${item.nome}:`,
      emailSugerido(item),
    );
    if (email === null) return;
    if (!email.includes("@")) {
      setErro("Informe um e-mail válido com @.");
      return;
    }

    const senha = globalThis.prompt(
      "Senha inicial — deixe em branco para o sistema gerar uma senha temporária forte:",
      "",
    );
    if (senha === null) return;

    setOcupado(true);
    setErro(null);
    setAviso(null);
    try {
      const res = await fetch(`/api/professores/${item.id}/acesso`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), senha: senha.trim() || undefined }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        email?: string;
        senhaTemporaria?: string | null;
        mensagem?: string;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        setErro(data.error ?? "Não foi possível criar o acesso.");
        return;
      }
      setCredenciais({
        nome: item.nome,
        email: data.email ?? email,
        senha: data.senhaTemporaria ?? (senha.trim() || null),
        telefone: item.telefone,
      });
      setAviso(data.mensagem ?? "Acesso criado/atualizado com sucesso.");
      router.refresh();
    } finally {
      setOcupado(false);
    }
  }

  async function copiarCredenciais() {
    if (!credenciais) return;
    const texto = [
      "Agenda da Gestão Escolar — EE PROFA. MARLENE FRATTINI",
      `Professor(a): ${credenciais.nome}`,
      `Endereço: ${globalThis.location.origin}/entrar`,
      `E-mail: ${credenciais.email}`,
      credenciais.senha ? `Senha: ${credenciais.senha}` : "Senha: a definida pela gestão",
      "",
      "Você verá apenas a sua agenda e os compromissos coletivos da escola.",
    ].join("\n");
    try {
      await navigator.clipboard.writeText(texto);
      setCopiaOk(true);
      globalThis.setTimeout(() => setCopiaOk(false), 2500);
    } catch {
      setErro("Não foi possível copiar automaticamente.");
    }
  }

  /** Abre o WhatsApp do professor com as credenciais prontas. */
  function enviarCredenciaisWhatsApp() {
    if (!credenciais) return;
    const texto = [
      "*AGENDA DA GESTÃO ESCOLAR*",
      "EE PROFA. MARLENE FRATTINI",
      "",
      `Olá, ${credenciais.nome.split(" ")[0]}!`,
      "Seu acesso à agenda escolar foi criado.",
      "",
      `🔗 Endereço: ${globalThis.location.origin}/entrar`,
      `👤 E-mail: ${credenciais.email}`,
      credenciais.senha ? `🔑 Senha: ${credenciais.senha}` : "",
      "",
      "Ao entrar, você verá a sua agenda e os compromissos coletivos da escola.",
      "Recomendamos trocar a senha em “Minha senha”, no primeiro acesso.",
    ]
      .filter(Boolean)
      .join("\n");

    const numero = (credenciais.telefone ?? "").replace(/\D/g, "");
    const link = numero
      ? `https://wa.me/${numero.startsWith("55") ? numero : `55${numero}`}?text=${encodeURIComponent(texto)}`
      : `https://wa.me/?text=${encodeURIComponent(texto)}`;
    globalThis.open(link, "_blank", "noopener,noreferrer");
  }

  async function removerAcesso(item: ProfessorItem) {
    if (!globalThis.confirm(`Remover o login de ${item.nome}? O cadastro do professor permanece.`)) {
      return;
    }
    setOcupado(true);
    await fetch(`/api/professores/${item.id}/acesso`, { method: "DELETE" });
    setOcupado(false);
    setAviso("Acesso removido.");
    router.refresh();
  }

  async function copiarFeed(item: ProfessorItem) {
    try {
      await navigator.clipboard.writeText(
        `${globalThis.location.origin}/api/professores/${item.id}/ics`,
      );
      setCopiado(item.id);
      globalThis.setTimeout(() => setCopiado(null), 2500);
    } catch {
      setErro("Não foi possível copiar o endereço da agenda.");
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
      <form onSubmit={salvar} className="card-surface h-fit p-5">
        <h2 className="text-sm font-semibold text-slate-900">
          {editando ? "Editar professor(a)" : "Cadastrar professor(a)"}
        </h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Depois de cadastrar, crie o login em “🔑 Criar acesso” — cada professor tem e-mail e senha
          próprios.
        </p>

        <div className="mt-4 space-y-3">
          <Field label="Nome completo">
            <input
              className={inputClass}
              value={form.nome}
              onChange={(event) => setForm({ ...form, nome: event.target.value })}
              placeholder="Ex.: Ana Paula Ferreira"
              required
            />
          </Field>
          <Field label="Disciplina / componente">
            <input
              className={inputClass}
              value={form.disciplina}
              onChange={(event) => setForm({ ...form, disciplina: event.target.value })}
              placeholder="Matemática, Língua Portuguesa..."
            />
          </Field>
          <Field label="Turmas / anos">
            <input
              className={inputClass}
              value={form.turmas}
              onChange={(event) => setForm({ ...form, turmas: event.target.value })}
              placeholder="6º A, 7º B, 8º A"
            />
          </Field>
          <Field label="Turno">
            <select
              className={selectClass}
              value={form.turno}
              onChange={(event) => setForm({ ...form, turno: event.target.value })}
            >
              {TURNOS.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="E-mail" hint="Será o e-mail de login do professor.">
            <input
              type="email"
              className={inputClass}
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              placeholder="nome@marlenefrattini.edu.br"
            />
          </Field>
          <Field label="WhatsApp (com DDD)" hint="Usado para avisos automáticos.">
            <input
              className={inputClass}
              value={form.telefone}
              onChange={(event) => setForm({ ...form, telefone: event.target.value })}
              placeholder="(11) 98812-4477"
              inputMode="tel"
            />
          </Field>
          <Field label="Observações">
            <textarea
              className={`${inputClass} min-h-[70px] resize-y`}
              value={form.observacoes}
              onChange={(event) => setForm({ ...form, observacoes: event.target.value })}
              placeholder="Aulas em outras unidades, restrições de horário, etc."
            />
          </Field>
        </div>

        {erro ? (
          <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 ring-1 ring-rose-200">
            {erro}
          </p>
        ) : null}

        <div className="mt-4 flex gap-2">
          <button
            type="submit"
            disabled={ocupado}
            className="rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
          >
            {editando ? "Salvar alterações" : "Cadastrar professor(a)"}
          </button>
          {editando ? (
            <button
              type="button"
              onClick={() => setForm({ ...vazio })}
              className="rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-300 hover:bg-slate-50"
            >
              Cancelar
            </button>
          ) : null}
        </div>

        <div className="mt-4 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Tipos usados na agenda docente
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {TIPOS_DOCENTES.map((chave) => {
              const info = tipoInfo(chave);
              return (
                <span
                  key={chave}
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${info.chip}`}
                >
                  {info.label}
                </span>
              );
            })}
          </div>
        </div>
      </form>

      <div className="space-y-4">
        {credenciais ? (
          <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-600 p-5 text-white shadow-lg">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-100">
                  Acesso criado — envie ao professor
                </p>
                <p className="mt-1 text-sm font-semibold">{credenciais.nome}</p>
              </div>
              <button
                type="button"
                onClick={() => setCredenciais(null)}
                className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold hover:bg-white/25"
              >
                Fechar ✕
              </button>
            </div>
            <dl className="mt-3 space-y-1.5 text-[11px]">
              <div>
                <dt className="text-emerald-100">Endereço do sistema</dt>
                <dd className="font-mono">/entrar</dd>
              </div>
              <div>
                <dt className="text-emerald-100">E-mail</dt>
                <dd className="font-mono font-semibold">{credenciais.email}</dd>
              </div>
              <div>
                <dt className="text-emerald-100">Senha</dt>
                <dd className="font-mono text-lg font-bold tracking-wider">
                  {credenciais.senha ?? "definida pela gestão"}
                </dd>
              </div>
            </dl>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void copiarCredenciais()}
                className="rounded-lg bg-white px-3 py-2 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50"
              >
                {copiaOk ? "✓ Copiado" : "📋 Copiar credenciais"}
              </button>
              <button
                type="button"
                onClick={() => enviarCredenciaisWhatsApp()}
                className="rounded-lg bg-[#25D366] px-3 py-2 text-[11px] font-semibold text-white hover:brightness-95"
              >
                📱 Enviar por WhatsApp
              </button>
            </div>
            {!credenciais.telefone ? (
              <p className="mt-2 text-[11px] text-emerald-100">
                Sem WhatsApp cadastrado: o envio abrirá o WhatsApp sem destinatário definido.
              </p>
            ) : null}
            <p className="mt-2 rounded-lg bg-white/10 px-3 py-2 text-[11px] leading-relaxed text-emerald-50">
              {credenciais.senha
                ? "A senha temporária é exibida apenas agora. O professor deve alterá-la em “Minha senha” após entrar."
                : "A senha foi definida por você. Oriente o professor a alterá-la no primeiro acesso."}
            </p>
          </section>
        ) : null}

        {aviso ? (
          <div className="rounded-xl bg-indigo-50 px-3.5 py-2.5 text-[11px] font-medium leading-relaxed text-indigo-800 ring-1 ring-indigo-200">
            {aviso}
            <button
              type="button"
              onClick={() => setAviso(null)}
              className="ml-2 font-bold text-indigo-600 hover:text-indigo-800"
            >
              ✕
            </button>
          </div>
        ) : null}

        {TURNOS.map((turno) => {
          const doTurno = professores.filter((p) => p.turno === turno.key);
          if (doTurno.length === 0 && professores.length > 0) return null;
          return (
            <section key={turno.key} className="card-surface overflow-hidden">
              <header className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`grid h-7 w-7 place-items-center rounded-lg text-[11px] font-bold ${turno.chip}`}
                  >
                    {turno.sigla}
                  </span>
                  <h3 className="text-sm font-semibold text-slate-900">Turno da {turno.label}</h3>
                </div>
                <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200">
                  {doTurno.length} professor(es)
                </span>
              </header>
              <div className="divide-y divide-slate-100">
                {doTurno.length === 0 ? (
                  <p className="px-4 py-4 text-xs text-slate-500">
                    Nenhum professor cadastrado neste turno.
                  </p>
                ) : (
                  doTurno.map((p) => (
                    <div key={p.id} className="px-4 py-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900">
                            {p.nome}
                            {!p.ativo ? (
                              <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                                inativo
                              </span>
                            ) : null}
                            {p.temAcesso ? (
                              <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                                login ativo
                              </span>
                            ) : (
                              <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800 ring-1 ring-inset ring-amber-200">
                                sem login
                              </span>
                            )}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {[p.disciplina, p.turmas, p.telefone].filter(Boolean).join(" · ") ||
                              "Sem dados complementares"}
                          </p>
                          <p className="mt-0.5 text-[11px] text-slate-500">
                            {p.email ? (
                              <>Login: <span className="font-mono">{p.email}</span></>
                            ) : (
                              "E-mail de acesso ainda não cadastrado"
                            )}
                            {p.temAcesso && p.ultimoAcesso
                              ? ` · último acesso ${new Date(p.ultimoAcesso).toLocaleString("pt-BR")}`
                              : ""}
                          </p>
                          {p.temAcesso ? (
                            <p className="mt-0.5 text-[10px] text-slate-400">
                              A senha é criptografada (não pode ser lida). Para entregar ao
                              professor, use “🔑 Redefinir acesso” e envie pelo WhatsApp.
                            </p>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                            {p.totalCompromissos} convocação(ões)
                          </span>
                          <Link
                            href={`/compromissos/novo?professor=${p.id}&tipo=HTPC`}
                            className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-emerald-700"
                          >
                            ＋ Convocar
                          </Link>
                          <button
                            type="button"
                            disabled={ocupado}
                            onClick={() => void criarAcesso(p)}
                            className="rounded-lg bg-indigo-600 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                          >
                            {p.temAcesso ? "🔑 Redefinir acesso" : "🔑 Criar acesso"}
                          </button>
                          {p.temAcesso ? (
                            <button
                              type="button"
                              disabled={ocupado}
                              onClick={() => void removerAcesso(p)}
                              className="rounded-lg bg-white px-2 py-1.5 text-[10px] font-semibold text-rose-600 ring-1 ring-rose-200 hover:bg-rose-50 disabled:opacity-60"
                            >
                              🚫
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => void copiarFeed(p)}
                            className="rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                          >
                            {copiado === p.id ? "✓ Copiado" : "Feed .ics"}
                          </button>
                          <button
                            type="button"
                            onClick={() => editar(p)}
                            className="rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => void excluir(p.id)}
                            className="rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-semibold text-rose-600 ring-1 ring-rose-200 hover:bg-rose-50"
                          >
                            Excluir
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          );
        })}

        {professores.length === 0 ? (
          <div className="card-surface p-6">
            <div className="flex flex-col items-center gap-2 text-center">
              <span className="text-2xl">👩‍🏫</span>
              <p className="text-sm font-semibold text-slate-800">
                Nenhum professor cadastrado ainda
              </p>
              <p className="max-w-md text-xs text-slate-500">
                Cadastre o corpo docente, depois crie o acesso de cada um com e-mail e senha. O
                professor verá somente a própria agenda e os compromissos coletivos da escola.
              </p>
            </div>
          </div>
        ) : (
          <p className="text-[11px] text-slate-400">
            Turnos: {TURNOS.map((t) => t.label).join(" · ")}. Cada professor tem login próprio
            (e-mail + senha) e enxerga apenas a sua agenda e a agenda coletiva da escola.{" "}
            <Link href="/usuarios" className="font-semibold text-indigo-600 hover:text-indigo-700">
              Ver todos os usuários →
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
