# ArtSango AI

Plateforme IA conversationnelle MVP pour aider les artisans africains à discuter avec une IA, générer des descriptions produits, améliorer des textes, proposer des prix, créer des posts réseaux sociaux, travailler le branding et recevoir des conseils business.

## Architecture

- `src/app/page.tsx` : entrée Next.js App Router.
- `src/components/chat/chat-app.tsx` : interface conversationnelle, sidebar, composer, uploads, conversations locales.
- `src/app/api/chat/route.ts` : API route Node.js sécurisée, aucune clé exposée au frontend.
- `src/lib/ai/models.ts` : configuration centralisée Build with AFRI pour chat, image, audio, vidéo et ASR.
- `src/lib/ai/service.ts` : orchestration IA.
- `src/lib/ai/providers/openai-compatible.ts` : provider compatible `/chat/completions` utilisé par Build with AFRI.
- `src/lib/ai/prompt.ts` : prompt système ArtSango AI.
- `src/lib/storage/conversations.ts` : persistance locale MVP via `localStorage`.
- `src/types/chat.ts` : types partagés frontend/backend.

## Modèles configurés

Modèles conversationnels disponibles dans le sélecteur UI:

- `gpt-5.5` : production haut de gamme, vision, documents longs, raisonnement supérieur.
- `claude-opus-4.7` : analyse profonde, stratégie, raisonnement long, vision.

Modèles multimodaux préparés dans la configuration centrale:

- `gpt-image-2` via `POST /v1/images`.
- `gpt-audio-1.5` via `POST /v1/audio/speech`.
- `sora-2` via `POST /v1/videos/generations`.
- `afri-asr` via `POST /v1/audio/afri-asr/transcribe`.

## Variables d'environnement

Créer `.env.local` à partir de `.env.example`.

```bash
ARTSANGO_AI_API_KEY=your_server_side_key
ARTSANGO_AI_BASE_URL=https://build.lewisnote.com/v1
ARTSANGO_AI_PROVIDER=build-with-afri

ARTSANGO_AI_GPT55_MODEL=gpt-5.5
ARTSANGO_AI_CLAUDE_OPUS_MODEL=claude-opus-4.7
ARTSANGO_AI_IMAGE_MODEL=gpt-image-2
ARTSANGO_AI_TTS_MODEL=gpt-audio-1.5
ARTSANGO_AI_VIDEO_MODEL=sora-2

ARTSANGO_AI_USE_MOCK=false
```

Notes:

- Ne jamais préfixer la clé avec `NEXT_PUBLIC_`.
- `ARTSANGO_AI_BASE_URL` doit rester la racine API: `https://build.lewisnote.com/v1`.
- Les endpoints spécifiques sont centralisés dans `src/lib/ai/models.ts`.
- `ARTSANGO_AI_USE_MOCK=true` permet de tester l'interface sans provider réel.

## Lancement local

```bash
npm install
copy .env.example .env.local
npm run dev
```

Ouvrir `http://localhost:3000`.

Pour valider la production:

```bash
npm run typecheck
npm run build
npm run start
```

## Déploiement Vercel

1. Pousser le projet sur GitHub.
2. Importer le repo dans Vercel.
3. Framework preset: `Next.js`.
4. Build command: `npm run build`.
5. Ajouter les variables d'environnement dans Vercel Project Settings.
6. Déployer.

## Ajouter un nouveau modèle IA

Pour un modèle conversationnel, modifier uniquement `src/lib/ai/models.ts` dans `AI_MODELS`:

```ts
{
  id: "nouveau-modele",
  label: "Nouveau modèle",
  description: "Usage principal du modèle.",
  badge: "New",
  capability: "chat",
  provider: "build-with-afri",
  providerModel: "provider-model-name",
  envModelKey: "ARTSANGO_AI_NEW_MODEL",
  endpoint: "/chat/completions",
  temperature: 0.6,
  maxTokens: 1200,
  supports: ["text", "image", "file"],
}
```

Puis ajouter la variable correspondante dans `.env.local` et Vercel:

```bash
ARTSANGO_AI_NEW_MODEL=provider-model-name
```

Pour un modèle image/audio/vidéo/ASR, ajouter une entrée dans `AI_MEDIA_MODELS` avec son endpoint et ses paramètres par défaut.

## Sécurité

- Les appels IA passent par `/api/chat` côté serveur.
- Les clés API restent dans `.env.local` ou les variables Vercel.
- Les conversations MVP sont stockées localement dans le navigateur.
- Les uploads sont limités côté UI à 3 fichiers de 3 Mo pour éviter des payloads trop lourds.

## Limites MVP

- Persistance locale uniquement, pas encore de compte utilisateur ni base de données.
- Le chat utilise maintenant `gpt-5.5` et `claude-opus-4.7` via Build with AFRI.
- Les modèles image/audio/vidéo/ASR sont centralisés et prêts pour les prochaines routes API dédiées.