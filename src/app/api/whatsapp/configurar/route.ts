import type { NextRequest } from "next/server";
import { badRequest, json, serverError } from "@/lib/api";
import { exigirAdministracao, getSessao } from "@/lib/auth";
import { registrarAuditoria } from "@/lib/repo";
import { descricaoProvedorAtivo, provedorAtivo, PROVEDORES } from "@/lib/whatsapp";
import {
  CAMPOS_PROVEDOR,
  lerConfiguracao,
  removerProvedor,
  salvarProvedor,
  validarCredenciais,
} from "@/lib/whatsapp-config";

export const dynamic = "force-dynamic";

/** Situação atual da integração (sem revelar segredos). */
export async function GET() {
  try {
    const sessao = await getSessao();
    if (!sessao) {
      return json({ ok: false, error: "Sessão expirada." }, { status: 401 });
    }

    const ativo = provedorAtivo();
    const config = lerConfiguracao();
    const preenchidos = Object.fromEntries(
      Object.entries(CAMPOS_PROVEDOR).map(([provedor, campos]) => [
        provedor,
        campos
          .filter((c) => Boolean(config[c.chave] || process.env[c.chave]))
          .map((c) => c.chave),
      ]),
    );

    return json({
      ok: true,
      ativo,
      descricao: descricaoProvedorAtivo(),
      provedores: PROVEDORES.map((p) => ({
        key: p.key,
        label: p.label,
        descricao: p.descricao,
        variaveis: p.variaveis,
        campos: CAMPOS_PROVEDOR[p.key] ?? [],
        preenchidos: preenchidos[p.key] ?? [],
      })),
      podeEditar: sessao.papel === "ADMIN",
    });
  } catch (error) {
    console.error("GET /api/whatsapp/configurar", error);
    return serverError();
  }
}

/** Valida as credenciais no provedor e ativa o envio automático. */
export async function POST(request: NextRequest) {
  try {
    const permissao = await exigirAdministracao();
    if (permissao instanceof Response) return permissao;

    const body = (await request.json()) as {
      provedor?: string;
      valores?: Record<string, string>;
    };

    const provedor = (body.provedor ?? "").trim().toLowerCase();
    if (!CAMPOS_PROVEDOR[provedor]) return badRequest("Provedor inválido.");

    const valores = body.valores ?? {};
    const obrigatorios = CAMPOS_PROVEDOR[provedor].filter(
      (c) => !/opcional|\(opcional\)/i.test(c.label),
    );
    const faltando = obrigatorios.filter((c) => !(valores[c.chave] ?? "").trim());
    if (faltando.length > 0) {
      return badRequest(`Preencha: ${faltando.map((c) => c.label).join(", ")}.`);
    }

    const validacao = await validarCredenciais(provedor, valores);
    if (!validacao.ok) {
      return json(
        { ok: false, etapa: "validacao", error: validacao.mensagem },
        { status: 400 },
      );
    }

    salvarProvedor(provedor, valores);

    await registrarAuditoria({
      entidade: "whatsapp",
      entidadeId: null,
      acao: "PROVEDOR_CONFIGURADO",
      detalhe: `${permissao.nome} configurou o provedor ${provedor} para envio automático de WhatsApp.`,
    });

    return json({
      ok: true,
      provedor,
      conectado: validacao.conectado ?? true,
      mensagem: validacao.mensagem,
      descricao: descricaoProvedorAtivo(),
      ativoAgora: provedorAtivo(),
    });
  } catch (error) {
    console.error("POST /api/whatsapp/configurar", error);
    return serverError(
      error instanceof Error ? error.message : "Não foi possível salvar a configuração.",
    );
  }
}

/** Desativa o envio automático e volta ao link manual. */
export async function DELETE() {
  try {
    const permissao = await exigirAdministracao();
    if (permissao instanceof Response) return permissao;

    removerProvedor();
    await registrarAuditoria({
      entidade: "whatsapp",
      entidadeId: null,
      acao: "PROVEDOR_REMOVIDO",
      detalhe: `${permissao.nome} desativou o envio automático de WhatsApp.`,
    });

    return json({ ok: true, mensagem: "Envio automático desativado. O sistema voltou ao link manual." });
  } catch (error) {
    console.error("DELETE /api/whatsapp/configurar", error);
    return serverError();
  }
}
