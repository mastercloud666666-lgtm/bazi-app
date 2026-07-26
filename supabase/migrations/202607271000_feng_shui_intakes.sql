insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'feng-shui-intakes',
  'feng-shui-intakes',
  false,
  8388608,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

comment on column public.order_intakes.metadata is
  'Private operational metadata, including manual product details and private storage object references.';
