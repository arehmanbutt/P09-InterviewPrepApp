"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

interface PipelineData {
  scheduled: number;
  "in-progress": number;
  completed: number;
}

interface PipelineChartProps {
  data: PipelineData;
}

const STATUS_CONFIG = [
  { key: "scheduled", label: "Scheduled", color: "hsl(240 5% 64.9%)" },
  { key: "in-progress", label: "In Progress", color: "hsl(38 92% 50%)" },
  { key: "completed", label: "Completed", color: "hsl(160 60% 52%)" },
] as const;

export default function PipelineChart({ data }: PipelineChartProps) {
  const chartData = STATUS_CONFIG.map((s) => ({
    name: s.label,
    value: data[s.key],
    color: s.color,
  })).filter((d) => d.value > 0);

  if (chartData.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        No interview data yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={4}
          dataKey="value"
        >
          {chartData.map((entry, i) => (
            <Cell key={i} fill={entry.color} stroke="transparent" />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(240 8% 5.5%)",
            border: "1px solid hsl(240 6% 12%)",
            borderRadius: "8px",
            color: "hsl(0 0% 98%)",
          }}
        />
        <Legend wrapperStyle={{ color: "hsl(240 5% 64.9%)", fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
