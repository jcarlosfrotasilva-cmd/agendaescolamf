import type { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { usuarios } from "@/db/schema";
import { badRequest, json, notFound, serverError } from "@/lib/api";
import { buscarUsuario, exigirSessao, gerarHashSenha, podeAdministrar } from "@/lib/auth";
import { registrarAuditoria } from "@/lib/repo";
import { gerarSenhaTemporaria } from "@/lib/senha";

export const dynamic = "force-dynamic";

/**
 * Gera uma senha temporária forte para um usuário e a devolve UMA ÚNICA VEZ
 * ao administrador (o banco guarda apenas o hash scrypt).
 * O usuário deve trocá-la em "Minha senha" após o primeiro acesso.
 */
export async function POST(request: NextRequest) {
  try {
    const sessao = await exigirSessao();
    if (!podeAdministrar(sessao.papel)) {
      return json(
        { ok: false, error: "Apenas administradores podem redefinir senhas." },
        { status: 403 },
      );
    }

    const body = (await request.json()) as { id?: number };
    const id = Number(body.id);
    if (!Number.isFinite(id) || id <= 0) return badRequest("Identificador inválido");

    const usuario = await buscarUsuario(id);
    if (!usuario) return notFound("Usuário não encontrado");

    const senhaTemporaria = gerarSenhaTemporaria(12);

    await db
      .update(usuarios)
      .set({ senhaHash: gerarHashSenha(senhaTemporaria), ativo: true })
      .where(eq(usuarios.id, id));

    await registrarAuditoria({
      entidade: "usuario",
      entidadeId: id,
      acao: "SENHA_TEMPORARIA",
      detalhe: `${sessao.nome} gerou senha temporária para ${usuario.email}.`,
    });

    return json({
      ok: true,
      email: usuario.email,
      nome: usuario.nome,
      senhaTemporaria,
      aviso:
        "Esta senha é exibida uma única vez. Envie ao usuário por um canal seguro e oriente a troca em Minha senha.",
    });
  } catch (error) {
    if (error instanceof Error && error.message === "NAO_AUTENTICADO") {
      return json({ ok: false, error: "Sessão expirada. Faça login novamente." }, { status: 401 });
    }
    console.error("POST /api/usuarios/senha-temporaria", error);
    return serverError();
  }
}
