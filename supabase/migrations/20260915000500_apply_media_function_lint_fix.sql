do $migration$
declare
  definition text;
begin
  select pg_get_functiondef(
    'public.finalize_business_media(uuid,uuid,uuid,text,text,jsonb)'::regprocedure
  ) into definition;

  definition := replace(
    definition,
    'previous_groups uuid[] := ''{}'';',
    'previous_groups uuid[] := array[]::uuid[];'
  );
  definition := replace(
    definition,
    'previous_paths text[] := ''{}'';',
    'previous_paths text[] := array[]::text[];'
  );
  execute definition;
end;
$migration$;
