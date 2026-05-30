# ArtSango AI

Plateforme IA conversationnelle MVP pour aider les artisans africains a discuter avec une IA, generer des descriptions produits, ameliorer des textes, proposer des prix, creer des posts reseaux sociaux, travailler le branding et recevoir des conseils business.

## Architecture

- `src/app/page.tsx` : entree Next.js App Router.
- `src/components/chat/chat-app.tsx` : interface conversationnelle, sidebar, composer, uploads, conversations locales.
- `src/app/api/chat/route.ts` : API route Node.js securisee, aucune cle exposee au frontend.
- `src/lib/ai/models.ts` : configuration centralisee Build with AFRI pour chat, image, audio, video et ASR.
- `src/lib/ai/service.ts` : orchestration IA.
- `src/lib/ai/providers/openai-compatible.ts` : provider compatible `/chat/completions` utilise par Build with AFRI.
- `src/lib/ai/prompt.ts` : prompt systeme ArtSango AI.
- `src/lib/storage/conversations.ts` : persistance locale MVP via `localStorage`.
- `src/types/chat.ts` : types partages frontend/backend.

## Modeles configures

Modeles conversationnels disponibles dans le selecteur UI:

- `gpt-5.5` : production haut de gamme, vision, documents longs, raisonnement superieur.
- `claude-opus-4.7` : analyse profonde, strategie, raisonnement long, vision.

Modeles multimodaux prepares dans la configuration centrale:

- `gpt-image-2` via `POST /v1/images`.
- `gpt-audio-1.5` via `POST /v1/audio/speech`.
- `sora-2` via `POST /v1/videos/generations`.
- `afri-asr` via `POST /v1/audio/afri-asr/transcribe`.

## Variables d'environnement

Creer `.env.local` a partir de `.env.example`.

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

- Ne jamais prefixer la cle avec `NEXT_PUBLIC_`.
- `ARTSANGO_AI_BASE_URL` doit rester la racine API: `https://build.lewisnote.com/v1`.
- Les endpoints specifiques sont centralises dans `src/lib/ai/models.ts`.
- `ARTSANGO_AI_USE_MOCK=true` permet de tester l'interface sans provider reel.

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

## Deploiement Vercel

1. Pousser le projet sur GitHub.
2. Importer le repo dans Vercel.
3. Framework preset: `Next.js`.
4. Build command: `npm run build`.
5. Ajouter les variables d'environnement dans Vercel Project Settings.
6. Deployer.

## Ajouter un nouveau modele IA

Pour un modele conversationnel, modifier uniquement `src/lib/ai/models.ts` dans `AI_MODELS`:

```ts
{
  id: "nouveau-modele",
  label: "Nouveau modele",
  description: "Usage principal du modele.",
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

Pour un modele image/audio/video/ASR, ajouter une entree dans `AI_MEDIA_MODELS` avec son endpoint et ses parametres par defaut.

## Securite

- Les appels IA passent par `/api/chat` cote serveur.
- Les cles API restent dans `.env.local` ou les variables Vercel.
- Les conversations MVP sont stockees localement dans le navigateur.
- Les uploads sont limites cote UI a 3 fichiers de 3 Mo pour eviter des payloads trop lourds.

## Limites MVP

- Persistance locale uniquement, pas encore de compte utilisateur ni base de donnees.
- Le chat utilise maintenant `gpt-5.5` et `claude-opus-4.7` via Build with AFRI.
- Les modeles image/audio/video/ASR sont centralises et prets pour les prochaines routes API dediees.