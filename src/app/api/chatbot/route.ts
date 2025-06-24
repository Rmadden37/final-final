import { NextRequest, NextResponse } from 'next/server'
import { leadflowAssistant } from '@/ai/leadflow-assistant'

interface ChatbotRequest {
  userMessage: string
  context?: {
    userRole?: string
    teamId?: string
    leadCount?: number
    recentActivity?: string
  }
  conversationHistory?: Array<{
    role: 'user' | 'assistant'
    content: string
    timestamp: string
  }>
}

interface ChatbotResponse {
  text: string
  chart: null // Chart support can be added later if Genkit returns chart data
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatbotRequest = await request.json()
    const { userMessage, context, conversationHistory } = body

    if (!userMessage || typeof userMessage !== 'string') {
      return NextResponse.json(
        { error: 'Invalid userMessage' },
        { status: 400 }
      )
    }

    // Fetch analytics data for context
    let analyticsData = {};
    try {
      // Use localhost URLs for internal API calls during development
      const baseUrl = process.env.NODE_ENV === 'production' 
        ? process.env.NEXT_PUBLIC_BASE_URL || ''
        : 'http://localhost:9002';
      
      const [closerRes, setterRes] = await Promise.all([
        fetch(`${baseUrl}/api/analytics/csv-data`),
        fetch(`${baseUrl}/api/analytics/setter-data`)
      ]);
      const closerJson = closerRes.ok ? await closerRes.json() : { closers: [] };
      const setterJson = setterRes.ok ? await setterRes.json() : { setters: [] };
      analyticsData = {
        closers: closerJson.closers || [],
        setters: setterJson.setters || [],
        totalSales: closerJson.totalSales || 0,
        totalRevenue: closerJson.totalRevenue || 0,
        lastUpdated: closerJson.lastUpdated || null
      };
    } catch (err) {
      // If analytics fetch fails, continue with empty analytics
      analyticsData = { closers: [], setters: [] };
    }

    // Compose context for Genkit
    let userRole: 'manager' | 'closer' | 'setter' = 'closer';
    if (context?.userRole === 'manager' || context?.userRole === 'admin') userRole = 'manager';
    else if (context?.userRole === 'setter') userRole = 'setter';
    else if (context?.userRole === 'closer') userRole = 'closer';

    const aiContext = {
      userRole,
      teamId: context?.teamId || 'default',
      leadCount: context?.leadCount,
      recentActivity: context?.recentActivity,
      analytics: analyticsData // <-- Inject analytics data here
    };

    // Defensive: ensure analyticsData is always an object with arrays
    const closersArr = analyticsData && typeof analyticsData === 'object' && 'closers' in analyticsData && Array.isArray((analyticsData as any).closers) ? (analyticsData as any).closers : [];
    const settersArr = analyticsData && typeof analyticsData === 'object' && 'setters' in analyticsData && Array.isArray((analyticsData as any).setters) ? (analyticsData as any).setters : [];

    // Detect analytics questions and answer directly if possible
    const analyticsQ = userMessage.toLowerCase();
    if (analyticsQ.includes('top') && analyticsQ.includes('closer')) {
      // Top closers
      if (closersArr.length > 0) {
        const top = closersArr.slice(0, 5).map((c, i) => `${i + 1}. ${c.name} - ${c.sales} sales, $${c.revenue?.toLocaleString?.() || c.revenue} revenue, ${c.totalKW} kW`).join('\n');
        return NextResponse.json({ text: `🏆 Top Closers This Month:\n${top}`, chart: null });
      } else {
        return NextResponse.json({ text: 'No closer data available.', chart: null });
      }
    }
    if (analyticsQ.includes('top') && analyticsQ.includes('setter')) {
      // Top setters
      if (settersArr.length > 0) {
        const top = settersArr.slice(0, 5).map((s, i) => `${i + 1}. ${s.displayName} - ${s.totalLeads} leads`).join('\n');
        return NextResponse.json({ text: `🌟 Top Setters:\n${top}`, chart: null });
      } else {
        return NextResponse.json({ text: 'No setter data available.', chart: null });
      }
    }
    if (analyticsQ.includes('conversion rate')) {
      // Conversion rate (use closers for now)
      if (closersArr.length > 0) {
        const avg = (closersArr.reduce((sum, c) => sum + (c.sales || 0), 0) / (closersArr.length || 1)).toFixed(2);
        return NextResponse.json({ text: `📈 Average Conversion Rate (by closer): ${avg} sales per closer.`, chart: null });
      } else {
        return NextResponse.json({ text: 'No conversion data available.', chart: null });
      }
    }

    // Call Genkit-powered assistant
    const aiResponse = await leadflowAssistant({
      message: userMessage,
      context: aiContext,
      conversationHistory: conversationHistory || [],
    })

    const response: ChatbotResponse = {
      text: aiResponse,
      chart: null
    }

    return NextResponse.json(response)
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
