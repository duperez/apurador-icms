"use client";

import { Fragment, useMemo, useRef, useState } from "react";
import { parseNFe } from "@/lib/icms/parser";
import { apurar, totalARecolher } from "@/lib/icms/engine";
import { conferir } from "@/lib/icms/conferencia";
import { pendenciasNCM } from "@/lib/icms/pendencias";
import { resumoPorCliente, resumoToCsv } from "@/lib/icms/resumo";
import { BADGE, BADGE_CONF, money, numBR, toCsv } from "@/lib/icms/format";
import { FINALIDADES_PADRAO, REGRAS_PADRAO } from "@/lib/icms/defaults";
import { useLocalStorage } from "@/lib/useLocalStorage";
import type { Finalidade, ItemNota, RegraFinalidade, RegraST } from "@/lib/icms/types";

type Arquivo = { nome: string; itens: ItemNota[] };
type Aba =
  | "apuracao"
  | "conferencia"
  | "pendencias"
  | "cliente"
  | "regras"
  | "finalidades"
  | "ajuda";

export default function Home() {
  const [aba, setAba] = useState<Aba>("apuracao");
  const [arquivos, setArquivos] = useState<Arquivo[]>([]);
  const [regras, setRegras] = useLocalStorage<RegraST[]>("regras_st", REGRAS_PADRAO);
  const [fins, setFins] = useLocalStorage<RegraFinalidade[]>("finalidades", FINALIDADES_PADRAO);
  const inputRef = useRef<HTMLInputElement>(null);
  const [aberto, setAberto] = useState<number | null>(null);

  const itens = useMemo(() => arquivos.flatMap((a) => a.itens), [arquivos]);
  const aps = useMemo(() => apurar(itens, regras, fins), [itens, regras, fins]);
  const total = totalARecolher(aps);

  const porGalho = useMemo(() => {
    const m: Record<string, number> = {};
    for (const a of aps) m[a.galho] = (m[a.galho] ?? 0) + (a.valor ?? 0);
    return m;
  }, [aps]);
  const semRegra = aps.filter((a) => a.valor == null).length;

  // conferência da ST destacada pelo fornecedor (autônomo)
  const confs = useMemo(() => conferir(itens, regras), [itens, regras]);
  const confProblemas = confs.filter(
    (c) => c.status === "ERRO_CALCULO" || c.status === "PARAM_DIVERGENTE"
  ).length;

  // fila de pendências de NCM (itens sem regra)
  const pend = useMemo(() => pendenciasNCM(aps), [aps]);

  // resumo por cliente/competência (base da DeSTDA)
  const resumo = useMemo(() => resumoPorCliente(aps), [aps]);
  function baixarResumoCsv() {
    const blob = new Blob(["﻿" + resumoToCsv(resumo)], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "resumo-por-cliente.csv";
    a.click();
  }

  // cadastra uma regra em branco para o NCM pendente e leva para a aba Regras
  function cadastrarRegra(ncm: string, uf: string) {
    if (!regras.some((r) => r.ncm === ncm && r.uf === uf)) {
      setRegras([{ ncm, uf, ehSt: false, mva: 0, aliqInterna: 19.5 }, ...regras]);
    }
    setAba("regras");
  }

  async function adicionar(lista: FileList | null) {
    if (!lista) return;
    const novos: Arquivo[] = [];
    for (const f of Array.from(lista)) {
      if (!f.name.toLowerCase().endsWith(".xml")) continue;
      const itensNota = parseNFe(await f.text(), f.name);
      if (itensNota.length) novos.push({ nome: f.name, itens: itensNota });
    }
    setArquivos((a) => [...a, ...novos]);
  }

  function baixarCsv() {
    const blob = new Blob(["﻿" + toCsv(aps)], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "apuracao.csv";
    a.click();
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800">
      <header className="bg-gradient-to-br from-teal-800 to-teal-600 px-7 py-6 text-white">
        <h1 className="text-xl font-semibold">Apurador de ICMS ST — Entrada</h1>
        <p className="mt-1 text-sm text-white/80">
          Arraste os XMLs das notas de entrada. Tudo roda no seu navegador.
        </p>
      </header>

      <div className="mx-auto max-w-6xl px-5 pb-20">
        <nav className="mt-4 mb-6 flex flex-wrap gap-1 border-b border-slate-200">
          {([
            ["apuracao", "Apuração"],
            ["conferencia", `Conferência ST${confs.length ? ` · ${confs.length}` : ""}${confProblemas ? " ⚠" : ""}`],
            ["pendencias", `Pendências${pend.length ? ` · ${pend.length} ⚠` : ""}`],
            ["cliente", "Por cliente / DeSTDA"],
            ["regras", `Regras de ST · ${regras.length}`],
            ["finalidades", `Finalidades · ${fins.length}`],
            ["ajuda", "Ajuda"],
          ] as [Aba, string][]).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setAba(id)}
              className={`rounded-t-md px-4 py-2.5 text-sm font-medium ${
                aba === id
                  ? "border-b-2 border-teal-600 text-teal-800"
                  : "text-slate-500 hover:bg-white hover:text-slate-800"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>

        {aba === "apuracao" && (
          <section>
            <div
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                adicionar(e.dataTransfer.files);
              }}
              className="cursor-pointer rounded-2xl border-2 border-dashed border-slate-300 bg-white p-9 text-center transition hover:border-teal-600 hover:bg-teal-50"
            >
              <div className="text-base font-semibold">Arraste os arquivos XML aqui</div>
              <div className="mt-1 text-sm text-slate-500">
                ou clique para selecionar — pode jogar várias notas de uma vez
              </div>
              <input
                ref={inputRef}
                type="file"
                accept=".xml"
                multiple
                hidden
                onChange={(e) => adicionar(e.target.files)}
              />
            </div>

            {arquivos.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {arquivos.map((a, i) => (
                  <span
                    key={i}
                    className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs shadow-sm"
                  >
                    <b className="font-semibold">{a.nome}</b> · {a.itens.length} itens
                    <button
                      onClick={() => setArquivos((arr) => arr.filter((_, j) => j !== i))}
                      className="font-bold text-slate-400 hover:text-red-600"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}

            {aps.length > 0 && (
              <>
                <div className="my-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-xl bg-gradient-to-br from-teal-800 to-teal-600 p-4 text-white shadow">
                    <div className="text-xs uppercase tracking-wide text-white/80">
                      Total a recolher (estimado)
                    </div>
                    <div className="mt-1 text-2xl font-bold">{money(total)}</div>
                  </div>
                  {Object.entries(porGalho)
                    .filter(([g]) => g !== "ST_JA_RECOLHIDA")
                    .map(([g, v]) => (
                      <div key={g} className="rounded-xl bg-white p-4 shadow">
                        <div className="text-xs uppercase tracking-wide text-slate-500">
                          {BADGE[g as keyof typeof BADGE]?.label ?? g}
                        </div>
                        <div className="mt-1 text-2xl font-bold">
                          {g === "FALTA_REGRA" ? "⚠" : money(v)}
                        </div>
                      </div>
                    ))}
                </div>

                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <strong>
                    {arquivos.length} nota(s) · {aps.length} item(ns)
                    {semRegra > 0 && ` · ${semRegra} sem regra`}
                  </strong>
                  <div className="flex gap-2">
                    <button onClick={baixarCsv} className="btn-ghost">Baixar CSV</button>
                    <button onClick={() => setArquivos([])} className="btn-ghost">Limpar</button>
                  </div>
                </div>

                <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Os valores são <b>estimativa</b>. Os MVAs e alíquotas vêm da aba{" "}
                  <b>Regras de ST</b> — confira-os com sua fonte antes de gerar guia.
                </div>

                <div className="overflow-x-auto rounded-xl bg-white shadow">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-500">
                        <th className="th">NF</th><th className="th">Rota</th>
                        <th className="th">NCM</th><th className="th">CEST</th>
                        <th className="th">Produto</th><th className="th">Finalidade</th>
                        <th className="th">Tratamento</th>
                        <th className="th text-right">Base</th>
                        <th className="th text-right">A recolher</th>
                      </tr>
                    </thead>
                    <tbody>
                      {aps.map((r, i) => {
                        const b = BADGE[r.galho];
                        const open = aberto === i;
                        return (
                          <Fragment key={i}>
                            <tr
                              onClick={() => setAberto(open ? null : i)}
                              className="cursor-pointer border-t border-slate-100 hover:bg-slate-50"
                            >
                              <td className="td">{r.nNF}</td>
                              <td className="td">{r.ufOrig}→{r.ufDest}</td>
                              <td className="td">{r.ncm}</td>
                              <td className="td">{r.cest || "—"}</td>
                              <td className="td max-w-[220px] truncate" title={r.produto}>
                                {r.produto}
                              </td>
                              <td className="td">{r.galho === "ST_JA_RECOLHIDA" ? "—" : r.finalidade}</td>
                              <td className="td">
                                <span
                                  title={r.detalhe}
                                  className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${b.cls}`}
                                >
                                  {b.label}
                                </span>
                              </td>
                              <td className="td text-right tabular-nums">{numBR(r.base)}</td>
                              <td className="td text-right font-bold tabular-nums">
                                <span className="mr-1 text-slate-400">{open ? "▾" : "▸"}</span>
                                {r.valor == null ? "?" : numBR(r.valor)}
                              </td>
                            </tr>
                            {open && (
                              <tr className="bg-slate-50/70">
                                <td colSpan={9} className="px-6 py-3">
                                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                    Memória de cálculo
                                  </div>
                                  <table className="mt-2 w-full max-w-xl text-sm">
                                    <tbody>
                                      {r.memoria.map((p, j) => (
                                        <tr key={j} className="border-b border-slate-200/70 last:border-0">
                                          <td className="py-1 pr-4">
                                            {p.rotulo}
                                            {p.detalhe && (
                                              <span className="ml-1 text-xs text-slate-400">— {p.detalhe}</span>
                                            )}
                                          </td>
                                          <td className="py-1 text-right tabular-nums font-medium">
                                            {p.unidade === "percent" ? `${numBR(p.valor)}%` : money(p.valor)}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>
        )}

        {/* ---------------- CONFERÊNCIA ST ---------------- */}
        {aba === "conferencia" && (
          <section>
            <div className="mb-4 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
              Quando a nota vem com <b>ST já retida pelo fornecedor</b>, recalculamos para conferir
              se ele cobrou certo — usando só o XML e seus cadastros. Pega erro de cálculo do
              fornecedor (que o cliente acabaria pagando) sem depender de nenhum sistema externo.
            </div>

            {confs.length === 0 ? (
              <div className="rounded-xl bg-white p-10 text-center text-slate-500 shadow">
                Nenhum item com ST retida nas notas carregadas. Suba notas em que o fornecedor já
                destacou a ST (CST 10/30/70).
              </div>
            ) : (
              <>
                <div className="my-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <div className="rounded-xl bg-white p-4 shadow">
                    <div className="text-xs uppercase tracking-wide text-slate-500">Itens conferidos</div>
                    <div className="mt-1 text-2xl font-bold">{confs.length}</div>
                  </div>
                  <div className="rounded-xl bg-white p-4 shadow">
                    <div className="text-xs uppercase tracking-wide text-slate-500">Conferem</div>
                    <div className="mt-1 text-2xl font-bold text-green-600">
                      {confs.length - confProblemas}
                    </div>
                  </div>
                  <div className={`rounded-xl p-4 shadow ${confProblemas ? "bg-red-50" : "bg-white"}`}>
                    <div className="text-xs uppercase tracking-wide text-slate-500">Com divergência</div>
                    <div className={`mt-1 text-2xl font-bold ${confProblemas ? "text-red-600" : ""}`}>
                      {confProblemas}
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-xl bg-white shadow">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-500">
                        <th className="th">NF</th><th className="th">NCM</th><th className="th">Produto</th>
                        <th className="th text-right">ST declarada</th>
                        <th className="th text-right">ST recalc.</th>
                        <th className="th text-right">Difer.</th>
                        <th className="th">Resultado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {confs.map((c, i) => {
                        const b = BADGE_CONF[c.status];
                        const ruim = c.status === "ERRO_CALCULO" || c.status === "PARAM_DIVERGENTE";
                        return (
                          <tr
                            key={i}
                            className={`border-t border-slate-100 ${ruim ? "bg-red-50/40" : "hover:bg-slate-50"}`}
                          >
                            <td className="td">{c.item.nNF}</td>
                            <td className="td">{c.item.ncm}</td>
                            <td className="td max-w-[220px] truncate" title={c.item.produto}>
                              {c.item.produto}
                            </td>
                            <td className="td text-right tabular-nums">{numBR(c.stDeclarada)}</td>
                            <td className="td text-right tabular-nums">{numBR(c.stRecalc)}</td>
                            <td className={`td text-right tabular-nums ${Math.abs(c.divergenciaCalc) > 0.02 ? "font-bold text-red-600" : ""}`}>
                              {numBR(c.divergenciaCalc)}
                            </td>
                            <td className="td">
                              <span
                                title={c.mensagem}
                                className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${b.cls}`}
                              >
                                {b.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <p className="mt-3 text-xs text-slate-500">
                  Passe o mouse sobre o resultado para ver o detalhe. &quot;Erro de cálculo&quot; usa
                  só os números da própria nota (sempre confiável). &quot;Parâmetro divergente&quot;
                  compara com a sua aba de Regras.
                </p>
              </>
            )}
          </section>
        )}

        {/* ---------------- PENDÊNCIAS ---------------- */}
        {aba === "pendencias" && (
          <section>
            <div className="mb-4 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
              NCMs que apareceram nas notas mas <b>não têm regra cadastrada</b> — sem eles o cálculo
              não fecha. Esta é a sua lista de trabalho: classifique cada NCM (na ECONET) e cadastre
              a regra. Conforme você cadastra, a pendência some sozinha.
            </div>

            {pend.length === 0 ? (
              <div className="rounded-xl bg-white p-10 text-center text-slate-500 shadow">
                Nenhuma pendência 🎉 — todos os NCMs das notas carregadas têm regra cadastrada.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl bg-white shadow">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-500">
                      <th className="th">NCM</th><th className="th">UF</th>
                      <th className="th text-right">Itens</th><th className="th text-right">Notas</th>
                      <th className="th">Produto (exemplo)</th><th className="th">Clientes</th>
                      <th className="th"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {pend.map((p, i) => (
                      <tr key={i} className="border-t border-slate-100 hover:bg-slate-50">
                        <td className="td font-semibold">{p.ncm}</td>
                        <td className="td">{p.uf}</td>
                        <td className="td text-right tabular-nums">{p.qtdItens}</td>
                        <td className="td text-right tabular-nums">{p.qtdNotas}</td>
                        <td className="td max-w-[240px] truncate" title={p.produtoExemplo}>
                          {p.produtoExemplo}
                        </td>
                        <td className="td max-w-[180px] truncate" title={p.clientes.join(", ")}>
                          {p.clientes.join(", ")}
                        </td>
                        <td className="td">
                          <button onClick={() => cadastrarRegra(p.ncm, p.uf)} className="btn text-xs">
                            Cadastrar regra
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* ---------------- POR CLIENTE / DeSTDA ---------------- */}
        {aba === "cliente" && (
          <section>
            <div className="mb-4 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
              Consolidação por <b>cliente e competência</b> — como você fecha o mês. Estes são também
              os valores que alimentam a <b>DeSTDA</b> (ST, antecipação e DIFAL por contribuinte/período).
              <span className="mt-1 block text-xs text-amber-700">
                O arquivo de importação do SEDIF-SN (layout oficial) é um passo seguinte — aqui
                entregamos os valores consolidados; confirme o enquadramento de cada coluna na DeSTDA.
              </span>
            </div>

            {resumo.length === 0 ? (
              <div className="rounded-xl bg-white p-10 text-center text-slate-500 shadow">
                Suba notas na aba Apuração para ver o resumo por cliente.
              </div>
            ) : (
              <>
                <div className="mb-3 flex items-center justify-between">
                  <strong>{resumo.length} cliente(s)/competência(s)</strong>
                  <button onClick={baixarResumoCsv} className="btn-ghost">Baixar CSV</button>
                </div>
                <div className="overflow-x-auto rounded-xl bg-white shadow">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-500">
                        <th className="th">Cliente</th><th className="th">Competência</th>
                        <th className="th text-right">Notas</th><th className="th text-right">Itens</th>
                        <th className="th text-right">ST / Antecipada</th>
                        <th className="th text-right">Antecip. parcial</th>
                        <th className="th text-right">DIFAL</th>
                        <th className="th text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resumo.map((g, i) => (
                        <tr key={i} className="border-t border-slate-100 hover:bg-slate-50">
                          <td className="td max-w-[220px] truncate" title={`${g.cliente} (${g.cnpj})`}>
                            {g.cliente}
                          </td>
                          <td className="td">{g.competencia}</td>
                          <td className="td text-right tabular-nums">{g.qtdNotas}</td>
                          <td className="td text-right tabular-nums">{g.qtdItens}</td>
                          <td className="td text-right tabular-nums">{numBR(g.stAntecipada)}</td>
                          <td className="td text-right tabular-nums">{numBR(g.antecipacaoParcial)}</td>
                          <td className="td text-right tabular-nums">{numBR(g.difal)}</td>
                          <td className="td text-right font-bold tabular-nums">{money(g.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>
        )}

        {aba === "regras" && <EditorRegras regras={regras} setRegras={setRegras} />}
        {aba === "finalidades" && <EditorFinalidades fins={fins} setFins={setFins} />}

        {aba === "ajuda" && (
          <div className="rounded-xl bg-white p-6 shadow text-sm leading-relaxed">
            <h3 className="font-semibold">Como funciona</h3>
            <p className="mt-2">
              O sistema lê o XML, identifica cada item e decide o tratamento cruzando com as duas
              tabelas que você mantém (Regras de ST e Finalidades):
            </p>
            <pre className="mt-3 overflow-x-auto rounded-lg bg-slate-900 p-4 text-xs text-teal-100">{`item com ST já retida na origem?  → nada a recolher
senão, qual a finalidade do item?
   ├─ consumo / ativo  → DIFAL (diferença de alíquota)
   └─ revenda          → é ST no destino?
                          ├─ sim → ST antecipada (MVA ajustada)
                          └─ não → antecipação parcial`}</pre>
            <h3 className="mt-5 font-semibold">Por que triar por NCM, não pelo CEST</h3>
            <p className="mt-2">
              Fornecedores às vezes esquecem o CEST. A regra de ST é decidida pelo <b>NCM</b> na sua
              tabela; o CEST do XML é só pista.
            </p>
            <h3 className="mt-5 font-semibold">Privacidade</h3>
            <p className="mt-2">
              Nada sai do seu computador: leitura e cálculo acontecem no navegador, e suas tabelas
              ficam salvas localmente.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}

/* =============================== editores =============================== */

function EditorRegras({
  regras,
  setRegras,
}: {
  regras: RegraST[];
  setRegras: (v: RegraST[]) => void;
}) {
  const set = (i: number, patch: Partial<RegraST>) =>
    setRegras(regras.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  return (
    <section>
      <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <b>Cache 1 — regra fiscal por NCM.</b> Para cada NCM/UF de destino: é ST? qual o MVA e a
        alíquota interna? Fonte: ECONET. Fica salvo no navegador.
      </div>
      <div className="mb-3 flex items-center justify-between">
        <strong>Regras cadastradas</strong>
        <button
          onClick={() =>
            setRegras([...regras, { ncm: "", uf: "PR", ehSt: false, mva: 0, aliqInterna: 19.5 }])
          }
          className="btn"
        >
          + Nova regra
        </button>
      </div>
      <div className="overflow-x-auto rounded-xl bg-white shadow">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-500">
              <th className="th">NCM</th><th className="th">UF dest.</th><th className="th">É ST?</th>
              <th className="th">MVA %</th><th className="th">Alíq. interna %</th><th className="th"></th>
            </tr>
          </thead>
          <tbody>
            {regras.map((r, i) => (
              <tr key={i} className="border-t border-slate-100">
                <td className="td"><input className="inp w-24" value={r.ncm} onChange={(e) => set(i, { ncm: e.target.value })} /></td>
                <td className="td"><input className="inp w-16" value={r.uf} onChange={(e) => set(i, { uf: e.target.value.toUpperCase() })} /></td>
                <td className="td">
                  <select className="inp" value={String(r.ehSt)} onChange={(e) => set(i, { ehSt: e.target.value === "true" })}>
                    <option value="true">Sim</option><option value="false">Não</option>
                  </select>
                </td>
                <td className="td"><input type="number" step="0.01" className="inp w-20" value={r.mva} onChange={(e) => set(i, { mva: +e.target.value })} /></td>
                <td className="td"><input type="number" step="0.01" className="inp w-24" value={r.aliqInterna} onChange={(e) => set(i, { aliqInterna: +e.target.value })} /></td>
                <td className="td">
                  <button onClick={() => setRegras(regras.filter((_, j) => j !== i))} className="btn-ghost text-xs">remover</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function EditorFinalidades({
  fins,
  setFins,
}: {
  fins: RegraFinalidade[];
  setFins: (v: RegraFinalidade[]) => void;
}) {
  const set = (i: number, patch: Partial<RegraFinalidade>) =>
    setFins(fins.map((f, j) => (j === i ? { ...f, ...patch } : f)));

  return (
    <section>
      <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <b>Cache 2 — finalidade por cliente + produto.</b> Define se o item é <b>revenda</b> (segue
        ST/antecipação) ou <b>uso/consumo / ativo</b> (vira DIFAL). Não cadastrado = revenda.
      </div>
      <div className="mb-3 flex items-center justify-between">
        <strong>Finalidades cadastradas</strong>
        <button onClick={() => setFins([...fins, { cnpj: "", ncm: "", finalidade: "revenda" }])} className="btn">
          + Nova finalidade
        </button>
      </div>
      <div className="overflow-x-auto rounded-xl bg-white shadow">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-500">
              <th className="th">CNPJ do cliente</th><th className="th">NCM</th>
              <th className="th">Finalidade</th><th className="th"></th>
            </tr>
          </thead>
          <tbody>
            {fins.map((f, i) => (
              <tr key={i} className="border-t border-slate-100">
                <td className="td"><input className="inp w-44" value={f.cnpj} onChange={(e) => set(i, { cnpj: e.target.value })} /></td>
                <td className="td"><input className="inp w-24" value={f.ncm} onChange={(e) => set(i, { ncm: e.target.value })} /></td>
                <td className="td">
                  <select className="inp" value={f.finalidade} onChange={(e) => set(i, { finalidade: e.target.value as Finalidade })}>
                    <option value="revenda">revenda</option>
                    <option value="consumo">consumo</option>
                    <option value="ativo">ativo</option>
                  </select>
                </td>
                <td className="td">
                  <button onClick={() => setFins(fins.filter((_, j) => j !== i))} className="btn-ghost text-xs">remover</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
