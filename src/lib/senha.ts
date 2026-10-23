/**
 * Política de senhas — módulo seguro para cliente e servidor.
 * Regras: mínimo 8 caracteres, ao menos uma letra e um número,
 * sem sequências triviais e sem conter o e-mail/nome do usuário.
 */
export const SENHA_MINIMA = 8;

const FRACAS = [
  "senha",
  "password",
  "123456",
  "12345678",
  "escola",
  "admin",
  "qwerty",
  "abc123",
  "marlene",
  "frattini",
  "gestao",
  "supabase",
];

export type ResultadoSenha = { ok: true } | { ok: false; mensagem: string };

export function validarSenhaForte(
  senha: string,
  contexto: { email?: string | null; nome?: string | null } = {},
): ResultadoSenha {
  if (!senha || senha.length < SENHA_MINIMA) {
    return { ok: false, mensagem: `A senha deve ter pelo menos ${SENHA_MINIMA} caracteres.` };
  }
  if (senha.length > 128) {
    return { ok: false, mensagem: "A senha deve ter no máximo 128 caracteres." };
  }
  if (!/[A-Za-zÀ-ÿ]/.test(senha)) {
    return { ok: false, mensagem: "Inclua pelo menos uma letra na senha." };
  }
  if (!/\d/.test(senha)) {
    return { ok: false, mensagem: "Inclua pelo menos um número na senha." };
  }

  const minuscula = senha.toLowerCase();
  if (FRACAS.some((fraca) => minuscula === fraca || minuscula.includes(`${fraca}123`))) {
    return { ok: false, mensagem: "Esta senha é muito comum. Escolha outra combinação." };
  }

  const email = (contexto.email ?? "").toLowerCase().split("@")[0];
  if (email.length >= 4 && minuscula.includes(email)) {
    return { ok: false, mensagem: "A senha não pode conter o e-mail de acesso." };
  }
  const primeiroNome = (contexto.nome ?? "").toLowerCase().split(" ")[0];
  if (primeiroNome.length >= 4 && minuscula === primeiroNome) {
    return { ok: false, mensagem: "A senha não pode ser igual ao seu nome." };
  }

  return { ok: true };
}

/** Medidor simples para orientar o usuário no formulário. */
export function forcaSenha(senha: string): { nivel: number; rotulo: string; cor: string } {
  let pontos = 0;
  if (senha.length >= 8) pontos += 1;
  if (senha.length >= 12) pontos += 1;
  if (/[a-z]/.test(senha) && /[A-Z]/.test(senha)) pontos += 1;
  if (/\d/.test(senha)) pontos += 1;
  if (/[^A-Za-z0-9]/.test(senha)) pontos += 1;

  if (senha.length === 0) return { nivel: 0, rotulo: "—", cor: "bg-slate-200" };
  if (pontos <= 2) return { nivel: 1, rotulo: "Fraca", cor: "bg-rose-500" };
  if (pontos === 3) return { nivel: 2, rotulo: "Razoável", cor: "bg-amber-500" };
  if (pontos === 4) return { nivel: 3, rotulo: "Boa", cor: "bg-emerald-500" };
  return { nivel: 4, rotulo: "Forte", cor: "bg-emerald-600" };
}

const ALFABETO_MAIUSCULO = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // sem I e O (confusão visual)
const ALFABETO_MINUSCULO = "abcdefghijkmnopqrstuvwxyz"; // sem l e o
const DIGITOS = "23456789";
const SIMBOLOS = "@#$%&*!?";

/**
 * Gera uma senha temporária forte e legível, exibida uma única vez ao
 * administrador (o banco guarda apenas o hash).
 */
export function gerarSenhaTemporaria(tamanho = 12): string {
  const grupos = [ALFABETO_MAIUSCULO, ALFABETO_MINUSCULO, DIGITOS, SIMBOLOS];
  const bytes = new Uint8Array(tamanho);
  crypto.getRandomValues(bytes);

  const senha: string[] = [];
  // Garante ao menos um caractere de cada grupo (exigência da política).
  grupos.forEach((grupo, indice) => {
    senha.push(grupo[bytes[indice] % grupo.length]);
  });
  const todos = grupos.join("");
  for (let i = grupos.length; i < tamanho; i += 1) {
    senha.push(todos[bytes[i] % todos.length]);
  }
  // Embaralha para não deixar os grupos em posições previsíveis.
  for (let i = senha.length - 1; i > 0; i -= 1) {
    const j = bytes[i] % (i + 1);
    [senha[i], senha[j]] = [senha[j], senha[i]];
  }
  return senha.join("");
}
