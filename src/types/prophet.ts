// Prophet Platform Types

export interface Patent {
  id: string;
  title: string;
  abstract: string;
  publicationDate: string;
  assignee: string;
  inventors: string[];
  classifications: string[];
  citationCount: number;
  backwardCitations: string[];
  forwardCitations: string[];
  domain: string;
}

export interface TIRMetrics {
  domain: string;
  tir: number;
  cycleTime: number;
  knowledgeFlow: number;
  spnpCentrality: number;
  betweennessCentrality: number;
  eigenvectorCentrality: number;
  cohortYear: number;
  confidence: number;
  trend: 'accelerating' | 'stable' | 'decelerating';
}

export interface SCurveData {
  year: number;
  performance: number;
  predicted: number;
  lowerBound: number;
  upperBound: number;
}

export interface MainPathNode {
  id: string;
  patentId: string;
  title: string;
  year: number;
  centrality: number;
  isMainPath: boolean;
}

export interface MainPathEdge {
  source: string;
  target: string;
  weight: number;
  isMainPath: boolean;
}

export interface MainPathGraph {
  nodes: MainPathNode[];
  edges: MainPathEdge[];
  domain: string;
  pathLength: number;
  keyPatents: string[];
}

export interface SearchResult {
  patent: Patent;
  score: number;
  highlights: string[];
}

export interface ComplianceAlert {
  id: string;
  type: 'drift' | 'rbac' | 'egress' | 'schema';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: string;
  acknowledged: boolean;
  details: Record<string, unknown>;
}

export interface SystemHealth {
  service: string;
  status: 'healthy' | 'degraded' | 'down';
  latency: number;
  lastCheck: string;
  metrics: {
    cpu: number;
    memory: number;
    connections: number;
  };
}

export interface DomainMetrics {
  domain: string;
  patentCount: number;
  avgTir: number;
  topAssignees: { name: string; count: number }[];
  yearlyTrend: { year: number; tir: number }[];
}
