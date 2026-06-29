<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Guia do projeto (para agentes de IA)

Contexto interno do **Apurador de ICMS ST**. O `README.md` é a porta de entrada
para humanos; este arquivo é o handoff técnico/estratégico.

## O que é

Web app que apura **ICMS ST / antecipação / DIFAL na entrada** a partir do XML de
NF-e (modelo 55). Público-alvo: escritórios de contabilidade, clientes do Simples
Nacional que compram de outros estados para revender. Roda 100% no navegador.

## Princípio de arquitetura (não viole)

**Toda a lógica fiscal vive em `src/lib/icms/`, é TypeScript puro e testável sem
navegador.** UI (`src/app`), persistência e futuro banco são encanamento plugado em
volta. O motor é o ativo — mantenha-o desacoplado.

```
src/lib/icms/
  types.ts          tipos do domínio
  parser.ts         XML da NF-e → ItemNota[] (fast-xml-parser, isomórfico)
  engine.ts         apuração: escolhe o "galho" e calcula  ← coração
  conferencia.ts    confere a ST que o fornecedor destacou
  pendencias.ts     agrupa itens sem regra (FALTA_REGRA)
  resumo.ts         consolida por cliente/competência (base da DeSTDA)
  defaults.ts       seeds dos caches (VALORES DE EXEMPLO)
  format.ts         formatação/CSV (só UI)
  *.test.ts         Vitest — gitignored (dependem dos fixtures)
  __fixtures__/     XMLs/seeds reais — gitignored, nunca versionar
src/lib/useLocalStorage.ts   persistência provisória dos caches
src/app/page.tsx    UI: upload, abas, tabelas, editores
supabase/schema.sql groundwork de banco (não ativado)
```

## Galho de decisão (engine.ts)

```
ST já retida na origem?  → nada a recolher
senão, finalidade do item?
   consumo/ativo → DIFAL (diferença de alíquota)
   revenda       → é ST no destino? sim → ST antecipada (MVA ajustada)
                                     não → antecipação parcial
```

Dois caches alimentados por humano: `regra_st` (por NCM/UF: é ST? MVA? alíq. interna)
e `finalidade` (por cliente+NCM: revenda/consumo/ativo).

## Caveats fiscais (importantes)

- **MVA: cadastra-se a MVA ORIGINAL.** O engine calcula a MVA ajustada em runtime
  (`mvaAjustada`) pela alíquota interestadual da nota. Não armazenar MVA já ajustada
  (≠ do OCA l10n-brazil, que guarda a ajustada) — senão ajusta em dobro.
- **Os parâmetros em `defaults.ts` são EXEMPLO.** MVA/alíquota precisam ser validados
  com a ECONET e/ou uma apuração real antes de confiar nos valores.
- **Base da operação** = vProd + IPI + frete + seguro + outras − desconto (conferido
  contra o OCA l10n-brazil).
- A regra fiscal (ST/MVA por NCM/estado) é o dado difícil; não é open source — é o que
  ECONET/SaaS vendem.

## Privacidade (regra dura)

Repositório é **público**. **Nunca** versione dado de cliente:
- `src/lib/icms/__fixtures__/` e `*.test.ts` estão no `.gitignore`.
- `defaults.ts` não pode conter CNPJ/nome reais (seed de teste vive em `__fixtures__/seeds.ts`).
- Antes de qualquer push, audite: `git grep -inE "<cnpj>|<nome>"` em `origin/main` e `origin/gh-pages`.

## Testes

`npm test` (Vitest 2 — fixado; v4 quebra com rolldown no Mac ARM). Os testes dependem
dos fixtures locais e travam o total das 2 notas em **R$ 451,06**. Rodam só localmente.

## Deploy (GitHub Pages)

- Static export do Next (`output: 'export'`, `basePath` = `/<repo>` via `PAGES_BASE_PATH`).
- **Não** usar o pipeline oficial `upload-pages-artifact`/`deploy-pages` → dava
  **BlobNotFound** persistente. Em vez disso: o workflow builda e dá **force-push de
  `out/` para a branch `gh-pages`**; o Pages serve dela (build_type=legacy).
- Live: https://duperez.github.io/apurador-icms/

## Roadmap

Feito: apuração, conferência da ST, pendências de NCM, memória de cálculo, resumo por
cliente/competência. Autônomo (só XML + caches). Próximos:
1. Calibrar parâmetros com apuração real.
2. Supabase (banco + login compartilhado) — `supabase/schema.sql` pronto; falta conta/credenciais
   e trocar `useLocalStorage` por banco.
3. Gerar arquivo da DeSTDA (layout SEDIF-SN — precisa do layout do manual).
4. Integrações: Distribuição DF-e (certificado A1) e emissão de GNRE (webservice).
