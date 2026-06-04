const express = require('express');
const path = require('path');
const fs = require('fs');
const { getPublicKey, sendPushNotifications } = require('./push-service');

const app = express();
app.use(express.json({ limit: '20mb' }));
app.use(express.static(__dirname));

app.get('/api/push', (req, res) => {
  res.json({ publicKey: getPublicKey() });
});

app.post('/api/push', async (req, res) => {
  try {
    const subscriptions = Array.isArray(req.body?.subscriptions) ? req.body.subscriptions : [];
    const notification = req.body?.notification || {};
    if (!subscriptions.length) {
      return res.status(400).json({ error: 'Aucune souscription push fournie.' });
    }

    const result = await sendPushNotifications(subscriptions, notification);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Erreur push.' });
  }
});

// ── Config ──────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;

function normalizeBaseUrl(value) {
  return cleanEnv(value).replace(/\/+$/, '');
}

function cleanEnv(value) {
  return String(value || '').trim();
}

const AI_PROVIDER = cleanEnv(process.env.ARTSANGO_AI_PROVIDER || process.env.AI_PROVIDER || process.env.OPENAI_PROVIDER || 'openai');
const AI_BASE_URL = normalizeBaseUrl(
  process.env.ARTSANGO_AI_BASE_URL ||
  process.env.AI_BASE_URL ||
  process.env.OPENAI_BASE_URL ||
  'https://api.openai.com/v1'
);
const AI_API_KEY = cleanEnv(
  process.env.ARTSANGO_AI_API_KEY ||
  process.env.ARTSANGO_AI_KEY ||
  process.env.ARTSANGO_AI_GATEWAY_API_KEY ||
  process.env.AI_GATEWAY_API_KEY ||
  process.env.VERCEL_AI_GATEWAY_API_KEY ||
  process.env.AI_API_KEY ||
  process.env.OPENAI_API_KEY ||
  ''
);

const TEXT_MODEL =
  cleanEnv(process.env.ARTSANGO_AI_GPT55_MODEL ||
  process.env.AI_TEXT_MODEL ||
  process.env.OPENAI_TEXT_MODEL ||
  'gpt-4o-mini');
const IMAGE_MODEL =
  cleanEnv(process.env.ARTSANGO_AI_IMAGE_MODEL ||
  process.env.AI_IMAGE_MODEL ||
  process.env.OPENAI_IMAGE_MODEL ||
  'gpt-image-1');

function getAiStatus() {
  const missingEnv = [];
  if (!AI_API_KEY) missingEnv.push('ARTSANGO_AI_API_KEY ou AI_GATEWAY_API_KEY ou AI_API_KEY ou OPENAI_API_KEY');
  return {
    configured: missingEnv.length === 0,
    provider: AI_PROVIDER,
    baseUrl: AI_BASE_URL,
    textModel: TEXT_MODEL,
    imageModel: IMAGE_MODEL,
    missingEnv,
  };
}

// ── Persistance JSON simple ─────────────────────────────────────────────────
const DB_PATH = path.join(__dirname, 'data', 'db.json');

function ensureDB() {
  if (!fs.existsSync(path.dirname(DB_PATH))) fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({ conversations: [], outputs: [] }, null, 2));
  }
}

function readDB() {
  try {
    ensureDB();
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  } catch {
    return { conversations: [], outputs: [] };
  }
}

function writeDB(data) {
  ensureDB();
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

function getJsonErrorText(data, fallback = 'Erreur API IA') {
  if (!data) return fallback;
  if (typeof data.error === 'string') return data.error;
  if (typeof data.error?.message === 'string') return data.error.message;
  if (typeof data.message === 'string') return data.message;
  return fallback;
}

async function readProviderResponse(response, fallback) {
  const raw = await response.text();
  if (!raw.trim()) return null;

  try {
    return JSON.parse(raw);
  } catch {
    const preview = raw.trim().slice(0, 500);
    if (response.ok) {
      return { choices: [{ message: { content: preview } }] };
    }
    throw new Error(`${fallback}: réponse non JSON du fournisseur (${preview})`);
  }
}

function extractTextFromChatResponse(data) {
  const direct = data?.choices?.[0]?.message?.content;
  if (typeof direct === 'string') return direct.trim();
  if (Array.isArray(direct)) {
    return direct
      .map((p) => (typeof p === 'string' ? p : p?.text || ''))
      .join('')
      .trim();
  }
  return '';
}

function normalizeDataUrl(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string') return '';
  if (!dataUrl.startsWith('data:image/')) return '';
  return dataUrl;
}

function dataUrlToBlob(dataUrl) {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/i.exec(dataUrl || '');
  if (!match) throw new Error('Image invalide.');
  const mimeType = match[1];
  const base64 = match[2];
  const buffer = Buffer.from(base64, 'base64');
  const ext = mimeType.split('/')[1] || 'png';
  const blob = new Blob([buffer], { type: mimeType });
  return { blob, mimeType, ext };
}

function inferIntent(prompt, hasImage) {
  const text = (prompt || '').toLowerCase();

  const asksImage = /(g[eé]n[ée]r|cr[ée]e|fabrique|produis).*(image|visuel|affiche|illustration|logo)|image de|visuel de/.test(text);
  const asksImprove = /(am[eé]liore|retouche|optimise|corrige|upscale|am[ée]lioration|am[ée]liorer).*(image|photo|visuel)|am[eé]liore-la|am[eé]liore cette/.test(text);

  if (hasImage && asksImprove) return 'image_edit';
  if (!hasImage && asksImage) return 'image_generate';
  if (hasImage && !asksImprove) return 'image_edit';
  return 'text_chat';
}

async function requestTextReply({ prompt, imageDataUrl }) {
  const system = [
    'Tu es ArtSango AI, assistant pour artisans et artistes africains.',
    'Ta mission: aider en marketing, storytelling, descriptions produit, textes réseaux sociaux et accompagnement de visuels.',
    'Réponds toujours en français clair, concret et orienté action.',
    'Quand on parle d\'image, propose aussi un texte d\'accompagnement prêt à publier.',
  ].join(' ');

  const userMessage = imageDataUrl
    ? {
        role: 'user',
        content: [
          { type: 'text', text: prompt || 'Analyse cette image et propose une amélioration + texte d\'accompagnement.' },
          { type: 'image_url', image_url: { url: imageDataUrl } },
        ],
      }
    : { role: 'user', content: prompt || '' };

  const response = await fetch(`${AI_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${AI_API_KEY}`,
    },
    body: JSON.stringify({
      model: TEXT_MODEL,
      max_tokens: 900,
      messages: [
        { role: 'system', content: system },
        userMessage,
      ],
    }),
  });

  const data = await readProviderResponse(response, `Text API HTTP ${response.status}`);
  if (!response.ok) throw new Error(getJsonErrorText(data, `Text API HTTP ${response.status}`));

  const text = extractTextFromChatResponse(data);
  if (!text) throw new Error('Réponse texte vide du modèle IA.');
  return text;
}

async function requestImageGeneration({ prompt }) {
  const response = await fetch(`${AI_BASE_URL}/images/generations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${AI_API_KEY}`,
    },
    body: JSON.stringify({
      model: IMAGE_MODEL,
      prompt,
      size: '1024x1024',
      quality: 'high',
      n: 1,
      output_format: 'png',
    }),
  });

  const data = await readProviderResponse(response, `Image API HTTP ${response.status}`);
  if (!response.ok) throw new Error(getJsonErrorText(data, `Image API HTTP ${response.status}`));

  const item = data?.data?.[0] || null;
  const imageUrl = item?.url || (item?.b64_json ? `data:image/png;base64,${item.b64_json}` : '');
  if (!imageUrl) throw new Error('Image non retournée par le modèle.');
  return imageUrl;
}

async function requestImageEdit({ prompt, imageDataUrl }) {
  const { blob, ext } = dataUrlToBlob(imageDataUrl);
  const fd = new FormData();
  fd.append('model', IMAGE_MODEL);
  fd.append('prompt', prompt || 'Améliore cette image artisanale, conserve son identité et augmente la qualité.');
  fd.append('size', '1024x1024');
  fd.append('quality', 'high');
  fd.append('n', '1');
  fd.append('output_format', 'png');
  fd.append('image', blob, `upload.${ext}`);

  const response = await fetch(`${AI_BASE_URL}/images/edits`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${AI_API_KEY}`,
    },
    body: fd,
  });

  const data = await readProviderResponse(response, `Image edit API HTTP ${response.status}`);
  if (!response.ok) throw new Error(getJsonErrorText(data, `Image edit API HTTP ${response.status}`));

  const item = data?.data?.[0] || null;
  const imageUrl = item?.url || (item?.b64_json ? `data:image/png;base64,${item.b64_json}` : '');
  if (!imageUrl) throw new Error('Image améliorée non retournée par le modèle.');
  return imageUrl;
}

function saveOutput({ mode, prompt, reply, imageUrl, conversationId }) {
  const db = readDB();
  const output = {
    id: Date.now().toString(),
    mode,
    prompt,
    result: reply,
    imageUrl: imageUrl || '',
    createdAt: new Date().toISOString(),
  };

  db.outputs.unshift(output);

  if (conversationId) {
    const conv = db.conversations.find((c) => c.id === conversationId);
    if (conv) {
      conv.messages.push({ role: 'user', content: prompt, at: new Date().toISOString() });
      conv.messages.push({ role: 'assistant', content: reply, imageUrl: imageUrl || '', at: new Date().toISOString() });
    }
  }

  writeDB(db);
  return output;
}

// ── Routes conversations ─────────────────────────────────────────────────────
app.get('/api/conversations', (req, res) => {
  const db = readDB();
  res.json(db.conversations);
});

app.post('/api/conversations', (req, res) => {
  const db = readDB();
  const conv = {
    id: Date.now().toString(),
    title: req.body.title || 'Nouvelle conversation',
    messages: [],
    createdAt: new Date().toISOString(),
  };
  db.conversations.unshift(conv);
  writeDB(db);
  res.json(conv);
});

app.get('/api/conversations/:id', (req, res) => {
  const db = readDB();
  const conv = db.conversations.find((c) => c.id === req.params.id);
  if (!conv) return res.status(404).json({ error: 'Conversation introuvable' });
  res.json(conv);
});

app.get('/api/outputs', (req, res) => {
  const db = readDB();
  res.json(db.outputs);
});

// ── Route chatbot unifiée ────────────────────────────────────────────────────
app.get('/api/chat', (req, res) => {
  const status = getAiStatus();
  res.status(status.configured ? 200 : 503).json(status);
});

app.post('/api/chat', async (req, res) => {
  const { prompt = '', conversationId } = req.body || {};
  const imageDataUrl = normalizeDataUrl(req.body?.imageDataUrl || '');

  if (!prompt.trim() && !imageDataUrl) {
    return res.status(400).json({ error: 'Message ou image requis.' });
  }

  if ((prompt || '').trim().toLowerCase() === 'ping') {
    const status = getAiStatus();
    return res.status(status.configured ? 200 : 503).json({
      mode: 'status',
      reply: status.configured ? 'IA connectee.' : 'Configuration IA manquante.',
      ...status,
    });
  }

  const status = getAiStatus();
  if (!status.configured) {
    return res.status(500).json({
      error: `Configuration IA manquante: definis ${status.missingEnv.join(', ')} dans les variables d'environnement.`,
      ...status,
    });
  }

  const mode = inferIntent(prompt, Boolean(imageDataUrl));

  try {
    let reply = '';
    let imageUrl = '';

    if (mode === 'image_generate') {
      imageUrl = await requestImageGeneration({ prompt });
      reply = await requestTextReply({
        prompt: `L'image a été générée pour cette demande: "${prompt}". Donne 1) un court texte de présentation produit, 2) une légende réseaux sociaux avec hashtags, 3) un CTA e-commerce.`,
      });
    } else if (mode === 'image_edit') {
      imageUrl = await requestImageEdit({ prompt, imageDataUrl });
      reply = await requestTextReply({
        prompt: `L'image a été améliorée selon cette demande: "${prompt || 'améliorer l\'image'}". Propose un texte d'accompagnement vendeur + une version courte Instagram avec hashtags.`,
      });
    } else {
      reply = await requestTextReply({ prompt, imageDataUrl });
    }

    const output = saveOutput({ mode, prompt, reply, imageUrl, conversationId });

    res.json({
      mode,
      reply,
      imageUrl,
      outputId: output.id,
    });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Erreur serveur IA.' });
  }
});

app.listen(PORT, () => {
  console.log(`ArtSango AI Server -> http://localhost:${PORT}`);
});
