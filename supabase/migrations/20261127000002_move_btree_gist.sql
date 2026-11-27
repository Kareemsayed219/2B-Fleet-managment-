-- Keep extensions out of the exposed public schema (Supabase security advisor 0014).
alter extension btree_gist set schema extensions;
