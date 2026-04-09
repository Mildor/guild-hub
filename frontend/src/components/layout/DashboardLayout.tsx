import { useEffect, useMemo, useState } from 'react';
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
import { useDeleteMyAccount, useGetGuildProfile, useGetStrategies, useSyncCharacters } from '@/api/queries';
import { AppRole } from '@/types/auth';
import { ChevronDown, ChevronRight, Menu, X, Home, Calendar, Users, Shield, BookOpen, Swords, Plus, BarChart3, Coins, Trophy, Search, RefreshCw } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Footer } from '@/components/layout/Footer';
import { useGetWowToken } from '@/api/queries';

const GUILD_REALM = 'archimonde';
const GUILD_NAME = 'The Good Place';
const TWW_RAID_PRIORITY_SLUGS = ['liberation-of-undermine', 'nerubar-palace'];

const getGuildProgressSummary = (
  raidProgression?: Record<string, { summary: string }>,
): string => {
  for (const slug of TWW_RAID_PRIORITY_SLUGS) {
    const summary = raidProgression?.[slug]?.summary;
    if (summary) {
      return summary;
    }
  }

  const firstAvailableSummary = Object.values(raidProgression ?? {}).find(
    (value) => value?.summary,
  )?.summary;

  return firstAvailableSummary || '0/8 N';
};

export function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [strategiesExpanded, setStrategiesExpanded] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const deleteMyAccount = useDeleteMyAccount();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { data: wowToken } = useGetWowToken();
  const { data: guildProfile } = useGetGuildProfile(GUILD_REALM, GUILD_NAME);
  const syncCharactersMutation = useSyncCharacters(user?.userId);

  const { data: strategies } = useGetStrategies();

  const isOfficerOrAdmin =
    user?.appRole === AppRole.ADMIN || user?.appRole === AppRole.OFFICER;

  // Auto-expand when on strategies page
  const isOnStrategies = location.pathname.startsWith('/strategies');
  const expanded = strategiesExpanded || isOnStrategies;

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname]);

  const groupedByRaid = useMemo(() => {
    if (!strategies) return {};
    return strategies.reduce<Record<string, typeof strategies>>((acc, strat) => {
      const raidKey = strat.raidName;
      const raidStrategies = acc[raidKey] ?? (acc[raidKey] = []);
      raidStrategies.push(strat);
      return acc;
    }, {});
  }, [strategies]);

  const handleLogout = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  const handleDeleteMyAccount = async () => {
    try {
      await deleteMyAccount.mutateAsync();
      await logout();
      navigate('/login?reason=account-deleted', { replace: true });
    } finally {
      setDeleteDialogOpen(false);
    }
  };

  const navItems = [
    { icon: Home, label: 'Dashboard', href: '/dashboard' },
    { icon: Calendar, label: 'Calendrier', href: '/calendar' },
    { icon: Users, label: 'Roster', href: '/roster' },
    { icon: Search, label: 'Crafter Hub', href: '/crafter-hub' },
    { icon: Trophy, label: 'Classement & Progress', href: '/guild-link' },
    ...(user?.appRole !== AppRole.GUEST
      ? [{ icon: BarChart3, label: 'Sondages', href: '/polls' }]
      : []),
    ...(user?.appRole === 'ADMIN'
      ? [{ icon: Shield, label: 'Administration', href: '/admin' }]
      : []),
  ];

  const initials = user?.battletag
    ? (user.battletag.split('#')[0] ?? '')
      .split('')
      .slice(0, 2)
      .join('')
      .toUpperCase()
    : 'GH';

  const formattedTokenPrice =
    typeof wowToken?.currentPrice === 'number'
      ? `${new Intl.NumberFormat('fr-FR').format(wowToken.currentPrice)} po`
      : 'Indisponible';

  const guildProgressSummary = getGuildProgressSummary(guildProfile?.raid_progression);

  const renderNavContent = (showLabels: boolean, onNavigate?: () => void) => (
    <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
      {navItems.map((item) => (
        <Link
          key={item.href}
          to={item.href}
          onClick={onNavigate}
          className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors group ${
            location.pathname === item.href
              ? 'bg-primary/15 text-primary'
              : 'text-muted-foreground hover:bg-primary/10 hover:text-primary'
          }`}
        >
          <item.icon className="w-5 h-5 flex-shrink-0" />
          {showLabels && <span className="text-sm font-medium">{item.label}</span>}
        </Link>
      ))}

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
          {showLabels && (
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

        {showLabels && expanded && (
          <div className="ml-4 mt-1 pl-4 border-l border-border/30 space-y-3 py-1">
            {isOfficerOrAdmin && (
              <Link
                to="/strategies/new"
                onClick={onNavigate}
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
                        onClick={onNavigate}
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
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={`hidden md:flex ${
          sidebarOpen ? 'w-64' : 'w-20'
        } bg-sidebar border-r border-sidebar-border transition-all duration-300 flex-col`}
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

        {renderNavContent(sidebarOpen)}

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

      {mobileSidebarOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <aside className="absolute left-0 top-0 flex h-full w-80 max-w-[85vw] flex-col bg-sidebar border-r border-sidebar-border shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-border/50 p-4">
              <Link
                to="/dashboard"
                onClick={() => setMobileSidebarOpen(false)}
                className="flex items-center gap-3 group min-w-0"
              >
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center group-hover:shadow-lg group-hover:shadow-primary/30 transition-all glow-gold">
                  <span className="text-sm font-bold text-primary-foreground">TGP</span>
                </div>
                <h1 className="truncate text-lg font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                  The Good Place
                </h1>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMobileSidebarOpen(false)}
                className="text-muted-foreground hover:text-primary"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            {renderNavContent(true, () => setMobileSidebarOpen(false))}
            <div className="border-t border-border/50 p-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMobileSidebarOpen(false)}
                className="w-full justify-center text-muted-foreground hover:text-primary"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </aside>
        </div>
      ) : null}

      {/* Main Content */}
      <div className="flex-1 flex min-w-0 flex-col">
        {/* Header */}
        <header className="border-b border-border/50 bg-card/40 backdrop-blur-md sticky top-0 z-40 h-16">
          <div className="h-full px-4 md:px-6 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMobileSidebarOpen(true)}
                className="-ml-2 text-muted-foreground hover:text-primary md:hidden"
              >
                <Menu className="h-5 w-5" />
              </Button>
              <h2 className="hidden sm:block text-sm font-medium text-muted-foreground truncate">Dashboard</h2>
              <div className="relative hidden sm:block">
                <button
                  type="button"
                  aria-label="Resume progression guilde"
                  className="group inline-flex items-center gap-1 rounded-full border border-violet-500/30 bg-violet-500/15 px-2 py-1 text-[11px] font-semibold text-violet-200 transition-colors hover:bg-violet-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60 sm:px-3 sm:text-xs"
                >
                  <span aria-hidden="true">👑</span>
                  T1: {guildProgressSummary}

                  <div className="pointer-events-none absolute left-1/2 top-[calc(100%+10px)] z-50 w-64 -translate-x-1/2 rounded-xl border border-violet-400/30 bg-slate-950/95 p-3 text-left opacity-0 shadow-2xl shadow-violet-900/30 backdrop-blur-md transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100">
                    <div className="absolute -top-2 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-l border-t border-violet-400/30 bg-slate-950/95" />
                    <p className="text-[10px] uppercase tracking-[0.16em] text-violet-300/80">
                      Progression actuelle
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-100">
                      The Good Place - T1: {guildProgressSummary}
                    </p>
                    <p className="mt-1 text-xs text-slate-300">
                      Statut live de notre progression raid, mis a jour via Raider.IO.
                    </p>
                  </div>
                </button>
              </div>
              <Link
                to="/token"
                className="inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-[11px] font-semibold text-amber-400 transition-colors hover:bg-amber-500/20 sm:px-3 sm:text-xs"
              >
                <Coins className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Token: {formattedTokenPrice}</span>
                <span className="sm:hidden">{formattedTokenPrice}</span>
              </Link>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => syncCharactersMutation.mutate()}
                disabled={syncCharactersMutation.isPending}
                className="h-8 gap-2 border-primary/30 bg-primary/10 px-2 text-[11px] font-semibold text-primary hover:bg-primary/20 sm:px-3 sm:text-xs"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${syncCharactersMutation.isPending ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">
                  {syncCharactersMutation.isPending ? 'Synchronisation...' : 'Sync persos'}
                </span>
                <span className="sm:hidden">Sync</span>
              </Button>
            </div>

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
                <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                  <DialogTrigger asChild>
                    <DropdownMenuItem
                      className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/30"
                    >
                      Supprimer mon compte definitivement
                    </DropdownMenuItem>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Supprimer mon compte definitivement</DialogTitle>
                      <DialogDescription>
                        Cette action est irreversible. Toutes vos donnees Guild Hub seront
                        supprimees immediatement.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="w-full">
                      <Button
                        variant="outline"
                        onClick={() => setDeleteDialogOpen(false)}
                        className="w-full md:w-auto"
                      >
                        Annuler
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={handleDeleteMyAccount}
                        disabled={deleteMyAccount.isPending}
                        className="w-full md:w-auto"
                      >
                        {deleteMyAccount.isPending
                          ? 'Suppression en cours...'
                          : 'Oui, supprimer mon compte'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
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
        <main className="flex-1 overflow-x-hidden">
          <Outlet />
        </main>

        <Footer />
      </div>
    </div>
  );
}
