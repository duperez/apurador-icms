// Conferência da ST destacada pelo fornecedor.
//
// 100% autônomo: usa só o XML que já foi carregado + (opcionalmente) os seus
// cadastros de regra. Não conecta com nada externo.
//
// São três checagens, da mais confiável para a que depende dos seus parâmetros:
//   1. ARITMÉTICA  — o fornecedor multiplicou certo? vICMSST == vBCST*pICMSST - vICMS.
//                    Sempre confiável (usa só números da própria nota).
//   2. BASE        — vBCST == base * (1 + pMVAST)? Pega base montada errada (ex: esqueceu frete).
//   3. PARÂMETRO   — o MVA/alíquota usados batem com a sua regra cadastrada?
//                    Só vale quando você já calibrou os parâmetros.
import type { ItemNota, RegraST } from "./types";
import { indexRegras, stRetidaOrigem } from "./engine";

const round2 = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100;
const TOL = 0.02; // tolerância de 2 centavos para arredondamento

export type StatusConferencia =
  | "OK"
  | "OK_SEM_REGRA"
  | "ERRO_CALCULO"
  | "PARAM_DIVERGENTE";

export interface ConferenciaST {
  item: ItemNota;
  // valores declarados na nota
  baseDeclarada: number;
  stDeclarada: number;
  mvaFornecedor: number;
  aliqFornecedor: number;
  // recálculo aritmético (com os parâmetros do próprio fornecedor)
  stRecalc: number;
  divergenciaCalc: number; // declarada - recalculada
  baseRecalc: number;
  divergenciaBase: number;
  // comparação com a sua regra (quando existe)
  mvaRegra: number | null;
  aliqRegra: number | null;
  status: StatusConferencia;
  mensagem: string;
}

/** Confere um item que veio com ST retida na origem. */
export function conferirItem(it: ItemNota, regra: RegraST | undefined): ConferenciaST {
  const base = round2(it.vProd + it.vIPI + it.vFrete + it.vSeg + it.vOutro - it.vDesc);
  // os campos pMVAST/pICMSST/vBCST não estão em ItemNota; vêm do recálculo possível.
  // Reconstruímos a partir do que temos: vICMSST, vICMS e a alíquota/MVA destacados.
  const mvaForn = it.pMVAST;
  const aliqForn = it.pICMSST;
  const baseDeclarada = it.vBCST;
  const stDeclarada = it.vICMSST;

  // 1) aritmética: ST esperada com os parâmetros do próprio fornecedor
  const stRecalc = round2(Math.max((baseDeclarada * aliqForn) / 100 - it.vICMS, 0));
  const divergenciaCalc = round2(stDeclarada - stRecalc);

  // 2) base: vBCST esperado a partir da base da operação e do MVA destacado
  const baseRecalc = round2(base * (1 + mvaForn / 100));
  const divergenciaBase = round2(baseDeclarada - baseRecalc);

  const mvaRegra = regra?.ehSt ? regra.mva : null;
  const aliqRegra = regra?.ehSt ? regra.aliqInterna : null;

  let status: StatusConferencia;
  let mensagem: string;

  if (Math.abs(divergenciaCalc) > TOL) {
    status = "ERRO_CALCULO";
    const sinal = divergenciaCalc > 0 ? "a mais" : "a menos";
    mensagem = `Fornecedor destacou ${stDeclarada.toFixed(2)}; pela própria base/alíquota dele daria ${stRecalc.toFixed(2)} (${Math.abs(divergenciaCalc).toFixed(2)} ${sinal}).`;
  } else if (
    mvaRegra != null &&
    aliqRegra != null &&
    (Math.abs(mvaForn - mvaRegra) > 0.01 || Math.abs(aliqForn - aliqRegra) > 0.01)
  ) {
    status = "PARAM_DIVERGENTE";
    const partes: string[] = [];
    if (Math.abs(mvaForn - mvaRegra) > 0.01)
      partes.push(`MVA ${mvaForn}% vs sua regra ${mvaRegra}%`);
    if (Math.abs(aliqForn - aliqRegra) > 0.01)
      partes.push(`alíquota ${aliqForn}% vs sua regra ${aliqRegra}%`);
    mensagem = `Conta fecha, mas com parâmetro diferente do seu cadastro: ${partes.join("; ")}.`;
  } else if (mvaRegra == null) {
    status = "OK_SEM_REGRA";
    mensagem = "Aritmética confere. Sem regra cadastrada para comparar MVA/alíquota.";
  } else {
    status = "OK";
    mensagem = "ST destacada confere com o cálculo e com a sua regra.";
  }

  return {
    item: it,
    baseDeclarada,
    stDeclarada,
    mvaFornecedor: mvaForn,
    aliqFornecedor: aliqForn,
    stRecalc,
    divergenciaCalc,
    baseRecalc,
    divergenciaBase,
    mvaRegra,
    aliqRegra,
    status,
    mensagem,
  };
}

/** Confere todos os itens da lista que vieram com ST retida. */
export function conferir(itens: ItemNota[], regras: RegraST[]): ConferenciaST[] {
  const ri = indexRegras(regras);
  return itens
    .filter((it) => stRetidaOrigem(it) && it.vICMSST > 0)
    .map((it) => conferirItem(it, ri.get(`${it.ncm}|${it.ufDest}`)));
}
