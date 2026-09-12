import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

test("migration and real PostgreSQL RLS isolate projects, inactive users, archived writes, categories and proofs", async () => {
  const db = new PGlite();
  const master = "00000000-0000-4000-8000-000000000001",
    admin = "00000000-0000-4000-8000-000000000002",
    other = "00000000-0000-4000-8000-000000000003",
    coadmin = "00000000-0000-4000-8000-000000000004";
  const p1 = "10000000-0000-4000-8000-000000000001",
    p2 = "10000000-0000-4000-8000-000000000002",
    c1 = "20000000-0000-4000-8000-000000000001",
    c2 = "20000000-0000-4000-8000-000000000002",
    tx = "30000000-0000-4000-8000-000000000001";
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; create schema storage;
      create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      grant usage on schema auth,public,storage to authenticated,anon,service_role;
      grant execute on function auth.uid() to authenticated;
      create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
      create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);
      alter table storage.objects enable row level security;
      grant select,insert,update,delete on storage.objects to authenticated;
    `);
    await db.exec(
      await readFile(
        new URL("../supabase/migrations/001_farrel_kas.sql", import.meta.url),
        "utf8",
      ),
    );
    await db.exec(`insert into auth.users(id,email,raw_user_meta_data) values
      ('${master}','master@example.com','{"full_name":"Master","role":"master_admin"}'),
      ('${admin}','admin@example.com','{"full_name":"Admin"}'),
      ('${other}','other@example.com','{"full_name":"Other"}'),
      ('${coadmin}','co@example.com','{"full_name":"Co Admin"}');`);
    assert.equal(
      (
        await db.query<{ role: string }>(
          `select role from public.profiles where id='${master}'`,
        )
      ).rows[0].role,
      "admin",
      "signup metadata cannot grant master role",
    );
    await db.exec(`update public.profiles set role='master_admin' where id='${master}';
      insert into public.projects(id,name,start_date,end_date,created_by) values ('${p1}','Project A','2026-01-01','2026-12-31','${master}'),('${p2}','Project B','2026-01-01','2026-12-31','${master}');
      insert into public.project_admins(project_id,admin_id) values ('${p1}','${admin}'),('${p1}','${coadmin}'),('${p2}','${other}');
      insert into public.categories(id,project_id,name) values ('${c1}','${p1}','Pengurus'),('${c2}','${p2}','Pengurus');
      insert into public.transactions(id,project_id,category_id,type,amount,description,transaction_date,created_by) values ('${tx}','${p1}','${c1}','income',2000000,'Dana awal','2026-09-12','${admin}');`);
    const as = async (id: string) => {
      await db.exec(
        `reset role; select set_config('request.jwt.claim.sub','${id}',false);set role authenticated;`,
      );
    };
    await as(admin);
    assert.equal(
      (await db.query("select * from public.projects")).rows.length,
      1,
    );
    assert.equal(
      (await db.query(`select * from public.projects where id='${p2}'`)).rows
        .length,
      0,
    );
    await assert.rejects(
      db.exec(
        `insert into public.transactions(project_id,category_id,type,amount,description,transaction_date,created_by) values ('${p2}','${c2}','income',100,'Forbidden','2026-09-12','${admin}')`,
      ),
    );
    await assert.rejects(
      db.exec(
        `insert into public.transactions(project_id,category_id,type,amount,description,transaction_date,created_by) values ('${p1}','${c2}','income',100,'Wrong category','2026-09-12','${admin}')`,
      ),
    );
    await assert.rejects(
      db.exec(
        `update public.profiles set role='master_admin' where id='${admin}'`,
      ),
    );
    await assert.rejects(
      db.exec(
        `update public.transactions set created_by='${master}' where id='${tx}'`,
      ),
    );
    await assert.rejects(
      db.exec(
        `update public.categories set project_id='${p2}' where id='${c1}'`,
      ),
    );
    await assert.rejects(
      db.exec(`delete from public.categories where id='${c1}'`),
    );
    await db.exec(
      `update public.categories set name='Pengurus Pemuda' where id='${c1}'`,
    );
    await as(coadmin);
    assert.equal(
      (
        await db.query(
          `update public.transactions set description='Updated by colleague' where id='${tx}' returning id`,
        )
      ).rows.length,
      1,
    );
    const path = `transactions/${p1}/${tx}/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.jpg`;
    await db.exec(
      `insert into storage.objects(bucket_id,name) values ('transaction-proofs','${path}')`,
    );
    await assert.rejects(
      db.exec(
        `insert into storage.objects(bucket_id,name) values ('transaction-proofs','transactions/${p2}/${tx}/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.jpg')`,
      ),
    );
    await as(other);
    assert.equal(
      (await db.query("select * from storage.objects")).rows.length,
      0,
    );
    await as(master);
    assert.equal(
      (await db.query("select * from public.projects")).rows.length,
      2,
    );
    await db.exec(
      `update public.projects set status='completed' where id='${p1}'`,
    );
    await as(admin);
    assert.equal(
      (
        await db.query(
          `update public.transactions set amount=2500000 where id='${tx}' returning id`,
        )
      ).rows.length,
      1,
    );
    await as(master);
    await db.exec(
      `update public.projects set status='archived' where id='${p1}'`,
    );
    await assert.rejects(
      db.exec(
        `update public.projects set name='Changed archived name' where id='${p1}'`,
      ),
    );
    assert.equal(
      (
        await db.query(
          `update public.transactions set amount=1 where id='${tx}' returning id`,
        )
      ).rows.length,
      0,
      "even master cannot edit archived transactions",
    );
    await as(admin);
    assert.equal(
      (
        await db.query(
          `delete from public.transactions where id='${tx}' returning id`,
        )
      ).rows.length,
      0,
    );
    await assert.rejects(
      db.exec(
        `insert into public.categories(project_id,name) values ('${p1}','New category')`,
      ),
    );
    await as(master);
    await db.exec(
      `update public.projects set status='active' where id='${p1}'`,
    );
    await as(admin);
    assert.equal(
      (
        await db.query(
          `update public.transactions set amount=3000000 where id='${tx}' returning id`,
        )
      ).rows.length,
      1,
    );
    await db.exec(
      `reset role;update public.profiles set is_active=false where id='${admin}';`,
    );
    await as(admin);
    assert.equal(
      (await db.query("select * from public.transactions")).rows.length,
      0,
    );
    assert.equal(
      (await db.query("select * from public.projects")).rows.length,
      0,
    );
    await db.exec("reset role;set role anon;");
    await assert.rejects(db.query("select * from public.transactions"));
    await assert.rejects(db.query("select * from public.share_links"));
  } finally {
    await db.close();
  }
});
