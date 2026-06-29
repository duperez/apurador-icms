// Leitura do XML da NF-e (modelo 55) -> lista de ItemNota.
// Camada determinística: só extrai e tria o que está no XML; não decide imposto.
import { XMLParser } from "fast-xml-parser";
import type { ItemNota } from "./types";

const CUF: Record<string, string> = {
  "11": "RO", "12": "AC", "13": "AM", "14": "RR", "15": "PA", "16": "AP",
  "17": "TO", "21": "MA", "22": "PI", "23": "CE", "24": "RN", "25": "PB",
  "26": "PE", "27": "AL", "28": "SE", "29": "BA", "31": "MG", "32": "ES",
  "33": "RJ", "35": "SP", "41": "PR", "42": "SC", "43": "RS", "50": "MS",
  "51": "MT", "52": "GO", "53": "DF",
};

// parseTagValue:false -> mantém tudo como string. Importante: senão "00" (CST)
// e NCMs com zero à esquerda viram número e perdem dígitos.
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  parseTagValue: false,
  trimValues: true,
});

// fast-xml-parser devolve objeto único quando há 1 ocorrência e array quando há N.
function toArray<T>(v: T | T[] | undefined): T[] {
  if (v === undefined || v === null) return [];
  return Array.isArray(v) ? v : [v];
}

const str = (v: unknown): string => (v === undefined || v === null ? "" : String(v).trim());
const num = (v: unknown): number => {
  const n = parseFloat(str(v));
  return Number.isNaN(n) ? 0 : n;
};

// Pega o "miolo" de <ICMS> (ICMS00, ICMS10, ICMSSN101, ...) — só há uma chave.
function icmsInner(imposto: Record<string, unknown> | undefined): Record<string, unknown> {
  const icms = imposto?.ICMS as Record<string, unknown> | undefined;
  if (!icms) return {};
  const first = Object.values(icms)[0];
  return (first && typeof first === "object" ? first : {}) as Record<string, unknown>;
}

// vIPI fica em IPI > IPITrib > vIPI (quando o item é tributado por IPI).
function ipiValor(imposto: Record<string, unknown> | undefined): number {
  const ipi = imposto?.IPI as Record<string, unknown> | undefined;
  const trib = ipi?.IPITrib as Record<string, unknown> | undefined;
  return num(trib?.vIPI);
}

export function parseNFe(xmlText: string, arquivo = ""): ItemNota[] {
  const root = parser.parse(xmlText) as Record<string, any>;
  const nfeProc = root.nfeProc ?? root;
  const nfe = nfeProc.NFe ?? nfeProc;
  const inf = nfe.infNFe;
  if (!inf) return [];

  const ide = inf.ide ?? {};
  const emit = inf.emit ?? {};
  const dest = inf.dest ?? {};

  const nNF = str(ide.nNF);
  const dhEmi = str(ide.dhEmi).slice(0, 10);
  const ufOrig = str(emit.enderEmit?.UF) || CUF[str(ide.cUF)] || "";
  const emitNome = str(emit.xNome);
  const ufDest = str(dest.enderDest?.UF);
  const destNome = str(dest.xNome);
  const destCnpj = str(dest.CNPJ);

  return toArray<Record<string, any>>(inf.det).map((det) => {
    const prod = det.prod ?? {};
    const imposto = det.imposto ?? {};
    const icms = icmsInner(imposto);

    return {
      arquivo,
      nNF,
      dhEmi,
      emit: emitNome,
      ufOrig,
      dest: destNome,
      destCnpj,
      ufDest,
      item: str(det["@_nItem"]),
      ncm: str(prod.NCM),
      cest: str(prod.CEST),
      cfop: str(prod.CFOP),
      produto: str(prod.xProd),
      vProd: num(prod.vProd),
      vFrete: num(prod.vFrete),
      vSeg: num(prod.vSeg),
      vOutro: num(prod.vOutro),
      vDesc: num(prod.vDesc),
      vIPI: ipiValor(imposto),
      cst: str(icms.CST) || str(icms.CSOSN),
      pICMS: num(icms.pICMS),
      vICMS: num(icms.vICMS),
      pMVAST: num(icms.pMVAST),
      pICMSST: num(icms.pICMSST),
      vBCST: num(icms.vBCST),
      vICMSST: num(icms.vICMSST),
    };
  });
}
