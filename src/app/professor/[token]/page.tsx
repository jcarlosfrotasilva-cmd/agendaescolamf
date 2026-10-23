import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/**
 * ACESSO POR LINK DESATIVADO
 * Cada professor agora possui login próprio (e-mail + senha), criado pela
 * gestão em Professores → "🔑 Criar acesso". A antiga URL de link pessoal
 * redireciona para a tela de login.
 */
export default async function AcessoPorLinkPage() {
  redirect("/entrar");
}
