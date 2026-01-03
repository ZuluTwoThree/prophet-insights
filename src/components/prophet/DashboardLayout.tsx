import { useState } from "react";
import { 
  LayoutDashboard, 
  Search, 
  GitBranch, 
  TrendingUp, 
  Shield, 
  Activity,
  Menu,
  X,
  Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "search", label: "Patent Search", icon: Search },
  { id: "tir", label: "TIR Analytics", icon: TrendingUp },
  { id: "graph", label: "Main Path", icon: GitBranch },
  { id: "compliance", label: "Compliance", icon: Shield },
  { id: "health", label: "System Health", icon: Activity },
];

interface DashboardLayoutProps {
  children: React.ReactNode;
  activeView: string;
  onViewChange: (view: string) => void;
}

export function DashboardLayout({ children, activeView, onViewChange }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen bg-background prophet-grid-bg">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 h-full bg-sidebar border-r border-sidebar-border z-50 transition-all duration-300",
          sidebarOpen ? "w-64" : "w-16"
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border">
          <div className={cn("flex items-center gap-3", !sidebarOpen && "justify-center w-full")}>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Zap className="h-4 w-4 text-primary-foreground" />
            </div>
            {sidebarOpen && (
              <div>
                <h1 className="font-semibold text-foreground text-lg tracking-tight">Prophet</h1>
                <p className="text-xs text-muted-foreground">Technology Forecasting</p>
              </div>
            )}
          </div>
          
          <Button
            variant="ghost"
            size="iconSm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={cn(!sidebarOpen && "hidden")}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Collapse button when closed */}
        {!sidebarOpen && (
          <div className="p-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(true)}
              className="w-full"
            >
              <Menu className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Navigation */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const isActive = activeView === item.id;
            const IconComponent = item.icon;
            
            return (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-left",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-primary border border-sidebar-primary/20"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
                  !sidebarOpen && "justify-center"
                )}
              >
                <IconComponent className={cn("h-4 w-4 shrink-0", isActive && "text-sidebar-primary")} />
                {sidebarOpen && (
                  <span className="text-sm font-medium">{item.label}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Version info */}
        {sidebarOpen && (
          <div className="absolute bottom-4 left-4 right-4">
            <div className="p-3 bg-secondary/30 rounded-lg border border-border/50">
              <p className="text-xs text-muted-foreground">MVP v1.0.0</p>
              <p className="text-xs text-muted-foreground mt-1">Private Cloud Deploy</p>
            </div>
          </div>
        )}
      </aside>

      {/* Main content */}
      <main
        className={cn(
          "transition-all duration-300 min-h-screen",
          sidebarOpen ? "ml-64" : "ml-16"
        )}
      >
        {/* Top bar */}
        <header className="h-16 border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-40">
          <div className="h-full px-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {!sidebarOpen && (
                <Button variant="ghost" size="iconSm" onClick={() => setSidebarOpen(true)}>
                  <Menu className="h-4 w-4" />
                </Button>
              )}
              <h2 className="text-lg font-semibold text-foreground">
                {navItems.find((item) => item.id === activeView)?.label || "Dashboard"}
              </h2>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 rounded-full bg-prophet-success animate-pulse" />
                <span className="text-muted-foreground">Systems Operational</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
