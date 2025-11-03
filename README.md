# PromptForge

PromptForge aide à générer des prompts optimisés pour modèles d'IA (ChatGPT, Claude...) via une interface simple et un endpoint serveur qui appelle un provider externe.

## Fonctionnalités

- Formulaire : Profil, Niveau d'expertise, Objectif, Contexte, Contraintes
- Génération de prompt optimisé + processus de réflexion (thinking)
- Historique local (localStorage) et option de sauvegarde côté serveur (Supabase — optionnel)
- Mode démo si l'API externe n'est pas configurée

## Stack

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS
- Framer Motion
- lucide-react (icônes)

## Prérequis

- Node.js 18+
- npm / pnpm / yarn

## Installation

1. Cloner le dépôt

```bash
git clone <votre-repo-url>
cd promptforge
```

2. Installer les dépendances

```bash
npm install
# ou pnpm install
```

3. Copier les variables d'environnement

Créez un fichier `.env.local` et renseignez les variables nécessaires (exemples ci-dessous).

### Variables pour la génération (OpenAI ou provider compatible)

```
OPENAI_API_KEY=sk-xxxxxx
API_URL=https://api.openai.com/v1/chat/completions # optionnel
MODEL_NAME=gpt-4o-mini # optionnel
```

### Variables Supabase (optionnel)

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=public-anon-key
SUPABASE_SERVICE_ROLE_KEY=service-role-key  # uniquement côté serveur si nécessaire
```

> Remarque : si aucune clé d'API externe n'est fournie, l'application propose un mode démo local avec un prompt et un thinking prédéfinis.

## Scripts utiles

```bash
npm run dev    # lance le serveur en développement
npm run build  # build de production
npm run start  # démarre la version buildée
```

## Endpoints API

- `POST /api/generate` — endpoint prévu pour appeler le provider externe et générer le prompt.
- `POST /api/generate2` — route de secours ajoutée (si vous trouvez `app/api/generate/route.ts` corrompu). Elle renvoie des erreurs détaillées pour faciliter le debug.

Réponse attendue (JSON) :

```json
{
  "thinking": "...détails du raisonnement...",
  "prompt": "...prompt optimisé..."
}
```

## Debug & erreurs communes

- `Property 'getSession' does not exist on type 'SupabaseAuthClient'` :
  - L'API d'auth Supabase a évolué selon les versions. Vérifiez la version installée et utilisez la méthode adaptée :
    - client JS récent : `supabase.auth.getSession()` (ou `supabase.auth.getUser()` selon la version)
    - helpers Next.js : importer `getSession` / `getUser` depuis `@supabase/auth-helpers-nextjs` si utilisé côté serveur

- Erreur « Erreur lors de la génération » côté client :
  - Vérifiez que `OPENAI_API_KEY` (ou variable provider) est définie
  - Ouvrez la console (server) pour voir les détails renvoyés par l'API externe
  - Si l'API renvoie du texte non-JSON, l'endpoint fait un fallback et renvoie le texte brut

## Vérifications avant commit / push

- Ne commitez jamais `.env.local`
- Lancer `npm run build` localement pour vérifier TypeScript

## Contribution

1. Fork
2. Créer une branche feature/x
3. PR avec description claire

## Licence

MIT (par défaut) — adaptez selon vos besoins.

---

Si vous voulez que je :

- répare/écrase `app/api/generate/route.ts` corrompu et renomme `generate2` en `generate`, je peux le faire ;
- ajoute des scripts de check (lint/typecheck) et une CI GitHub simple ;
- génère un `CONTRIBUTING.md` et `CODE_OF_CONDUCT`.

Dites-moi ce que vous préférez et je l'applique.
