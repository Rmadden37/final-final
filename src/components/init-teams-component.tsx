"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { initializeTeams } from "@/utils/init-teams";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export default function InitTeamsComponent() {
  const [isInitializing, setIsInitializing] = useState(false);
  const { toast } = useToast();

  const handleInitialize = async () => {
    setIsInitializing(true);
    try {
      await initializeTeams();
      toast({
        title: "Success",
        description: "Teams have been initialized successfully!",
      });
    } catch (error: any) {
      console.error("Error initializing teams:", error);
      toast({
        title: "Error",
        description: `Failed to initialize teams: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsInitializing(false);
    }
  };

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Initialize Teams</CardTitle>
        <CardDescription>
          Add the default Empire team to the database.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button 
          onClick={handleInitialize} 
          disabled={isInitializing}
          className="w-full"
        >
          {isInitializing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Initialize Teams
        </Button>
      </CardContent>
    </Card>
  );
}
