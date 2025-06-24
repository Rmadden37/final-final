import { ai } from './genkit';
import * as z from 'zod';

const LeadAssistantInputSchema = z.object({
  message: z.string(),
  context: z.object({
    userRole: z.enum(['setter', 'closer', 'manager']),
    teamId: z.string(),
    leadCount: z.number().optional(),
    recentActivity: z.string().optional(),
    analytics: z.any().optional(), // <-- Accept analytics data
  }),
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
    timestamp: z.string(),
  })).optional(),
});

export const leadflowAssistant = ai.defineFlow(
  {
    name: 'leadflowAssistant',
    inputSchema: LeadAssistantInputSchema,
    outputSchema: z.string(),
  },
  async (input) => {
    const { message, context, conversationHistory = [] } = input;
    const analytics = context.analytics || {};

    // Summarize analytics for the prompt in a structured table
    let analyticsSummary = '';
    if (context.analytics) {
      const { closers = [], setters = [], totalSales, totalRevenue, lastUpdated } = context.analytics;
      if (closers.length > 0) {
        analyticsSummary += `\nTop Closers This Month (Name | Sales | Revenue | kW):`;
        analyticsSummary += '\n' + closers.slice(0, 5).map((c, i) => `${i + 1}. ${c.name} | ${c.sales} | $${c.revenue?.toLocaleString?.() || c.revenue} | ${c.totalKW}`).join('\n');
      }
      if (setters.length > 0) {
        analyticsSummary += `\nTop Setters (Name | Leads):`;
        analyticsSummary += '\n' + setters.slice(0, 5).map((s, i) => `${i + 1}. ${s.displayName} | ${s.totalLeads}`).join('\n');
      }
      if (typeof totalSales === 'number') analyticsSummary += `\nTotal Sales: ${totalSales}`;
      if (typeof totalRevenue === 'number') analyticsSummary += `\nTotal Revenue: $${totalRevenue?.toLocaleString?.() || totalRevenue}`;
      if (lastUpdated) analyticsSummary += `\nData last updated: ${lastUpdated}`;
    }

    // Build context-aware system prompt
    const systemPrompt = `You are LeadFlow Assistant, an AI helper for a lead history system.\n\nUser Context:\n- Role: ${context.userRole}\n- Team ID: ${context.teamId}\n- Current Leads: ${context.leadCount || 0}\n- Recent Activity: ${context.recentActivity || 'None'}\n\nSALES ANALYTICS DATA (for this team):\n${analyticsSummary || 'No analytics data available.'}\n\nYou help users with:\n1. Lead history guidance\n2. Best practices for ${context.userRole}s\n3. System navigation help\n4. Team coordination advice\n5. Performance optimization tips\n6. Answering analytics questions using the provided data above.\n\nWhen asked about sales, top performers, or team stats, ALWAYS use the analytics data above. If the answer is not in the data, say so. If a user asks for top closers, list them from the table. If a user asks for conversion rates or sales, use the numbers above.\n\nKeep responses concise, helpful, and role-appropriate. Use emojis sparingly but effectively.`;

    // Format conversation history for genkit
    const formattedHistory = conversationHistory.slice(-10).map(msg => ({
      role: msg.role === 'assistant' ? 'model' : msg.role,
      content: [{ text: msg.content }]
    }));

    const prompt = `${systemPrompt}

Conversation History:
${formattedHistory.map(msg => `${msg.role}: ${msg.content[0].text}`).join('\n')}

User: ${message}`;

    const llmResponse = await ai.generate(prompt);

    return llmResponse.text;
  }
);
