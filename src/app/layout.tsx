import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AlarmCenter } from "@/components/AlarmCenter";
import { ScriptTema } from "@/components/SeletorTema";
import { Shell } from "@/components/Shell";
import { getSessao } from "@/lib/auth";
import { ESCOLA } from "@/lib/escola";
import "./globals.css";

export const metadata: Metadata = {
  title: `${ESCOLA.nome} | Agenda de Compromissos da Gestão Escolar`,
  description:
    `Sistema de agendamento de compromissos da gestão escolar da ${ESCOLA.nomeCompleto}: ` +
    "direção, vice-direção, coordenação de gestão pedagógica geral e gerência de organização escolar, " +
    "com despertador de compromissos, organização por cargo, data e local e consulta online externa.",
  applicationName: "Agenda da Gestão Escolar",
  robots: { index: false, follow: false },
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const sessao = await getSessao();
  return (
    <html lang="pt-BR" data-tema="nevoa" suppressHydrationWarning>
      <head>
        <ScriptTema />
      </head>
      <body className="antialiased">
        {sessao ? (
          <>
            <Shell
              usuario={{ nome: sessao.nome, email: sessao.email, papel: sessao.papel }}
            >
              {children}
            </Shell>
            <AlarmCenter />
          </>
        ) : (
          // Telas públicas (acesso, diagnóstico, configuração) sem barra lateral.
          children
        )}
      </body>
    </html>
  );
}
