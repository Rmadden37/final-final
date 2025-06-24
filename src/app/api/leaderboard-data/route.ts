import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const url = process.env.GOOGLE_SHEETS_OVERALL_CSV_URL;
  if (!url) return NextResponse.json({ error: 'CSV URL not set' }, { status: 500 });

  const res = await fetch(url);
  if (!res.ok) return NextResponse.json({ error: 'Failed to fetch CSV' }, { status: 500 });

  const csv = await res.text();
  
  // Better CSV parsing that handles quoted fields with commas
  function parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  }
  
  const lines = csv.trim().split('\n');
  const headers = parseCSVLine(lines[0]).map(h => h.replace(/"/g, '').trim());
  const data = lines.slice(1).map(line => {
    const values = parseCSVLine(line);
    const entry: any = {};
    headers.forEach((header, i) => { 
      entry[header] = values[i] ? values[i].replace(/"/g, '').trim() : '';
    });
    return entry;
  });

  return NextResponse.json({ data });
}
