import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const DB_PATH = path.join(process.cwd(), 'data', 'db.json');

export async function readDb() {
  try {
    const raw = await readFile(DB_PATH, 'utf8');
    return JSON.parse(raw);
  } catch {
    return { conversations: [], outputs: [] };
  }
}

export async function writeDb(data) {
  await mkdir(path.dirname(DB_PATH), { recursive: true });
  await writeFile(DB_PATH, JSON.stringify(data, null, 2));
}
