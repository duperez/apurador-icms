// Formatação e exportação — usado só na UI.
import type { Apuracao, Galho } from "./types";
import type { StatusConferencia } from "./conferencia";

export const money = (v: number | null) =>
  v == null ? "—" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const numBR = (v: number) =>
  v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Rótulo + classe de cor (Tailwind) por galho. */
export const BADGE: Record<Galho, { label: string; cls: string }> = {
  ST_JA_RECOLHIDA: { label: "ST já recolhida", cls: "bg-slate-100 text-slate-600" },
  ST_ANTECIPADA: { label: "ST antecipada", cls: "bg-amber-100 text-amber-700" },
  ANTECIPACAO_PARCIAL: { label: "Antecip. parcial", cls: "bg-blue-100 text-blue-700" },
  DIFAL: { label: "DIFAL", cls: "bg-violet-100 text-violet-700" },
  FALTA_REGRA: { label: "Falta regra", cls: "bg-red-100 text-red-700" },
};

export const BADGE_CONF: Record<StatusConferencia, { label: string; cls: string }> = {
  OK: { label: "Confere", cls: "bg-green-100 text-green-700" },
  OK_SEM_REGRA: { label: "Confere (s/ regra)", cls: "bg-slate-100 text-slate-600" },
  ERRO_CALCULO: { label: "Erro de cálculo", cls: "bg-red-100 text-red-700" },
  PARAM_DIVERGENTE: { label: "Parâmetro divergente", cls: "bg-amber-100 text-amber-700" },
};

export function toCsv(aps: Apuracao[]): string {
  const cols: (keyof Apuracao)[] = [
    "nNF", "ufOrig", "ufDest", "dest", "ncm", "cest", "produto",
    "finalidade", "galho", "base", "pICMS", "valor", "detalhe",
  ];
  const head = [
    "NF", "UF orig", "UF dest", "Cliente", "NCM", "CEST", "Produto",
    "Finalidade", "Tratamento", "Base", "% ICMS", "A recolher", "Detalhe",
  ];
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [
    head.join(";"),
    ...aps.map((r) => cols.map((c) => esc(r[c])).join(";")),
  ].join("\n");
}
