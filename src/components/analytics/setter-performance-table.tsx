"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import { SetterPerformance } from "./types";

interface SetterPerformanceTableProps {
  setterPerformance: SetterPerformance[];
  selectedSetter: string;
  onSetterSelect: (setterId: string) => void;
}

export function SetterPerformanceTable({ 
  setterPerformance, 
  selectedSetter, 
  onSetterSelect 
}: SetterPerformanceTableProps) {
  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Setter Performance
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-center p-2">Setter</th>
                <th className="text-center p-2">Total Leads</th>
                <th className="text-center p-2">Sits</th>
                <th className="text-center p-2">Sit Rate</th>
                <th className="text-center p-2">Failed Credit</th>
                <th className="text-center p-2">Immediate</th>
                <th className="text-center p-2">Scheduled</th>
                <th className="text-center p-2">Cancel/No Show</th>
                <th className="text-center p-2">Avg/Day</th>
              </tr>
            </thead>
            <tbody>
              {setterPerformance
                .filter(setter => selectedSetter === "all" || setter.uid === selectedSetter)
                .map((setter) => (
                  <tr
                    key={setter.uid}
                    className="border-b hover:bg-gray-50 cursor-pointer"
                    onClick={() => onSetterSelect(setter.uid)}
                  >
                    <td className="p-2 font-medium text-center">{setter.name}</td>
                    <td className="text-center p-2">{setter.totalLeads}</td>
                    <td className="text-center p-2">
                      <span className="text-green-600 font-semibold">
                        {setter.sitCount}
                      </span>
                    </td>
                    <td className="text-center p-2">
                      <span className="font-semibold text-emerald-600">
                        {setter.sitRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="text-center p-2">
                      <span className="text-red-600">
                        {setter.failedCreditCount} ({setter.failedCreditRate.toFixed(1)}%)
                      </span>
                    </td>
                    <td className="text-center p-2">
                      <span className="text-purple-600">
                        {setter.immediateDispatchCount} ({setter.immediateDispatchPercentage.toFixed(1)}%)
                      </span>
                    </td>
                    <td className="text-center p-2">
                      <span className="text-blue-600">
                        {setter.scheduledDispatchCount}
                      </span>
                    </td>
                    <td className="text-center p-2">
                      <span className="text-orange-600">
                        {setter.cancelNoShowCount} ({setter.cancelNoShowRate.toFixed(1)}%)
                      </span>
                    </td>
                    <td className="text-center p-2">{setter.avgLeadsPerDay.toFixed(1)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
