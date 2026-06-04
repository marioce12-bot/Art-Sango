# ArtSango IA Chat MVP

Interface conversationnelle type ChatGPT/Claude pour ArtSango:
- modes: `generate_image`, `product_description`, `improve_text`, `suggest_price`, `social_posts`
- conversations sauvegardees
- sorties IA sauvegardees
- endpoint backend securise (cle API cote serveur)

## Installation

```bash
npm install
cp .env.example .env
# remplir ANTHROPIC_API_KEY dans .env
npm run dev
```

Ouvrir: `http://localhost:3000/artsango-ia.html`

## API

- `GET /api/conversations`
- `POST /api/conversations`
- `GET /api/conversations/:id`
- `GET /api/outputs`
- `POST /api/chat`

## Persistance MVP

Le stockage local est dans `data/db.json` (base JSON locale pour MVP).

## Integration produit

Actions disponibles sur les reponses IA:
- copier texte
- envoyer vers description produit
- envoyer vers prix produit

Les donnees sont posees en `localStorage`:
- `artsango_product_draft`
- `artsango_last_ai_output`

Le dashboard/form produit peut lire ces cles pour pre-remplir les champs.
