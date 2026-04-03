import { useState, useMemo } from 'react';
import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import {
  Avatar,
  AvatarFallback,
} from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/authStore';
import { useGetStrategies } from '@/api/queries';
import { AppRole } from '@/types/auth';
import { ChevronDown, ChevronRight, Menu, X, Home, Calendar, Users, Shield, BookOpen, Swords, Plus, BarChart3 } from 'lucide-react';

export function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [strategiesExpanded, setStrategiesExpanded] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const { data: strategies } = useGetStrategies();

  const isOfficerOrAdmin =
    user?.appRole === AppRole.ADMIN || user?.appRole === AppRole.OFFICER;

  // Auto-expand when on strategies page
  const isOnStrategies = location.pathname.startsWith('/strategies');
  const expanded = strategiesExpanded || isOnStrategies;

  const groupedByRaid = useMemo(() => {
    if (!strategies) return {};
    return strategies.reduce<Record<string, typeof strategies>>((acc, strat) => {
      if (!acc[strat.raidName]) acc[strat.raidName] = [];
      acc[strat.raidName].push(strat);
      return acc;
    }, {});
  }, [strategies]);

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  const navItems = [
    { icon: Home, label: 'Dashboard', href: '/dashboard' },
    { icon: Calendar, label: 'Calendrier', href: '/calendar' },
    { icon: Users, label: 'Roster', href: '/roster' },
    ...(user?.appRole !== AppRole.GUEST
      ? [{ icon: BarChart3, label: 'Sondages', href: '/polls' }]
      : []),
    ...(user?.appRole === 'ADMIN'
      ? [{ icon: Shield, label: 'Administration', href: '/admin' }]
      : []),
  ];

  const initials = user?.battletag
    ? user.battletag.split('#')[0].split('').slice(0, 2).join('').toUpperCase()
    : 'GH';

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } bg-sidebar border-r border-sidebar-border transition-all duration-300 flex flex-col`}
      >
        {/* Logo */}
        <div className="p-6 border-b border-border/50">
          <Link
            to="/dashboard"
            className="flex items-center gap-3 group"
          >
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center group-hover:shadow-lg group-hover:shadow-primary/30 transition-all glow-gold">
              <span className="text-sm font-bold text-primary-foreground">TGP</span>
            </div>
            {sidebarOpen && (
              <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                The Good Place
              </h1>
            )}
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors group ${
                location.pathname === item.href
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted-foreground hover:bg-primary/10 hover:text-primary'
              }`}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {sidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
            </Link>
          ))}

          {/* Stratégies - collapsible section */}
          <div>
            <button
              onClick={() => setStrategiesExpanded(!expanded)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors group ${
                isOnStrategies
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted-foreground hover:bg-primary/10 hover:text-primary'
              }`}
            >
              <BookOpen className="w-5 h-5 flex-shrink-0" />
              {sidebarOpen && (
                <>
                  <span className="text-sm font-medium flex-1 text-left">Stratégies</span>
                  <ChevronRight
                    className={`w-4 h-4 transition-transform duration-200 ${
                      expanded ? 'rotate-90' : ''
                    }`}
                  />
                </>
              )}
            </button>

            {/* Sub-items: boss list grouped by raid */}
            {sidebarOpen && expanded && (
              <div className="ml-4 mt-1 pl-4 border-l border-border/30 space-y-3 py-1">
                {/* + Nouveau button */}
                {isOfficerOrAdmin && (
                  <Link
                    to="/strategies/new"
                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-amber-500 hover:text-amber-400 hover:bg-amber-600/10 rounded-md transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Nouvelle Stratégie
                  </Link>
                )}

                {Object.keys(groupedByRaid).length === 0 && (
                  <p className="text-xs text-muted-foreground/50 px-3 py-1">Aucune stratégie</p>
                )}

                {Object.entries(groupedByRaid).map(([raidName, bosses]) => (
                  <div key={raidName}>
                    <p className="text-[10px] font-semibold text-amber-500/60 uppercase tracking-wider px-3 mb-1">
                      {raidName}
                    </p>
                    <div className="space-y-0.5">
                      {bosses.map((strat) => {
                        const isActive = location.pathname === `/strategies/${strat.id}`;
                        return (
                          <Link
                            key={strat.id}
                            to={`/strategies/${strat.id}`}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs transition-colors ${
                              isActive
                                ? 'bg-amber-600/20 text-amber-400'
                                : 'text-muted-foreground hover:bg-muted/50 hover:text-slate-200'
                            }`}
                          >
                            <Swords className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="truncate">{strat.bossName}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </nav>

        {/* Footer with toggle */}
        <div className="border-t border-border/50 p-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-full justify-center text-muted-foreground hover:text-primary"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="border-b border-border/50 bg-card/40 backdrop-blur-md sticky top-0 z-40 h-16">
          <div className="h-full px-6 flex items-center justify-between">
            <h2 className="text-sm font-medium text-muted-foreground">Dashboard</h2>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center gap-2 h-10 px-2"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  {user && (
                    <span className="hidden sm:inline text-sm font-medium text-foreground max-w-[150px] truncate">
                      {user.battletag}
                    </span>
                  )}
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium text-foreground">{user?.battletag}</p>
                  <p className="text-xs text-muted-foreground">{user?.appRole || 'Membre'}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <button
                    onClick={handleLogout}
                    className="w-full text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/30"
                  >
                    Se déconnecter
                  </button>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
