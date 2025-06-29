"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Target } from "lucide-react";
import { CloserPerformance } from "./types";

interface CloserPerformanceTableProps {
  closerPerformance: CloserPerformance[];
  selectedCloser: string;
  onCloserSelect: (closerId: string) => void;
}

export function CloserPerformanceTable({ 
  closerPerformance, 
  selectedCloser, 
  onCloserSelect 
}: CloserPerformanceTableProps) {
  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          <Target className="h-5 w-5" />
          Closer Performance
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-center p-2">Closer</th>
                <th className="text-center p-2">Assigned</th>
                <th className="text-center p-2">Sold</th>
                <th className="text-center p-2">Close Rate</th>
                <th className="text-center p-2">No Sale</th>
                <th className="text-center p-2">Credit Fail</th>
                <th className="text-center p-2">Self-Gen</th>
                <th className="text-center p-2">Conversion</th>
                <th className="text-center p-2">Avg/Day</th>
              </tr>
            </thead>
            <tbody>
              {closerPerformance
                .filter(closer => selectedCloser === "all" || closer.uid === selectedCloser)
                .map((closer) => (
                  <tr
                    key={closer.uid}
                    className="border-b hover:bg-gray-50 cursor-pointer"
                    onClick={() => onCloserSelect(closer.uid)}
                  >
                    <td className="p-2 font-medium text-center">{closer.name}</td>
                    <td className="text-center p-2">{closer.totalAssigned}</td>
                    <td className="text-center p-2">
                      <span className="text-green-600 font-semibold">
                        {closer.soldCount}
                      </span>
                    </td>
                    <td className="text-center p-2">
                      <span className={`font-semibold ${
                        closer.closeRate >= 20 ? 'text-green-600' : 
                        closer.closeRate >= 15 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {closer.closeRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="text-center p-2">
                      <span className="text-red-600">
                        {closer.noSaleCount}
                      </span>
                    </td>
                    <td className="text-center p-2">
                      <span className="text-orange-600">
                        {closer.failedCreditCount}
                      </span>
                    </td>
                    <td className="text-center p-2">
                      <span className="text-blue-600">
                        {closer.selfGenCount} ({closer.selfGenRate.toFixed(1)}%)
                      </span>
                    </td>
                    <td className="text-center p-2">
                      <span className={`font-semibold ${
                        closer.conversionRate >= 25 ? 'text-green-600' : 
                        closer.conversionRate >= 20 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {closer.conversionRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="text-center p-2">{closer.avgDealsPerDay?.toFixed(1) || '0.0'}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}