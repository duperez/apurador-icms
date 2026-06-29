// Exportar/importar cadastros (regras + finalidades) e importar regras de planilha.
// Lógica pura, testável.
import type { RegraFinalidade, RegraST } from "./types";

export interface Cadastros {
  regras: RegraST[];
  finalidades: RegraFinalidade[];
}

// ---- backup completo (JSON) ----

export function exportarCadastros(regras: RegraST[], finalidades: RegraFinalidade[]): string {
  return JSON.stringify({ versao: 1, regras, finalidades }, null, 2);
}

export function importarCadastros(json: string): Cadastros {
  const obj = JSON.parse(json);
  if (!obj || typeof obj !== "object") throw new Error("Arquivo inválido");
  const regras = Array.isArray(obj.regras) ? (obj.regras as RegraST[]) : [];
  const finalidades = Array.isArray(obj.finalidades)
    ? (obj.finalidades as RegraFinalidade[])
    : [];
  return { regras, finalidades };
}

// ---- importação de regras por CSV (ex.: export da ECONET) ----

const parseNum = (s: string) => {
  const n = parseFloat(String(s).replace(",", "."));
  return Number.isNaN(n) ? 0 : n;
};
const parseBool = (s: string) =>
  ["s", "sim", "true", "1", "y", "yes"].includes(String(s).trim().toLowerCase());

// normaliza cabeçalho: minúsculo, decompõe acentos e remove tudo que não é a-z0-9
// (os acentos viram marcas combinantes no NFD e caem no strip final).
const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[^a-z0-9]/g, "");

/**
 * Lê um CSV de regras. Cabeçalho flexível; delimitador ; ou , (autodetectado).
 * Colunas reconhecidas: ncm, uf, eh_st (S/N), mva, aliq_interna, fcp_st.
 */
export function importarRegrasCsv(csv: string): RegraST[] {
  const linhas = csv.split(/\r?\n/).filter((l) => l.trim());
  if (linhas.length < 2) return [];

  const delim =
    (linhas[0].match(/;/g)?.length ?? 0) >= (linhas[0].match(/,/g)?.length ?? 0) ? ";" : ",";
  const head = linhas[0].split(delim).map(norm);
  const idx = (...nomes: string[]) => head.findIndex((h) => nomes.includes(h));

  const iNcm = idx("ncm");
  const iUf = idx("uf", "ufdest", "ufdestino");
  const iSt = idx("ehst", "est", "st");
  const iMva = idx("mva", "mvaoriginal");
  const iAliq = idx("aliqinterna", "aliquotainterna", "aliq", "aliquota");
  const iFcp = idx("fcp", "fcpst");

  return linhas
    .slice(1)
    .map((l) => {
      const c = l.split(delim);
      return {
        ncm: (c[iNcm] ?? "").trim(),
        uf: (c[iUf] ?? "").trim().toUpperCase(),
        ehSt: iSt >= 0 ? parseBool(c[iSt]) : false,
        mva: iMva >= 0 ? parseNum(c[iMva]) : 0,
        aliqInterna: iAliq >= 0 ? parseNum(c[iAliq]) : 0,
        fcpSt: iFcp >= 0 ? parseNum(c[iFcp]) : 0,
      } as RegraST;
    })
    .filter((r) => r.ncm);
}

/** Mescla regras novas nas atuais; mesma (NCM, UF) é sobrescrita pela nova. */
export function mesclarRegras(atual: RegraST[], novas: RegraST[]): RegraST[] {
  const mapa = new Map(atual.map((r) => [`${r.ncm}|${r.uf}`, r]));
  for (const n of novas) mapa.set(`${n.ncm}|${n.uf}`, n);
  return [...mapa.values()];
}
