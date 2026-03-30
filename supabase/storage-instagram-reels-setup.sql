-- Exécuter une fois dans Supabase : SQL Editor → Run.
-- Bucket pour les vidéos Reels (section Instagram). Nom par défaut : instagram-reels
-- (ou INSTAGRAM_REELS_STORAGE_BUCKET dans .env).

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'instagram-reels',
  'instagram-reels',
  true,
  104857600,
  NULL
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit;

DROP POLICY IF EXISTS "Lecture publique instagram reels" ON storage.objects;
CREATE POLICY "Lecture publique instagram reels"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'instagram-reels');
