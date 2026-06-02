const AI_BASE_URL = (process.env.ARTSANGO_AI_BASE_URL || process.env.AI_BASE_URL || 'https://build.lewisnote.com/v1').replace(/\/$/, '');
const AI_API_KEY = process.env.ARTSANGO_AI_API_KEY || process.env.AI_API_KEY;
const TEXT_MODEL = process.env.ARTSANGO_AI_GPT55_MODEL || process.env.AI_TEXT_MODEL || 'gpt-5.5';
const IMAGE_MODEL = process.env.ARTSANGO_AI_IMAGE_MODEL || process.env.AI_IMAGE_MODEL || 'gpt-image-2';

function getErrorText(data, fallback) {
  if (!data) return fallback;
  if (typeof data.error === 'string') return data.error;
  if (typeof data.error?.message === 'string') return data.error.message;
  if (typeof data.message === 'string') return data.message;
  return fallback;
}

function normalizeDataUrl(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string') return '';
  if (!dataUrl.startsWith('data:image/')) return '';
  return dataUrl;
}

function extractText(data) {
  const direct = data?.choices?.[0]?.message?.content;
  if (typeof direct === 'string') return direct.trim();
  if (Array.isArray(direct)) {
    return direct.map((p) => (typeof p === 'string' ? p : p?.text || '')).join('').trim();
  }
  return '';
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

function dataUrlToBlob(dataUrl) {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/i.exec(dataUrl || '');
  if (!match) throw new Error('Image invalide.');
  const mimeType = match[1];
  const base64 = match[2];
  const buffer = Buffer.from(base64, 'base64');
  const ext = mimeType.split('/')[1] || 'png';
  const blob = new Blob([buffer], { type: mimeType });
  return { blob, ext };
}

async function requestTextReply({ prompt, imageDataUrl }) {
  const system = [
    'Tu es ArtSango AI, assistant pour artisans et artistes africains.',
    'Tu aides pour le marketing, le storytelling, les descriptions produit et les textes réseaux sociaux.',
    'Réponds toujours en français clair, concret et orienté action.',
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
      temperature: 0.7,
      max_tokens: 900,
      messages: [
        { role: 'system', content: system },
        userMessage,
      ],
    }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(getErrorText(data, `Text API HTTP ${response.status}`));
  const text = extractText(data);
  if (!text) throw new Error('Réponse texte vide du modèle IA.');
  return text;
}

async function requestImageGeneration(prompt) {
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

  const data = await response.json();
  if (!response.ok) throw new Error(getErrorText(data, `Image API HTTP ${response.status}`));

  const item = data?.data?.[0] || null;
  const imageUrl = item?.url || (item?.b64_json ? `data:image/png;base64,${item.b64_json}` : '');
  if (!imageUrl) throw new Error('Image non retournée par le modèle.');
  return imageUrl;
}

async function requestImageEdit(prompt, imageDataUrl) {
  const { blob, ext } = dataUrlToBlob(imageDataUrl);
  const fd = new FormData();
  fd.append('model', IMAGE_MODEL);
  fd.append('prompt', prompt || 'Améliore cette image artisanale en conservant son identité.');
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

  const data = await response.json();
  if (!response.ok) throw new Error(getErrorText(data, `Image edit API HTTP ${response.status}`));

  const item = data?.data?.[0] || null;
  const imageUrl = item?.url || (item?.b64_json ? `data:image/png;base64,${item.b64_json}` : '');
  if (!imageUrl) throw new Error('Image améliorée non retournée par le modèle.');
  return imageUrl;
}

async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string' && req.body.trim()) {
    try { return JSON.parse(req.body); } catch { return {}; }
  }

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!AI_BASE_URL || !AI_API_KEY) {
    return res.status(500).json({
      error: 'Configuration manquante: ARTSANGO_AI_BASE_URL et ARTSANGO_AI_API_KEY doivent etre definies sur Vercel.',
    });
  }

  const body = await readJsonBody(req);
  const prompt = (body.prompt || '').trim();
  const imageDataUrl = normalizeDataUrl(body.imageDataUrl || '');

  if (!prompt && !imageDataUrl) {
    return res.status(400).json({ error: 'Message ou image requis.' });
  }

  if (prompt.toLowerCase() === 'ping') {
    return res.status(200).json({ mode: 'status', reply: 'IA connectée.' });
  }

  const mode = inferIntent(prompt, Boolean(imageDataUrl));

  try {
    let reply = '';
    let imageUrl = '';

    if (mode === 'image_generate') {
      imageUrl = await requestImageGeneration(prompt);
      reply = await requestTextReply({
        prompt: `Image générée pour: "${prompt}". Donne un texte produit, une légende Instagram avec hashtags et un CTA WhatsApp.`,
      });
    } else if (mode === 'image_edit') {
      imageUrl = await requestImageEdit(prompt, imageDataUrl);
      reply = await requestTextReply({
        prompt: `Image améliorée pour: "${prompt || 'amélioration visuelle'}". Donne un texte vendeur + une version courte Instagram.`,
      });
    } else {
      reply = await requestTextReply({ prompt, imageDataUrl });
    }

    return res.status(200).json({ mode, reply, imageUrl });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Erreur IA.' });
  }
};
