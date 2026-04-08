import { useEffect } from 'react';
import { BrowserRouter, Navigate, Routes, Route } from 'react-router-dom';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { useGetMe } from '@/api/queries';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { LoginPage } from '@/pages/LoginPage';
import { LandingPage } from '@/pages/LandingPage';
import { AuthCallbackPage } from '@/pages/AuthCallbackPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { CalendarPage } from '@/pages/CalendarPage';
import { EventDetailPage } from '@/pages/EventDetailPage';
import { RosterPage } from '@/pages/RosterPage';
import { GuildLinkPage } from '@/pages/GuildLinkPage';
import { AdminPage } from '@/pages/AdminPage';
import { StrategiesPage } from '@/pages/StrategiesPage';
import { PollsPage } from '@/pages/PollsPage';
import { PrivacyPolicy } from '@/pages/PrivacyPolicy';
import { TokenPage } from '@/pages/TokenPage';
import { CrafterHubPage } from '@/pages/CrafterHubPage';
import { Skeleton } from '@/components/ui/skeleton';
import { isJwtValid } from '@/lib/jwt';
import { RoleGuard } from '@/components/RoleGuard';
import { AppRole } from '@/types/auth';

// Créez une instance QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
    },
  },
});

// Wrapper pour le fetch utilisateur
function AppContent() {
  const token = useAuthStore((s) => s.token);
  const setUser = useAuthStore((s) => s.setUser);
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const { data: meData, isLoading: isMeLoading, error: meError } = useGetMe();

  // Vérifier si le JWT est expiré au démarrage
  useEffect(() => {
    if (token && !isJwtValid(token)) {
      console.warn('JWT expiré, déconnexion automatique');
      logout();
    }
  }, [token, logout]);

  // Update user dans le store quand les données arrivent
  useEffect(() => {
    if (meData && !isMeLoading) {
      setUser(meData);
    }
  }, [meData, isMeLoading, setUser]);

  // Si erreur lors du fetch me, logout (401 unauthorized, 404 user deleted, etc)
  useEffect(() => {
    if (meError && token) {
      const error = meError as any;
      const status = error?.response?.status;

      // Logout si erreur d'authentification (401) ou utilisateur introuvable (404)
      // ou toute autre erreur qui indique que le compte n'est pas valide
      if (status === 401 || status === 404) {
        console.warn(`Logout automatique - Erreur ${status}: compte invalide ou supprimé`);
        logout();
      }
    }
  }, [meError, token, logout]);

  // Loading screen
  if (token && isMeLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="space-y-4 w-full max-w-md px-4">
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-32 w-full rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/login/success" element={<AuthCallbackPage />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />

        {/* Layout avec les pages protégées */}
        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/events/:id" element={<EventDetailPage />} />
            <Route path="/roster" element={<RosterPage />} />
            <Route path="/guild-link" element={<GuildLinkPage />} />
            <Route path="/token" element={<TokenPage />} />
            <Route path="/crafter-hub" element={<CrafterHubPage />} />
            <Route
              path="/polls"
              element={
                <RoleGuard
                  allowedRoles={[AppRole.MEMBER, AppRole.OFFICER, AppRole.ADMIN]}
                  fallback={<Navigate to="/dashboard" replace />}
                >
                  <PollsPage />
                </RoleGuard>
              }
            />
            <Route path="/strategies" element={<StrategiesPage />} />
            <Route path="/strategies/:id" element={<StrategiesPage />} />
            <Route path="/admin" element={<AdminPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}

export default App;
