import { useState } from "react";
import { Shield, AlertTriangle, CheckCircle, Info, Bell, BellOff, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { mockComplianceAlerts } from "@/lib/mockData";
import type { ComplianceAlert } from "@/types/prophet";
import { format } from "date-fns";

export function CompliancePanel() {
  const [alerts, setAlerts] = useState<ComplianceAlert[]>(mockComplianceAlerts);

  const acknowledgeAlert = (id: string) => {
    setAlerts((prev) =>
      prev.map((alert) =>
        alert.id === id ? { ...alert, acknowledged: true } : alert
      )
    );
  };

  const getAlertIcon = (severity: ComplianceAlert["severity"]) => {
    switch (severity) {
      case "critical":
        return <AlertTriangle className="h-4 w-4 text-prophet-danger" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-prophet-warning" />;
      case "info":
        return <Info className="h-4 w-4 text-prophet-info" />;
    }
  };

  const getAlertVariant = (severity: ComplianceAlert["severity"]) => {
    switch (severity) {
      case "critical":
        return "prophetDanger" as const;
      case "warning":
        return "prophetWarning" as const;
      case "info":
        return "prophetInfo" as const;
    }
  };

  const getTypeLabel = (type: ComplianceAlert["type"]) => {
    switch (type) {
      case "drift":
        return "Config Drift";
      case "rbac":
        return "RBAC";
      case "egress":
        return "Egress";
      case "schema":
        return "Schema";
    }
  };

  const unacknowledgedCount = alerts.filter((a) => !a.acknowledged).length;

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div className="prophet-card p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-primary" />
            <div>
              <h2 className="text-lg font-semibold">Compliance & Governance</h2>
              <p className="text-sm text-muted-foreground">ISO 27001 + SOC 2 aligned • Kafka + Spark drift detection</p>
            </div>
          </div>
          
          {unacknowledgedCount > 0 ? (
            <Badge variant="prophetDanger" className="animate-pulse">
              {unacknowledgedCount} pending
            </Badge>
          ) : (
            <Badge variant="prophetSuccess">
              <CheckCircle className="h-3 w-3 mr-1" />
              All clear
            </Badge>
          )}
        </div>
      </div>

      {/* Alerts List */}
      <div className="space-y-3">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={`prophet-card p-4 transition-all ${
              alert.acknowledged ? "opacity-60" : ""
            }`}
          >
            <div className="flex items-start gap-4">
              <div className="shrink-0 mt-0.5">{getAlertIcon(alert.severity)}</div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant={getAlertVariant(alert.severity)} className="text-xs">
                    {alert.severity.toUpperCase()}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {getTypeLabel(alert.type)}
                  </Badge>
                  {alert.acknowledged && (
                    <Badge variant="outline" className="text-xs text-muted-foreground">
                      Acknowledged
                    </Badge>
                  )}
                </div>
                
                <p className="text-sm text-foreground font-medium">{alert.message}</p>
                
                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{format(new Date(alert.timestamp), "MMM d, yyyy HH:mm")}</span>
                </div>
                
                {alert.details && Object.keys(alert.details).length > 0 && (
                  <div className="mt-3 p-3 bg-secondary/50 rounded-md font-mono text-xs">
                    {Object.entries(alert.details).map(([key, value]) => (
                      <div key={key} className="flex gap-2">
                        <span className="text-muted-foreground">{key}:</span>
                        <span className="text-foreground">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {!alert.acknowledged && (
                <Button
                  variant="prophetGhost"
                  size="iconSm"
                  onClick={() => acknowledgeAlert(alert.id)}
                  title="Acknowledge"
                >
                  <BellOff className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Compliance Status */}
      <div className="prophet-card p-6">
        <h3 className="text-sm font-semibold mb-4">Compliance Framework Status</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg">
            <CheckCircle className="h-5 w-5 text-prophet-success" />
            <div>
              <div className="text-sm font-medium">ISO 27001</div>
              <div className="text-xs text-muted-foreground">Evidence hooks active</div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg">
            <CheckCircle className="h-5 w-5 text-prophet-success" />
            <div>
              <div className="text-sm font-medium">SOC 2 Type II</div>
              <div className="text-xs text-muted-foreground">Audit logging enabled</div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg">
            <CheckCircle className="h-5 w-5 text-prophet-success" />
            <div>
              <div className="text-sm font-medium">Vault Integration</div>
              <div className="text-xs text-muted-foreground">Secrets encrypted</div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg">
            <CheckCircle className="h-5 w-5 text-prophet-success" />
            <div>
              <div className="text-sm font-medium">RBAC via OIDC</div>
              <div className="text-xs text-muted-foreground">Role policies active</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
