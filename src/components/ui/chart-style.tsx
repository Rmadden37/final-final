// components/ui/chart-style.tsx
"use client"

import * as React from "react"

export function ChartStyle({ id, config }: { id: string; config: Record<string, any> }) {
  const colorConfig = React.useMemo(() => {
    const configLookup = new Map(
      Object.entries(config).filter(([_, config]) => config.theme || config.color)
    )

    const getColorFromConfig = (dataKey: string) => {
      const config = configLookup.get(dataKey)
      if (!config) return null
      return config.theme?.light || config.color
    }

    return {
      getColorFromConfig,
    }
  }, [config])

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: Object.entries(config)
          .map(
            ([key, value]) => `
          [data-chart="${id}"] [data-id="${key}"] {
            fill: ${value.color || `hsl(var(--chart-${key}))`};
          }
        `
          )
          .join("\n"),
      }}
    />
  )
}