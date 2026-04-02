# Modules (architecture hybride)

Ce dossier introduit une séparation explicite par responsabilités, sans changer le routing Next (qui reste dans `app/`).

## Convention

- `modules/public/*`: logique et UI propres aux pages publiques.
- `modules/admin/*`: UI et logique propres à l’admin.
- `modules/shared/*`: composants UI génériques, helpers UI, providers.
- `modules/data/*`: accès données (server-only) et modèles/queries.

Migration progressive: tant que des fichiers sont encore dans `components/` ou `lib/`, on peut ajouter des “façades” (re-export) dans `modules/*` pour migrer sans casser.

