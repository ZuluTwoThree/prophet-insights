import { useState } from "react";
import { DashboardLayout } from "@/components/prophet/DashboardLayout";
import { MetricCard } from "@/components/prophet/MetricCard";
import { TIRChart } from "@/components/prophet/TIRChart";
import { CentralityRadar } from "@/components/prophet/CentralityRadar";
import { DomainSelector } from "@/components/prophet/DomainSelector";
import { SearchPanel } from "@/components/prophet/SearchPanel";
import { MainPathGraph } from "@/components/prophet/MainPathGraph";
import { CompliancePanel } from "@/components/prophet/CompliancePanel";
import { SystemHealth } from "@/components/prophet/SystemHealth";
import { mockTIRMetrics, mockDomains, generateSCurveData } from "@/lib/mockData";
import { TrendingUp, Clock, Network, Gauge } from "lucide-react";

const Index = () => {
  const [activeView, setActiveView] = useState("overview");
  const [selectedDomain, setSelectedDomain] = useState(mockDomains[0]);

  const currentMetrics = mockTIRMetrics.find((m) => m.domain === selectedDomain) || mockTIRMetrics[0];
  const sCurveData = generateSCurveData(selectedDomain);

  const renderContent = () => {
    switch (activeView) {
      case "search":
        return <SearchPanel />;
      case "tir":
        return (
          <div className="space-y-6">
            <DomainSelector
              domains={mockDomains}
              selectedDomain={selectedDomain}
              onSelectDomain={setSelectedDomain}
              metrics={mockTIRMetrics}
            />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <TIRChart data={sCurveData} domain={selectedDomain} />
              <CentralityRadar metrics={currentMetrics} />
            </div>
          </div>
        );
      case "graph":
        return <MainPathGraph />;
      case "compliance":
        return <CompliancePanel />;
      case "health":
        return <SystemHealth />;
      default:
        return (
          <div className="space-y-6">
            {/* Domain Selector */}
            <DomainSelector
              domains={mockDomains}
              selectedDomain={selectedDomain}
              onSelectDomain={setSelectedDomain}
              metrics={mockTIRMetrics}
            />

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                label="Technology Improvement Rate"
                value={`${(currentMetrics.tir * 100).toFixed(1)}%`}
                subtitle="Annual performance gain"
                trend={currentMetrics.trend === "accelerating" ? "up" : currentMetrics.trend === "decelerating" ? "down" : "stable"}
                trendValue={currentMetrics.trend}
                icon={<TrendingUp className="h-5 w-5" />}
                glow
              />
              <MetricCard
                label="Cycle Time"
                value={`${currentMetrics.cycleTime.toFixed(1)} yrs`}
                subtitle="Mean backward citation age"
                icon={<Clock className="h-5 w-5" />}
              />
              <MetricCard
                label="Knowledge Flow"
                value={currentMetrics.knowledgeFlow.toFixed(2)}
                subtitle="Normalized forward impact"
                icon={<Network className="h-5 w-5" />}
              />
              <MetricCard
                label="Confidence"
                value={`${(currentMetrics.confidence * 100).toFixed(0)}%`}
                subtitle="Model certainty"
                icon={<Gauge className="h-5 w-5" />}
              />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <TIRChart data={sCurveData} domain={selectedDomain} />
              <CentralityRadar metrics={currentMetrics} />
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <MainPathGraph />
              <SystemHealth />
            </div>
          </div>
        );
    }
  };

  return (
    <DashboardLayout activeView={activeView} onViewChange={setActiveView}>
      {renderContent()}
    </DashboardLayout>
  );
};

export default Index;
