"use client";

import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { BrainCircuit, Loader2 } from "lucide-react";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { AiChart, AiApiResponse } from "./types";

export default function AIAssistantTab() {
  const { toast } = useToast();
  const [prompt, setPrompt] = useState("");
  const [textResponse, setTextResponse] = useState("");
  const [chartResponse, setChartResponse] = useState<AiChart | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const fetchCsvData = async (url: string): Promise<string> => {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.statusText}`);
        }
        return await response.text();
    } catch (error) {
        console.error("Failed to fetch CSV data:", error);
        throw error;
    }
  };

  const handleAiGenerate = async () => {
    if (!prompt) {
      toast({ title: "Prompt is empty", description: "Please enter a question.", variant: "destructive" });
      return;
    }

    const csvUrl = process.env.NEXT_PUBLIC_CSV_URL;
    if (!csvUrl) {
      toast({ title: "CSV URL Not Configured", description: "Please set NEXT_PUBLIC_CSV_URL in your environment.", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    setTextResponse("");
    setChartResponse(null);

    try {
      const csvData = await fetchCsvData(csvUrl);

      const enhancedPrompt = `
        You are a data analytics assistant. Based on the following CSV data, provide an answer to the user's question.
        If the question asks for a comparison, trend, or distribution (e.g., "show me a bar chart of...", "compare...", "what is the distribution of..."), respond with a JSON object for a chart.
        Otherwise, provide a concise text-based answer.

        CSV Data:
        ---
        ${csvData}
        ---
        
        User's Question: "${prompt}"
      `;

      const schema = {
        type: "OBJECT",
        properties: {
          text_response: { type: "STRING", description: "A text-based answer to the user's question." },
          chart_response: {
            type: "OBJECT",
            description: "A chart visualization for the user's question.",
            properties: {
              type: { type: "STRING", enum: ["bar", "line", "pie"] },
              title: { type: "STRING" },
              dataKey: { type: "STRING", description: "The key for the numeric values in the data." },
              categoryKey: { type: "STRING", description: "The key for the labels/categories on the x-axis or for pie slices." },
              data: {
                type: "ARRAY",
                items: { type: "OBJECT" }
              }
            }
          }
        }
      };

      const payload = {
        contents: [{ role: "user", parts: [{ text: enhancedPrompt }] }],
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: schema,
        },
      };

      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";
      if (!apiKey) {
        toast({ 
          title: "API Key Missing", 
          description: "Please set NEXT_PUBLIC_GEMINI_API_KEY in your environment variables.", 
          variant: "destructive" 
        });
        setIsGenerating(false);
        return;
      }
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

      const apiResponse = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
      });

      if (!apiResponse.ok) throw new Error(`API Error: ${apiResponse.statusText}`);
      
      const result = await apiResponse.json();

      if (result.candidates && result.candidates[0]?.content?.parts[0]?.text) {
          const responseJson: AiApiResponse = JSON.parse(result.candidates[0].content.parts[0].text);
          if(responseJson.chart_response) {
            setChartResponse(responseJson.chart_response);
          } else if (responseJson.text_response) {
            setTextResponse(responseJson.text_response);
          } else {
            setTextResponse("The AI returned a response I couldn't understand.");
          }
      } else {
          throw new Error("Invalid response structure from the AI.");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      console.error("AI generation failed:", errorMessage);
      toast({ title: "AI Assistant Error", description: `Could not get a response. ${errorMessage}`, variant: "destructive" });
      setTextResponse(`Sorry, an error occurred: ${errorMessage}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const renderAiChart = () => {
    if (!chartResponse) return null;

    return (
        <Card className="bg-muted/50 dark:bg-muted/20 mt-4">
            <CardHeader>
                <CardTitle className="text-lg">{chartResponse.title}</CardTitle>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <>
                    {/* Bar Chart (single or stacked/double) */}
                    {chartResponse.type === 'bar' && (
                      <BarChart data={chartResponse.data}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey={chartResponse.categoryKey} />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        {/* Support for stacked/double bar: if dataKey is array, render multiple bars */}
                        {Array.isArray(chartResponse.dataKey)
                          ? chartResponse.dataKey.map((key: string, idx: number) => (
                              <Bar
                                key={key}
                                dataKey={key}
                                fill={['#8884d8', '#82ca9d', '#ffc658', '#ff7300'][idx % 4]}
                                stackId={chartResponse.stacked ? "a" : undefined}
                              />
                            ))
                          : (
                            <Bar dataKey={chartResponse.dataKey} fill="#8884d8" />
                          )
                        }
                      </BarChart>
                    )}

                    {/* Line Chart (single, double, or with trend line) */}
                    {chartResponse.type === 'line' && (
                      <LineChart data={chartResponse.data}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey={chartResponse.categoryKey} />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        {/* Support for double line: if dataKey is array, render multiple lines */}
                        {Array.isArray(chartResponse.dataKey)
                          ? chartResponse.dataKey.map((key: string, idx: number) => (
                              <Line
                                key={key}
                                type="monotone"
                                dataKey={key}
                                stroke={['#8884d8', '#82ca9d', '#ffc658', '#ff7300'][idx % 4]}
                                dot={false}
                              />
                            ))
                          : (
                            <Line type="monotone" dataKey={chartResponse.dataKey} stroke="#8884d8" dot={false} />
                          )
                        }
                        {/* Optional: Trend line if chartResponse.trendLineKey is provided */}
                        {'trendLineKey' in chartResponse && chartResponse.trendLineKey && (
                          <Line
                            type="monotone"
                            dataKey={chartResponse.trendLineKey as string}
                            stroke="#ff7300"
                            strokeDasharray="5 5"
                            dot={false}
                            name="Trend"
                          />
                        )}
                      </LineChart>
                    )}

                    {/* Pie Chart */}
                    {chartResponse.type === 'pie' && (
                      <PieChart>
                        <Pie
                          data={chartResponse.data}
                          dataKey={Array.isArray(chartResponse.dataKey) ? chartResponse.dataKey[0] : chartResponse.dataKey}
                          nameKey={chartResponse.categoryKey}
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          fill="#8884d8"
                          label
                        >
                          {chartResponse.data.map((_: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={`#${Math.floor(Math.random()*16777215).toString(16)}`} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    )}
                  </>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
  };

  return (
    <Card className="dark:card-glass">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BrainCircuit className="h-6 w-6 text-primary" />
          AI Data Analyst
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Ask questions about your data using a provided CSV file. Try asking for charts!
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Textarea 
            placeholder="e.g., 'Show me a bar chart of leads per setter'"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            className="text-base"
          />
          <Button onClick={handleAiGenerate} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              "Analyze with CSV"
            )}
          </Button>

          {textResponse && (
            <Card className="bg-muted/50 dark:bg-muted/20">
              <CardHeader><CardTitle className="text-lg">AI Response</CardTitle></CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap font-mono text-sm">{textResponse}</p>
              </CardContent>
            </Card>
          )}

          {chartResponse && renderAiChart()}
        </div>
      </CardContent>
    </Card>
  );
}
