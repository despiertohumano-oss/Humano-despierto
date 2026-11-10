-- Superficie de seguridad de la base, una línea por hecho: grants a anon/authenticated (tabla y
-- columna), RLS, policies, execute de funciones (+ hash del cuerpo), triggers, constraints y
-- migraciones. Solo SELECT. La usa cloud-parity.sh para comparar la nube con el stack local.
select line from (
  select 'tab|'||grantee||'|'||table_schema||'.'||table_name||'|'||privilege_type as line
    from information_schema.role_table_grants
   where table_schema in ('public','storage') and grantee in ('anon','authenticated','public')
  union all
  select 'col|'||grantee||'|'||table_name||'.'||column_name||'|'||privilege_type
    from information_schema.column_privileges
   where table_schema = 'public' and grantee in ('anon','authenticated','public')
  union all
  select 'rls|'||n.nspname||'.'||c.relname||'|'||c.relrowsecurity||'|'||c.relforcerowsecurity
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname in ('public','storage') and c.relkind in ('r','p')
  union all
  select 'pol|'||schemaname||'.'||tablename||'|'||policyname||'|'||cmd||'|'||roles::text||'|'||md5(coalesce(qual,'')||'#'||coalesce(with_check,''))
    from pg_policies where schemaname in ('public','storage')
  union all
  select 'fn|'||p.oid::regprocedure::text||'|anon='||has_function_privilege('anon',p.oid,'execute')||'|auth='||has_function_privilege('authenticated',p.oid,'execute')||'|definer='||p.prosecdef||'|'||md5(pg_get_functiondef(p.oid))
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.prokind = 'f'
  union all
  select 'trg|'||c.relname||'|'||t.tgname||'|'||t.tgenabled::text
    from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and not t.tgisinternal
  union all
  select 'con|'||conrelid::regclass::text||'|'||conname||'|'||md5(pg_get_constraintdef(oid))
    from pg_constraint where connamespace = 'public'::regnamespace
  union all
  select 'mig|'||version from supabase_migrations.schema_migrations
  union all
  select 'posix|'||((select count(*) from pg_constraint where connamespace = 'public'::regnamespace and pg_get_constraintdef(oid) like '%[[:%')
                 + (select count(*) from pg_proc where pronamespace = 'public'::regnamespace and prokind = 'f' and pg_get_functiondef(oid) like '%[[:%'))
) s order by line;
