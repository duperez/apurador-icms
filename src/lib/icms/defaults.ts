// Seeds dos dois caches — valores de EXEMPLO (validar com a ECONET).
// Na versão com Supabase isto sai daqui e vira dado por escritório.
import type { RegraFinalidade, RegraST } from "./types";

export const REGRAS_PADRAO: RegraST[] = [
  { ncm: "40115000", uf: "PR", ehSt: true, mva: 45, aliqInterna: 19.5 },
  { ncm: "87116000", uf: "PR", ehSt: true, mva: 46.18, aliqInterna: 19.5 },
  { ncm: "87149490", uf: "PR", ehSt: false, mva: 0, aliqInterna: 19.5 },
  { ncm: "87149990", uf: "PR", ehSt: false, mva: 0, aliqInterna: 19.5 },
  { ncm: "82055900", uf: "PR", ehSt: false, mva: 0, aliqInterna: 19.5 },
  { ncm: "76130000", uf: "PR", ehSt: false, mva: 0, aliqInterna: 19.5 },
  { ncm: "65061090", uf: "PR", ehSt: false, mva: 0, aliqInterna: 19.5 },
  { ncm: "61179000", uf: "PR", ehSt: false, mva: 0, aliqInterna: 19.5 },
];

// Começa vazio: cada escritório cadastra as finalidades dos seus próprios clientes.
export const FINALIDADES_PADRAO: RegraFinalidade[] = [];
