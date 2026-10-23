import "server-only";
import { buscarUsuarioPorEmail, exigirEdicao, gerarHashSenha } from "./auth";
import { registrarAuditoria } from "./repo";

/**
 * Reexporta utilidades usadas pelo endpoint de acesso do professor.
 * Centraliza imports para manter a rota enxuta.
 */
export { buscarUsuarioPorEmail, exigirEdicao, gerarHashSenha };
export const registrarAuditoriaOk = registrarAuditoria;
