"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, Sparkles, Sun, Crown } from "lucide-react";
import BotChat from "@/components/performance-dashboard.tsx/bot-chat";
import { Button } from "@/components/ui/button";

export default function AnalyticsAIPage() {
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics AI Assistant</h1>
          <p className="text-muted-foreground">
            Powered by Ra - Your divine guide to sales insights
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Sun className="h-6 w-6 text-amber-600 dark:text-turquoise animate-pulse" />
          <Crown className="h-4 w-4 text-amber-700 dark:text-cyan" />
        </div>
      </div>

      {/* Main AI Assistant Card */}
      <Card className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-slate-900 dark:to-slate-800 border-2 border-amber-200 dark:border-turquoise/30 dark:card-glass dark:glow-turquoise">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <div className="h-20 w-20 rounded-full bg-gradient-to-br from-amber-200 to-orange-300 dark:from-turquoise/20 dark:to-cyan/30 flex items-center justify-center border-4 border-amber-300 dark:border-turquoise/50 shadow-lg dark:glow-turquoise">
                <Sun className="h-10 w-10 text-amber-700 dark:text-turquoise" />
              </div>
              <Crown className="h-6 w-6 text-amber-700 dark:text-cyan absolute -top-2 -right-2" />
            </div>
          </div>
          <CardTitle className="text-2xl text-amber-900 dark:text-turquoise">
            Ra - Sun God of LeadFlow
          </CardTitle>
          <p className="text-amber-700 dark:text-gray-300">
            Your divine analytics assistant, ready to illuminate sales insights with cosmic wisdom
          </p>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="p-4 bg-white/20 dark:bg-slate-800/30 rounded-lg">
              <Brain className="h-8 w-8 text-amber-600 dark:text-turquoise mx-auto mb-2" />
              <h3 className="font-semibold text-amber-800 dark:text-turquoise">Smart Analytics</h3>
              <p className="text-amber-600 dark:text-gray-400">AI-powered insights from your sales data</p>
            </div>
            <div className="p-4 bg-white/20 dark:bg-slate-800/30 rounded-lg">
              <Sparkles className="h-8 w-8 text-amber-600 dark:text-turquoise mx-auto mb-2" />
              <h3 className="font-semibold text-amber-800 dark:text-turquoise">Data Visualization</h3>
              <p className="text-amber-600 dark:text-gray-400">Dynamic charts and graphs on demand</p>
            </div>
            <div className="p-4 bg-white/20 dark:bg-slate-800/30 rounded-lg">
              <Sun className="h-8 w-8 text-amber-600 dark:text-turquoise mx-auto mb-2" />
              <h3 className="font-semibold text-amber-800 dark:text-turquoise">Divine Guidance</h3>
              <p className="text-amber-600 dark:text-gray-400">Strategic recommendations from Ra</p>
            </div>
          </div>
          
          <Button 
            onClick={() => setIsChatOpen(true)}
            className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 dark:from-turquoise/80 dark:to-cyan/80 dark:hover:from-turquoise dark:hover:to-cyan text-white dark:text-slate-900 px-8 py-3 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 dark:glow-cyan"
          >
            <Sun className="mr-2 h-5 w-5" />
            Consult with Ra
          </Button>
        </CardContent>
      </Card>

      {/* Additional Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-amber-600 dark:text-turquoise" />
              What Ra Can Help With
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <div className="h-2 w-2 bg-amber-500 rounded-full"></div>
                Top performer analysis and rankings
              </li>
              <li className="flex items-center gap-2">
                <div className="h-2 w-2 bg-amber-500 rounded-full"></div>
                Revenue and system size breakdowns
              </li>
              <li className="flex items-center gap-2">
                <div className="h-2 w-2 bg-amber-500 rounded-full"></div>
                Team performance comparisons
              </li>
              <li className="flex items-center gap-2">
                <div className="h-2 w-2 bg-amber-500 rounded-full"></div>
                Custom charts and visualizations
              </li>
              <li className="flex items-center gap-2">
                <div className="h-2 w-2 bg-amber-500 rounded-full"></div>
                Strategic sales insights
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-600 dark:text-turquoise" />
              Example Questions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <ul className="space-y-2 text-sm">
              <li className="italic text-muted-foreground">"Show me the top 5 closers by revenue"</li>
              <li className="italic text-muted-foreground">"Create a chart of system sizes by team"</li>
              <li className="italic text-muted-foreground">"How is Richard performing this month?"</li>
              <li className="italic text-muted-foreground">"Compare Dynasty Vendetta vs TakeoverPros"</li>
              <li className="italic text-muted-foreground">"What's our average deal size?"</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Ra Chat Dialog */}
      <BotChat 
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
      />
    </div>
  );
}