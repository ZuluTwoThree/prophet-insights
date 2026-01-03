import { useMemo } from "react";
import { mockMainPathGraph } from "@/lib/mockData";
import { Badge } from "@/components/ui/badge";
import { GitBranch, CircleDot, ArrowRight } from "lucide-react";

export function MainPathGraph() {
  const { nodes, edges, domain, keyPatents } = mockMainPathGraph;

  const mainPathNodes = useMemo(() => {
    return nodes
      .filter((n) => n.isMainPath)
      .sort((a, b) => a.year - b.year);
  }, [nodes]);

  return (
    <div className="prophet-card p-6 animate-slide-up">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <GitBranch className="h-5 w-5 text-primary" />
          <div>
            <h3 className="text-lg font-semibold">SPLC Main Path Analysis</h3>
            <p className="text-sm text-muted-foreground">{domain} • Citation Network Traversal</p>
          </div>
        </div>
        <Badge variant="prophet">{mainPathNodes.length} nodes</Badge>
      </div>

      {/* Main Path Visualization */}
      <div className="relative">
        {/* Timeline */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary via-primary/50 to-transparent" />
        
        <div className="space-y-4 pl-16">
          {mainPathNodes.map((node, index) => {
            const isKeyPatent = keyPatents.includes(node.patentId);
            
            return (
              <div
                key={node.id}
                className={`relative prophet-card p-4 border-l-2 ${
                  isKeyPatent ? "border-l-primary bg-primary/5" : "border-l-border"
                } animate-slide-in-right`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Node indicator */}
                <div className={`absolute -left-[42px] top-4 w-4 h-4 rounded-full flex items-center justify-center ${
                  isKeyPatent ? "bg-primary text-primary-foreground" : "bg-secondary border border-border"
                }`}>
                  <CircleDot className="h-2.5 w-2.5" />
                </div>

                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-mono text-xs text-primary">{node.patentId}</span>
                      <Badge variant="secondary" className="text-xs">{node.year}</Badge>
                      {isKeyPatent && (
                        <Badge variant="prophetSuccess" className="text-xs">Key Patent</Badge>
                      )}
                    </div>
                    <h4 className="text-sm font-medium text-foreground">{node.title}</h4>
                  </div>
                  
                  <div className="text-right shrink-0">
                    <div className="prophet-label mb-1">Centrality</div>
                    <div className="font-mono text-lg font-semibold text-primary">
                      {node.centrality.toFixed(2)}
                    </div>
                  </div>
                </div>

                {/* Edge indicator */}
                {index < mainPathNodes.length - 1 && (
                  <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 z-10">
                    <ArrowRight className="h-3 w-3 text-muted-foreground rotate-90" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-border">
        <div className="text-center">
          <div className="prophet-label mb-1">Path Length</div>
          <div className="font-mono text-xl font-semibold text-foreground">{mockMainPathGraph.pathLength}</div>
        </div>
        <div className="text-center">
          <div className="prophet-label mb-1">Total Nodes</div>
          <div className="font-mono text-xl font-semibold text-foreground">{nodes.length}</div>
        </div>
        <div className="text-center">
          <div className="prophet-label mb-1">Total Edges</div>
          <div className="font-mono text-xl font-semibold text-foreground">{edges.length}</div>
        </div>
      </div>
    </div>
  );
}
