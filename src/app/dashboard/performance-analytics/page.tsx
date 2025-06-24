"use client";

import { useState } from "react";
import PerformanceDashboard from "@/components/analytics/performance-dashboard";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, MessageSquare, TrendingUp, BarChart3, Users, Target, Send, Loader2, Sparkles, ChartBar, PieChart, Activity } from "lucide-react";
import { callLocalAIAssistant } from "@/lib/local-ai-assistant";

interface ChatMessage {
  id: string;
  content: string;
  isBot: boolean;
  timestamp: Date;
  status?: 'sending' | 'sent' | 'error';
}

interface QuickAction {
  icon: React.ReactNode;
  title: string;
  description: string;
  query: string;
  category: 'performance' | 'trends' | 'team';
}

const quickActions: QuickAction[] = [
  {
    icon: <TrendingUp className="h-5 w-5" />,
    title: "Weekly Performance",
    description: "Get this week's sales performance summary",
    query: "Show me this week's sales performance compared to last week",
    category: 'performance'
  },
  {
    icon: <Users className="h-5 w-5" />,
    title: "Top Performers",
    description: "Who are our best closers this month?",
    query: "Who are the top 5 performing closers this month?",
    category: 'team'
  },
  {
    icon: <BarChart3 className="h-5 w-5" />,
    title: "Conversion Rates",
    description: "Analyze lead conversion by source",
    query: "What are our conversion rates by lead source?",
    category: 'performance'
  },
  {
    icon: <Target className="h-5 w-5" />,
    title: "Pipeline Analysis",
    description: "Review current pipeline status",
    query: "Analyze our current sales pipeline and forecast",
    category: 'trends'
  },
  {
    icon: <PieChart className="h-5 w-5" />,
    title: "Team Distribution",
    description: "How are leads distributed across teams?",
    query: "Show me how leads are distributed across our teams",
    category: 'team'
  },
  {
    icon: <Activity className="h-5 w-5" />,
    title: "Daily Metrics",
    description: "Today's key performance indicators",
    query: "What are today's key metrics and how do they compare to our goals?",
    category: 'performance'
  }
];

export default function PerformanceAnalyticsPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      content: "Hi! I'm your AI sales analytics assistant. I can help you analyze performance data, track trends, and answer questions about your sales metrics. What would you like to know?",
      isBot: true,
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const handleSendMessage = async (messageText?: string) => {
    const question = messageText || inputValue.trim();
    
    if (!question) {
      return;
    }

    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: question,
      isBot: false,
      timestamp: new Date(),
      status: 'sending'
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      // Update user message status
      setMessages(prev => 
        prev.map(msg => 
          msg.id === userMessage.id 
            ? { ...msg, status: 'sent' }
            : msg
        )
      );

      // Call the local AI assistant
      const response = await callLocalAIAssistant({
        message: question,
        context: {
          userRole: (user?.role === 'admin' ? 'manager' : user?.role) as 'setter' | 'closer' | 'manager' || 'closer',
          teamId: user?.teamId || 'default',
          leadCount: 0
        }
      });
      
      // Add bot response
      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: response,
        isBot: true,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMessage]);

    } catch (error) {
      console.error('Error calling AI assistant:', error);
      
      // Add error message
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: `☀️ The cosmic energies are momentarily disrupted! Please try your query again, and the solar wisdom shall illuminate your path.`,
        isBot: true,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
      
      // Update user message status to error
      setMessages(prev => 
        prev.map(msg => 
          msg.id === userMessage.id 
            ? { ...msg, status: 'error' }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const filteredQuickActions = selectedCategory === "all" 
    ? quickActions 
    : quickActions.filter(action => action.category === selectedCategory);

  if (!user) return null;

  if (user.role === "setter") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md mx-auto">
          <CardContent className="flex items-center justify-center p-8">
            <div className="text-center">
              <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Analytics Not Available</h2>
              <p className="text-muted-foreground">Analytics are available for closers and managers only.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-3 rounded-xl">
              <Brain className="h-8 w-8 text-white" />
            </div>
            Analytics
          </h1>
          <p className="text-muted-foreground mt-2">
            Performance dashboards and AI-powered insights
          </p>
        </div>
        <Badge variant="secondary" className="flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          AI Powered
        </Badge>
      </div>

      {/* Tabs for Dashboard and AI Assistant */}
      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Performance Dashboard
          </TabsTrigger>
          <TabsTrigger value="ai-assistant" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            AI Assistant
          </TabsTrigger>
        </TabsList>

        {/* Performance Dashboard Tab */}
        <TabsContent value="dashboard" className="mt-6">
          <PerformanceDashboard />
        </TabsContent>

        {/* AI Assistant Tab */}
        <TabsContent value="ai-assistant" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Quick Actions Sidebar */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ChartBar className="h-5 w-5" />
                    Quick Insights
                  </CardTitle>
                  <CardDescription>
                    Click any question to get instant analytics
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Category Filter */}
                  <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
                      <TabsTrigger value="performance" className="text-xs">Performance</TabsTrigger>
                      <TabsTrigger value="trends" className="text-xs">Trends</TabsTrigger>
                      <TabsTrigger value="team" className="text-xs">Team</TabsTrigger>
                    </TabsList>
                  </Tabs>

                  {/* Quick Action Buttons */}
                  <div className="space-y-2">
                    {filteredQuickActions.map((action, index) => (
                      <Button
                        key={index}
                        variant="ghost"
                        className="w-full h-auto p-4 justify-start text-left hover:bg-muted/50"
                        onClick={() => handleSendMessage(action.query)}
                        disabled={isLoading}
                      >
                        <div className="flex items-start gap-3 w-full">
                          <div className="bg-primary/10 p-2 rounded-lg flex-shrink-0">
                            {action.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm">{action.title}</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {action.description}
                            </div>
                          </div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Chat Interface */}
            <div className="lg:col-span-2">
              <Card className="h-[600px] flex flex-col">
                <CardHeader className="flex-shrink-0">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    AI Chat Assistant
                  </CardTitle>
                  <CardDescription>
                    Ask me anything about your sales data and analytics
                  </CardDescription>
                </CardHeader>
                
                {/* Messages Area */}
                <CardContent className="flex-1 flex flex-col min-h-0">
                  <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex gap-3 ${
                          message.isBot ? 'justify-start' : 'justify-end'
                        }`}
                      >
                        {message.isBot && (
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                              AI
                            </AvatarFallback>
                          </Avatar>
                        )}
                        
                        <div
                          className={`max-w-[80%] rounded-lg px-4 py-2 ${
                            message.isBot
                              ? 'bg-muted text-foreground'
                              : 'bg-primary text-primary-foreground'
                          }`}
                        >
                          <div className="text-sm whitespace-pre-wrap">
                            {message.content}
                          </div>
                          <div className="text-xs opacity-70 mt-1 flex items-center gap-1">
                            {message.timestamp.toLocaleTimeString()}
                            {message.status === 'sending' && (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            )}
                            {message.status === 'error' && (
                              <span className="text-red-400">Failed</span>
                            )}
                          </div>
                        </div>
                        
                        {!message.isBot && (
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user?.avatarUrl || undefined} />
                            <AvatarFallback>
                              {user?.displayName?.charAt(0) || 'U'}
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    ))}
                    
                    {isLoading && (
                      <div className="flex gap-3 justify-start">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                            AI
                          </AvatarFallback>
                        </Avatar>
                        <div className="bg-muted rounded-lg px-4 py-2">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Analyzing your data...
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Input Area */}
                  <div className="flex gap-2 border-t pt-4">
                    <Input
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Ask about sales performance, trends, team metrics..."
                      className="flex-1"
                      disabled={isLoading}
                    />
                    <Button
                      onClick={() => handleSendMessage()}
                      disabled={isLoading || !inputValue.trim()}
                      size="icon"
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
