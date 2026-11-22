-- Pokreni jednom u Supabase SQL Editoru, ako tablica notes još ne postoji.

create table notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references auth.users(id),
  content text not null
);

alter table notes enable row level security;

grant select, insert, update, delete
on notes to authenticated;

create policy "Samo vlastite bilješke"
on notes
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
