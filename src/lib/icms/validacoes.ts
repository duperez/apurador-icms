// Validações/alertas do XML — autônomo, só olha os itens lidos.
// Pega inconsistências do fornecedor antes de virarem erro de apuração.
import type { ItemNota } from "./types";

export type NivelAlerta = "erro" | "aviso";

export interface Alerta {
  nivel: NivelAlerta;
  titulo: string;
  detalhe: string;
}

export function validar(itens: ItemNota[]): Alerta[] {
  const alertas: Alerta[] = [];

  // 1) Mesmo NCM com CEST preenchido em uns itens e ausente em outros.
  //    (caso clássico: fornecedor esquece o CEST em parte dos itens do mesmo produto)
  const porNcm = new Map<string, { comCest: number; semCest: number }>();
  for (const it of itens) {
    if (!it.ncm) continue;
    const g = porNcm.get(it.ncm) ?? { comCest: 0, semCest: 0 };
    if (it.cest) g.comCest++;
    else g.semCest++;
    porNcm.set(it.ncm, g);
  }
  for (const [ncm, g] of porNcm) {
    if (g.comCest > 0 && g.semCest > 0) {
      alertas.push({
        nivel: "aviso",
        titulo: `NCM ${ncm}: CEST inconsistente`,
        detalhe: `Tem CEST em ${g.comCest} item(ns) e falta em ${g.semCest}. Se o produto é ST, todos deveriam ter CEST — verifique a classificação.`,
      });
    }
  }

  // 2) Item sem NCM.
  const semNcm = itens.filter((it) => !it.ncm).length;
  if (semNcm > 0) {
    alertas.push({
      nivel: "erro",
      titulo: "Item sem NCM",
      detalhe: `${semNcm} item(ns) sem NCM — impossível classificar.`,
    });
  }

  // 3) ST destacada mas CST incompatível (esperado 10/30/70).
  for (const it of itens) {
    if (it.vICMSST > 0 && !["10", "30", "70"].includes(it.cst)) {
      alertas.push({
        nivel: "aviso",
        titulo: `NF ${it.nNF}, item ${it.item}: ST destacada com CST ${it.cst}`,
        detalhe: `Veio ICMS-ST (R$ ${it.vICMSST.toFixed(2)}) mas o CST ${it.cst} não é de ST retida (10/30/70). Conferir.`,
      });
    }
  }

  return alertas;
}
