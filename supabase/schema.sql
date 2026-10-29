-- ============================================================================
-- Halı Saha Takım Dengeleyici — Supabase şeması
-- Bu dosyanın TAMAMINI Supabase projenizin SQL Editör'üne yapıştırıp çalıştırın.
-- Mevcut bir projeye eklenebilmesi için tüm tablo/fonksiyon adları
-- `halisaha_` önekiyle isimlendirilmiştir.
-- ============================================================================

-- PIN hash'leme için gerekli.
create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- 1) Tablo
-- ----------------------------------------------------------------------------
create table if not exists public.halisaha_players (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) > 0),
  nickname text,
  positions text[] not null,
  main_position text not null check (main_position in ('KL', 'DEF', 'OS', 'FOR')),
  pace integer not null check (pace between 1 and 99),
  shooting integer not null check (shooting between 1 and 99),
  passing integer not null check (passing between 1 and 99),
  dribbling integer not null check (dribbling between 1 and 99),
  defending integer not null check (defending between 1 and 99),
  physical integer not null check (physical between 1 and 99),
  goalkeeping integer check (goalkeeping between 1 and 99),
  avatar_type text not null check (avatar_type in ('initial', 'emoji', 'photo')),
  avatar_value text not null default '',
  photo_url text,
  pin_hash text not null,
  -- Basit brute-force koruması.
  failed_pin_attempts integer not null default 0,
  locked_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.halisaha_players is 'Halı saha oyuncu kartları. anon rolü bu tabloya doğrudan erişemez; halisaha_players_public view + RPC fonksiyonları kullanılır.';

-- ----------------------------------------------------------------------------
-- 2) RLS: anon için HİÇBİR doğrudan erişim yok.
-- ----------------------------------------------------------------------------
alter table public.halisaha_players enable row level security;
revoke all on public.halisaha_players from anon, authenticated;
-- Kasıtlı olarak anon/authenticated için select/insert/update/delete politikası
-- EKLENMİYOR. Tüm erişim aşağıdaki view ve security definer fonksiyonlar üzerinden.

-- ----------------------------------------------------------------------------
-- 3) Herkese açık görünüm (pin_hash ve brute-force alanları HARİÇ).
-- ----------------------------------------------------------------------------
create or replace view public.halisaha_players_public as
select
  id, name, nickname, positions, main_position,
  pace, shooting, passing, dribbling, defending, physical, goalkeeping,
  avatar_type, avatar_value, photo_url, created_at, updated_at
from public.halisaha_players;

grant select on public.halisaha_players_public to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 4) Yardımcı: PIN doğrulama + brute-force kilidi (security definer fonksiyonlar içinde kullanılır)
-- ----------------------------------------------------------------------------
-- Not: Admin PIN, Supabase projenizde bir "Vault secret" veya Edge Function env
-- değişkeni olarak saklanabilir. Basitlik için burada bir ayarlar tablosunda
-- saklıyoruz; isterseniz bunu Supabase Dashboard > Database > Settings üzerinden
-- de yönetebilirsiniz.
create table if not exists public.halisaha_settings (
  key text primary key,
  value text not null
);
alter table public.halisaha_settings enable row level security;
revoke all on public.halisaha_settings from anon, authenticated;

-- Yönetici PIN'ini kendi hash'lenmiş haliyle buraya eklemeniz gerekir. Aşağıdaki
-- satırı KENDİ PIN'inizle değiştirip çalıştırın (örnek PIN: 1234 — mutlaka değiştirin):
-- insert into public.halisaha_settings (key, value)
--   values ('admin_pin_hash', crypt('1234', gen_salt('bf')))
--   on conflict (key) do update set value = excluded.value;

create or replace function public.halisaha_check_pin(
  p_player_id uuid,
  p_pin text
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row record;
  v_admin_hash text;
  v_now timestamptz := now();
begin
  select value into v_admin_hash from halisaha_settings where key = 'admin_pin_hash';
  if v_admin_hash is not null and crypt(p_pin, v_admin_hash) = v_admin_hash then
    return true;
  end if;

  select pin_hash, failed_pin_attempts, locked_until
    into v_row
    from halisaha_players
    where id = p_player_id
    for update;

  if v_row is null then
    raise exception 'Oyuncu bulunamadı.';
  end if;

  if v_row.locked_until is not null and v_row.locked_until > v_now then
    raise exception 'Çok fazla hatalı PIN denemesi yapıldı. Lütfen % dakika sonra tekrar deneyin.',
      ceil(extract(epoch from (v_row.locked_until - v_now)) / 60);
  end if;

  if crypt(p_pin, v_row.pin_hash) = v_row.pin_hash then
    update halisaha_players
      set failed_pin_attempts = 0, locked_until = null
      where id = p_player_id;
    return true;
  end if;

  update halisaha_players
    set
      failed_pin_attempts = failed_pin_attempts + 1,
      locked_until = case
        when failed_pin_attempts + 1 >= 5 then v_now + interval '15 minutes'
        else locked_until
      end
    where id = p_player_id;

  raise exception 'PIN yanlış.';
end;
$$;

-- ----------------------------------------------------------------------------
-- 5) RPC: Oyuncu oluştur
-- ----------------------------------------------------------------------------
create or replace function public.halisaha_create_player(
  p_name text,
  p_nickname text,
  p_positions text[],
  p_main_position text,
  p_pace integer,
  p_shooting integer,
  p_passing integer,
  p_dribbling integer,
  p_defending integer,
  p_physical integer,
  p_goalkeeping integer,
  p_avatar_type text,
  p_avatar_value text,
  p_photo_url text,
  p_pin text
) returns public.halisaha_players_public
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_id uuid;
  v_result halisaha_players_public;
begin
  if p_pin is null or p_pin !~ '^\d{4}$' then
    raise exception 'PIN 4 haneli bir sayı olmalı.';
  end if;

  insert into halisaha_players (
    name, nickname, positions, main_position,
    pace, shooting, passing, dribbling, defending, physical, goalkeeping,
    avatar_type, avatar_value, photo_url, pin_hash
  ) values (
    p_name, p_nickname, p_positions, p_main_position,
    p_pace, p_shooting, p_passing, p_dribbling, p_defending, p_physical, p_goalkeeping,
    p_avatar_type, p_avatar_value, p_photo_url, crypt(p_pin, gen_salt('bf'))
  )
  returning id into v_new_id;

  select * into v_result from halisaha_players_public where id = v_new_id;
  return v_result;
end;
$$;

grant execute on function public.halisaha_create_player(
  text, text, text[], text, integer, integer, integer, integer, integer, integer, integer, text, text, text, text
) to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 6) RPC: Oyuncu güncelle (PIN veya admin PIN gerekir; null alanlar değiştirilmez)
-- ----------------------------------------------------------------------------
create or replace function public.halisaha_update_player(
  p_id uuid,
  p_pin text,
  p_name text default null,
  p_nickname text default null,
  p_positions text[] default null,
  p_main_position text default null,
  p_pace integer default null,
  p_shooting integer default null,
  p_passing integer default null,
  p_dribbling integer default null,
  p_defending integer default null,
  p_physical integer default null,
  p_goalkeeping integer default null,
  p_avatar_type text default null,
  p_avatar_value text default null,
  p_photo_url text default null
) returns public.halisaha_players_public
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result halisaha_players_public;
begin
  if not public.halisaha_check_pin(p_id, p_pin) then
    raise exception 'PIN doğrulanamadı.';
  end if;

  update halisaha_players set
    name = coalesce(p_name, name),
    nickname = coalesce(p_nickname, nickname),
    positions = coalesce(p_positions, positions),
    main_position = coalesce(p_main_position, main_position),
    pace = coalesce(p_pace, pace),
    shooting = coalesce(p_shooting, shooting),
    passing = coalesce(p_passing, passing),
    dribbling = coalesce(p_dribbling, dribbling),
    defending = coalesce(p_defending, defending),
    physical = coalesce(p_physical, physical),
    goalkeeping = coalesce(p_goalkeeping, goalkeeping),
    avatar_type = coalesce(p_avatar_type, avatar_type),
    avatar_value = coalesce(p_avatar_value, avatar_value),
    photo_url = coalesce(p_photo_url, photo_url),
    updated_at = now()
  where id = p_id;

  select * into v_result from halisaha_players_public where id = p_id;
  if v_result is null then
    raise exception 'Oyuncu bulunamadı.';
  end if;
  return v_result;
end;
$$;

grant execute on function public.halisaha_update_player(
  uuid, text, text, text, text[], text, integer, integer, integer, integer, integer, integer, integer, text, text, text
) to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 7) RPC: Oyuncu sil (PIN veya admin PIN gerekir)
-- ----------------------------------------------------------------------------
create or replace function public.halisaha_delete_player(
  p_id uuid,
  p_pin text
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.halisaha_check_pin(p_id, p_pin) then
    raise exception 'PIN doğrulanamadı.';
  end if;

  delete from halisaha_players where id = p_id;
end;
$$;

grant execute on function public.halisaha_delete_player(uuid, text) to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 8) Fotoğraflar için Storage bucket
-- Bu kısım SQL Editör'de de çalışır (storage şeması Supabase tarafından sağlanır).
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('halisaha-avatars', 'halisaha-avatars', true, 262144) -- ~256KB sınır
on conflict (id) do nothing;

-- Herkes okuyabilsin (public bucket), herkes yükleyebilsin (login olmadığı için).
-- İstersen burayı daha sıkı hale getirebilirsin (örn. yalnızca belirli bir boyut/tip).
drop policy if exists "halisaha_avatars_public_read" on storage.objects;
create policy "halisaha_avatars_public_read"
  on storage.objects for select
  using (bucket_id = 'halisaha-avatars');

drop policy if exists "halisaha_avatars_anon_upload" on storage.objects;
create policy "halisaha_avatars_anon_upload"
  on storage.objects for insert
  with check (bucket_id = 'halisaha-avatars');

-- ----------------------------------------------------------------------------
-- 9) Maç sonucu, gol/asist ve maç sonrası performans puanları
-- Bu tablolar PIN korumasına bağlı DEĞİLDİR (bilinçli ürün kararı — sadece
-- organizatör rolü PIN gerektiriyor, maç sonrası kayıt herkese açık ve serbest).
-- Kötüye kullanımı tamamen önlemez ama arkadaş grubu ölçeğinde kabul edilebilir.
-- ----------------------------------------------------------------------------
create table if not exists public.halisaha_matches (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  team_size integer not null check (team_size in (5, 6, 7, 8)),
  team_a_name text not null default 'Kırmızı',
  team_b_name text not null default 'Mavi',
  team_a_score integer not null check (team_a_score >= 0),
  team_b_score integer not null check (team_b_score >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.halisaha_match_player_stats (
  match_id uuid not null references public.halisaha_matches(id) on delete cascade,
  player_id uuid not null references public.halisaha_players(id) on delete cascade,
  team text not null check (team in ('A', 'B')),
  goals integer not null default 0 check (goals >= 0),
  assists integer not null default 0 check (assists >= 0),
  primary key (match_id, player_id)
);

create table if not exists public.halisaha_match_ratings (
  match_id uuid not null references public.halisaha_matches(id) on delete cascade,
  rater_id uuid not null references public.halisaha_players(id) on delete cascade,
  rated_id uuid not null references public.halisaha_players(id) on delete cascade,
  score integer not null check (score between 1 and 10),
  created_at timestamptz not null default now(),
  primary key (match_id, rater_id, rated_id),
  constraint halisaha_no_self_rating check (rater_id <> rated_id)
);

alter table public.halisaha_matches enable row level security;
alter table public.halisaha_match_player_stats enable row level security;
alter table public.halisaha_match_ratings enable row level security;

-- Herkes okuyabilsin ve yeni kayıt ekleyebilsin; geçmiş kayıtları güncelleme/
-- silme politikası kasıtlı olarak YOK (yanlış girilen maçlar için doğrudan
-- SQL Editör'den düzeltme yapılabilir).
drop policy if exists "halisaha_matches_select" on public.halisaha_matches;
create policy "halisaha_matches_select" on public.halisaha_matches for select using (true);
drop policy if exists "halisaha_matches_insert" on public.halisaha_matches;
create policy "halisaha_matches_insert" on public.halisaha_matches for insert with check (true);

drop policy if exists "halisaha_match_stats_select" on public.halisaha_match_player_stats;
create policy "halisaha_match_stats_select" on public.halisaha_match_player_stats for select using (true);
drop policy if exists "halisaha_match_stats_insert" on public.halisaha_match_player_stats;
create policy "halisaha_match_stats_insert" on public.halisaha_match_player_stats for insert with check (true);

drop policy if exists "halisaha_match_ratings_select" on public.halisaha_match_ratings;
create policy "halisaha_match_ratings_select" on public.halisaha_match_ratings for select using (true);
drop policy if exists "halisaha_match_ratings_insert" on public.halisaha_match_ratings;
create policy "halisaha_match_ratings_insert" on public.halisaha_match_ratings for insert with check (true);
drop policy if exists "halisaha_match_ratings_update" on public.halisaha_match_ratings;
create policy "halisaha_match_ratings_update" on public.halisaha_match_ratings for update using (true);

grant select, insert on public.halisaha_matches to anon, authenticated;
grant select, insert on public.halisaha_match_player_stats to anon, authenticated;
grant select, insert, update on public.halisaha_match_ratings to anon, authenticated;

-- ============================================================================
-- Kurulum sonrası: admin PIN'inizi ayarlamayı unutmayın (bkz. yukarıdaki yorum,
-- bölüm 4). Örnek:
--   insert into public.halisaha_settings (key, value)
--     values ('admin_pin_hash', crypt('SIZIN_PININIZ', gen_salt('bf')))
--     on conflict (key) do update set value = excluded.value;
-- ============================================================================
