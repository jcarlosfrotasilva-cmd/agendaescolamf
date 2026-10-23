import type { NextRequest } from "next/server";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { professores, usuarios } from "@/db/schema";
import { badRequest, json, notFound, serverError } from "@/lib/api";
import {
  buscarUsuarioPorEmail,
  exigirEdicao,
  gerarHashSenha,
  registrarAuditoriaOk,
} from "@/lib/acesso-professor";
import { validarSenhaForte, gerarSenhaTemporaria } from "@/lib/senha";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

async function idFrom(ctx: Ctx) {
  const { id } = await ctx.params;
  const numero = Number(id);
  return Number.isFinite(numero) && numero > 0 ? numero : null;
}

/** Situação do acesso de um professor (se já tem login criado). */
export async function GET(_request: NextRequest, ctx: Ctx) {
  try {
    const permissao = await exigirEdicao();
    if (permissao instanceof Response) return permissao;

    const id = await idFrom(ctx);
    if (!id) return badRequest("Identificador inválido");

    const linhas = await db
      .select({
        usuarioId: usuarios.id,
        email: usuarios.email,
        ativo: usuarios.ativo,
        ultimoAcesso: usuarios.ultimoAcesso,
      })
      .from(usuarios)
      .where(eq(usuarios.professorId, id))
      .limit(1);

    return json({ ok: true, acesso: linhas[0] ?? null });
  } catch (error) {
    console.error("GET /api/professores/[id]/acesso", error);
    return serverError();
  }
}

/**
 * Cria ou atualiza o LOGIN do professor (e-mail + senha).
 * Sem senha informada, gera uma temporária forte e devolve uma única vez.
 */
export async function POST(request: NextRequest, ctx: Ctx) {
  try {
    const permissao = await exigirEdicao();
    if (permissao instanceof Response) return permissao;

    const id = await idFrom(ctx);
    if (!id) return badRequest("Identificador inválido");

    const linhas = await db.select().from(professores).where(eq(professores.id, id)).limit(1);
    const professor = linhas[0];
    if (!professor) return notFound("Professor não encontrado");

    const body = (await request.json().catch(() => ({}))) as {
      email?: string;
      senha?: string;
      redefinir?: boolean;
    };

    const email = (body.email?.trim() || professor.email?.trim() || "").toLowerCase();
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      return badRequest(
        "Informe o e-mail de acesso do professor (ou cadastre o e-mail no perfil dele).",
      );
    }

    // Um e-mail não pode pertencer a dois usuários — nem a um da gestão.
    const emUso = await buscarUsuarioPorEmail(email);
    const usuarioAtual = (
      await db.select().from(usuarios).where(eq(usuarios.professorId, id)).limit(1)
    )[0];

    if (emUso && emUso.id !== usuarioAtual?.id) {
      return badRequest(
        "Este e-mail já está em uso por outro usuário do sistema. Use um e-mail diferente.",
      );
    }

    const senhaInformada = body.senha?.trim() ?? "";
    const senha = senhaInformada || gerarSenhaTemporaria(12);
    const politica = validarSenhaForte(senha, { email, nome: professor.nome });
    if (!politica.ok) return badRequest(politica.mensagem);

    let usuarioId: number;
    let criou = false;

    if (usuarioAtual) {
      // Atualiza o acesso existente (e-mail, senha, reativação).
      const [atualizado] = await db
        .update(usuarios)
        .set({
          nome: professor.nome,
          email,
          senhaHash: gerarHashSenha(senha),
          papel: "PROFESSOR",
          professorId: id,
          ativo: true,
        })
        .where(eq(usuarios.id, usuarioAtual.id))
        .returning();
      usuarioId = atualizado.id;
      if (email !== professor.email) {
        await db.update(professores).set({ email }).where(eq(professores.id, id));
      }
    } else {
      const [criado] = await db
        .insert(usuarios)
        .values({
          nome: professor.nome,
          email,
          senhaHash: gerarHashSenha(senha),
          papel: "PROFESSOR",
          professorId: id,
          ativo: true,
        })
        .returning();
      usuarioId = criado.id;
      criou = true;
      if (email !== professor.email) {
        await db.update(professores).set({ email }).where(eq(professores.id, id));
      }
    }

    // Desktop de segurança: nenhum outro usuário pode herdar este professor.
    await db
      .update(usuarios)
      .set({ professorId: null })
      .where(and(eq(usuarios.professorId, id), ne(usuarios.id, usuarioId)));

    await registrarAuditoriaOk({
      entidade: "usuario",
      entidadeId: usuarioId,
      acao: criou ? "ACESSO_PROFESSOR_CRIADO" : "ACESSO_PROFESSOR_ATUALIZADO",
      detalhe: `Login de acesso ${criou ? "criado" : "atualizado"} para o(a) professor(a) ${professor.nome} (${email}).`,
    });

    return json({
      ok: true,
      criou,
      usuarioId,
      email,
      senhaTemporaria: senhaInformada ? null : senha,
      nome: professor.nome,
      mensagem: senhaInformada
        ? "Acesso atualizado com a senha informada."
        : "Acesso criado. Envie a senha temporária ao professor — ela é exibida uma única vez.",
    });
  } catch (error) {
    console.error("POST /api/professores/[id]/acesso", error);
    return serverError();
  }
}

/** Remove o acesso do professor (o cadastro do professor permanece). */
export async function DELETE(_request: NextRequest, ctx: Ctx) {
  try {
    const permissao = await exigirEdicao();
    if (permissao instanceof Response) return permissao;

    const id = await idFrom(ctx);
    if (!id) return badRequest("Identificador inválido");

    const linhas = await db.select().from(usuarios).where(eq(usuarios.professorId, id)).limit(1);
    const usuario = linhas[0];
    if (!usuario) return notFound("Este professor ainda não possui acesso de login.");

    await db.delete(usuarios).where(eq(usuarios.id, usuario.id));
    await registrarAuditoriaOk({
      entidade: "usuario",
      entidadeId: usuario.id,
      acao: "ACESSO_PROFESSOR_REMOVIDO",
      detalhe: `Login de ${usuario.email} removido (professor sem acesso ao sistema).`,
    });

    return json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/professores/[id]/acesso", error);
    return serverError();
  }
}
