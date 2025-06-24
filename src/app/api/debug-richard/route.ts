import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const url = process.env.GOOGLE_SHEETS_OVERALL_CSV_URL;
  if (!url) return NextResponse.json({ error: 'CSV URL not set' }, { status: 500 });

  const res = await fetch(url);
  if (!res.ok) return NextResponse.json({ error: 'Failed to fetch CSV' }, { status: 500 });

  const csv = await res.text();
  
  // Simple CSV parsing that handles quoted fields with commas
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

  // Process the data exactly like the frontend does
  const closerMap = new Map();
  
  data.forEach((entry: any) => {
    const kw = parseFloat(entry.kw?.replace(/\r$/, '') || '0');
    const netPpw = parseFloat(entry.net_ppw?.replace(/\r$/, '') || '0');
    const revenue = kw * netPpw;
    const realization = entry.realization === '1';
    const dateSubmitted = entry.date_submitted;
    
    // Process closer data
    const closerName = entry.closer_name?.trim().replace(/\s+/g, ' '); // Normalize whitespace
    const normalizedCloserKey = closerName?.toLowerCase().replace(/[^a-z0-9]/g, ''); // Create normalized key for Map
    
    if (closerName && normalizedCloserKey && realization) {
      if (!closerMap.has(normalizedCloserKey)) {
        closerMap.set(normalizedCloserKey, {
          name: closerName,
          normalizedName: normalizedCloserKey,
          sales: 0,
          revenue: 0,
          totalKW: 0,
          teamName: '',
          dates: [],
          matchedProfile: null
        });
      }
      const closer = closerMap.get(normalizedCloserKey);
      closer.sales += 1;
      closer.revenue += revenue;
      closer.totalKW += kw;
      closer.avgDealSize = closer.sales > 0 ? closer.revenue / closer.sales : 0;
      closer.dates.push(dateSubmitted);
    }
  });

  const closersData = Array.from(closerMap.values()).sort((a, b) => b.revenue - a.revenue);
  
  // Check for Richard Niger specifically
  const richardEntries = closersData.filter(c => c.name.includes('Richard Niger'));
  const richardRawData = data.filter(d => d.closer_name === 'Richard Niger' && d.realization === '1');
  
  return NextResponse.json({ 
    richardEntriesInProcessed: richardEntries.length,
    richardEntries,
    richardRawCount: richardRawData.length,
    richardRawSample: richardRawData.slice(0, 5),
    totalClosersProcessed: closersData.length,
    mapSize: closerMap.size,
    mapKeys: Array.from(closerMap.keys())
  });
}
