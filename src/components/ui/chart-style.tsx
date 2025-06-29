"use client"

import * as React from "react"

interface ChartStyleProps {
  id: string
  config: Record<string, any>
}

export function ChartStyle({ id, config }: ChartStyleProps) {
  const colorConfig = React.useMemo(() => {
    const colors = Object.entries(config).reduce((acc, [key, value]) => {
      if (typeof value === 'object' && value.color) {
        acc[`--color-${key}`] = value.color
      }
      return acc
    }, {} as Record<string, string>)
    
    return colors
  }, [config])

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
          [data-chart="${id}"] {
            ${Object.entries(colorConfig)
              .map(([key, value]) => `${key}: ${value};`)
              .join('\n')}
          }
        `,
      }}
    />
  )
}