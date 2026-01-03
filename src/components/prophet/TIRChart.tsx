import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  ComposedChart,
  Legend,
} from "recharts";
import type { SCurveData } from "@/types/prophet";

interface TIRChartProps {
  data: SCurveData[];
  domain: string;
  showConfidence?: boolean;
}

export function TIRChart({ data, domain, showConfidence = true }: TIRChartProps) {
  const chartConfig = useMemo(() => ({
    performance: "hsl(192, 91%, 50%)",
    predicted: "hsl(160, 84%, 39%)",
    confidence: "hsl(192, 91%, 50%)",
  }), []);

  return (
    <div className="prophet-card p-6 animate-slide-up">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground">{domain}</h3>
          <p className="text-sm text-muted-foreground">S-Curve Performance Trajectory</p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-primary rounded" />
            <span className="text-muted-foreground">Actual</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-accent rounded" />
            <span className="text-muted-foreground">Predicted</span>
          </div>
        </div>
      </div>

      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="confidenceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={chartConfig.confidence} stopOpacity={0.2} />
                <stop offset="100%" stopColor={chartConfig.confidence} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="hsl(var(--border))" 
              opacity={0.4}
              vertical={false}
            />
            
            <XAxis
              dataKey="year"
              stroke="hsl(var(--muted-foreground))"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${value.toFixed(0)}%`}
            />
            
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                boxShadow: "var(--shadow-elevated)",
              }}
              labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
              itemStyle={{ color: "hsl(var(--muted-foreground))" }}
              formatter={(value: number) => [`${value.toFixed(2)}%`, ""]}
            />
            
            {showConfidence && (
              <Area
                type="monotone"
                dataKey="upperBound"
                stroke="transparent"
                fill="url(#confidenceGradient)"
                fillOpacity={1}
              />
            )}
            
            <Line
              type="monotone"
              dataKey="predicted"
              stroke={chartConfig.predicted}
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
            />
            
            <Line
              type="monotone"
              dataKey="performance"
              stroke={chartConfig.performance}
              strokeWidth={2.5}
              dot={{
                fill: chartConfig.performance,
                strokeWidth: 0,
                r: 3,
              }}
              activeDot={{
                fill: chartConfig.performance,
                strokeWidth: 2,
                stroke: "hsl(var(--background))",
                r: 5,
              }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
