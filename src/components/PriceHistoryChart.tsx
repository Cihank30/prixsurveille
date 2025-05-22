
"use client"

import type { ChartConfig } from "@/components/ui/chart"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart"
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"
import { format } from "date-fns";

interface PriceHistoryChartProps {
  data: Array<{ date: string; price: number }>;
}

const chartConfig = {
  price: {
    label: "Prix (€)",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig

export function PriceHistoryChart({ data }: PriceHistoryChartProps) {
  if (!data || data.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucun historique de prix disponible.</p>;
  }

  const chartData = data.map(item => ({
    date: format(new Date(item.date), "dd MMM yy"),
    price: item.price,
  })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());


  return (
    <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
      <LineChart
        accessibilityLayer
        data={chartData}
        margin={{
          left: 12,
          right: 12,
          top: 12,
        }}
      >
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tickFormatter={(value) => value}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tickFormatter={(value) => `€${value}`}
          domain={['dataMin - 10', 'dataMax + 10']}
        />
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent indicator="line" />}
        />
        <ChartLegend content={<ChartLegendContent />} />
        <Line
          dataKey="price"
          type="monotone"
          stroke="var(--color-price)"
          strokeWidth={2}
          dot={true}
        />
      </LineChart>
    </ChartContainer>
  )
}
