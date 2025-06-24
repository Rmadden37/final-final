"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Download, Filter } from "lucide-react";
import { SetterPerformance, CloserPerformance } from "./types";

interface PerformanceFiltersProps {
  dateRange: string;
  selectedSetter: string;
  selectedCloser: string;
  setterPerformance: SetterPerformance[];
  closerPerformance: CloserPerformance[];
  onDateRangeChange: (value: string) => void;
  onSetterChange: (value: string) => void;
  onCloserChange: (value: string) => void;
  onExport: () => void;
}

export function PerformanceFilters({
  dateRange,
  selectedSetter,
  selectedCloser,
  setterPerformance,
  closerPerformance,
  onDateRangeChange,
  onSetterChange,
  onCloserChange,
  onExport
}: PerformanceFiltersProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <span className="text-sm font-medium">Filters:</span>
          </div>
          
          <Select value={dateRange} onValueChange={onDateRangeChange}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Date Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="365d">Last year</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedSetter} onValueChange={onSetterChange}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Setters" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Setters</SelectItem>
              {setterPerformance.map((setter) => (
                <SelectItem key={setter.uid} value={setter.uid}>
                  {setter.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedCloser} onValueChange={onCloserChange}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Closers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Closers</SelectItem>
              {closerPerformance.map((closer) => (
                <SelectItem key={closer.uid} value={closer.uid}>
                  {closer.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button onClick={onExport} variant="outline" className="ml-auto">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
