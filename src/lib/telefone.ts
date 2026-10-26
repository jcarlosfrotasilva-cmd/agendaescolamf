/**
 * VALIDAÇÃO DE TELEFONE (compartilhada entre navegador e servidor)
 *
 * Regras para o Brasil:
 *  • DDD entre 11 e 99
 *  • celular: 9 dígitos começando por 9 → total 11 (DDD + 9)
 *  • fixo: 8 dígitos começando por 2 a 5 → total 10 (DDD + 8)
 *  • aceita "+55", "55", "0" inicial e máscaras — mas NUNCA “adivinha”:
 *    número com quantidade errada de dígitos é recusado com explicação.
 *
 * Números de outros países só são aceitos com "+" explícito (ex.: +1 555…),
 * evitando que um DDD brasileiro seja confundido com código de país.
 */
export type AnaliseTelefone =
  | {
      ok: true;
      /** Somente dígitos, no formato E.164 sem "+" (ex.: 5516997626715). */
      numero: string;
      /** Apresentação amigável (ex.: +55 (16) 99762-6715). */
      formatado: string;
      internacional: boolean;
      tipo: "celular" | "fixo" | "internacional";
    }
  | { ok: false; motivo: string; digitos: string };

const DDDS_VALIDOS = new Set([
  11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 24, 27, 28, 31, 32, 33, 34, 35, 37, 38, 41, 42, 43,
  44, 45, 46, 47, 48, 49, 51, 53, 54, 55, 61, 62, 63, 64, 65, 66, 67, 68, 69, 71, 73, 74, 75, 77,
  79, 81, 82, 83, 84, 85, 86, 87, 88, 89, 91, 92, 93, 94, 95, 96, 97, 98, 99,
]);

function formatarBr(digitos: string): string {
  const ddd = digitos.slice(2, 4);
  const resto = digitos.slice(4);
  const meio = resto.length === 9 ? resto.slice(0, 5) : resto.slice(0, 4);
  const fim = resto.length === 9 ? resto.slice(5) : resto.slice(4);
  return `+55 (${ddd}) ${meio}-${fim}`;
}

export function analisarTelefone(valor: string | null | undefined): AnaliseTelefone {
  const bruto = (valor ?? "").trim();
  if (!bruto) {
    return { ok: false, motivo: "Telefone não informado.", digitos: "" };
  }

  const temMais = bruto.startsWith("+");
  const digitosBrutos = bruto.replace(/\D/g, "");

  if (!digitosBrutos) {
    return { ok: false, motivo: "O telefone não contém números.", digitos: "" };
  }
  if (digitosBrutos.length > 15) {
    return {
      ok: false,
      motivo: `Telefone com ${digitosBrutos.length} dígitos — mais que o máximo internacional (15).`,
      digitos: digitosBrutos,
    };
  }

  // ---------- Internacional explícito ----------
  if (temMais && !digitosBrutos.startsWith("55")) {
    if (digitosBrutos.length < 8) {
      return {
        ok: false,
        motivo: "Número internacional incompleto. Inclua o código do país e o número.",
        digitos: digitosBrutos,
      };
    }
    return {
      ok: true,
      numero: digitosBrutos,
      formatado: `+${digitosBrutos}`,
      internacional: true,
      tipo: "internacional",
    };
  }

  // ---------- Brasil ----------
  let d = digitosBrutos;
  while (d.startsWith("0")) d = d.slice(1);

  if (d.startsWith("55") && (d.length === 12 || d.length === 13)) {
    d = d.slice(2);
  }

  if (d.length !== 10 && d.length !== 11) {
    return {
      ok: false,
      motivo:
        `Telefone com ${d.length} dígito(s) após o DDD — o correto é 8 (fixo) ou 9 (celular). ` +
        "Exemplo: (16) 99762-6715. Confira se não há dígito a mais ou a menos.",
      digitos: d,
    };
  }

  const ddd = Number(d.slice(0, 2));
  if (!DDDS_VALIDOS.has(ddd)) {
    return {
      ok: false,
      motivo: `DDD ${d.slice(0, 2)} não existe. Informe um DDD válido (ex.: 16, 11, 69).`,
      digitos: d,
    };
  }

  const assinante = d.slice(2);
  const primeiro = assinante[0];

  if (assinante.length === 9 && primeiro !== "9") {
    return {
      ok: false,
      motivo:
        "Celular brasileiro deve ter 9 dígitos começando por 9 (ex.: 99762-6715). " +
        "Verifique se não faltou ou sobrou um dígito.",
      digitos: d,
    };
  }
  if (assinante.length === 8 && !/[2-5]/.test(primeiro)) {
    return {
      ok: false,
      motivo: "Telefone fixo deve começar por 2, 3, 4 ou 5 após o DDD.",
      digitos: d,
    };
  }

  const numero = `55${d}`;
  return {
    ok: true,
    numero,
    formatado: formatarBr(numero),
    internacional: false,
    tipo: assinante.length === 9 ? "celular" : "fixo",
  };
}

/** Atalho: devolve o número E.164 (sem "+") ou null quando inválido. */
export function normalizarTelefone(valor: string | null | undefined): string | null {
  const analise = analisarTelefone(valor);
  return analise.ok ? analise.numero : null;
}

/** Link direto do WhatsApp — null quando o telefone é inválido. */
export function linkWhatsApp(telefone: string | null | undefined, mensagem: string): string | null {
  const numero = normalizarTelefone(telefone);
  if (!numero) return null;
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
}

/** Apresentação amigável; devolve o valor original quando não for possível formatar. */
export function telefoneFormatado(valor: string | null | undefined): string {
  const analise = analisarTelefone(valor);
  if (analise.ok) return analise.formatado;
  const bruto = (valor ?? "").trim();
  return bruto || "sem telefone";
}
