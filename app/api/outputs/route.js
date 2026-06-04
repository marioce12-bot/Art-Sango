import { readDb } from '../_json-db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const db = await readDb();
  return Response.json(db.outputs);
}
