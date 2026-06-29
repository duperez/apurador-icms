# Apurador de ICMS ST

Apuração de **ICMS Substituição Tributária, antecipação e DIFAL na entrada** a partir do
XML da NF-e. Pensado para escritórios de contabilidade com clientes do **Simples Nacional**
que compram de outros estados para revender.

**🔗 Demo:** https://duperez.github.io/apurador-icms/

> ⚠️ **Versão demonstrativa.** Os MVAs e alíquotas embutidos são **valores de exemplo** e
> ainda **não foram validados**. Não use os números para recolhimento sem conferir com sua
> fonte fiscal (ex.: ECONET).

---

## O que faz

Você arrasta os XMLs das notas de entrada e o sistema, para cada item:

- 📥 **Lê e classifica** cada item pelo NCM (não depende do CEST vir preenchido na nota).
- 🧮 **Apura** o tratamento correto e o valor a recolher:
  - ST já retida na origem → nada a recolher (não cobra em dobro)
  - ST antecipada → cálculo com MVA ajustada
  - Antecipação parcial → diferença de alíquota
  - DIFAL → para itens de uso/consumo ou ativo
- 🔎 **Confere a ST do fornecedor** — recalcula a ST destacada e aponta erro de cálculo
  ou parâmetro divergente.
- 📋 **Lista pendências de NCM** — o que falta classificar vira uma lista de trabalho.
- 🧾 **Memória de cálculo** — cada linha abre e mostra a conta passo a passo (auditável).
- 👥 **Resumo por cliente/competência** — consolida para fechar o mês (base da DeSTDA).
- 🔒 **Roda no navegador** — os XMLs e os cálculos não saem da sua máquina.

## Como funciona

A decisão por item segue esta árvore:

```
item com ST já retida na origem?  → nada a recolher
senão, qual a finalidade do item?
   ├─ consumo / ativo  → DIFAL (diferença de alíquota)
   └─ revenda          → é ST no destino?
                          ├─ sim → ST antecipada (MVA ajustada)
                          └─ não → antecipação parcial
```

Você mantém duas tabelas simples (editáveis na própria interface):

- **Regras de ST** — por NCM/UF de destino: é ST? qual a MVA e a alíquota interna.
- **Finalidades** — por cliente + produto: revenda, uso/consumo ou ativo.

> A MVA informada é a **original** (do protocolo/convênio); o sistema calcula a MVA
> ajustada automaticamente pela alíquota interestadual de cada nota.

## Tecnologias

- [Next.js](https://nextjs.org) 16 + React 19 + TypeScript (App Router, export estático)
- Tailwind CSS
- [fast-xml-parser](https://github.com/NaturalIntelligence/fast-xml-parser) — leitura do XML
- [Vitest](https://vitest.dev) — testes da lógica fiscal

## Rodando localmente

```bash
npm install
npm run dev      # http://localhost:3000
```

Outros comandos:

```bash
npm test         # testes da lógica de cálculo
npm run build    # build estático (gera out/)
```

## Estrutura

```
src/
  lib/icms/        lógica fiscal pura e testável (parser, motor de cálculo, conferência…)
  lib/             utilitários (persistência local)
  app/page.tsx     interface (upload, abas, tabelas)
```

A lógica fiscal fica isolada em `src/lib/icms/` — testável sem abrir o navegador.

## Privacidade

Nenhum dado sai do seu computador: a leitura dos XMLs e os cálculos acontecem inteiramente
no navegador, e suas tabelas ficam salvas localmente.

## Status

Projeto em desenvolvimento. As funcionalidades acima estão implementadas e cobertas por
testes; a calibração dos parâmetros fiscais e integrações (banco, geração de guia e DeSTDA)
estão no roadmap.

---

Feito para simplificar uma dor real de quem faz apuração de ICMS ST na mão.
