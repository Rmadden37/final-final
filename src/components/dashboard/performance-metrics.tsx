"use client";
import { TrendingUp, TrendingDown, DollarSign, Users, Target, Clock } from "lucide-react";

const performanceData = [
  {
    id: 1,
    title: "Revenue",
    value: "$847K",
    change: "+12.5%",
    trend: "up" as const,
    subtitle: "This month",
    icon: DollarSign,
    color: "text-green-400"
  },
  {
    id: 2,
    title: "Active Leads",
    value: "284",
    change: "+8.2%",
    trend: "up" as const,
    subtitle: "In pipeline",
    icon: Users,
    color: "text-blue-400"
  },
  {
    id: 3,
    title: "Conversion Rate",
    value: "32.4%",
    change: "-2.1%",
    trend: "down" as const,
    subtitle: "Last 30 days",
    icon: Target,
    color: "text-purple-400"
  },
  {
    id: 4,
    title: "Avg. Close Time",
    value: "18 days",
    change: "-5.3%",
    trend: "up" as const,
    subtitle: "Improvement",
    icon: Clock,
    color: "text-orange-400"
  }
];

export default function PerformanceMetrics() {
  return (
    <div className="dashboard-card performance-metrics-card">
      <div className="card-header">
        <h2 className="card-title">Performance Overview</h2>
        <p className="card-subtitle">Key metrics and trends</p>
      </div>
      
      <div className="metrics-grid">
        {performanceData.map((metric) => {
          const IconComponent = metric.icon;
          const TrendIcon = metric.trend === 'up' ? TrendingUp : TrendingDown;
          const trendColor = metric.trend === 'up' ? 'text-green-400' : 'text-red-400';
          
          return (
            <div key={metric.id} className="metric-card">
              <div className="metric-header">
                <div className={`metric-icon ${metric.color}`}>
                  <IconComponent size={20} />
                </div>
                <div className={`metric-trend ${trendColor}`}>
                  <TrendIcon size={16} />
                  <span className="trend-value">{metric.change}</span>
                </div>
              </div>
              
              <div className="metric-content">
                <div className="metric-value">{metric.value}</div>
                <div className="metric-label">{metric.title}</div>
                <div className="metric-subtitle">{metric.subtitle}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}