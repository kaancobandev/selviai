-- ---------------------------------------------------------------
-- Selvi · Faz 3 — kalıcı depolama
--
-- Supabase panelinde SQL Editor'e yapıştırıp çalıştırın. (CLI'ya
-- geçtiğinizde bu dosyayı `supabase migration new` ile yeniden
-- oluşturun; elle yazılmış dosya adları migration geçmişini bozuyor.)
-- ---------------------------------------------------------------

-- 1) Üretilen kompozisyonların kaydı --------------------------------
create table if not exists public.compositions (
  id            uuid primary key,
  -- Faz 4'te kimlik doğrulama gelince dolacak. Şu an null: üretim
  -- anonim yapılıyor ve kayıtlar yalnızca sunucudan okunuyor.
  user_id       uuid references auth.users (id) on delete cascade,
  created_at    timestamptz not null default now(),

  -- üretim
  model         text not null,
  duration_ms   integer,
  attempt       smallint,
  attempts      jsonb,

  -- kabul kapısı
  accepted      boolean,
  score         numeric(4, 2),
  reason        text,

  -- kullanıcının seçtiği parametreler
  crop          text,
  placement     text,
  lighting      text,
  aspect        text,
  note          text,

  -- depodaki dosya
  image_path    text not null,
  image_bytes   integer,
  mime_type     text
);

-- Kimlik dogrulama gelene kadar kayitlar anonim bir tarayici oturumuna
-- baglanir. Galeri bununla kapsamlanir: kimse baskasinin karesini
-- listeleyemez. Faz 4'te oturum kayitlari user_id'ye devredilecek.
alter table public.compositions add column if not exists session_id text;

create index if not exists compositions_user_created_idx
  on public.compositions (user_id, created_at desc);
create index if not exists compositions_session_created_idx
  on public.compositions (session_id, created_at desc);

-- 2) RLS — açık şemadaki her tablo için zorunlu ----------------------
-- Sunucu gizli anahtarla yazıyor ve RLS'i atlıyor. Politikalar Faz 4
-- içindir: kullanıcı yalnızca kendi kayıtlarını görebilsin.
alter table public.compositions enable row level security;

drop policy if exists "kendi kayıtlarını görür" on public.compositions;
create policy "kendi kayıtlarını görür"
  on public.compositions for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "kendi kaydını siler" on public.compositions;
create policy "kendi kaydını siler"
  on public.compositions for delete
  to authenticated
  using (auth.uid() = user_id);

-- 3) Depolama kovası ------------------------------------------------
-- ÖZEL kova: yüz fotoğrafı içeren çıktılar herkese açık olamaz.
-- Görseller uygulamanın kendi /api/kare/:id ucundan servis edilir,
-- imzalı URL'e gerek yok ve yetki kontrolü tek yerde kalır.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('compositions', 'compositions', false, 2097152,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Kovaya erişim yalnızca sunucudan (gizli anahtar) olduğu için
-- storage.objects üzerinde politikaya gerek yok; RLS zaten açık ve
-- anonim/oturumlu roller için hiçbir politika tanımlı değil.

-- 4) Data API yetkileri ---------------------------------------------
-- Proje "Automatically expose new tables" KAPALI kurulduğu için (Supabase'in
-- kendi tavsiyesi) yetkiler elle veriliyor. Sunucu tarafı gizli anahtarla
-- çalıştığı ve service_role bunları atladığı için Faz 3 bunlar olmadan da
-- çalışır; bu satırlar Faz 4 içindir: kullanıcı kendi galerisini tarayıcıdan
-- okuyabilsin. Hangi satırı göreceğini yukarıdaki RLS politikaları belirler.
-- service_role RLS'i atlar ama tablo yetkilerini ATLAMAZ. Proje
-- "Automatically expose new tables" kapali kuruldugunda bu yetki de
-- otomatik verilmiyor ve sunucu "permission denied" aliyor.
grant usage on schema public to service_role;
grant select, insert, update, delete on public.compositions to service_role;

-- Faz 4: kullanici kendi galerisini tarayicidan okusun.
grant usage on schema public to authenticated;
grant select, delete on public.compositions to authenticated;

-- anon rolüne kasten hiçbir yetki verilmiyor: oturumsuz kimse
-- kompozisyon kaydı okuyamaz.

-- 5) Girdi kovası ---------------------------------------------------
-- İstemci görselleri imzalı adresle doğrudan buraya yükler; API gövdesi
-- yalnızca yolları taşır. Girdiler ÜRETİM BİTİNCE SİLİNİR: yüz
-- fotoğrafları gereğinden uzun durmamalı ve üç girdi bir çıktıdan
-- büyük olduğu için 1 GB'lık alanı üç kat hızlı tüketirlerdi.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('inputs', 'inputs', false, 2097152,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
