import { readDb, writeDb } from '../_json-db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const db = await readDb();
  return Response.json(db.conversations);
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const db = await readDb();
  const conv = {
    id: Date.now().toString(),
    title: body.title || 'Nouvelle conversation',
    messages: [],
    createdAt: new Date().toISOString(),
  };
  db.conversations.unshift(conv);
  await writeDb(db);
  return Response.json(conv);
}
