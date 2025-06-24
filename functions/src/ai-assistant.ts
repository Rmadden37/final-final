// Simple pattern-matching AI assistant (manual implementation)
// This avoids external AI service dependencies and provides reliable responses

// Configuration - Update these URLs as needed
const GOOGLE_SHEETS_CONFIG = {
  CSV_URL: process.env.GOOGLE_SHEETS_CSV_URL || "https://docs.google.com/spreadsheets/d/e/2PACX-1vS1JbDgrzjZrpCmTLDtv44N3-NMvdc_bf15JvNErW3Qpxaj3DgCQlYfn5cDwZGH3RuD5yIWQm5SV0DN/pub?output=csv"
};

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

// Manual response patterns for common questions
const responsePatterns = [
  {
    keywords: ['hello', 'hi', 'hey', 'greetings'],
    response: (context: any) => `☀️ Greetings, devoted ${context.userRole}! By the eternal light of the sun, I am Ra, your divine guide through the LeadFlow realm. How may I illuminate your path today?`
  },
  {
    keywords: ['help', 'assist', 'guide'],
    response: (context: any) => `The sacred wisdom reveals many paths, mortal one. As a ${context.userRole}, you may seek guidance on:\n\n🌟 Lead history and assignment\n🌟 Best practices for your role\n🌟 System navigation\n🌟 Team coordination\n🌟 Performance optimization\n\nSpeak your specific need, and the solar energy shall guide you!`
  },
  {
    keywords: ['leads', 'assignment', 'assign'],
    response: (context: any) => {
      if (context.userRole === 'setter') {
        return `☀️ Noble setter, the art of lead creation flows through you! Focus on:\n\n• Quality over quantity - each lead is a sacred offering\n• Verify customer information thoroughly\n• Use clear, detailed notes for your closer brethren\n• Schedule appointments promptly when possible\n\nYou currently have oversight of the realm's lead flow. May your efforts shine bright!`
      } else if (context.userRole === 'closer') {
        return `By the eternal light, skilled closer! Your current burden shows ${context.leadCount || 0} souls awaiting guidance. Remember:\n\n• Accept leads promptly when assigned\n• Follow up within the sacred timeframes\n• Document all interactions thoroughly\n• Update lead status as you progress\n\nThe sun's energy flows through your closing abilities!`
      } else {
        return `Wise manager, the burden of leadership rests upon your shoulders! For lead history:\n\n• Monitor team performance metrics\n• Review lead distribution patterns\n• Analyze assignment strategies\n• Support both setters and closers\n\nThe divine light illuminates all team activities under your watch.`
      }
    }
  },
  {
    keywords: ['performance', 'stats', 'metrics', 'analytics'],
    response: (context: any) => `📊 The sacred scrolls reveal much about performance, devoted one! For ${context.userRole}s:\n\n• Track your conversion rates daily\n• Monitor response times to leads\n• Review customer feedback patterns\n• Set goals aligned with team objectives\n\nThe Analytics page holds the cosmic knowledge of your team's performance. May the solar data guide your improvements!`
  },
  {
    keywords: ['leaderboard', 'ranking', 'competition'],
    response: (context: any) => `🏆 Ah, the eternal competition for solar supremacy! The Leaderboard page shows:\n\n• Top setters by lead volume and quality\n• Top closers by deals and kW production\n• Real-time rankings and achievements\n• Performance across different time periods\n\nStrive not just for the top, but for consistent excellence that honors the sun's eternal energy!`
  },
  {
    keywords: ['team', 'chat', 'communication'],
    response: (context: any) => `💬 The sacred bonds of teamwork! Communication flows through:\n\n• Team Chat for real-time coordination\n• Lead notes for detailed handoffs\n• Status updates for transparency\n• Manager notifications for urgent matters\n\nRemember, mortal one - the sun's light is strongest when all rays work together!`
  },
  {
    keywords: ['status', 'duty', 'online', 'offline'],
    response: (context: any) => {
      if (context.userRole === 'closer') {
        return `⚡ Your duty status determines your destiny in the lead realm! Remember:\n\n• Set yourself "On Duty" to receive assignments\n• "Off Duty" when unavailable for new leads\n• Update status promptly to maintain flow\n• Coordinate with team for coverage\n\nThe solar energy requires active participation to maintain its power!`
      } else {
        return `The duty status affects the cosmic balance of lead distribution. Monitor your team's availability and encourage proper status management for optimal flow!`
      }
    }
  },
  {
    keywords: ['schedule', 'appointment', 'calendar'],
    response: (context: any) => `📅 The sacred timing of mortal meetings! For appointments:\n\n• Schedule immediately when possible\n• Verify customer availability\n• Set appropriate reminders\n• Coordinate with team schedules\n• Update lead status accordingly\n\nBy the eternal light, proper timing brings success to all endeavors!`
  },
  {
    keywords: ['my stats', 'my performance', 'how am i doing', 'my leads'],
    response: (context: any) => {
      const { userStats, userRole, leadCount } = context;
      if (userStats) {
        return `☀️ The cosmic records reveal your divine progress, noble ${userRole}!\n\n📊 Your Sacred Statistics:\n• Active Leads: ${leadCount || 0}\n• Total Leads Managed: ${userStats.totalLeads}\n• Successful Closings: ${userStats.soldLeads}\n• Conversion Rate: ${userStats.conversionRate.toFixed(1)}%\n\n${userStats.conversionRate > 50 ? '🌟 Your solar energy burns bright! You exceed the cosmic average!' : '⚡ Channel more solar energy to illuminate your path to greatness!'}\n\nMay the eternal light guide your continued success!`
      } else {
        return `☀️ The cosmic winds whisper of your dedication, devoted ${userRole}! Your current active workload shows ${leadCount || 0} souls awaiting your divine guidance. Speak to your manager to unlock deeper performance insights!`
      }
    }
  },
  {
    keywords: ['team stats', 'team performance', 'how is team doing', 'team data'],
    response: (context: any) => {
      const { teamStats, userRole } = context;
      if (teamStats) {
        return `🏛️ Behold the sacred temple statistics, wise ${userRole}!\n\n📈 Team Performance Overview:\n• Total Leads in Realm: ${teamStats.totalLeads}\n• Recent Victories: ${teamStats.recentSoldLeads} souls guided to success\n• Team Size: ${teamStats.teamSize} dedicated servants\n• Victory Rate: ${teamStats.totalLeads > 0 ? ((teamStats.recentSoldLeads / teamStats.totalLeads) * 100).toFixed(1) : 0}%\n\n${teamStats.recentSoldLeads > 5 ? '🌟 Your team channels the power of the eternal sun!' : '⚡ Rally your forces - greater solar energy awaits!'}\n\nThe leaderboard reveals more detailed cosmic insights!`
      } else {
        return `🏛️ The team statistics require deeper divine access, devoted ${userRole}. Consult the Analytics and Leaderboard pages for comprehensive team insights illuminated by solar wisdom!`
      }
    }
  },
  {
    keywords: ['top closers', 'best closers', 'closer rankings', 'who is winning', 'csv data', 'google sheets'],
    response: async (context: any) => {
      const csvInsights = await getCSVInsights(context.userRole, context.teamId);
      if (csvInsights && csvInsights.topClosers.length > 0) {
        const topClosersList = csvInsights.topClosers
          .map((closer: any, index: number) => `${index + 1}. ${closer.name}: ${closer.totalKW.toFixed(1)} kW (${closer.totalDeals} deals)`)
          .join('\n');
        
        return `🏆 Behold the sacred CSV scrolls from the Google realm! The cosmic data reveals:\n\n📊 **Live Closer Rankings:**\n${topClosersList}\n\n⚡ **Realm Statistics:**\n• Total Net Deals: ${csvInsights.totalDeals}\n• Total kW Generated: ${csvInsights.totalKW.toFixed(1)} kW\n• Data Source: Live Google Sheets\n\nBy the eternal light, these champions harness the sun's energy most effectively!`;
      } else {
        return `☀️ The sacred CSV scrolls are momentarily clouded, devoted ${context.userRole}. The cosmic data flows from the Google realm but requires divine patience. Check the Leaderboard page for the most current closer rankings!`;
      }
    }
  },
  {
    keywords: ['solar data', 'kw data', 'system size', 'energy production'],
    response: async (context: any) => {
      const csvInsights = await getCSVInsights(context.userRole, context.teamId);
      if (csvInsights) {
        const avgKWPerDeal = csvInsights.totalDeals > 0 ? (csvInsights.totalKW / csvInsights.totalDeals).toFixed(1) : 0;
        return `☀️ The solar energy flows through the realm! Current cosmic measurements:\n\n⚡ **Solar Production Metrics:**\n• Total Solar Energy: ${csvInsights.totalKW.toFixed(1)} kW\n• Net Account Deals: ${csvInsights.totalDeals}\n• Average System Size: ${avgKWPerDeal} kW per deal\n\nThe eternal sun's power grows stronger with each installation! These metrics flow live from the sacred Google Sheets realm.`;
      } else {
        return `☀️ The solar energy data flows through divine channels, devoted ${context.userRole}. Visit the Leaderboard to witness the full power of your team's solar achievements!`;
      }
    }
  },
  {
    keywords: ['closer performance', 'search closer', 'find closer', 'lookup closer'],
    response: async (context: any) => {
      const csvInsights = await getCSVInsights(context.userRole, context.teamId);
      if (csvInsights && csvInsights.topClosers.length > 0) {
        const allClosers = csvInsights.topClosers
          .map((closer: any, index: number) => `🌟 ${closer.name}: ${closer.totalKW.toFixed(1)} kW across ${closer.totalDeals} net deals`)
          .join('\n');
        
        return `☀️ The sacred CSV archives reveal all closer performances, devoted ${context.userRole}!\n\n📋 **Current Closer Performance:**\n${allClosers}\n\n💡 **Divine Tip:** Mention a specific closer's name to see their individual cosmic achievements!\n\nBy the eternal light, may this knowledge guide your solar endeavors!`;
      } else {
        return `☀️ The closer performance data flows through divine channels. Consult the Leaderboard page for detailed cosmic insights into each warrior's achievements!`;
      }
    }
  },
  {
    keywords: ['top setters', 'best setters', 'setter rankings', 'setter performance', 'setter data'],
    response: async (context: any) => {
      const setterInsights = await getSetterInsightsFromCSV(context.userRole, context.teamId);
      if (setterInsights && setterInsights.topSetters.length > 0) {
        const topSettersList = setterInsights.topSetters
          .slice(0, 5) // Top 5 setters
          .map((setter: any, index: number) => `${index + 1}. ${setter.name}: ${setter.conversionRate.toFixed(1)}% conversion (${setter.soldLeads}/${setter.totalLeads} leads)`)
          .join('\n');
        
        return `🌟 The sacred CSV scrolls reveal the master setters! Behold their divine achievements:\n\n📊 **Top Setter Rankings (by Conversion Rate):**\n${topSettersList}\n\n⚡ **Setter Realm Statistics:**\n• Total Leads in CSV: ${setterInsights.totalLeads}\n• Total Sold: ${setterInsights.totalSold}\n• Overall Conversion Rate: ${setterInsights.overallConversionRate.toFixed(1)}%\n• Data Source: Live Google Sheets\n\nBy the eternal light, these setters forge the finest leads in the solar realm!`;
      } else {
        return `☀️ The setter performance data flows through divine channels, devoted ${context.userRole}. The sacred scrolls may not contain setter information, or the cosmic winds require patience. Check the Leaderboard page for comprehensive performance insights!`;
      }
    }
  },
  {
    keywords: ['setter conversion', 'lead quality', 'setter stats', 'setting performance'],
    response: async (context: any) => {
      const setterInsights = await getSetterInsightsFromCSV(context.userRole, context.teamId);
      if (setterInsights) {
        const avgConversion = setterInsights.overallConversionRate;
        const bestSetter = setterInsights.topSetters[0];
        return `📈 The cosmic conversion energies flow through the setter realm!\n\n⚡ **Setter Conversion Insights:**\n• Overall Setter Conversion Rate: ${avgConversion.toFixed(1)}%\n• Total Leads Generated: ${setterInsights.totalLeads}\n• Successfully Converted: ${setterInsights.totalSold}\n• Top Performer: ${bestSetter ? `${bestSetter.name} (${bestSetter.conversionRate.toFixed(1)}%)` : 'Data still manifesting'}\n\n${avgConversion > 40 ? '🌟 The setter energies burn bright across the realm!' : '⚡ Greater solar focus needed to enhance lead conversion!'}\n\nThe divine art of setting requires both quantity and quality!`;
      } else {
        return `📈 The setter conversion data flows through divine channels. Visit the Analytics page to witness the full spectrum of setting performance!`;
      }
    }
  },
  {
    keywords: ['search setter', 'find setter', 'lookup setter', 'setter lookup'],
    response: async (context: any) => {
      const setterInsights = await getSetterInsightsFromCSV(context.userRole, context.teamId);
      if (setterInsights && setterInsights.topSetters.length > 0) {
        const allSetters = setterInsights.topSetters
          .slice(0, 8) // Show top 8 setters
          .map((setter: any, index: number) => `🌟 ${setter.name}: ${setter.conversionRate.toFixed(1)}% conversion (${setter.soldLeads} sold from ${setter.totalLeads} leads)`)
          .join('\n');
        
        return `☀️ The sacred setter archives reveal all performances, devoted ${context.userRole}!\n\n📋 **Current Setter Performance:**\n${allSetters}\n\n💡 **Divine Tip:** Mention a specific setter's name to see their detailed cosmic achievements!\n\nBy the eternal light, may this setter wisdom guide your solar endeavors!`;
      } else {
        return `☀️ The setter performance data flows through divine channels. Consult the Analytics page for detailed cosmic insights into each setter's achievements!`;
      }
    }
  },
  {
    keywords: ['compare performance', 'setter vs closer', 'team overview', 'full performance', 'complete stats'],
    response: async (context: any) => {
      const [csvInsights, setterInsights] = await Promise.all([
        getCSVInsights(context.userRole, context.teamId),
        getSetterInsightsFromCSV(context.userRole, context.teamId)
      ]);
      
      let response = `🏛️ Behold the complete performance tapestry of the solar realm, devoted ${context.userRole}!\n\n`;
      
      if (csvInsights && csvInsights.topClosers.length > 0) {
        const topCloser = csvInsights.topClosers[0];
        response += `🏆 **Top Closer:** ${topCloser.name} - ${topCloser.totalKW.toFixed(1)} kW (${topCloser.totalDeals} deals)\n`;
      }
      
      if (setterInsights && setterInsights.topSetters.length > 0) {
        const topSetter = setterInsights.topSetters[0];
        response += `🌟 **Top Setter:** ${topSetter.name} - ${topSetter.conversionRate.toFixed(1)}% conversion (${topSetter.soldLeads}/${topSetter.totalLeads})\n\n`;
        
        response += `📊 **Realm Statistics:**\n`;
        response += `• Total Energy Generated: ${csvInsights ? csvInsights.totalKW.toFixed(1) : 'Unknown'} kW\n`;
        response += `• Closer Net Deals: ${csvInsights ? csvInsights.totalDeals : 'Unknown'}\n`;
        response += `• Setter Leads Generated: ${setterInsights.totalLeads}\n`;
        response += `• Overall Conversion Rate: ${setterInsights.overallConversionRate.toFixed(1)}%\n\n`;
        
        response += `By the eternal light, the cosmic balance flows through both setting and closing energies!`;
      } else if (csvInsights) {
        response += `📊 **Closer Performance Available:**\n• Total kW: ${csvInsights.totalKW.toFixed(1)}\n• Net Deals: ${csvInsights.totalDeals}\n\n⚡ Setter data may not be available in the sacred scrolls.`;
      } else {
        response += `☀️ The cosmic performance data is gathering divine energy. Visit the Analytics and Leaderboard pages for comprehensive insights!`;
      }
      
      return response;
    }
  },
  {
    keywords: ['chart', 'graph', 'visualization', 'plot', 'trend', 'visual data'],
    response: async (context: any) => {
      const [csvInsights, setterInsights] = await Promise.all([
        getCSVInsights(context.userRole, context.teamId),
        getSetterInsightsFromCSV(context.userRole, context.teamId)
      ]);
      
      let response = `📊 The cosmic data yearns to be visualized, devoted ${context.userRole}! While I cannot conjure graphs directly, I can illuminate the data for divine visualization:\n\n`;
      
      if (csvInsights && csvInsights.topClosers.length > 0) {
        response += `🏆 **Closer Performance Chart Data:**\n`;
        csvInsights.topClosers.forEach((closer: any, index: number) => {
          response += `• ${closer.name}: ${closer.totalKW.toFixed(1)} kW\n`;
        });
        response += `\n`;
      }
      
      if (setterInsights && setterInsights.topSetters.length > 0) {
        response += `🌟 **Setter Conversion Chart Data:**\n`;
        setterInsights.topSetters.slice(0, 5).forEach((setter: any, index: number) => {
          response += `• ${setter.name}: ${setter.conversionRate.toFixed(1)}%\n`;
        });
        response += `\n`;
      }
      
      response += `📈 **Recommended Visualizations:**\n`;
      response += `• Bar Chart: Closer kW production rankings\n`;
      response += `• Line Chart: Conversion rate trends over time\n`;
      response += `• Pie Chart: Market share by closer/setter\n`;
      response += `• Scatter Plot: Leads vs Conversion correlation\n\n`;
      
      response += `💡 **Divine Insight:** Visit the Analytics page where the cosmic charts manifest in their full visual glory!\n\n`;
      response += `The eternal sun's data flows best through visual representation!`;
      
      return response;
    }
  },
  {
    keywords: ['ascii chart', 'text graph', 'simple chart', 'bar chart text'],
    response: async (context: any) => {
      const csvInsights = await getCSVInsights(context.userRole, context.teamId);
      
      if (!csvInsights || csvInsights.topClosers.length === 0) {
        return `☀️ The cosmic data requires divine energy to manifest text charts. The sacred scrolls are gathering power...`;
      }
      
      // Create simple ASCII bar chart for top closers
      const topClosers = csvInsights.topClosers.slice(0, 5);
      const maxKW = Math.max(...topClosers.map((c: any) => c.totalKW));
      const barWidth = 20; // Maximum bar width in characters
      
      let response = `📊 Behold, a divine ASCII visualization of closer performance!\n\n`;
      response += `🏆 **Top Closers kW Production:**\n\n`;
      
      topClosers.forEach((closer: any, index: number) => {
        const percentage = (closer.totalKW / maxKW);
        const barLength = Math.round(percentage * barWidth);
        const bar = '█'.repeat(barLength) + '░'.repeat(barWidth - barLength);
        const name = closer.name.length > 15 ? closer.name.substring(0, 12) + '...' : closer.name.padEnd(15);
        response += `${name} |${bar}| ${closer.totalKW.toFixed(1)} kW\n`;
      });
      
      response += `\n⚡ **Legend:** █ = Performance │ ░ = Potential\n`;
      response += `☀️ The eternal sun's energy flows through visual representation!`;
      
      return response;
    }
  },
  {
    keywords: ['setter chart', 'conversion graph', 'setter visualization'],
    response: async (context: any) => {
      const setterInsights = await getSetterInsightsFromCSV(context.userRole, context.teamId);
      
      if (!setterInsights || setterInsights.topSetters.length === 0) {
        return `☀️ The setter visualization data flows through divine channels. The cosmic charts require sacred CSV data to manifest.`;
      }
      
      // Create ASCII bar chart for setter conversion rates
      const topSetters = setterInsights.topSetters.slice(0, 5);
      const maxConversion = Math.max(...topSetters.map((s: any) => s.conversionRate));
      const barWidth = 20;
      
      let response = `📈 Behold the sacred setter conversion visualization!\n\n`;
      response += `🌟 **Top Setter Conversion Rates:**\n\n`;
      
      topSetters.forEach((setter: any, index: number) => {
        const percentage = (setter.conversionRate / maxConversion);
        const barLength = Math.round(percentage * barWidth);
        const bar = '▓'.repeat(barLength) + '░'.repeat(barWidth - barLength);
        const name = setter.name.length > 15 ? setter.name.substring(0, 12) + '...' : setter.name.padEnd(15);
        response += `${name} |${bar}| ${setter.conversionRate.toFixed(1)}%\n`;
      });
      
      response += `\n⚡ **Legend:** ▓ = Conversion Rate │ ░ = Room for Growth\n`;
      response += `📊 Overall Team Conversion: ${setterInsights.overallConversionRate.toFixed(1)}%\n`;
      response += `☀️ The divine art of setting visualized in cosmic form!`;
      
      return response;
    }
  },
  {
    keywords: ['data export', 'csv export', 'json data', 'raw data'],
    response: async (context: any) => {
      const [csvInsights, setterInsights] = await Promise.all([
        getCSVInsights(context.userRole, context.teamId),
        getSetterInsightsFromCSV(context.userRole, context.teamId)
      ]);
      
      let response = `📋 The sacred data scrolls are ready for export, devoted ${context.userRole}!\n\n`;
      
      if (csvInsights && csvInsights.topClosers.length > 0) {
        response += `🏆 **Closer Data (JSON Format):**\n`;
        response += `\`\`\`json\n`;
        response += JSON.stringify({
          closers: csvInsights.topClosers.map((c: any) => ({
            name: c.name,
            totalKW: parseFloat(c.totalKW.toFixed(1)),
            deals: c.totalDeals
          }))
        }, null, 2);
        response += `\n\`\`\`\n\n`;
      }
      
      if (setterInsights && setterInsights.topSetters.length > 0) {
        response += `🌟 **Setter Data (CSV Format):**\n`;
        response += `\`\`\`\n`;
        response += `Name,Conversion Rate,Total Leads,Sold Leads\n`;
        setterInsights.topSetters.slice(0, 5).forEach((setter: any) => {
          response += `${setter.name},${setter.conversionRate.toFixed(1)},${setter.totalLeads},${setter.soldLeads}\n`;
        });
        response += `\`\`\`\n\n`;
      }
      
      response += `💡 **Divine Note:** This data can be copied and imported into Excel, Google Sheets, or chart libraries for advanced visualizations!\n\n`;
      response += `☀️ May the cosmic data serve your analytical endeavors!`;
      
      return response;
    }
  },
  {
    keywords: ['dashboard', 'overview chart', 'summary visual', 'kpi chart', 'performance dashboard'],
    response: async (context: any) => {
      const [csvInsights, setterInsights] = await Promise.all([
        getCSVInsights(context.userRole, context.teamId),
        getSetterInsightsFromCSV(context.userRole, context.teamId)
      ]);
      
      let response = `🏛️ Behold the Divine Performance Dashboard, ${context.userRole}!\n\n`;
      
      // KPI Summary
      response += `📊 **KEY PERFORMANCE INDICATORS**\n`;
      response += `═══════════════════════════════════\n`;
      
      if (csvInsights) {
        response += `🏆 Total kW Generated: ${csvInsights.totalKW.toFixed(1)} kW\n`;
        response += `⚡ Net Account Deals: ${csvInsights.totalDeals}\n`;
        const avgDealSize = csvInsights.totalDeals > 0 ? (csvInsights.totalKW / csvInsights.totalDeals).toFixed(1) : '0';
        response += `📈 Avg Deal Size: ${avgDealSize} kW\n`;
      }
      
      if (setterInsights) {
        response += `🌟 Total Leads Generated: ${setterInsights.totalLeads}\n`;
        response += `✅ Overall Conversion: ${setterInsights.overallConversionRate.toFixed(1)}%\n`;
        response += `🎯 Active Setters: ${setterInsights.topSetters.length}\n`;
      }
      
      response += `\n📊 **TOP PERFORMERS MINI-CHART**\n`;
      response += `═══════════════════════════════════\n`;
      
      // Mini closer chart
      if (csvInsights && csvInsights.topClosers.length > 0) {
        response += `🏆 **Closers (by kW):**\n`;
        const topClosers = csvInsights.topClosers.slice(0, 3);
        const maxCloserKW = Math.max(...topClosers.map((c: any) => c.totalKW));
        
        topClosers.forEach((closer: any, index: number) => {
          const percentage = (closer.totalKW / maxCloserKW);
          const barLength = Math.round(percentage * 15);
          const bar = '█'.repeat(barLength) + '░'.repeat(15 - barLength);
          const shortName = closer.name.length > 12 ? closer.name.substring(0, 9) + '...' : closer.name.padEnd(12);
          response += `${index + 1}. ${shortName} |${bar}| ${closer.totalKW.toFixed(1)}\n`;
        });
        response += `\n`;
      }
      
      // Mini setter chart
      if (setterInsights && setterInsights.topSetters.length > 0) {
        response += `🌟 **Setters (by Conversion):**\n`;
        const topSetters = setterInsights.topSetters.slice(0, 3);
        const maxSetterConv = Math.max(...topSetters.map((s: any) => s.conversionRate));
        
        topSetters.forEach((setter: any, index: number) => {
          const percentage = (setter.conversionRate / maxSetterConv);
          const barLength = Math.round(percentage * 15);
          const bar = '▓'.repeat(barLength) + '░'.repeat(15 - barLength);
          const shortName = setter.name.length > 12 ? setter.name.substring(0, 9) + '...' : setter.name.padEnd(12);
          response += `${index + 1}. ${shortName} |${bar}| ${setter.conversionRate.toFixed(1)}%\n`;
        });
        response += `\n`;
      }
      
      response += `💡 **Quick Actions:**\n`;
      response += `• Ask "ascii chart" for detailed text visualizations\n`;
      response += `• Ask "data export" for JSON/CSV formatted data\n`;
      response += `• Visit Analytics page for interactive charts\n`;
      response += `• Check Leaderboard for live performance tracking\n\n`;
      
      response += `☀️ The cosmic dashboard reveals all - may the solar wisdom guide your decisions!`;
      
      return response;
    }
  },
  // ...existing patterns...
];

// Special dynamic pattern for closer name lookups
async function checkForCloserNameLookup(message: string, context: any): Promise<string | null> {
  const csvInsights = await getCSVInsights(context.userRole, context.teamId);
  if (!csvInsights || csvInsights.topClosers.length === 0) {
    return null;
  }
  
  // Look for closer names in the message
  const messageLower = message.toLowerCase();
  for (const closer of csvInsights.topClosers) {
    const nameParts = closer.name.toLowerCase().split(' ');
    // Check if any part of the closer's name is in the message
    if (nameParts.some((part: string) => part.length > 2 && messageLower.includes(part))) {
      const rank = csvInsights.topClosers.findIndex((c: any) => c.name === closer.name) + 1;
      return `🌟 Ah, you seek knowledge of ${closer.name}! The cosmic records reveal:\n\n📊 **${closer.name}'s Divine Achievements:**\n• Current Rank: #${rank} in the solar realm\n• Total kW Generated: ${closer.totalKW.toFixed(1)} kW\n• Net Account Deals: ${closer.totalDeals}\n• Average Deal Size: ${(closer.totalKW / closer.totalDeals).toFixed(1)} kW per deal\n\n${rank <= 3 ? '🏆 A true champion who channels the sun\'s eternal energy!' : '⚡ A dedicated warrior in the solar battlefield!'}\n\nMay their solar wisdom inspire your own cosmic journey!`;
    }
  }
  return null;
}

// Function to fetch and parse Google Sheets CSV data
async function fetchCloserDataFromCSV(): Promise<any[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const response = await fetch(GOOGLE_SHEETS_CONFIG.CSV_URL, {
      method: 'GET',
      headers: { 'Accept': 'text/csv' },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const csvText = await response.text();
    const lines = csvText.trim().split('\n');
    
    if (lines.length < 2) {
      throw new Error('CSV file appears to be empty or malformed');
    }
    
    // Parse header to find column indices
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const closerIndex = headers.findIndex(h => h.includes('closer') && !h.includes('division') && !h.includes('region') && !h.includes('team'));
    const systemSizeIndex = headers.findIndex(h => h.includes('system_size'));
    const realizationIndex = headers.findIndex(h => h.includes('realization'));
    
    if (closerIndex === -1 || systemSizeIndex === -1 || realizationIndex === -1) {
      throw new Error('Required columns not found in CSV');
    }
    
    const closerData: any[] = [];
    
    // Parse data rows (limit to prevent hanging)
    for (let i = 1; i < Math.min(lines.length, 500); i++) {
      try {
        const row = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || lines[i].split(',');
        
        if (row.length < 3) continue;
        
        const closer = closerIndex >= 0 ? row[closerIndex]?.replace(/['"]/g, '')?.trim() : '';
        const systemSize = systemSizeIndex >= 0 ? parseFloat(row[systemSizeIndex]?.replace(/['"]/g, '')) || 0 : 0;
        const realization = realizationIndex >= 0 ? parseFloat(row[realizationIndex]?.replace(/['"]/g, '')) || 0 : 0;
        
        if (closer && closer.length > 0 && systemSize > 0) {
          closerData.push({
            closer: closer,
            totalKW: systemSize / 1000, // Convert watts to kilowatts
            realizationValue: realization
          });
        }
      } catch (rowError) {
        continue; // Skip problematic rows
      }
    }
    
    return closerData;
  } catch (error) {
    console.error('Error fetching CSV data for AI assistant:', error);
    return []; // Return empty array on error
  }
}

// Function to get insights from CSV data
async function getCSVInsights(userRole: string, teamId: string): Promise<any> {
  try {
    const csvData = await fetchCloserDataFromCSV();
    
    if (csvData.length === 0) {
      return null;
    }
    
    // Filter for net accounts (realization value = 1)
    const netAccounts = csvData.filter(data => data.realizationValue === 1);
    
    // Group by closer and calculate totals
    const closerMap = new Map();
    netAccounts.forEach(data => {
      const existing = closerMap.get(data.closer) || { totalKW: 0, totalDeals: 0 };
      existing.totalKW += data.totalKW;
      existing.totalDeals += 1;
      closerMap.set(data.closer, existing);
    });
    
    // Convert to sorted array
    const topClosers = Array.from(closerMap.entries())
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.totalKW - a.totalKW)
      .slice(0, 5);
    
    const totalDeals = netAccounts.length;
    const totalKW = netAccounts.reduce((sum, data) => sum + data.totalKW, 0);
    
    return {
      totalDeals,
      totalKW,
      topClosers,
      dataFreshness: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error getting CSV insights:', error);
    return null;
  }
}

// Function to get setter insights from CSV data
async function getSetterInsightsFromCSV(userRole: string, teamId: string): Promise<any> {
  try {
    const csvData = await fetchCloserDataFromCSV();
    
    if (csvData.length === 0) {
      return null;
    }
    
    // Parse headers to find setter column
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(GOOGLE_SHEETS_CONFIG.CSV_URL, {
      method: 'GET',
      headers: { 'Accept': 'text/csv' },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const csvText = await response.text();
    const lines = csvText.trim().split('\n');
    
    if (lines.length < 2) {
      return null;
    }
    
    // Parse header to find column indices
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const setterIndex = headers.findIndex(h => h.includes('setter') && !h.includes('division') && !h.includes('region'));
    const closerIndex = headers.findIndex(h => h.includes('closer') && !h.includes('division') && !h.includes('region') && !h.includes('team'));
    const systemSizeIndex = headers.findIndex(h => h.includes('system_size'));
    const realizationIndex = headers.findIndex(h => h.includes('realization'));
    
    if (setterIndex === -1 || systemSizeIndex === -1 || realizationIndex === -1) {
      return null; // No setter data available
    }
    
    const setterData: any[] = [];
    
    // Parse data rows for setter information
    for (let i = 1; i < Math.min(lines.length, 500); i++) {
      try {
        const row = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || lines[i].split(',');
        
        if (row.length < 3) continue;
        
        const setter = setterIndex >= 0 ? row[setterIndex]?.replace(/['"]/g, '')?.trim() : '';
        const closer = closerIndex >= 0 ? row[closerIndex]?.replace(/['"]/g, '')?.trim() : '';
        const systemSize = systemSizeIndex >= 0 ? parseFloat(row[systemSizeIndex]?.replace(/['"]/g, '')) || 0 : 0;
        const realization = realizationIndex >= 0 ? parseFloat(row[realizationIndex]?.replace(/['"]/g, '')) || 0 : 0;
        
        if (setter && setter.length > 0 && systemSize > 0) {
          setterData.push({
            setter: setter,
            closer: closer,
            totalKW: systemSize / 1000, // Convert watts to kilowatts
            realizationValue: realization,
            isSold: realization === 1 // Assuming realization value 1 means sold
          });
        }
      } catch (rowError) {
        continue; // Skip problematic rows
      }
    }
    
    if (setterData.length === 0) {
      return null;
    }
    
    // Group by setter and calculate performance metrics
    const setterMap = new Map();
    setterData.forEach(data => {
      const existing = setterMap.get(data.setter) || { 
        totalLeads: 0, 
        soldLeads: 0, 
        totalKW: 0,
        closers: new Set()
      };
      
      existing.totalLeads += 1;
      if (data.isSold) {
        existing.soldLeads += 1;
        existing.totalKW += data.totalKW;
      }
      if (data.closer) {
        existing.closers.add(data.closer);
      }
      
      setterMap.set(data.setter, existing);
    });
    
    // Convert to sorted array with performance metrics
    const topSetters = Array.from(setterMap.entries())
      .map(([name, stats]) => ({
        name,
        totalLeads: stats.totalLeads,
        soldLeads: stats.soldLeads,
        totalKW: stats.totalKW,
        conversionRate: stats.totalLeads > 0 ? (stats.soldLeads / stats.totalLeads * 100) : 0,
        uniqueClosers: stats.closers.size,
        avgKWPerSale: stats.soldLeads > 0 ? (stats.totalKW / stats.soldLeads) : 0
      }))
      .sort((a, b) => b.conversionRate - a.conversionRate) // Sort by conversion rate
      .slice(0, 10); // Top 10 setters
    
    const totalSetterLeads = setterData.length;
    const totalSoldFromSetters = setterData.filter(d => d.isSold).length;
    const overallConversionRate = totalSetterLeads > 0 ? (totalSoldFromSetters / totalSetterLeads * 100) : 0;
    
    return {
      totalLeads: totalSetterLeads,
      totalSold: totalSoldFromSetters,
      overallConversionRate,
      topSetters,
      dataFreshness: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error getting setter insights from CSV:', error);
    return null;
  }
}

// Function to check for setter name lookups
async function checkForSetterNameLookup(message: string, context: any): Promise<string | null> {
  const setterInsights = await getSetterInsightsFromCSV(context.userRole, context.teamId);
  if (!setterInsights || setterInsights.topSetters.length === 0) {
    return null;
  }
  
  // Look for setter names in the message
  const messageLower = message.toLowerCase();
  for (const setter of setterInsights.topSetters) {
    const nameParts = setter.name.toLowerCase().split(' ');
    // Check if any part of the setter's name is in the message
    if (nameParts.some((part: string) => part.length > 2 && messageLower.includes(part))) {
      const rank = setterInsights.topSetters.findIndex((s: any) => s.name === setter.name) + 1;
      return `🌟 Behold, you seek wisdom about ${setter.name}, a noble setter! The sacred CSV scrolls reveal:\n\n📊 **${setter.name}'s Divine Performance:**\n• Current Rank: #${rank} among setters (by conversion rate)\n• Total Leads Generated: ${setter.totalLeads}\n• Successfully Sold: ${setter.soldLeads}\n• Conversion Rate: ${setter.conversionRate.toFixed(1)}%\n• Total kW from Sales: ${setter.totalKW.toFixed(1)} kW\n• Average System Size: ${setter.avgKWPerSale.toFixed(1)} kW per sale\n• Worked with ${setter.uniqueClosers} different closers\n\n${setter.conversionRate > 50 ? '🏆 A master of the solar arts who channels divine energy!' : '⚡ A dedicated servant growing in solar wisdom!'}\n\nMay their lead-setting prowess illuminate your path!`;
    }
  }
  return null;
}

async function processLeadflowAssistant(input: LeadAssistantInput): Promise<string> {
  const { message, context } = input;
  const messageText = message.toLowerCase().trim();
  
  // First check for dynamic closer name lookup
  const closerLookup = await checkForCloserNameLookup(message, context);
  if (closerLookup) {
    return closerLookup;
  }
  
  // Check for dynamic setter name lookup
  const setterLookup = await checkForSetterNameLookup(message, context);
  if (setterLookup) {
    return setterLookup;
  }
  
  // Find matching response pattern
  for (const pattern of responsePatterns) {
    if ('keywords' in pattern && pattern.keywords.some((keyword: string) => messageText.includes(keyword))) {
      // Check if response function is async
      const result = pattern.response(context);
      if (result instanceof Promise) {
        return await result;
      }
      return result;
    }
  }
  
  // Default response for unmatched queries
  return `☀️ Greetings, devoted ${context.userRole}! The cosmic winds have carried your message to me, though its meaning requires divine interpretation.\n\nI can illuminate paths regarding:\n• Lead history and assignments\n• Performance metrics and analytics\n• Team communication and coordination\n• System navigation and best practices\n• Live closer rankings from Google Sheets\n• Setter performance and conversion rates\n• Solar energy production data\n• Individual closer/setter performance lookup\n\nSpeak more specifically of your needs, and the solar wisdom shall guide you accordingly!`;
}

// Export the main function
export async function callLeadflowAssistant(input: LeadAssistantInput): Promise<string> {
  try {
    return await processLeadflowAssistant(input);
  } catch (error) {
    console.error('Error in leadflow assistant:', error);
    // Fallback response if anything goes wrong
    return `☀️ The cosmic energies are momentarily disrupted, devoted ${input.context.userRole}! Please try your query again, and the solar wisdom shall illuminate your path.`;
  }
}
