import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Fixed: Use the correct environment variable name
  const url = process.env.NEXT_PUBLIC_GOOGLE_SHEETS_OVERALL_CSV_URL;
  
  console.log('🔍 API Route Debug:');
  console.log('- Environment variable value:', url ? 'Found' : 'Missing');
  console.log('- URL starts with:', url?.substring(0, 50) + '...');
  
  if (!url) {
    console.error('❌ CSV URL not set in environment variables');
    return NextResponse.json({ 
      error: 'CSV URL not set in environment variables',
      debug: 'Check NEXT_PUBLIC_GOOGLE_SHEETS_OVERALL_CSV_URL in .env.local'
    }, { status: 500 });
  }

  try {
    console.log('🔄 Fetching CSV from Google Sheets...');
    const res = await fetch(url);
    
    if (!res.ok) {
      console.error('❌ Failed to fetch CSV:', res.status, res.statusText);
      return NextResponse.json({ 
        error: `Failed to fetch CSV: ${res.status} ${res.statusText}`,
        url: url.substring(0, 100) + '...' // Partial URL for debugging
      }, { status: 500 });
    }

    const csv = await res.text();
    console.log('✅ CSV fetched successfully:', csv.length, 'characters');
    
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
    console.log('📊 CSV parsing:', lines.length, 'lines found');
    
    if (lines.length === 0) {
      return NextResponse.json({ 
        error: 'Empty CSV file',
        debug: 'CSV file contains no data'
      }, { status: 500 });
    }
    
    const headers = parseCSVLine(lines[0]).map(h => h.replace(/"/g, '').trim());
    console.log('📋 CSV headers:', headers);
    
    const data = lines.slice(1).map((line, index) => {
      const values = parseCSVLine(line);
      const entry: any = {};
      headers.forEach((header, i) => { 
        entry[header] = values[i] ? values[i].replace(/"/g, '').trim() : '';
      });
      
      // Debug first few rows
      if (index < 3) {
        console.log(`🔍 Parsed row ${index}:`, entry);
      }
      
      return entry;
    });

    console.log('✅ CSV parsed successfully:', data.length, 'data rows');
    return NextResponse.json({ data });
    
  } catch (error) {
    console.error('❌ API Error:', error);
    return NextResponse.json({ 
      error: 'Failed to process CSV data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}