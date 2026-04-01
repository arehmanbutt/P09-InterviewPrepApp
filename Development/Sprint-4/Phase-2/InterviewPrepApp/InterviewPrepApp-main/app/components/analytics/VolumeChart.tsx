"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface VolumeData {
  date: string;
  count: number;
  completed: number;
}

interface VolumeChartProps {
  data: VolumeData[];
}

export default function VolumeChart({ data }: VolumeChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        No interview data yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(160 60% 52%)" stopOpacity={0.3} />
            <stop offset="95%" stopColor="hsl(160 60% 52%)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(263 55% 70%)" stopOpacity={0.3} />
            <stop offset="95%" stopColor="hsl(263 55% 70%)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 6% 12%)" />
        <XAxis
          dataKey="date"
          stroke="hsl(240 5% 64.9%)"
          fontSize={12}
          tickFormatter={(v) =>
            new Date(v).toLocaleDateString("en", { month: "short", day: "numeric" })
          }
        />
        <YAxis stroke="hsl(240 5% 64.9%)" fontSize={12} allowDecimals={false} />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(240 8% 5.5%)",
            border: "1px solid hsl(240 6% 12%)",
            borderRadius: "8px",
            color: "hsl(0 0% 98%)",
          }}
        />
        <Area
          type="monotone"
          dataKey="count"
          name="Total"
          stroke="hsl(160 60% 52%)"
          fill="url(#colorTotal)"
          strokeWidth={2}
        />
        <Area
          type="monotone"
          dataKey="completed"
          name="Completed"
          stroke="hsl(263 55% 70%)"
          fill="url(#colorCompleted)"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
