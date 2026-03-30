-- Exécuter une fois dans Supabase : SQL Editor → Run.
-- Images « Médiathèque » admin (articles). Nom par défaut : site-media
-- (ou MEDIA_STORAGE_BUCKET dans .env).

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'site-media',
  'site-media',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Lecture publique site media" ON storage.objects;
CREATE POLICY "Lecture publique site media"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'site-media');

-- Les uploads passent par URL signée générée avec SUPABASE_SERVICE_ROLE_KEY (API admin).
