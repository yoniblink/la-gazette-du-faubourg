-- Exécuter une fois dans Supabase : SQL Editor → New query → Run.
-- Remplace flipbook-pdf si tu utilises FLIPBOOK_STORAGE_BUCKET différent.
--
-- Ce script ne touche pas à Postgres (articles, etc.) : uniquement Storage.

-- 1) Bucket public (lecture site + URLs getPublicUrl pour PDF + images flipbook WebP)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'flipbook-pdf',
  'flipbook-pdf',
  true,
  52428800,
  NULL
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit;

-- 2) Lecture publique des fichiers (visiteurs + next/image)
-- (Si des policies existent déjà pour ce bucket, adapte ou supprime les doublons.)
DROP POLICY IF EXISTS "Lecture publique flipbook" ON storage.objects;
CREATE POLICY "Lecture publique flipbook"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'flipbook-pdf');

-- Les uploads passent par SUPABASE_SERVICE_ROLE_KEY côté serveur (hors politiques anon).
-- Pas de policy INSERT anon nécessaire pour ce flux.
