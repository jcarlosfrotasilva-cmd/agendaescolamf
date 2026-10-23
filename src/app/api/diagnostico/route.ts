import { diagnosticarBanco } from "@/lib/db-diagnostico";
import { ESCOLA } from "@/lib/escola";

export const dynamic = "force-dynamic";

/**
 * Diagnóstico público e somente-leitura da conexão com o banco.
 * Não expõe credenciais — apenas host, provedor e orientações.
 * Serve para conferir a instalação quando o login falha.
 */
export async function GET() {
  const banco = await diagnosticarBanco();
  return Response.json(
    {
      ok: banco.conectado && banco.schemaPronto,
      escola: ESCOLA.nome,
      banco,
      recomendacoes: banco.conectado && banco.schemaPronto ? [] : recomendacoesDe(banco),
      verificadoEm: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

function recomendacoesDe(banco: Awaited<ReturnType<typeof diagnosticarBanco>>): string[] {
  const lista: string[] = [];
  if (!banco.conectado) {
    lista.push(
      "Confirme a variável SUPABASE_DB_URL (porta 6543 do pooler) em config/producao.json ou .env.local.",
    );
    if (banco.dica) lista.push(banco.dica);
    return lista;
  }
  if (!banco.schemaPronto) {
    lista.push(
      "Execute supabase/schema.sql no SQL Editor do Supabase para criar as tabelas que faltam: " +
        banco.tabelasFaltando.join(", ") +
        ".",
    );
    lista.push("Alternativa por linha de comando: SUPABASE_DB_URL=... npx drizzle-kit push");
  }
  if (banco.schemaPronto && banco.usuarios === 0) {
    lista.push(
      "Nenhum usuário cadastrado: abra /entrar para criar o primeiro administrador da escola.",
    );
  }
  return lista;
}
