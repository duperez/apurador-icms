// Motor de apuração. Domínio puro, testável, sem dependência de UI/banco.
//
// Galho de decisão por item:
//   ST já retida na origem?  -> nada a recolher
//   senão, finalidade?
//      consumo/ativo -> DIFAL (diferença de alíquota)
//      revenda       -> é ST no destino? sim -> ST antecipada (MVA ajustada)
//                                          não -> antecipação parcial
//
// ATENÇÃO: as fórmulas seguem o livro-texto. A correção dos VALORES depende
// dos MVAs/alíquotas cadastrados nas regras. Validar com apuração real.
import type {
  Apuracao,
  Finalidade,
  ItemNota,
  Passo,
  RegraFinalidade,
  RegraST,
} from "./types";

const round2 = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100;

/** Índices para lookup rápido a partir das listas de regras. */
export function indexRegras(regras: RegraST[]): Map<string, RegraST> {
  return new Map(regras.map((r) => [`${r.ncm}|${r.uf}`, r]));
}
export function indexFinalidades(fins: RegraFinalidade[]): Map<string, Finalidade> {
  return new Map(fins.map((f) => [`${f.cnpj}|${f.ncm}`, f.finalidade]));
}

/** MVA ajustada — usada quando a alíquota interestadual difere da interna do destino. */
export function mvaAjustada(mva: number, aliqInter: number, aliqInterna: number): number {
  if (aliqInterna >= 100) return mva;
  return ((1 + mva / 100) * (1 - aliqInter / 100)) / (1 - aliqInterna / 100) * 100 - 100;
}

/** ST já recolhida na origem (destacada na nota) ou em fase anterior. */
export function stRetidaOrigem(it: ItemNota): boolean {
  return (
    it.vICMSST > 0 ||
    ["10", "30", "70"].includes(it.cst) ||
    ["60", "500"].includes(it.cst)
  );
}

export function apurarItem(
  it: ItemNota,
  regras: Map<string, RegraST>,
  fins: Map<string, Finalidade>
): Apuracao {
  const base = round2(it.vProd + it.vIPI + it.vFrete + it.vSeg + it.vOutro - it.vDesc);
  const aliqInter = it.pICMS;
  const out: Apuracao = {
    ...it,
    base,
    finalidade: "",
    galho: "FALTA_REGRA",
    valor: null,
    detalhe: "",
    memoria: [],
  };

  const passoBase: Passo = {
    rotulo: "Base da operação",
    detalhe: `vProd ${it.vProd.toFixed(2)} + IPI ${it.vIPI.toFixed(2)} + frete ${it.vFrete.toFixed(2)} + seg ${it.vSeg.toFixed(2)} + outras ${it.vOutro.toFixed(2)} − desc ${it.vDesc.toFixed(2)}`,
    valor: base,
  };

  // 1) ST já retida -> nada a recolher
  if (stRetidaOrigem(it)) {
    out.galho = "ST_JA_RECOLHIDA";
    out.valor = 0;
    out.detalhe = "Fornecedor já recolheu a ST";
    out.memoria = [
      { rotulo: "ST destacada na nota", detalhe: "informada pelo fornecedor", valor: it.vICMSST },
      { rotulo: "A recolher na entrada", detalhe: "ST já recolhida na origem", valor: 0 },
    ];
    return out;
  }

  // 2) finalidade (Cache 2); default revenda com aviso
  let fin = fins.get(`${it.destCnpj}|${it.ncm}`);
  if (!fin) {
    fin = "revenda";
    out.detalhe = "finalidade não cadastrada → assumido revenda";
  }
  out.finalidade = fin;

  const regra = regras.get(`${it.ncm}|${it.ufDest}`);

  // 3) consumo/ativo -> DIFAL
  if (fin === "consumo" || fin === "ativo") {
    if (!regra) {
      out.detalhe = `sem alíquota interna p/ ${it.ncm}/${it.ufDest}`;
      out.memoria = [passoBase, { rotulo: "Pendente", detalhe: out.detalhe, valor: 0 }];
      return out;
    }
    const difal = round2(Math.max((base * (regra.aliqInterna - aliqInter)) / 100, 0));
    const fcp = regra.fcpSt ?? 0;
    const fcpValor = fcp > 0 ? round2((base * fcp) / 100) : 0;
    out.galho = "DIFAL";
    out.valor = round2(difal + fcpValor);
    out.detalhe = `DIFAL ${regra.aliqInterna}–${aliqInter}%${fcp > 0 ? ` + FCP ${fcp}%` : ""}`;
    out.memoria = [
      passoBase,
      { rotulo: "Alíquota interna do destino", valor: regra.aliqInterna, unidade: "percent" },
      { rotulo: "Alíquota interestadual (nota)", valor: aliqInter, unidade: "percent" },
      ...(fcp > 0
        ? [{ rotulo: `FCP (${fcp}%)`, detalhe: `base × ${fcp}%`, valor: fcpValor }]
        : []),
      {
        rotulo: "DIFAL a recolher",
        detalhe: `base × (${regra.aliqInterna}% − ${aliqInter}%)`,
        valor: out.valor,
      },
    ];
    return out;
  }

  // 4) revenda -> depende da regra de ST
  if (!regra) {
    out.detalhe = `NCM ${it.ncm}/${it.ufDest} não está nas regras`;
    out.memoria = [passoBase, { rotulo: "Pendente", detalhe: out.detalhe, valor: 0 }];
    return out;
  }
  const fcp = regra.fcpSt ?? 0;
  if (regra.ehSt) {
    const mvaAj = mvaAjustada(regra.mva, aliqInter, regra.aliqInterna);
    const baseSt = base * (1 + mvaAj / 100);
    const icmsInterno = (baseSt * regra.aliqInterna) / 100;
    const st = round2(Math.max(icmsInterno - it.vICMS, 0));
    const fcpValor = fcp > 0 ? round2((baseSt * fcp) / 100) : 0;
    out.galho = "ST_ANTECIPADA";
    out.valor = round2(st + fcpValor);
    out.detalhe = `MVA ${regra.mva}% (aj ${mvaAj.toFixed(1)}%) − crédito ${it.vICMS.toFixed(2)}${fcp > 0 ? ` + FCP ${fcp}%` : ""}`;
    out.memoria = [
      passoBase,
      { rotulo: "MVA original", valor: regra.mva, unidade: "percent" },
      {
        rotulo: "MVA ajustada",
        detalhe: `ajuste pela alíq. interestadual ${aliqInter}%`,
        valor: round2(mvaAj),
        unidade: "percent",
      },
      { rotulo: "Base de cálculo da ST", detalhe: "base × (1 + MVA ajustada)", valor: round2(baseSt) },
      {
        rotulo: `ICMS interno (${regra.aliqInterna}%)`,
        detalhe: `base ST × ${regra.aliqInterna}%`,
        valor: round2(icmsInterno),
      },
      { rotulo: "(−) Crédito da operação própria", detalhe: "ICMS destacado na nota", valor: -it.vICMS },
      ...(fcp > 0
        ? [{ rotulo: `FCP-ST (${fcp}%)`, detalhe: `base ST × ${fcp}%`, valor: fcpValor }]
        : []),
      { rotulo: "ST antecipada a recolher", valor: out.valor },
    ];
  } else {
    const antecip = round2(Math.max((base * (regra.aliqInterna - aliqInter)) / 100, 0));
    const fcpValor = fcp > 0 ? round2((base * fcp) / 100) : 0;
    out.galho = "ANTECIPACAO_PARCIAL";
    out.valor = round2(antecip + fcpValor);
    out.detalhe = `antecip. parcial ${regra.aliqInterna}–${aliqInter}%${fcp > 0 ? ` + FCP ${fcp}%` : ""}`;
    out.memoria = [
      passoBase,
      { rotulo: "Alíquota interna do destino", valor: regra.aliqInterna, unidade: "percent" },
      { rotulo: "Alíquota interestadual (nota)", valor: aliqInter, unidade: "percent" },
      ...(fcp > 0
        ? [{ rotulo: `FCP (${fcp}%)`, detalhe: `base × ${fcp}%`, valor: fcpValor }]
        : []),
      {
        rotulo: "Antecipação parcial a recolher",
        detalhe: `base × (${regra.aliqInterna}% − ${aliqInter}%)`,
        valor: out.valor,
      },
    ];
  }
  return out;
}

/** Apura uma lista de itens de uma vez. */
export function apurar(
  itens: ItemNota[],
  regras: RegraST[],
  fins: RegraFinalidade[]
): Apuracao[] {
  const ri = indexRegras(regras);
  const fi = indexFinalidades(fins);
  return itens.map((it) => apurarItem(it, ri, fi));
}

/** Soma o total a recolher (ignora itens sem valor). */
export function totalARecolher(aps: Apuracao[]): number {
  return round2(aps.reduce((s, a) => s + (a.valor ?? 0), 0));
}
