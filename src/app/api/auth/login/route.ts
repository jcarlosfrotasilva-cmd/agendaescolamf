import type { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { usuarios } from "@/db/schema";
import { badRequest, json, serverError } from "@/lib/api";
import {
  buscarUsuarioPorEmail,
  contarUsuarios,
  criarSessao,
  gerarHashSenha,
  papelInfo,
  verificarSenha,
} from "@/lib/auth";
import { registrarAuditoria } from "@/lib/repo";
import { configuracaoAusente } from "@/db";
import { validarSenhaForte } from "@/lib/senha";
import { explicarErroBanco } from "@/lib/db-diagnostico";

export const dynamic = "force-dynamic";

/**
 * Login da equipe de gestão. Quando ainda não existe nenhum usuário, este
 * endpoint também cria o primeiro administrador (instalação nova).
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      email?: string;
      senha?: string;
      nome?: string;
      primeiroAcesso?: boolean;
    };

    if (configuracaoAusente) {
      return json(
        {
          ok: false,
          codigo: "SEM_CONFIGURACAO",
          error:
            "O sistema ainda não está conectado ao banco de dados. Rode no terminal do projeto: " +
            'node scripts/configurar-banco.mjs "postgresql://..." usando a connection string do ' +
            "Supabase (porta 6543) e reinicie o servidor.",
          diagnostico: "/diagnostico",
        },
        { status: 503 },
      );
    }

    const email = (body.email ?? "").trim().toLowerCase();
    const senha = body.senha ?? "";

    if (!email || !/\S+@\S+\.\S+/.test(email)) return badRequest("Informe um e-mail válido.");

    const existentes = await contarUsuarios();

    // ---------- Instalação nova: cria o primeiro administrador ----------
    if (existentes === 0) {
      if (!body.primeiroAcesso) {
        return badRequest(
          "Nenhum usuário cadastrado. Confirme a criação do primeiro administrador.",
        );
      }
      const nome = (body.nome ?? "").trim();
      if (nome.length < 3) return badRequest("Informe o nome completo do administrador.");

      const politica = validarSenhaForte(senha, { email, nome });
      if (!politica.ok) return badRequest(politica.mensagem);

      const [criado] = await db
        .insert(usuarios)
        .values({
          nome,
          email,
          senhaHash: gerarHashSenha(senha),
          papel: "ADMIN",
          cargo: "DIRETOR",
        })
        .returning();

      await registrarAuditoria({
        entidade: "usuario",
        entidadeId: criado?.id ?? null,
        acao: "PRIMEIRO_ACESSO",
        detalhe: `Administrador(a) ${nome} criado(a) no primeiro acesso do sistema.`,
      });

      if (!criado) return serverError("Não foi possível criar o administrador.");
      await criarSessao(criado);
      return json({
        ok: true,
        criado: true,
        usuario: { nome: criado.nome, email: criado.email, papel: criado.papel },
      });
    }

    // ---------- Login normal ----------
    // Uma oscilação de rede com o Supabase não deve impedir o acesso:
    // tentamos novamente antes de reportar indisponibilidade.
    let usuario = null;
    for (let tentativa = 1; tentativa <= 3; tentativa += 1) {
      try {
        usuario = await buscarUsuarioPorEmail(email);
        break;
      } catch (erro) {
        const mensagem = erro instanceof Error ? erro.message : String(erro);
        const transitorio = /ECONNRESET|ETIMEDOUT|Connection terminated|timeout|EHOSTUNREACH|socket/i.test(
          mensagem,
        );
        if (!transitorio || tentativa === 3) throw erro;
        await new Promise((resolver) => setTimeout(resolver, 250 * tentativa));
      }
    }
    if (!usuario || !usuario.ativo || !verificarSenha(senha, usuario.senhaHash)) {
      await registrarAuditoria({
        entidade: "usuario",
        entidadeId: usuario?.id ?? null,
        acao: "LOGIN_FALHA",
        detalhe: `Tentativa de acesso não autorizada para ${email}.`,
      });
      return json(
        {
          ok: false,
          codigo: "CREDENCIAIS",
          error:
            "E-mail ou senha incorretos. Verifique maiúsculas, minúsculas e acentos. " +
            "Se necessário, peça a um administrador para redefinir sua senha em Usuários e Acessos.",
        },
        { status: 401 },
      );
    }

    // A sessão é criada primeiro: se um registro acessório falhar, o acesso já vale.
    await criarSessao(usuario);

    try {
      await db
        .update(usuarios)
        .set({ ultimoAcesso: new Date() })
        .where(eq(usuarios.id, usuario.id));
    } catch (erro) {
      console.warn(
        "[login] último acesso não atualizado:",
        erro instanceof Error ? erro.message : erro,
      );
    }

    await registrarAuditoria({
      entidade: "usuario",
      entidadeId: usuario.id,
      acao: "LOGIN",
      detalhe: `Acesso autorizado — ${usuario.nome} (${papelInfo(usuario.papel).label}).`,
    });

    return json({
      ok: true,
      criado: false,
      destino: usuario.papel === "PROFESSOR" ? "/minha-agenda" : "/",
      usuario: {
        nome: usuario.nome,
        email: usuario.email,
        papel: usuario.papel,
        professorId: usuario.professorId ?? null,
      },
    });
  } catch (error) {
    const explicacao = explicarErroBanco(error);
    console.error("POST /api/auth/login", explicacao.codigo ?? "", error);

    // Falha de infraestrutura: responde 503 com orientação, nunca um 500 opaco.
    return json(
      {
        ok: false,
        error:
          "Não foi possível validar o acesso agora: o banco de dados não respondeu. " +
          explicacao.dica,
        codigo: explicacao.codigo ?? "BANCO_INDISPONIVEL",
        diagnostico: "/diagnostico",
      },
      { status: 503 },
    );
  }
}
