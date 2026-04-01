"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface ScoreData {
  date: string;
  overall: number;
  correctness: number;
  depth: number;
  communication: number;
  count: number;
}

interface ScoreChartProps {
  data: ScoreData[];
}

export default function ScoreChart({ data }: ScoreChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        No completed interviews yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 6% 12%)" />
        <XAxis
          dataKey="date"
          stroke="hsl(240 5% 64.9%)"
          fontSize={12}
          tickFormatter={(v) =>
            new Date(v).toLocaleDateString("en", { month: "short", day: "numeric" })
          }
        />
        <YAxis stroke="hsl(240 5% 64.9%)" fontSize={12} domain={[0, 5]} />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(240 8% 5.5%)",
            border: "1px solid hsl(240 6% 12%)",
            borderRadius: "8px",
            color: "hsl(0 0% 98%)",
          }}
        />
        <Legend wrapperStyle={{ color: "hsl(240 5% 64.9%)", fontSize: 12 }} />
        <Bar
          dataKey="correctness"
          name="Correctness"
          fill="hsl(160 60% 52%)"
          radius={[2, 2, 0, 0]}
        />
        <Bar dataKey="depth" name="Depth" fill="hsl(263 55% 70%)" radius={[2, 2, 0, 0]} />
        <Bar
          dataKey="communication"
          name="Communication"
          fill="hsl(38 92% 50%)"
          radius={[2, 2, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
