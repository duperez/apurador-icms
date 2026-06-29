-- Schema do Apurador de ICMS ST para Supabase (Postgres).
--
-- Como usar (quando você criar o projeto no Supabase):
--   1. Crie um projeto em https://supabase.com
--   2. Vá em SQL Editor e cole este arquivo inteiro; rode.
--   3. Pegue Project URL e anon key em Settings > API e ponha no .env.local
--      (ver .env.local.example).
--
-- Modelo: cada ESCRITÓRIO é um "tenant". Usuários pertencem a um escritório e
-- só enxergam os dados dele (Row Level Security mais abaixo).

-- ---------------------------------------------------------------- tabelas
create table if not exists escritorio (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  created_at  timestamptz not null default now()
);

-- liga o usuário do Supabase Auth a um escritório
create table if not exists usuario (
  id            uuid primary key references auth.users (id) on delete cascade,
  escritorio_id uuid not null references escritorio (id) on delete cascade,
  nome          text,
  papel         text not null default 'membro', -- 'admin' | 'membro'
  created_at    timestamptz not null default now()
);

create table if not exists cliente (
  id            uuid primary key default gen_random_uuid(),
  escritorio_id uuid not null references escritorio (id) on delete cascade,
  cnpj          text not null,
  nome          text not null,
  uf            text,
  ie            text,
  regime        text default 'simples',
  created_at    timestamptz not null default now(),
  unique (escritorio_id, cnpj)
);

-- Cache 1: regra de ST por NCM (compartilhada pela equipe do escritório)
create table if not exists regra_st (
  id              uuid primary key default gen_random_uuid(),
  escritorio_id   uuid not null references escritorio (id) on delete cascade,
  ncm             text not null,
  uf              text not null,
  eh_st           boolean not null default false,
  mva             numeric(7,2) not null default 0,
  aliq_interna    numeric(7,2) not null default 0,
  vigencia_inicio date,            -- para aplicar a regra vigente na data da nota
  fonte           text,
  updated_at      timestamptz not null default now(),
  unique (escritorio_id, ncm, uf, vigencia_inicio)
);

-- Cache 2: finalidade por (cliente, NCM)
create table if not exists finalidade (
  id            uuid primary key default gen_random_uuid(),
  escritorio_id uuid not null references escritorio (id) on delete cascade,
  cnpj          text not null,
  ncm           text not null,
  finalidade    text not null default 'revenda', -- revenda | consumo | ativo
  updated_at    timestamptz not null default now(),
  unique (escritorio_id, cnpj, ncm)
);

-- Histórico de apurações (uma por cliente/competência)
create table if not exists apuracao (
  id            uuid primary key default gen_random_uuid(),
  escritorio_id uuid not null references escritorio (id) on delete cascade,
  cnpj          text not null,
  competencia   text not null,           -- "2026-05"
  total         numeric(12,2) not null default 0,
  itens         jsonb not null default '[]', -- snapshot da apuração
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------- RLS
-- Cada usuário só acessa linhas do próprio escritório.
alter table escritorio  enable row level security;
alter table usuario     enable row level security;
alter table cliente     enable row level security;
alter table regra_st    enable row level security;
alter table finalidade  enable row level security;
alter table apuracao    enable row level security;

-- função auxiliar: escritório do usuário logado
create or replace function meu_escritorio()
returns uuid language sql stable as $$
  select escritorio_id from usuario where id = auth.uid()
$$;

-- políticas (uma por tabela; leitura+escrita restrita ao próprio escritório)
create policy "usuario vê seu registro" on usuario
  for all using (id = auth.uid()) with check (id = auth.uid());

create policy "escritorio próprio" on escritorio
  for all using (id = meu_escritorio()) with check (id = meu_escritorio());

create policy "cliente do escritorio" on cliente
  for all using (escritorio_id = meu_escritorio()) with check (escritorio_id = meu_escritorio());

create policy "regra do escritorio" on regra_st
  for all using (escritorio_id = meu_escritorio()) with check (escritorio_id = meu_escritorio());

create policy "finalidade do escritorio" on finalidade
  for all using (escritorio_id = meu_escritorio()) with check (escritorio_id = meu_escritorio());

create policy "apuracao do escritorio" on apuracao
  for all using (escritorio_id = meu_escritorio()) with check (escritorio_id = meu_escritorio());
