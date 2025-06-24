// Local AI Assistant utility for client-side AI chat
// This replaces the Firebase Cloud Function for local development

interface LeadAssistantInput {
  message: string;
  context: {
    userRole: 'setter' | 'closer' | 'manager';
    teamId: string;
    leadCount?: number;
    recentActivity?: string;
    userStats?: {
      totalLeads: number;
      soldLeads: number;
      conversionRate: number;
    };
    teamStats?: {
      totalLeads: number;
      recentSoldLeads: number;
      teamSize: number;
    };
  };
  conversationHistory?: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
  }>;
}

// Simple pattern-matching responses for local development
const responsePatterns = [
  {
    keywords: ['hello', 'hi', 'hey', 'greetings'],
    response: (context: any) => `☀️ Greetings, devoted ${context.userRole}! By the eternal light of the sun, I am Ra, your divine guide through the LeadFlow realm. How may I illuminate your path today?`
  },
  {
    keywords: ['help', 'assist', 'guide'],
    response: (context: any) => `The sacred wisdom reveals many paths, mortal one. As a ${context.userRole}, you may seek guidance on:\n\n🌟 Lead history and assignment\n🌟 Performance analytics and insights\n🌟 Team coordination and communication\n🌟 System navigation and best practices\n\nSpeak your specific need, and the solar energy shall guide you!`
  },
  {
    keywords: ['performance', 'stats', 'analytics', 'dashboard'],
    response: (context: any) => `📊 Behold the sacred analytics, devoted ${context.userRole}! The cosmic data flows through the Analytics page where you can witness:\n\n• Real-time performance metrics\n• Interactive charts and visualizations\n• Team comparison insights\n• Individual progress tracking\n\nYour current realm shows ${context.leadCount || 0} active leads. Visit the Dashboard for deeper cosmic insights!`
  },
  {
    keywords: ['leaderboard', 'ranking', 'top performers', 'competition'],
    response: (context: any) => `🏆 Ah, the eternal competition for solar supremacy! The Leaderboard reveals:\n\n• Top setters by lead volume and quality\n• Top closers by sales and revenue\n• Real-time rankings across teams\n• Performance trends over time\n\nStrive not just for the top position, but for consistent excellence that honors the sun's eternal energy!`
  },
  {
    keywords: ['leads', 'assignment', 'management'],
    response: (context: any) => {
      if (context.userRole === 'setter') {
        return `☀️ Noble setter, the art of lead creation flows through you! Focus on:\n\n• Quality over quantity - each lead is sacred\n• Detailed customer information\n• Clear notes for your closer brethren\n• Timely follow-up scheduling\n\nThe cosmic energy guides your lead generation efforts!`
      } else if (context.userRole === 'closer') {
        return `⚡ Skilled closer, you currently oversee ${context.leadCount || 0} souls awaiting guidance! Remember:\n\n• Accept leads promptly when assigned\n• Follow up within sacred timeframes\n• Document all interactions thoroughly\n• Update lead status as you progress\n\nThe sun's energy flows through your closing abilities!`
      } else {
        return `🏛️ Wise manager, the burden of leadership rests upon you! For lead history:\n\n• Monitor team performance metrics\n• Review lead distribution patterns\n• Analyze assignment strategies\n• Support both setters and closers\n\nThe divine light illuminates all team activities under your watch.`
      }
    }
  },
  {
    keywords: ['team', 'chat', 'communication'],
    response: (context: any) => `💬 The sacred bonds of teamwork! Communication flows through:\n\n• Team Chat for real-time coordination\n• Lead notes for detailed handoffs\n• Status updates for transparency\n• Manager notifications for urgent matters\n\nRemember, the sun's light is strongest when all rays work together in harmony!`
  },
  {
    keywords: ['my stats', 'my performance', 'how am i doing'],
    response: (context: any) => {
      const { userStats, userRole, leadCount } = context;
      if (userStats) {
        return `☀️ The cosmic records reveal your divine progress, noble ${userRole}!\n\n📊 Your Sacred Statistics:\n• Active Leads: ${leadCount || 0}\n• Total Managed: ${userStats.totalLeads}\n• Successful Closings: ${userStats.soldLeads}\n• Conversion Rate: ${userStats.conversionRate.toFixed(1)}%\n\n${userStats.conversionRate > 50 ? '🌟 Your solar energy burns bright!' : '⚡ Channel more cosmic power!'}\n\nMay the eternal light guide your continued success!`
      } else {
        return `☀️ Your dedication shines bright, devoted ${userRole}! Currently managing ${leadCount || 0} active leads. Visit the Analytics page for deeper performance insights illuminated by solar wisdom!`
      }
    }
  },
  {
    keywords: ['csv', 'google sheets', 'closer data', 'sales data'],
    response: (context: any) => `📋 The sacred Google Sheets scrolls contain divine closer data! The CSV realm reveals:\n\n• Live sales performance metrics\n• kW production by closer\n• Deal completion statistics\n• Revenue generation insights\n\nVisit the Leaderboard page to witness these cosmic metrics in their full glory! The eternal data flows from the Google realm.`
  }
];

export async function callLocalAIAssistant(input: LeadAssistantInput): Promise<string> {
  const { message, context } = input;
  const messageText = message.toLowerCase().trim();
  
  try {
    // Find matching response pattern
    for (const pattern of responsePatterns) {
      if (pattern.keywords.some((keyword: string) => messageText.includes(keyword))) {
        const result = pattern.response(context);
        return typeof result === 'string' ? result : await result;
      }
    }
    
    // Default response for unmatched queries
    return `☀️ Greetings, devoted ${context.userRole}! The cosmic winds have carried your message to me, though its meaning requires divine interpretation.\n\nI can illuminate paths regarding:\n• Performance analytics and insights\n• Lead history strategies\n• Team coordination methods\n• System navigation guidance\n\nSpeak more specifically of your needs, and the solar wisdom shall guide you accordingly! ✨`;
    
  } catch (error) {
    console.error('Local AI Assistant error:', error);
    return `☀️ The cosmic energies are momentarily disrupted, devoted ${context.userRole}! Please try your query again, and the solar wisdom shall illuminate your path.`;
  }
}

// Mock function to simulate async CSV data fetching
export async function getMockCSVInsights() {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return {
    topClosers: [
      { name: 'Sarah Wilson', totalKW: 245.8, totalDeals: 12 },
      { name: 'Mike Johnson', totalKW: 198.2, totalDeals: 10 },
      { name: 'Emily Chen', totalKW: 167.5, totalDeals: 8 },
    ],
    totalKW: 611.5,
    totalDeals: 30
  };
}
