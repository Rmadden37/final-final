// components/ui/chart.tsx
"use client"

import * as React from "react"
import { ChartStyle } from "./chart-style"

// Chart Container Component
export const ChartContainer = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    config: Record<string, any>
    children: React.ReactNode
  }
>(({ className, children, config, ...props }, ref) => {
  const id = React.useId()
  const chartId = `chart-${id.replace(/:/g, "")}`

  return (
    <>
      <ChartStyle id={chartId} config={config} />
      <div
        data-chart={chartId}
        ref={ref}
        className={className}
        {...props}
      >
        {children}
      </div>
    </>
  )
})
ChartContainer.displayName = "ChartContainer"

// Chart Tooltip Component
export const ChartTooltip = ({
  active,
  payload,
  label,
  labelFormatter,
  formatter,
  contentStyle,
  wrapperStyle,
  labelStyle,
  itemStyle,
}: any) => {
  if (!active || !payload) {
    return null
  }

  return (
    <div
      style={{
        background: "rgba(0, 0, 0, 0.8)",
        border: "1px solid rgba(255, 255, 255, 0.2)",
        borderRadius: "4px",
        padding: "8px",
        ...wrapperStyle,
        ...contentStyle,
      }}
    >
      {label && (
        <p style={{ marginBottom: "4px", fontWeight: 600, ...labelStyle }}>
          {labelFormatter ? labelFormatter(label) : label}
        </p>
      )}
      {payload.map((entry: any, index: number) => {
        const value = formatter
          ? formatter(entry.value, entry.name, entry)
          : entry.value

        return (
          <div
            key={`item-${index}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              ...itemStyle,
            }}
          >
            <span
              style={{
                display: "inline-block",
                width: "10px",
                height: "10px",
                backgroundColor: entry.color || entry.fill,
                borderRadius: "2px",
              }}
            />
            <span>{entry.name || entry.dataKey}:</span>
            <span style={{ fontWeight: 600 }}>
              {Array.isArray(value) ? value.join(" ") : value}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// Chart Tooltip Content Component (for Recharts)
export const ChartTooltipContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    hideLabel?: boolean
    hideIndicator?: boolean
    indicator?: "line" | "dot" | "dashed"
    nameKey?: string
    labelKey?: string
  }
>(({ className, hideLabel, hideIndicator, indicator = "dot", nameKey, labelKey, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={className}
      {...props}
    />
  )
})
ChartTooltipContent.displayName = "ChartTooltipContent"

// Chart Legend Content Component
export const ChartLegendContent = ({ payload }: any) => {
  if (!payload) {
    return null
  }

  return (
    <ul
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "16px",
        padding: 0,
        margin: 0,
        listStyle: "none",
      }}
    >
      {payload.map((entry: any, index: number) => (
        <li
          key={`item-${index}`}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          <span
            style={{
              display: "inline-block",
              width: "10px",
              height: "10px",
              backgroundColor: entry.color,
              borderRadius: "2px",
            }}
          />
          <span style={{ fontSize: "14px" }}>{entry.value}</span>
        </li>
      ))}
    </ul>
  )
}

// Chart Legend Component (wrapper)
export const ChartLegend = ({ content, ...props }: any) => {
  // This is primarily used to pass the content prop to Recharts Legend
  return null
}