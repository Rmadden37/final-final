import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

interface ChatbotRequest {
  userMessage: string
  context?: {
    userRole?: string
    teamId?: string
  }
}

interface ChatbotResponse {
  text: string
  chart: {
    type: 'bar' | 'line' | 'pie'
    data: {
      labels: string[]
      datasets: Array<{
        label: string
        data: number[]
        backgroundColor?: string | string[]
        borderColor?: string
        fill?: boolean
      }>
    }
    options: {
      responsive: boolean
      [key: string]: any
    }
  } | null
}

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

async function fetchSalesDataFromCSV(): Promise<any[]> {
  try {
    const csvUrl = process.env.GOOGLE_SHEETS_OVERALL_CSV_URL
    if (!csvUrl) {
      throw new Error('Google Sheets CSV URL not configured')
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000)
    
    const response = await fetch(csvUrl, {
      method: 'GET',
      headers: { 'Accept': 'text/csv' },
      signal: controller.signal
    })
    
    clearTimeout(timeoutId)
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const csvText = await response.text()
    const lines = csvText.trim().split('\n')
    
    if (lines.length < 2) {
      return []
    }
    
    // Parse header
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
    const closerIndex = headers.findIndex(h => h.includes('closer') && !h.includes('division') && !h.includes('region'))
    const systemSizeIndex = headers.findIndex(h => h.includes('system_size'))
    const realizationIndex = headers.findIndex(h => h.includes('realization'))
    
    if (closerIndex === -1) {
      return []
    }
    
    const salesData: any[] = []
    
    // Parse data rows (limit to prevent hanging)
    for (let i = 1; i < Math.min(lines.length, 500); i++) {
      const row = lines[i].split(',')
      
      if (row.length > Math.max(closerIndex, systemSizeIndex, realizationIndex)) {
        const closer = row[closerIndex]?.trim()
        const systemSize = parseFloat(row[systemSizeIndex]?.trim() || '0')
        const realization = parseFloat(row[realizationIndex]?.trim() || '0')
        
        if (closer && closer !== '' && !isNaN(systemSize) && !isNaN(realization)) {
          salesData.push({
            closer,
            systemSize,
            realization,
            revenue: systemSize * realization
          })
        }
      }
    }
    
    return salesData
  } catch (error) {
    console.error('Error fetching CSV data:', error)
    return []
  }
}

function formatSalesDataForPrompt(salesData: any[]): string {
  if (salesData.length === 0) {
    return "No sales data available."
  }

  // Aggregate data by closer
  const closerStats = salesData.reduce((acc: any, record) => {
    const closer = record.closer
    if (!acc[closer]) {
      acc[closer] = {
        name: closer,
        totalDeals: 0,
        totalSystemSize: 0,
        totalRevenue: 0
      }
    }
    
    acc[closer].totalDeals++
    acc[closer].totalSystemSize += record.systemSize
    acc[closer].totalRevenue += record.revenue
    
    return acc
  }, {})

  const aggregatedData = Object.values(closerStats).map((closer: any) => ({
    ...closer,
    avgDealSize: closer.totalSystemSize / closer.totalDeals
  }))

  // Sort by total revenue
  aggregatedData.sort((a: any, b: any) => b.totalRevenue - a.totalRevenue)

  return JSON.stringify({
    summary: {
      totalClosers: aggregatedData.length,
      totalDeals: salesData.length,
      totalSystemSize: salesData.reduce((sum, record) => sum + record.systemSize, 0),
      totalRevenue: salesData.reduce((sum, record) => sum + record.revenue, 0)
    },
    topPerformers: aggregatedData.slice(0, 10),
    allClosers: aggregatedData
  }, null, 2)
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatbotRequest = await request.json()
    const { userMessage, context } = body

    if (!userMessage || typeof userMessage !== 'string') {
      return NextResponse.json(
        { error: 'Invalid userMessage' },
        { status: 400 }
      )
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'Gemini API key not configured' },
        { status: 500 }
      )
    }

    // Fetch sales data
    const salesData = await fetchSalesDataFromCSV()
    const formattedData = formatSalesDataForPrompt(salesData)

    // Build the prompt
    const prompt = `You are a sales analytics assistant. Here's the latest sales data:

${formattedData}

The user asked: "${userMessage}"

Respond clearly and helpfully. If the question requires a graph, return a JSON object in this format:

{
  "text": "Short written answer or summary",
  "chart": {
    "type": "bar" | "line" | "pie",
    "data": {
      "labels": [...],
      "datasets": [{ "label": "Some label", "data": [...] }]
    },
    "options": { "responsive": true }
  }
}

If no graph is needed, return:
{
  "text": "...",
  "chart": null
}

Important: Always return valid JSON. If you're providing analysis that would benefit from a chart, include appropriate chart data with proper labels and datasets.`

    // Send to Gemini
    const result = await model.generateContent(prompt)
    const response = await result.response
    const responseText = response.text()

    // Try to parse as JSON, fall back to text response if parsing fails
    let parsedResponse: ChatbotResponse
    try {
      // Clean the response text to extract JSON
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      const jsonText = jsonMatch ? jsonMatch[0] : responseText
      
      parsedResponse = JSON.parse(jsonText)
      
      // Validate the response structure
      if (!parsedResponse.text) {
        throw new Error('Invalid response structure')
      }
    } catch (parseError) {
      // If parsing fails, return text-only response
      parsedResponse = {
        text: responseText,
        chart: null
      }
    }

    return NextResponse.json(parsedResponse)

  } catch (error) {
    console.error('Chatbot API error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        text: 'Sorry, I encountered an error processing your request. Please try again.',
        chart: null
      },
      { status: 500 }
    )
  }
}
