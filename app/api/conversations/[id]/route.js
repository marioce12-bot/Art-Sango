import { readDb } from '../../_json-db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_request, context) {
  const params = await context.params;
  const db = await readDb();
  const conv = db.conversations.find((item) => item.id === params.id);
  if (!conv) return Response.json({ error: 'Conversation introuvable' }, { status: 404 });
  return Response.json(conv);
}
