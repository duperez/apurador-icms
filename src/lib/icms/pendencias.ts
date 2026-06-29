// Fila de pendências de NCM.
//
// Autônomo: a partir da apuração, junta os itens que ficaram sem regra
// (galho FALTA_REGRA) numa lista de trabalho — "esses NCMs precisam ser
// classificados". Reconecta com a ideia de gestão de tarefas, mas amarrada
// ao trabalho fiscal real.
import type { Apuracao } from "./types";

export interface Pendencia {
  ncm: string;
  uf: string;
  qtdItens: number;
  qtdNotas: number;
  produtoExemplo: string;
  clientes: string[];
}

/** Agrupa os itens FALTA_REGRA por NCM/UF de destino. */
export function pendenciasNCM(aps: Apuracao[]): Pendencia[] {
  const mapa = new Map<
    string,
    { ncm: string; uf: string; itens: Apuracao[]; notas: Set<string>; clientes: Set<string> }
  >();

  for (const a of aps) {
    if (a.galho !== "FALTA_REGRA") continue;
    const chave = `${a.ncm}|${a.ufDest}`;
    let g = mapa.get(chave);
    if (!g) {
      g = { ncm: a.ncm, uf: a.ufDest, itens: [], notas: new Set(), clientes: new Set() };
      mapa.set(chave, g);
    }
    g.itens.push(a);
    g.notas.add(a.nNF);
    if (a.dest) g.clientes.add(a.dest);
  }

  return [...mapa.values()]
    .map((g) => ({
      ncm: g.ncm,
      uf: g.uf,
      qtdItens: g.itens.length,
      qtdNotas: g.notas.size,
      produtoExemplo: g.itens[0]?.produto ?? "",
      clientes: [...g.clientes],
    }))
    .sort((a, b) => b.qtdItens - a.qtdItens);
}
