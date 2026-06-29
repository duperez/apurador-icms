// Resumo por cliente + competência (mês de referência).
//
// Autônomo: consolida a apuração no formato que ela usa para "fechar o mês".
// É também a base dos valores que alimentam a DeSTDA (ST, antecipação e DIFAL
// por contribuinte e por período).
import type { Apuracao } from "./types";

const round2 = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100;

export interface GrupoCliente {
  cnpj: string;
  cliente: string;
  competencia: string; // "05/2026"
  competenciaSort: string; // "2026-05"
  qtdNotas: number;
  qtdItens: number;
  stAntecipada: number;
  antecipacaoParcial: number;
  difal: number;
  total: number;
}

function competenciaDe(dhEmi: string): { display: string; sort: string } {
  const [ano, mes] = (dhEmi || "").split("-");
  if (!ano || !mes) return { display: "—", sort: "0000-00" };
  return { display: `${mes}/${ano}`, sort: `${ano}-${mes}` };
}

export function resumoPorCliente(aps: Apuracao[]): GrupoCliente[] {
  const mapa = new Map<string, GrupoCliente & { notas: Set<string> }>();

  for (const a of aps) {
    const comp = competenciaDe(a.dhEmi);
    const chave = `${a.destCnpj}|${comp.sort}`;
    let g = mapa.get(chave);
    if (!g) {
      g = {
        cnpj: a.destCnpj,
        cliente: a.dest,
        competencia: comp.display,
        competenciaSort: comp.sort,
        qtdNotas: 0,
        qtdItens: 0,
        stAntecipada: 0,
        antecipacaoParcial: 0,
        difal: 0,
        total: 0,
        notas: new Set(),
      };
      mapa.set(chave, g);
    }
    g.qtdItens++;
    g.notas.add(a.nNF);
    const v = a.valor ?? 0;
    if (a.galho === "ST_ANTECIPADA") g.stAntecipada += v;
    else if (a.galho === "ANTECIPACAO_PARCIAL") g.antecipacaoParcial += v;
    else if (a.galho === "DIFAL") g.difal += v;
    g.total += v;
  }

  return [...mapa.values()]
    .map((g) => ({
      cnpj: g.cnpj,
      cliente: g.cliente,
      competencia: g.competencia,
      competenciaSort: g.competenciaSort,
      qtdNotas: g.notas.size,
      qtdItens: g.qtdItens,
      stAntecipada: round2(g.stAntecipada),
      antecipacaoParcial: round2(g.antecipacaoParcial),
      difal: round2(g.difal),
      total: round2(g.total),
    }))
    .sort(
      (a, b) =>
        a.cliente.localeCompare(b.cliente) ||
        a.competenciaSort.localeCompare(b.competenciaSort)
    );
}

/** CSV do resumo — pode servir de base para a conferência da DeSTDA. */
export function resumoToCsv(grupos: GrupoCliente[]): string {
  const head = [
    "Cliente", "CNPJ", "Competencia", "Notas", "Itens",
    "ST/Antecipada", "Antecipacao parcial", "DIFAL", "Total a recolher",
  ];
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [
    head.join(";"),
    ...grupos.map((g) =>
      [g.cliente, g.cnpj, g.competencia, g.qtdNotas, g.qtdItens,
        g.stAntecipada, g.antecipacaoParcial, g.difal, g.total]
        .map(esc).join(";")
    ),
  ].join("\n");
}
