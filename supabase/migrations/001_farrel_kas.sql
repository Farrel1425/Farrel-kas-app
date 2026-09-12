-- FARREL KAS V1. Run once in a new Supabase project's SQL editor.
begin;
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (length(full_name) between 1 and 100),
  email text not null,
  role text not null default 'admin' check (role in ('master_admin','admin')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 2 and 100), description text not null default '',
  start_date date not null, end_date date not null check (end_date >= start_date),
  status text not null default 'active' check (status in ('active','completed','archived')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.project_admins (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  admin_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(), unique(project_id,admin_id)
);
create table public.categories (
  id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id),
  name text not null check (length(trim(name)) between 1 and 80),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(id,project_id)
);
create unique index category_name_unique on public.categories(project_id,lower(trim(name)));
create table public.transactions (
  id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id),
  category_id uuid not null, type text not null check (type in ('income','expense')),
  transaction_date date not null,
  amount numeric(16,2) not null check (amount > 0 and amount <= 99999999999999 and amount = trunc(amount)),
  description text not null check (length(trim(description)) between 1 and 2000), proof_path text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  foreign key (category_id,project_id) references public.categories(id,project_id) on delete restrict,
  check (proof_path is null or proof_path ~ ('^transactions/' || project_id::text || '/' || id::text || '/[a-f0-9-]+\.(jpg|png|pdf)$'))
);
create table public.share_links (
  id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id),
  token text not null unique check (token ~ '^[a-f0-9]{64}$'),
  is_active boolean not null default true, show_proof boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index on public.project_admins(admin_id,project_id);
create index on public.transactions(project_id,transaction_date desc,id);
create index on public.transactions(category_id);
create index on public.share_links(project_id);

create function private.is_master() returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.profiles where id = (select auth.uid()) and is_active and role = 'master_admin');
$$;
create function private.can_read(pid uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.profiles p where p.id = (select auth.uid()) and p.is_active and
    (p.role = 'master_admin' or exists(select 1 from public.project_admins a where a.admin_id=p.id and a.project_id=pid)));
$$;
create function private.can_write(pid uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select private.can_read(pid) and exists(select 1 from public.projects where id=pid and status <> 'archived');
$$;
revoke all on function private.is_master(), private.can_read(uuid), private.can_write(uuid) from public;
grant execute on function private.is_master(), private.can_read(uuid), private.can_write(uuid) to authenticated;

create function private.new_profile() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id,full_name,email) values(new.id, left(coalesce(nullif(new.raw_user_meta_data->>'full_name',''),'Admin'),100), new.email);
  return new;
end; $$;
create trigger create_profile after insert on auth.users for each row execute function private.new_profile();
create function private.sync_profile() returns trigger language plpgsql security definer set search_path='' as $$
begin
  update public.profiles set email=new.email,full_name=left(coalesce(nullif(new.raw_user_meta_data->>'full_name',''),'Admin'),100) where id=new.id;
  return new;
end; $$;
create trigger sync_profile after update of email,raw_user_meta_data on auth.users for each row execute function private.sync_profile();
create function private.stamp_update() returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at=now();
  if new.id is distinct from old.id then raise exception 'ID tidak dapat diubah'; end if;
  return new;
end; $$;
create function private.freeze_project_reference() returns trigger language plpgsql set search_path = '' as $$
begin
  if new.project_id is distinct from old.project_id then raise exception 'Transaksi dan kategori tidak dapat dipindah antar proyek'; end if;
  return new;
end; $$;
create trigger protect_category_project before update on public.categories for each row execute function private.freeze_project_reference();
create trigger protect_transaction_project before update on public.transactions for each row execute function private.freeze_project_reference();
create trigger protect_share_project before update on public.share_links for each row execute function private.freeze_project_reference();
create trigger stamp_profile before update on public.profiles for each row execute function private.stamp_update();
create trigger stamp_project before update on public.projects for each row execute function private.stamp_update();
create trigger stamp_category before update on public.categories for each row execute function private.stamp_update();
create trigger stamp_transaction before update on public.transactions for each row execute function private.stamp_update();
create trigger stamp_share before update on public.share_links for each row execute function private.stamp_update();

create function private.protect_archived_project() returns trigger language plpgsql set search_path='' as $$
begin
  if old.status='archived' and (new.name is distinct from old.name or new.description is distinct from old.description or new.start_date is distinct from old.start_date or new.end_date is distinct from old.end_date) then
    raise exception 'Buka kembali proyek sebelum mengeditnya';
  end if;
  return new;
end; $$;
create trigger protect_archived_project before update on public.projects for each row execute function private.protect_archived_project();

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_admins enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.share_links enable row level security;

revoke all on public.profiles, public.projects, public.project_admins, public.categories, public.transactions, public.share_links from anon;
grant select on public.profiles to authenticated;
grant select,insert,update on public.projects to authenticated;
grant select,insert,delete on public.project_admins to authenticated;
grant select,insert,update,delete on public.categories,public.transactions,public.share_links to authenticated;
grant all on public.profiles,public.projects,public.project_admins,public.categories,public.transactions,public.share_links to service_role;
-- Do not allow direct REST clients to forge creation metadata or move records.
revoke update on public.projects,public.categories,public.transactions,public.share_links from authenticated;
grant update(name,description,start_date,end_date,status) on public.projects to authenticated;
grant update(name) on public.categories to authenticated;
grant update(category_id,type,transaction_date,amount,description,proof_path) on public.transactions to authenticated;
grant update(is_active,show_proof) on public.share_links to authenticated;
-- Profile mutations go through the server-only Auth administration API.
revoke insert,update,delete on public.profiles from authenticated;
revoke delete on public.projects from authenticated;
create policy profiles_read on public.profiles for select to authenticated using (id=(select auth.uid()) or private.is_master());
create policy projects_read on public.projects for select to authenticated using (private.can_read(id));
create policy projects_insert on public.projects for insert to authenticated with check (private.is_master() and created_by=(select auth.uid()));
create policy projects_update on public.projects for update to authenticated using (private.is_master()) with check (private.is_master());
create policy assignments_read on public.project_admins for select to authenticated using (private.can_read(project_id));
create policy assignments_insert on public.project_admins for insert to authenticated with check (private.is_master() and private.can_write(project_id));
create policy assignments_delete on public.project_admins for delete to authenticated using (private.is_master() and private.can_write(project_id));
create policy categories_read on public.categories for select to authenticated using (private.can_read(project_id));
create policy categories_insert on public.categories for insert to authenticated with check (private.can_write(project_id));
create policy categories_update on public.categories for update to authenticated using (private.can_write(project_id)) with check (private.can_write(project_id));
create policy categories_delete on public.categories for delete to authenticated using (private.can_write(project_id));
create policy transactions_read on public.transactions for select to authenticated using (private.can_read(project_id));
create policy transactions_insert on public.transactions for insert to authenticated with check (private.can_write(project_id) and created_by=(select auth.uid()));
create policy transactions_update on public.transactions for update to authenticated using (private.can_write(project_id)) with check (private.can_write(project_id));
create policy transactions_delete on public.transactions for delete to authenticated using (private.can_write(project_id));
create policy shares_read on public.share_links for select to authenticated using (private.can_read(project_id));
create policy shares_insert on public.share_links for insert to authenticated with check (private.can_write(project_id) and created_by=(select auth.uid()));
create policy shares_update on public.share_links for update to authenticated using (private.can_write(project_id)) with check (private.can_write(project_id));
create policy shares_delete on public.share_links for delete to authenticated using (private.can_write(project_id));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('transaction-proofs','transaction-proofs',false,4194304,array['image/jpeg','image/png','application/pdf']);
create function private.proof_access(path text, writing boolean) returns boolean language plpgsql stable security definer set search_path='' as $$
declare pid uuid; tid uuid;
begin
  if path !~ '^transactions/[a-f0-9-]{36}/[a-f0-9-]{36}/[a-f0-9-]+\.(jpg|png|pdf)$' then return false; end if;
  begin pid=split_part(path,'/',2)::uuid; tid=split_part(path,'/',3)::uuid; exception when invalid_text_representation then return false; end;
  return (case when writing then private.can_write(pid) else private.can_read(pid) end)
    and exists(select 1 from public.transactions where id=tid and project_id=pid);
end; $$;
revoke all on function private.proof_access(text,boolean) from public;
grant execute on function private.proof_access(text,boolean) to authenticated;
create policy proof_read on storage.objects for select to authenticated using (bucket_id='transaction-proofs' and private.proof_access(name,false));
create policy proof_insert on storage.objects for insert to authenticated with check (bucket_id='transaction-proofs' and private.proof_access(name,true));
create policy proof_delete on storage.objects for delete to authenticated using (bucket_id='transaction-proofs' and private.proof_access(name,true));
-- No public table / storage read policy. Public links are checked on the server.
commit;
