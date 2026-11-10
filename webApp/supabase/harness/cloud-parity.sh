#!/usr/bin/env bash
# b1 contra la nube SIN escribir en producción.
#
# b1-postgrest-attacks.sh crea usuarios, publica un curso de ataque y debilita un CHECK un rato:
# contra la base real ensuciaría el catálogo y mandaría mails de confirmación. Lo que b1 prueba
# depende solo de la superficie de seguridad (grants, RLS, policies, funciones, constraints), así
# que esto la compara, en una transacción READ ONLY, contra el stack local donde b1 pasa.
# Igual superficie = igual resultado de b1. Además confirma que ningún CHECK use clases POSIX
# (dependen del locale, migración 0012).
#
# Uso:  npx supabase start && bash supabase/harness/b1-postgrest-attacks.sh   # b1 verde local
#       bash supabase/harness/cloud-parity.sh                                  # misma superficie
# Lee SUPABASE_DB_PASSWORD de webApp/.env.local. Sale 0 si no hay diferencias fuera de las
# esperadas (tablas internas `storage.iceberg_*` que trae solo el stack local).
set -uo pipefail
cd "$(dirname "$0")"
REF=${REF:-ovjxgggytdajadlxqety}
HOST=${HOST:-aws-1-us-west-2.pooler.supabase.com}
DBC=${DBC:-supabase_db_webApp}
PW=$(grep -E '^SUPABASE_DB_PASSWORD=' ../../.env.local | cut -d= -f2- | sed 's/^"//;s/"$//')
[ -n "$PW" ] || { echo "falta SUPABASE_DB_PASSWORD en webApp/.env.local"; exit 2; }

tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT
{ echo "begin transaction read only;"; cat security-surface.sql; echo "rollback;"; } > "$tmp/q.sql"

docker exec -i "$DBC" psql -U postgres -d postgres -tA -q < "$tmp/q.sql" > "$tmp/local" || { echo "no pude leer el stack local"; exit 2; }
docker exec -i -e PGPASSWORD="$PW" "$DBC" psql \
  "host=$HOST port=5432 user=postgres.$REF dbname=postgres sslmode=require" -tA -q < "$tmp/q.sql" > "$tmp/cloud" \
  || { echo "no pude leer la nube"; exit 2; }

diff "$tmp/local" "$tmp/cloud" | grep -E '^[<>]' | grep -v 'storage\.iceberg_' > "$tmp/diff"
posix=$(grep -E '^posix\|' "$tmp/cloud" | cut -d'|' -f2)

echo "local: $(wc -l < "$tmp/local") hechos · nube: $(wc -l < "$tmp/cloud") hechos"
if [ "$posix" != "0" ]; then echo "FALLA: $posix definiciones con clases POSIX en la nube (dependen del locale, 0012)"; exit 1; fi
if [ -s "$tmp/diff" ]; then
  echo "DIFERENCIAS (< solo local, > solo nube):"; cat "$tmp/diff"
  echo "Una migración nueva sin aplicar en la nube aparece como '<'. Cualquier '>' es deriva: revisar."
  exit 1
fi
echo "OK: la nube tiene la misma superficie de seguridad que el stack local."
