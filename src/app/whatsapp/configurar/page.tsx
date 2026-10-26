import Link from "next/link";
import { redirect } from "next/navigation";
import { ConfigurarWhatsApp } from "@/components/ConfigurarWhatsApp";
import { CopyBlock } from "@/components/CopyBlock";
import { Card } from "@/components/ui";
import { getSessao } from "@/lib/auth";
import { descricaoProvedorAtivo, provedorAtivo, PROVEDORES } from "@/lib/whatsapp";
import { CAMPOS_PROVEDOR, lerConfiguracao } from "@/lib/whatsapp-config";

export const dynamic = "force-dynamic";

/**
 * CONFIGURAÇÃO DO ENVIO AUTOMÁTICO DE WHATSAPP
 * Tela guiada: escolher provedor → colar dados → validar → testar.
 * Funciona sem terminal e sem editar arquivos.
 */
export default async function ConfigurarWhatsAppPage() {
  const sessao = await getSessao();
  if (!sessao) redirect("/entrar");

  const config = lerConfiguracao();
  const provedores = PROVEDORES.map((p) => ({
    key: p.key,
    label: p.label,
    descricao: p.descricao,
    variaveis: p.variaveis as string[],
    campos: CAMPOS_PROVEDOR[p.key] ?? [],
    preenchidos: (CAMPOS_PROVEDOR[p.key] ?? [])
      .filter((c) => Boolean(config[c.chave] || process.env[c.chave]))
      .map((c) => c.chave),
  }));

  const ativo = provedorAtivo();

  return (
    <div className="space-y-5">
      <nav className="text-[11px] text-slate-500">
        <Link href="/" className="hover:text-indigo-600">
          Painel
        </Link>{" "}
        /{" "}
        <Link href="/mensagens" className="hover:text-indigo-600">
          Mensagens WhatsApp
        </Link>{" "}
        / <span className="font-semibold text-slate-700">Configurar envio automático</span>
      </nav>

      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#128C7E]">
          Integração WhatsApp
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
          Ativar o envio automático
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">
          Escolha o provedor, cole os dados e clique em validar. O sistema testa a conexão antes de
          salvar — se algo estiver errado, nada é alterado. A configuração fica gravada no servidor.
        </p>
      </header>

      <div className="grid gap-5 xl:grid-cols-[1.35fr_1fr]">
        <Card className="p-5">
          <ConfigurarWhatsApp
            provedores={provedores}
            ativoAtual={ativo}
            descricaoAtual={descricaoProvedorAtivo()}
            podeEditar={sessao.papel === "ADMIN"}
          />
        </Card>

        <div className="space-y-5">
          <Card className="p-5">
            <h2 className="text-sm font-semibold text-slate-900">
              Caminho mais rápido: Z-API
            </h2>
            <ol className="mt-3 space-y-2 text-[11px] leading-relaxed text-slate-600">
              <li>
                <strong>1.</strong> Acesse <strong>z-api.io</strong> e crie a conta (há teste gratuito).
              </li>
              <li>
                <strong>2.</strong> No painel, crie uma <strong>instância</strong>. Ela fornece
                <em> Instance ID</em> e <em>Token</em>.
              </li>
              <li>
                <strong>3.</strong> Escaneie o <strong>QR Code</strong> com o WhatsApp da escola
                (Aparelhos conectados → Conectar aparelho).
              </li>
              <li>
                <strong>4.</strong> Copie o <em>Instance ID</em> e o <em>Token</em> e cole aqui ao
                lado. Clique em <strong>Validar e ativar</strong>.
              </li>
              <li>
                <strong>5.</strong> Envie uma <strong>mensagem de teste</strong> para o seu celular.
              </li>
            </ol>
            <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-[11px] leading-relaxed text-emerald-900 ring-1 ring-emerald-200">
              <strong>Não precisa reiniciar o servidor:</strong> ao validar, o envio automático passa a
              funcionar imediatamente.
            </p>
          </Card>

          <Card className="p-5">
            <h2 className="text-sm font-semibold text-slate-900">Depois de ativar</h2>
            <p className="mt-2 text-[11px] leading-relaxed text-slate-600">
              Agende a rota abaixo em um serviço de cron (cron-job.org, Google Cloud Scheduler,
              GitHub Actions ou <code>pg_cron</code> do Supabase) a cada <strong>5 minutos</strong>.
              Ela é o que dispara os <strong>lembretes do despertador</strong> no horário, mesmo com o
              navegador fechado.
            </p>
            <div className="mt-3">
              <CopyBlock
                titulo="rota do agendador (cron)"
                linhas={2}
                conteudo={`https://SEU_DOMINIO/api/whatsapp/automatico?somente=todos&secret=SEU_CRON_SECRET\n# para conferir sem enviar: ...&simulacao=true`}
              />
            </div>
            <p className="mt-2 text-[11px] text-slate-500">
              Sem o cron, os <strong>convites</strong> ao agendar continuam sendo enviados na hora; só
              os <strong>lembretes</strong> dependem do agendador.
            </p>
          </Card>

          <Card className="p-5">
            <h2 className="text-sm font-semibold text-slate-900">O que passa a ser automático</h2>
            <ul className="mt-2 space-y-1.5 text-[11px] text-slate-600">
              <li>• 📩 Convite da reunião/formação (ao salvar o compromisso)</li>
              <li>• ⏰ Lembrete na antecedência do despertador</li>
              <li>• 🔁 Aviso de alteração após edição</li>
              <li>• 👩‍🏫 Aviso individual aos professores convocados</li>
            </ul>
            <p className="mt-3 border-t border-slate-100 pt-2 text-[11px] text-slate-500">
              O <strong>despertador na tela</strong> continua funcionando de forma independente, mesmo
              sem provedor configurado.
            </p>
            <Link
              href="/mensagens"
              className="mt-3 inline-block text-xs font-semibold text-indigo-600 hover:text-indigo-700"
            >
              Ir para o histórico de mensagens →
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
