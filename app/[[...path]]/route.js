import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
};

const ALLOWED_EXTENSIONS = new Set(Object.keys(MIME_TYPES));

function getSafeFilePath(parts = []) {
  const rootDir = /* turbopackIgnore: true */ process.cwd();
  const requestedPath = parts.length ? parts.join('/') : 'index.html';
  const normalized = path.normalize(requestedPath).replace(/^([/\\])+/, '');
  const ext = path.extname(normalized) || '.html';
  const fileName = ext ? normalized : `${normalized}.html`;
  const fileExt = path.extname(fileName);

  if (!ALLOWED_EXTENSIONS.has(fileExt)) return null;
  if (fileName.startsWith('app/') || fileName.startsWith('api/') || fileName.startsWith('.git/') || fileName.includes('node_modules')) return null;

  const fullPath = path.resolve(rootDir, fileName);
  if (!fullPath.startsWith(rootDir)) return null;
  return { fullPath, fileExt };
}

export async function GET(request, context) {
  const params = await context.params;
  const resolved = getSafeFilePath(params?.path || []);

  if (!resolved) {
    return new Response('Not found', { status: 404 });
  }

  try {
    const body = await readFile(resolved.fullPath);
    return new Response(body, {
      headers: {
        'Content-Type': MIME_TYPES[resolved.fileExt] || 'application/octet-stream',
        'Cache-Control': resolved.fileExt === '.html' || path.basename(resolved.fullPath) === 'sw.js' ? 'no-cache' : 'public, max-age=3600',
      },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}
