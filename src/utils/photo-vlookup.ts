// src/utils/photo-vlookup.ts
// Utility to fetch and cache photo vlookup CSV and provide a lookup by name

let photoMap: Map<string, string> | null = null;
let lastFetch: number = 0;
const CACHE_DURATION = 1000 * 60 * 10; // 10 minutes

const CSV_URL = process.env.NEXT_PUBLIC_GOOGLE_SHEETS_PHOTO_CSV_URL;

function normalizeName(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export async function getPhotoUrlByName(name: string): Promise<string | undefined> {
  if (!CSV_URL || !name) return undefined;
  const now = Date.now();
  if (!photoMap || now - lastFetch > CACHE_DURATION) {
    // Fetch and parse CSV
    const res = await fetch(CSV_URL);
    const text = await res.text();
    const [header, ...rows] = text.trim().split(/\r?\n/);
    const keys = header.split(",");
    const nameIdx = keys.findIndex(k => k.toLowerCase().includes("name"));
    const photoIdx = keys.findIndex(k => k.toLowerCase().includes("photo"));
    const map = new Map<string, string>();
    for (const row of rows) {
      const values = row.split(",");
      if (nameIdx >= 0 && photoIdx >= 0 && values[nameIdx] && values[photoIdx]) {
        map.set(normalizeName(values[nameIdx]), values[photoIdx]);
      }
    }
    photoMap = map;
    lastFetch = now;
  }
  return photoMap.get(normalizeName(name));
}
