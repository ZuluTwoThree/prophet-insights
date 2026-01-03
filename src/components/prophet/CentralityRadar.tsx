import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { TIRMetrics } from "@/types/prophet";

interface CentralityRadarProps {
  metrics: TIRMetrics;
}

export function CentralityRadar({ metrics }: CentralityRadarProps) {
  const data = [
    { metric: "SPNP", value: metrics.spnpCentrality, fullMark: 1 },
    { metric: "Betweenness", value: metrics.betweennessCentrality, fullMark: 1 },
    { metric: "Eigenvector", value: metrics.eigenvectorCentrality, fullMark: 1 },
    { metric: "Knowledge Flow", value: metrics.knowledgeFlow, fullMark: 1 },
    { metric: "Confidence", value: metrics.confidence, fullMark: 1 },
  ];

  return (
    <div className="prophet-card p-6 animate-slide-up">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-foreground">Centrality Metrics</h3>
        <p className="text-sm text-muted-foreground">Graph-based innovation indicators</p>
      </div>

      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="75%" data={data}>
            <defs>
              <linearGradient id="radarGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(192, 91%, 50%)" stopOpacity={0.6} />
                <stop offset="100%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0.3} />
              </linearGradient>
            </defs>
            
            <PolarGrid 
              stroke="hsl(var(--border))" 
              strokeOpacity={0.5}
            />
            
            <PolarAngleAxis
              dataKey="metric"
              tick={{ 
                fill: "hsl(var(--muted-foreground))", 
                fontSize: 11,
                fontFamily: "JetBrains Mono",
              }}
            />
            
            <PolarRadiusAxis
              angle={30}
              domain={[0, 1]}
              tick={{ 
                fill: "hsl(var(--muted-foreground))", 
                fontSize: 10 
              }}
              tickFormatter={(value) => value.toFixed(1)}
            />
            
            <Radar
              name={metrics.domain}
              dataKey="value"
              stroke="hsl(192, 91%, 50%)"
              strokeWidth={2}
              fill="url(#radarGradient)"
              fillOpacity={0.6}
            />
            
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                boxShadow: "var(--shadow-elevated)",
              }}
              formatter={(value: number) => [value.toFixed(3), "Score"]}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
