// Mock data for Prophet dashboard - simulates API responses
import type { 
  TIRMetrics, 
  SCurveData, 
  MainPathGraph, 
  SearchResult, 
  ComplianceAlert, 
  SystemHealth,
  DomainMetrics,
  Patent 
} from '@/types/prophet';

export const mockDomains = [
  'Solid State Batteries',
  'Quantum Computing',
  'CRISPR Gene Editing',
  'Autonomous Vehicles',
  'Photovoltaic Cells',
  'mRNA Therapeutics',
  'Hydrogen Storage',
  'Carbon Capture',
];

export const mockTIRMetrics: TIRMetrics[] = [
  {
    domain: 'Solid State Batteries',
    tir: 0.23,
    cycleTime: 4.2,
    knowledgeFlow: 0.78,
    spnpCentrality: 0.65,
    betweennessCentrality: 0.42,
    eigenvectorCentrality: 0.71,
    cohortYear: 2024,
    confidence: 0.89,
    trend: 'accelerating',
  },
  {
    domain: 'Quantum Computing',
    tir: 0.31,
    cycleTime: 3.1,
    knowledgeFlow: 0.85,
    spnpCentrality: 0.78,
    betweennessCentrality: 0.56,
    eigenvectorCentrality: 0.82,
    cohortYear: 2024,
    confidence: 0.92,
    trend: 'accelerating',
  },
  {
    domain: 'CRISPR Gene Editing',
    tir: 0.28,
    cycleTime: 3.8,
    knowledgeFlow: 0.81,
    spnpCentrality: 0.72,
    betweennessCentrality: 0.48,
    eigenvectorCentrality: 0.76,
    cohortYear: 2024,
    confidence: 0.91,
    trend: 'stable',
  },
  {
    domain: 'Autonomous Vehicles',
    tir: 0.19,
    cycleTime: 5.1,
    knowledgeFlow: 0.72,
    spnpCentrality: 0.58,
    betweennessCentrality: 0.39,
    eigenvectorCentrality: 0.64,
    cohortYear: 2024,
    confidence: 0.87,
    trend: 'stable',
  },
  {
    domain: 'Photovoltaic Cells',
    tir: 0.15,
    cycleTime: 6.2,
    knowledgeFlow: 0.68,
    spnpCentrality: 0.52,
    betweennessCentrality: 0.35,
    eigenvectorCentrality: 0.59,
    cohortYear: 2024,
    confidence: 0.94,
    trend: 'decelerating',
  },
  {
    domain: 'mRNA Therapeutics',
    tir: 0.35,
    cycleTime: 2.8,
    knowledgeFlow: 0.91,
    spnpCentrality: 0.83,
    betweennessCentrality: 0.61,
    eigenvectorCentrality: 0.88,
    cohortYear: 2024,
    confidence: 0.88,
    trend: 'accelerating',
  },
];

export const generateSCurveData = (domain: string): SCurveData[] => {
  const metrics = mockTIRMetrics.find(m => m.domain === domain) || mockTIRMetrics[0];
  const baseYear = 2015;
  const data: SCurveData[] = [];
  
  for (let i = 0; i <= 15; i++) {
    const year = baseYear + i;
    const t = i / 15;
    const performance = 100 / (1 + Math.exp(-10 * (t - 0.5))) * metrics.tir * 3;
    const noise = (Math.random() - 0.5) * 5;
    
    data.push({
      year,
      performance: Math.max(0, performance + noise),
      predicted: performance,
      lowerBound: performance * 0.85,
      upperBound: performance * 1.15,
    });
  }
  
  return data;
};

export const mockMainPathGraph: MainPathGraph = {
  domain: 'Solid State Batteries',
  pathLength: 12,
  keyPatents: ['US10234567', 'US10345678', 'US10456789'],
  nodes: [
    { id: '1', patentId: 'US9123456', title: 'Solid electrolyte composition', year: 2016, centrality: 0.45, isMainPath: true },
    { id: '2', patentId: 'US9234567', title: 'Ion conducting polymer', year: 2017, centrality: 0.52, isMainPath: true },
    { id: '3', patentId: 'US9345678', title: 'Lithium anode protection', year: 2017, centrality: 0.38, isMainPath: false },
    { id: '4', patentId: 'US10123456', title: 'Ceramic separator', year: 2018, centrality: 0.61, isMainPath: true },
    { id: '5', patentId: 'US10234567', title: 'Sulfide-based electrolyte', year: 2019, centrality: 0.78, isMainPath: true },
    { id: '6', patentId: 'US10345678', title: 'Interface stabilization', year: 2020, centrality: 0.85, isMainPath: true },
    { id: '7', patentId: 'US10456789', title: 'All-solid-state cell design', year: 2021, centrality: 0.92, isMainPath: true },
    { id: '8', patentId: 'US10567890', title: 'Hybrid electrolyte system', year: 2022, centrality: 0.71, isMainPath: true },
    { id: '9', patentId: 'US10678901', title: 'Dendrite suppression', year: 2022, centrality: 0.55, isMainPath: false },
    { id: '10', patentId: 'US10789012', title: 'Scalable manufacturing', year: 2023, centrality: 0.89, isMainPath: true },
  ],
  edges: [
    { source: '1', target: '2', weight: 0.8, isMainPath: true },
    { source: '1', target: '3', weight: 0.4, isMainPath: false },
    { source: '2', target: '4', weight: 0.85, isMainPath: true },
    { source: '3', target: '4', weight: 0.35, isMainPath: false },
    { source: '4', target: '5', weight: 0.9, isMainPath: true },
    { source: '5', target: '6', weight: 0.95, isMainPath: true },
    { source: '6', target: '7', weight: 0.92, isMainPath: true },
    { source: '7', target: '8', weight: 0.88, isMainPath: true },
    { source: '7', target: '9', weight: 0.45, isMainPath: false },
    { source: '8', target: '10', weight: 0.91, isMainPath: true },
    { source: '9', target: '10', weight: 0.38, isMainPath: false },
  ],
};

export const mockSearchResults: SearchResult[] = [
  {
    patent: {
      id: 'US10234567',
      title: 'Sulfide-based solid electrolyte with enhanced ionic conductivity',
      abstract: 'A novel sulfide-based solid electrolyte composition featuring improved lithium-ion conductivity through controlled crystalline structure and dopant optimization...',
      publicationDate: '2019-03-15',
      assignee: 'Toyota Motor Corporation',
      inventors: ['Yamamoto, K.', 'Suzuki, T.', 'Watanabe, H.'],
      classifications: ['H01M10/0562', 'H01M10/0525'],
      citationCount: 142,
      backwardCitations: ['US9123456', 'US9234567'],
      forwardCitations: ['US10345678', 'US10456789'],
      domain: 'Solid State Batteries',
    },
    score: 0.94,
    highlights: ['solid electrolyte', 'ionic conductivity', 'sulfide-based'],
  },
  {
    patent: {
      id: 'US10345678',
      title: 'Interface stabilization layer for solid-state batteries',
      abstract: 'Methods and compositions for stabilizing the electrode-electrolyte interface in all-solid-state lithium batteries using atomic layer deposition techniques...',
      publicationDate: '2020-07-22',
      assignee: 'Samsung SDI Co., Ltd.',
      inventors: ['Kim, J.', 'Park, S.', 'Lee, M.'],
      classifications: ['H01M10/0562', 'H01M4/04'],
      citationCount: 98,
      backwardCitations: ['US10234567', 'US9345678'],
      forwardCitations: ['US10456789', 'US10567890'],
      domain: 'Solid State Batteries',
    },
    score: 0.89,
    highlights: ['interface stabilization', 'solid-state batteries'],
  },
];

export const mockComplianceAlerts: ComplianceAlert[] = [
  {
    id: 'alert-1',
    type: 'rbac',
    severity: 'warning',
    message: 'New user role "analyst_intern" created without explicit policy review',
    timestamp: '2024-01-15T14:32:00Z',
    acknowledged: false,
    details: { role: 'analyst_intern', createdBy: 'admin@company.com' },
  },
  {
    id: 'alert-2',
    type: 'schema',
    severity: 'info',
    message: 'Schema version updated: patents_v2.3.1 → patents_v2.3.2',
    timestamp: '2024-01-15T12:15:00Z',
    acknowledged: true,
    details: { previousVersion: 'v2.3.1', newVersion: 'v2.3.2' },
  },
  {
    id: 'alert-3',
    type: 'drift',
    severity: 'critical',
    message: 'Configuration drift detected in Neo4j GDS parameters',
    timestamp: '2024-01-15T10:45:00Z',
    acknowledged: false,
    details: { parameter: 'pagerank.dampingFactor', expected: 0.85, actual: 0.75 },
  },
];

export const mockSystemHealth: SystemHealth[] = [
  { service: 'FastAPI Gateway', status: 'healthy', latency: 12, lastCheck: '2024-01-15T15:00:00Z', metrics: { cpu: 23, memory: 45, connections: 156 } },
  { service: 'PostgreSQL', status: 'healthy', latency: 3, lastCheck: '2024-01-15T15:00:00Z', metrics: { cpu: 18, memory: 62, connections: 89 } },
  { service: 'Milvus Vector DB', status: 'healthy', latency: 8, lastCheck: '2024-01-15T15:00:00Z', metrics: { cpu: 34, memory: 71, connections: 42 } },
  { service: 'Neo4j Graph DB', status: 'degraded', latency: 45, lastCheck: '2024-01-15T15:00:00Z', metrics: { cpu: 78, memory: 85, connections: 234 } },
  { service: 'Kafka Cluster', status: 'healthy', latency: 5, lastCheck: '2024-01-15T15:00:00Z', metrics: { cpu: 15, memory: 38, connections: 12 } },
  { service: 'Celery Workers', status: 'healthy', latency: 2, lastCheck: '2024-01-15T15:00:00Z', metrics: { cpu: 42, memory: 56, connections: 8 } },
];

export const mockDomainMetrics: DomainMetrics[] = mockTIRMetrics.map(m => ({
  domain: m.domain,
  patentCount: Math.floor(Math.random() * 50000) + 10000,
  avgTir: m.tir,
  topAssignees: [
    { name: 'Toyota', count: Math.floor(Math.random() * 500) + 100 },
    { name: 'Samsung', count: Math.floor(Math.random() * 400) + 80 },
    { name: 'LG', count: Math.floor(Math.random() * 300) + 60 },
    { name: 'CATL', count: Math.floor(Math.random() * 200) + 40 },
  ],
  yearlyTrend: Array.from({ length: 10 }, (_, i) => ({
    year: 2015 + i,
    tir: m.tir * (0.7 + Math.random() * 0.6),
  })),
}));
