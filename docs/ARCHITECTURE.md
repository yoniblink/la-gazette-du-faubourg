# Architecture (hybride, orientée production)

Le routing reste dans `app/` (Next App Router). Le code applicatif est progressivement organisé dans `modules/` pour clarifier les responsabilités et faciliter l’ajout de features.

## Arborescence cible

- `modules/public/*`: UI + logique de la partie publique (sections home, layout public, etc.).
- `modules/admin/*`: UI + actions server de l’admin.
- `modules/shared/*`: UI générique, providers, composants transverses.
- `modules/data/*`: accès données (server-only), queries, mappers.

## Conventions

### Client vs server

- Les server actions vivent dans `modules/*/server/**` (`\"use server\"`).
- Les composants client vivent dans `modules/*/ui/**` (`\"use client\"` si nécessaire).
- Objectif: éviter d’importer du “server-only” dans des composants client.

### Imports

- Utiliser l’alias `@/` pour des chemins stables.
- Utiliser des points d’entrée (barrels) quand ça clarifie (ex. `modules/public/ui`), mais sans masquer des dépendances importantes.

### Migration progressive

Pour éviter les gros changements risqués:
- on crée d’abord des **façades** (`modules/**/index.ts`) qui re-exportent l’existant ;
- puis on déplace/renomme au fil de l’eau (par feature), en gardant `lint/typecheck/build` verts à chaque étape.

