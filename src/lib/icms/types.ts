// Tipos do domínio de apuração de ICMS ST / antecipação / DIFAL na entrada.
// Este arquivo não importa nada de React/Next — é domínio puro.

/** Um item de uma nota de entrada, já extraído do XML. */
export interface ItemNota {
  arquivo: string;
  nNF: string;
  dhEmi: string;
  emit: string;
  ufOrig: string;
  dest: string;
  destCnpj: string;
  ufDest: string;
  item: string;
  ncm: string;
  cest: string;
  cfop: string;
  produto: string;
  vProd: number;
  vFrete: number;
  vSeg: number;
  vOutro: number;
  vDesc: number;
  vIPI: number;
  cst: string;
  pICMS: number;
  vICMS: number;
  // ST destacada pelo fornecedor (presente quando a ST veio retida)
  pMVAST: number;
  pICMSST: number;
  vBCST: number;
  vICMSST: number;
}

/** Cache 1 — regra fiscal por NCM/UF de destino. Fonte: ECONET. */
export interface RegraST {
  ncm: string;
  uf: string;
  ehSt: boolean;
  mva: number;
  aliqInterna: number;
}

export type Finalidade = "revenda" | "consumo" | "ativo";

/** Cache 2 — finalidade por (cliente, NCM). Fonte: contadora. */
export interface RegraFinalidade {
  cnpj: string;
  ncm: string;
  finalidade: Finalidade;
}

/** Galho de cálculo escolhido para o item. */
export type Galho =
  | "ST_JA_RECOLHIDA"
  | "ST_ANTECIPADA"
  | "ANTECIPACAO_PARCIAL"
  | "DIFAL"
  | "FALTA_REGRA";

/** Um passo da memória de cálculo (para auditoria/validação). */
export interface Passo {
  rotulo: string;
  detalhe?: string;
  valor: number;
  unidade?: "moeda" | "percent";
}

/** Resultado da apuração de um item. */
export interface Apuracao extends ItemNota {
  base: number;
  finalidade: Finalidade | "";
  galho: Galho;
  /** Valor a recolher; null quando faltou dado (FALTA_REGRA). */
  valor: number | null;
  detalhe: string;
  /** Memória de cálculo: como chegamos no valor, passo a passo. */
  memoria: Passo[];
}
