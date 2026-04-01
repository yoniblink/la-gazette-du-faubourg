-- Exécuter une fois dans Supabase : SQL Editor -> Run.
-- Bucket PDF media-kit (page /le-media-kit). Nom par défaut : media-kit
-- (ou MEDIA_KIT_STORAGE_BUCKET dans .env).

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media-kit',
  'media-kit',
  true,
  41943040,
  ARRAY['application/pdf']::text[]
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Lecture publique media kit" ON storage.objects;
CREATE POLICY "Lecture publique media kit"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'media-kit');

-- Les uploads passent par URL signée générée côté serveur avec SUPABASE_SERVICE_ROLE_KEY.
