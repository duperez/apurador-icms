// Caches iniciais do app — começam VAZIOS de propósito.
//
// Nenhum valor fiscal (MVA, alíquota, "é ST?") vem pré-preenchido: esses dados
// dependem do estado/NCM e devem ser cadastrados pelo usuário a partir da fonte
// oficial (ex.: ECONET). Assim o app nunca apresenta número fabricado como se
// fosse verdade. Os campos exibem dicas (placeholder), não valores salvos.
import type { RegraFinalidade, RegraST } from "./types";

export const REGRAS_PADRAO: RegraST[] = [];
export const FINALIDADES_PADRAO: RegraFinalidade[] = [];
