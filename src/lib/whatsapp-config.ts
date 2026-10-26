import "server-only";
import { existsSync, readFileSync, writeFileSync, chmodSync, mkdirSync } from "node:fs";
import { join } from "node:path";

/** Variáveis de cada provedor, na ordem usada pelos formulários. */
export const CAMPOS_PROVEDOR: Record<string, { chave: string; label: string; dica: string }[]> = {
  zapi: [
    {
      chave: "ZAPI_INSTANCE",
      label: "Instance ID",
      dica: "Painel da Z-API → sua instância → “Instance ID” (sequência longa).",
    },
    {
      chave: "ZAPI_TOKEN",
      label: "Token da instância",
      dica: "Painel da Z-API → instância → “Token”.",
    },
    {
      chave: "ZAPI_CLIENT_TOKEN",
      label: "Client-Token (opcional)",
      dica: "Em Z-API → segurança da conta. Preencha se o painel exigir.",
    },
  ],
  meta: [
    { chave: "WHATSAPP_TOKEN", label: "Token de acesso (Meta)", dica: "Meta Business → WhatsApp → token permanente." },
    { chave: "WHATSAPP_PHONE_ID", label: "Phone number ID", dica: "Meta Business → número de telefone verificado." },
  ],
  evolution: [
    { chave: "EVOLUTION_URL", label: "URL do servidor", dica: "Ex.: https://evolution.suaescola.com.br" },
    { chave: "EVOLUTION_API_KEY", label: "API Key", dica: "Chave global da instância Evolution." },
    { chave: "EVOLUTION_INSTANCE", label: "Instância", dica: "Nome da instância conectada ao WhatsApp." },
  ],
  twilio: [
    { chave: "TWILIO_ACCOUNT_SID", label: "Account SID", dica: "Console Twilio → Account Info." },
    { chave: "TWILIO_AUTH_TOKEN", label: "Auth Token", dica: "Console Twilio → Account Info." },
    { chave: "TWILIO_WHATSAPP_FROM", label: "Número remetente", dica: "Ex.: +14155238886" },
  ],
};

const PROVEDORES_VALIDOS = Object.keys(CAMPOS_PROVEDOR);

const ARQUIVO = () => join(process.cwd(), "config", "producao.json");

/** Lê a configuração gravada no arquivo (sem expor segredos). */
export function lerConfiguracao(): Record<string, string> {
  try {
    const bruto = readFileSync(ARQUIVO(), "utf8");
    return JSON.parse(bruto) as Record<string, string>;
  } catch {
    return {};
  }
}

/**
 * Grava as credenciais do provedor no arquivo de produção **e** no ambiente do
 * processo. O arquivo garante persistência após reinícios; o ambiente ativa na
 * hora, sem precisar reiniciar o servidor.
 */
export function salvarProvedor(provedor: string, valores: Record<string, string>) {
  if (!PROVEDORES_VALIDOS.includes(provedor)) {
    throw new Error("Provedor inválido.");
  }

  const campos = CAMPOS_PROVEDOR[provedor];
  const limpos: Record<string, string> = {};
  for (const campo of campos) {
    const valor = (valores[campo.chave] ?? "").trim();
    if (valor) limpos[campo.chave] = valor;
  }

  const config = lerConfiguracao();
  // Remove credenciais de outros provedores para não haver conflito.
  for (const lista of Object.values(CAMPOS_PROVEDOR)) {
    for (const campo of lista) delete config[campo.chave];
  }
  delete config.WHATSAPP_PROVIDER;

  const nova = {
    ...config,
    WHATSAPP_PROVIDER: provedor,
    ...limpos,
  };

  mkdirSync(join(process.cwd(), "config"), { recursive: true });
  writeFileSync(ARQUIVO(), JSON.stringify(nova, null, 2) + "\n", "utf8");
  try {
    chmodSync(ARQUIVO(), 0o600);
  } catch {
    /* Windows */
  }

  // Aplica imediatamente no processo atual.
  for (const lista of Object.values(CAMPOS_PROVEDOR)) {
    for (const campo of lista) delete process.env[campo.chave];
  }
  process.env.WHATSAPP_PROVIDER = provedor;
  for (const [chave, valor] of Object.entries(limpos)) process.env[chave] = valor;

  return limpos;
}

/** Remove qualquer provedor configurado (volta ao envio por link). */
export function removerProvedor() {
  const config = lerConfiguracao();
  for (const lista of Object.values(CAMPOS_PROVEDOR)) {
    for (const campo of lista) {
      delete config[campo.chave];
      delete process.env[campo.chave];
    }
  }
  delete config.WHATSAPP_PROVIDER;
  delete process.env.WHATSAPP_PROVIDER;

  writeFileSync(ARQUIVO(), JSON.stringify(config, null, 2) + "\n", "utf8");
  try {
    chmodSync(ARQUIVO(), 0o600);
  } catch {
    /* Windows */
  }
}

export function arquivoExiste(): boolean {
  return existsSync(ARQUIVO());
}

/**
 * Consulta o status real do provedor para validar as credenciais antes de
 * ativar. Devolve mensagem clara em caso de falha.
 */
export async function validarCredenciais(
  provedor: string,
  valores: Record<string, string>,
): Promise<{ ok: boolean; conectado?: boolean; mensagem: string }> {
  try {
    if (provedor === "zapi") {
      const instance = valores.ZAPI_INSTANCE ?? "";
      const token = valores.ZAPI_TOKEN ?? "";
      const clientToken = valores.ZAPI_CLIENT_TOKEN;
      if (!instance || !token) {
        return { ok: false, mensagem: "Informe o Instance ID e o Token da Z-API." };
      }

      const resposta = await fetch(
        `https://api.z-api.io/instances/${encodeURIComponent(instance)}/token/${encodeURIComponent(token)}/status`,
        {
          headers: {
            "Content-Type": "application/json",
            ...(clientToken ? { "Client-Token": clientToken } : {}),
          },
          signal: AbortSignal.timeout(20000),
        },
      );

      const dados = (await resposta.json().catch(() => ({}))) as {
        connected?: boolean;
        value?: string;
        error?: string;
        message?: string;
      };

      if (!resposta.ok) {
        const detalhe = dados.error ?? dados.message ?? `HTTP ${resposta.status}`;
        return {
          ok: false,
          mensagem: /instance not found|not found/i.test(detalhe)
            ? "Instance ID ou Token inválidos (a Z-API respondeu “Instance not found”). Confira no painel."
            : `A Z-API recusou a validação: ${detalhe}`,
        };
      }

      const conectado = dados.connected === true || dados.value === "connected";
      return {
        ok: true,
        conectado,
        mensagem: conectado
          ? "Credenciais válidas e WhatsApp conectado."
          : "Credenciais válidas, mas o WhatsApp ainda não está conectado. No painel da Z-API, escaneie o QR Code com o celular da escola.",
      };
    }

    if (provedor === "meta") {
      const token = valores.WHATSAPP_TOKEN ?? "";
      const phoneId = valores.WHATSAPP_PHONE_ID ?? "";
      if (!token || !phoneId) {
        return { ok: false, mensagem: "Informe o token e o Phone number ID." };
      }
      const resposta = await fetch(
        `https://graph.facebook.com/v21.0/${encodeURIComponent(phoneId)}?fields=display_phone_number,verified_name`,
        { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(20000) },
      );
      const dados = (await resposta.json().catch(() => ({}))) as {
        error?: { message?: string };
        display_phone_number?: string;
      };
      if (!resposta.ok) {
        return {
          ok: false,
          mensagem: dados.error?.message ?? `Meta recusou a validação (HTTP ${resposta.status}).`,
        };
      }
      return {
        ok: true,
        conectado: true,
        mensagem: `Número validado: ${dados.display_phone_number ?? phoneId}.`,
      };
    }

    if (provedor === "evolution") {
      const base = (valores.EVOLUTION_URL ?? "").replace(/\/+$/, "");
      const apiKey = valores.EVOLUTION_API_KEY ?? "";
      const instance = valores.EVOLUTION_INSTANCE ?? "";
      if (!base || !apiKey || !instance) {
        return { ok: false, mensagem: "Informe URL, API Key e instância." };
      }
      const resposta = await fetch(
        `${base}/instance/connectionState/${encodeURIComponent(instance)}`,
        { headers: { apikey: apiKey }, signal: AbortSignal.timeout(20000) },
      );
      const dados = (await resposta.json().catch(() => ({}))) as {
        instance?: { state?: string };
        message?: string;
      };
      if (!resposta.ok) {
        return { ok: false, mensagem: dados.message ?? `Evolution recusou (HTTP ${resposta.status}).` };
      }
      const estado = dados.instance?.state;
      return {
        ok: true,
        conectado: estado === "open",
        mensagem:
          estado === "open"
            ? "Instância conectada."
            : `Credenciais válidas, mas o estado é “${estado ?? "desconhecido"}”. Conecte por QR Code.`,
      };
    }

    if (provedor === "twilio") {
      const sid = valores.TWILIO_ACCOUNT_SID ?? "";
      const token = valores.TWILIO_AUTH_TOKEN ?? "";
      if (!sid || !token) return { ok: false, mensagem: "Informe Account SID e Auth Token." };
      const resposta = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}.json`,
        {
          headers: { Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}` },
          signal: AbortSignal.timeout(20000),
        },
      );
      if (!resposta.ok) {
        return { ok: false, mensagem: `Twilio recusou as credenciais (HTTP ${resposta.status}).` };
      }
      return { ok: true, conectado: true, mensagem: "Conta Twilio validada." };
    }

    return { ok: false, mensagem: "Provedor não suportado." };
  } catch (erro) {
    return {
      ok: false,
      mensagem:
        erro instanceof Error
          ? `Não foi possível contatar o provedor: ${erro.message}`
          : "Falha de comunicação com o provedor.",
    };
  }
}
