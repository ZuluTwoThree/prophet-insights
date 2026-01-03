import { Activity, Server, Database, Cpu, HardDrive, Wifi } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { mockSystemHealth } from "@/lib/mockData";
import type { SystemHealth as SystemHealthType } from "@/types/prophet";

export function SystemHealth() {
  const getStatusVariant = (status: SystemHealthType["status"]) => {
    switch (status) {
      case "healthy":
        return "prophetSuccess" as const;
      case "degraded":
        return "prophetWarning" as const;
      case "down":
        return "prophetDanger" as const;
    }
  };

  const getServiceIcon = (service: string) => {
    if (service.includes("API") || service.includes("Gateway")) return Server;
    if (service.includes("SQL") || service.includes("DB")) return Database;
    if (service.includes("Kafka") || service.includes("Vector")) return HardDrive;
    if (service.includes("Worker")) return Cpu;
    return Wifi;
  };

  return (
    <div className="prophet-card p-6 animate-slide-up">
      <div className="flex items-center gap-3 mb-6">
        <Activity className="h-5 w-5 text-primary" />
        <div>
          <h3 className="text-lg font-semibold">System Health</h3>
          <p className="text-sm text-muted-foreground">Real-time infrastructure monitoring</p>
        </div>
      </div>

      <div className="space-y-4">
        {mockSystemHealth.map((service) => {
          const IconComponent = getServiceIcon(service.service);
          
          return (
            <div
              key={service.service}
              className="p-4 bg-secondary/30 rounded-lg border border-border/50"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <IconComponent className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-sm">{service.service}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">
                    {service.latency}ms
                  </span>
                  <Badge variant={getStatusVariant(service.status)} className="text-xs capitalize">
                    {service.status}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">CPU</span>
                    <span className="font-mono">{service.metrics.cpu}%</span>
                  </div>
                  <Progress 
                    value={service.metrics.cpu} 
                    className="h-1.5"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Memory</span>
                    <span className="font-mono">{service.metrics.memory}%</span>
                  </div>
                  <Progress 
                    value={service.metrics.memory} 
                    className="h-1.5"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Conn</span>
                    <span className="font-mono">{service.metrics.connections}</span>
                  </div>
                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary/50 rounded-full"
                      style={{ width: `${Math.min(service.metrics.connections / 3, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
