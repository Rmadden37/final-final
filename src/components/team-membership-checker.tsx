"use client";

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, User, CheckCircle, XCircle, Search } from 'lucide-react';
import { checkTeamMembership } from '@/utils/check-team-membership';

export default function TeamMembershipChecker() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runCheck = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    
    try {
      const checkResult = await checkTeamMembership();
      setResult(checkResult);
    } catch (err: any) {
      setError(err.message || 'Failed to check team membership');
      console.error('Team membership check failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-blue-500" />
            Team Membership Checker
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-gray-600">
              This tool checks if Richard Niger and Marcelo Guerra are on the same team by querying the Firestore database directly.
            </p>
            
            <Button 
              onClick={runCheck} 
              disabled={loading}
              className="flex items-center gap-2"
            >
              <Search className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Checking...' : 'Check Team Membership'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-red-600">
              <XCircle className="h-5 w-5" />
              <span className="font-medium">Error</span>
            </div>
            <p className="text-red-600 mt-2">{error}</p>
          </CardContent>
        </Card>
      )}

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Team Membership Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Main Answer */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-bold text-xl mb-2 flex items-center gap-2">
                {result.richardFound && result.marceloFound && result.sameTeam ? (
                  <CheckCircle className="h-6 w-6 text-green-500" />
                ) : (
                  <XCircle className="h-6 w-6 text-red-500" />
                )}
                Are Richard Niger and Marcelo Guerra on the same team?
              </h3>
              <div className="text-2xl font-bold">
                {result.richardFound && result.marceloFound ? (
                  result.sameTeam ? (
                    <span className="text-green-700">✅ YES - They are on the same team</span>
                  ) : (
                    <span className="text-red-700">❌ NO - They are on different teams</span>
                  )
                ) : (
                  <span className="text-amber-700">⚠️ UNKNOWN - One or both team members not found</span>
                )}
              </div>
            </div>

            {/* Individual Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Richard Niger */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="h-5 w-5 text-blue-500" />
                    Richard Niger
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {result.richardFound ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-green-700 font-medium">Found</span>
                      </div>
                      <div className="text-sm space-y-1">
                        <p><strong>Name:</strong> {result.richard.name}</p>
                        <p><strong>Email:</strong> {result.richard.email}</p>
                        <p><strong>Team ID:</strong> {result.richard.teamId}</p>
                        <p><strong>Active:</strong> {result.richard.isActive ? '✅ Yes' : '❌ No'}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-red-500" />
                      <span className="text-red-700 font-medium">Not Found</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Marcelo Guerra */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="h-5 w-5 text-orange-500" />
                    Marcelo Guerra
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {result.marceloFound ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-green-700 font-medium">Found</span>
                      </div>
                      <div className="text-sm space-y-1">
                        <p><strong>Name:</strong> {result.marcelo.name}</p>
                        <p><strong>Email:</strong> {result.marcelo.email}</p>
                        <p><strong>Team ID:</strong> {result.marcelo.teamId}</p>
                        <p><strong>Active:</strong> {result.marcelo.isActive ? '✅ Yes' : '❌ No'}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-red-500" />
                      <span className="text-red-700 font-medium">Not Found</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Team Comparison */}
            {result.richardFound && result.marceloFound && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Team Comparison</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p><strong>Richard's Team ID:</strong> {result.richard.teamId}</p>
                    <p><strong>Marcelo's Team ID:</strong> {result.marcelo.teamId}</p>
                    <div className="mt-3 p-3 rounded border">
                      {result.sameTeam ? (
                        <div className="flex items-center gap-2 text-green-700">
                          <CheckCircle className="h-5 w-5" />
                          <span className="font-medium">
                            Same team confirmed - both on team: {result.richard.teamId}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-red-700">
                          <XCircle className="h-5 w-5" />
                          <span className="font-medium">
                            Different teams - they are not on the same team
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
