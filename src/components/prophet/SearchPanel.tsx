import { useState } from "react";
import { Search, FileText, ExternalLink, Calendar, Building2, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { mockSearchResults } from "@/lib/mockData";
import type { SearchResult } from "@/types/prophet";

export function SearchPanel() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    
    setIsSearching(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 800));
    setResults(mockSearchResults);
    setIsSearching(false);
  };

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Search Input */}
      <div className="prophet-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <Search className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Semantic Patent Search</h2>
        </div>
        
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search patents by concept, technology, or application..."
              className="bg-secondary/50 border-border h-12 pl-4 pr-4 text-base"
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
          </div>
          <Button 
            variant="prophetSolid" 
            size="lg"
            onClick={handleSearch}
            disabled={isSearching}
            className="px-8"
          >
            {isSearching ? (
              <span className="animate-pulse">Searching...</span>
            ) : (
              <>
                <Search className="h-4 w-4 mr-2" />
                Search
              </>
            )}
          </Button>
        </div>
        
        <p className="text-sm text-muted-foreground mt-3">
          Powered by text-embedding-3-small • PII redacted • Milvus HNSW index
        </p>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-muted-foreground">
              {results.length} results found
            </h3>
            <Badge variant="prophet">Vector similarity search</Badge>
          </div>
          
          {results.map((result) => (
            <div 
              key={result.patent.id}
              className="prophet-card p-6 hover:border-primary/30 transition-colors cursor-pointer group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <FileText className="h-4 w-4 text-primary shrink-0" />
                    <span className="font-mono text-sm text-primary">{result.patent.id}</span>
                    <Badge variant="prophetSuccess" className="text-xs">
                      {(result.score * 100).toFixed(0)}% match
                    </Badge>
                  </div>
                  
                  <h4 className="text-base font-medium text-foreground mb-2 group-hover:text-primary transition-colors">
                    {result.patent.title}
                  </h4>
                  
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                    {result.patent.abstract}
                  </p>
                  
                  <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{result.patent.publicationDate}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5" />
                      <span>{result.patent.assignee}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" />
                      <span>{result.patent.inventors.join(", ")}</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mt-3">
                    {result.highlights.map((highlight) => (
                      <Badge key={highlight} variant="secondary" className="text-xs">
                        {highlight}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                <Button variant="ghost" size="iconSm" className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
