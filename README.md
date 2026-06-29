# Apurador de ICMS ST — Entrada

Web app para apurar ICMS ST / antecipação / DIFAL na entrada, a partir do XML de NF-e.
Voltado a escritórios de contabilidade (clientes Simples Nacional que compram de outros
estados para revender).

## Stack

- **Next.js 16 + React 19 + TypeScript** (App Router)
- **Tailwind** para estilo
- **fast-xml-parser** (lê XML no navegador e no Node)
- **Vitest** para testar o motor

## Estrutura

```
src/
  lib/icms/           ← o "motor": domínio puro, sem React/UI
    types.ts          tipos do domínio
    parser.ts         XML da NF-e → itens (camada determinística)
    engine.ts         apuração: escolhe o galho e calcula  ← coração do produto
    defaults.ts       seeds dos dois caches (valores de EXEMPLO)
    format.ts         formatação/CSV (usado só na UI)
    engine.test.ts    testes com notas reais — travam a conta em R$ 451,06
    __fixtures__/     XMLs reais usados nos testes
  lib/useLocalStorage.ts   persistência provisória dos caches
  app/page.tsx        a interface (upload, tabela, abas, editores)
```

A regra de ouro: **toda a lógica fiscal mora em `lib/icms/` e é testável sem abrir o navegador.**
UI, banco e login são plugados em volta.

## Rodar

```bash
npm run dev      # http://localhost:3000
npm test         # roda os testes do motor
npm run build    # build de produção
```

## Estado atual (features prontas)

- **Apuração**: lê XML, tria por NCM, escolhe o galho (ST já recolhida / ST antecipada /
  antecipação parcial / DIFAL) e calcula. Validado com notas reais (total R$ 451,06).
- **Conferência da ST do fornecedor**: recalcula a ST destacada e acusa erro de cálculo
  ou parâmetro divergente. Autônomo.
- **Fila de pendências de NCM**: agrupa itens sem regra; botão "Cadastrar regra" fecha o ciclo.
- **Memória de cálculo por nota**: cada linha expande e mostra a conta passo a passo.
- **Por cliente / DeSTDA**: consolida por cliente e competência (base dos valores da DeSTDA).
- Caches editáveis na UI e salvos no **localStorage**.

## Próximos passos

### 1. Calibrar parâmetros (antes de confiar nos valores)
MVAs e alíquotas em `defaults.ts` são **EXEMPLO**. Validar com a ECONET / uma apuração real.

### 2. Supabase (banco + login) — depende de você criar a conta
Groundwork pronto: `supabase/schema.sql` (tabelas + RLS por escritório) e `.env.local.example`.
Para ativar:
1. Crie um projeto em https://supabase.com
2. SQL Editor → cole `supabase/schema.sql` → rode
3. `cp .env.local.example .env.local` e preencha URL + anon key (Settings > API)
4. Avise — aí eu instalo `@supabase/supabase-js`, troco o `useLocalStorage` por
   leitura/escrita no banco e ligo o login.

### 3. DeSTDA — arquivo de importação
A aba "Por cliente / DeSTDA" já entrega os **valores consolidados**. Falta gerar o **arquivo
no layout oficial do SEDIF-SN** (registros documentados no manual). Precisa do layout em mãos
para implementar sem chutar o formato.

### 4. Integrações (exigem recursos externos — não dá pra fazer "no escuro")
- **Distribuição DF-e** (baixar XMLs automático): webservice da SEFAZ + **certificado A1** do cliente.
- **Emissão de GNRE**: webservice da GNRE. (O *valor* já é calculado; falta a emissão.)

### Privacidade dos fixtures
Os XMLs em `__fixtures__/` têm dados reais de cliente. Anonimizar (nome/CNPJ) antes de tornar
o repositório público.
