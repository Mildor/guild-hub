import { useEffect, useState } from "react";
import { BrowserRouter, Navigate, Routes, Route } from "react-router-dom";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { ThemeProvider } from "@/context/ThemeProvider";
import { useAuthStore } from "@/store/authStore";
import { useGetMe } from "@/api/queries";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { LoginPage } from "@/pages/LoginPage";
import { LandingPage } from "@/pages/LandingPage";
import { AuthCallbackPage } from "@/pages/AuthCallbackPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { CalendarPage } from "@/pages/CalendarPage";
import { EventDetailPage } from "@/pages/EventDetailPage";
import { RosterPage } from "@/pages/RosterPage";
import { GuildMembersPage } from "@/pages/GuildMembersPage";
import { WclPerformancesPage } from "@/pages/WclPerformancesPage";
import { GuildLinkPage } from "@/pages/GuildLinkPage";
import { AdminLayout } from "@/pages/admin/AdminLayout";
import { OverviewSection } from "@/pages/admin/sections/OverviewSection";
import { UsersSection } from "@/pages/admin/sections/UsersSection";
import { FailedLoginsSection } from "@/pages/admin/sections/FailedLoginsSection";
import { UnlinkedMembersSection } from "@/pages/admin/sections/UnlinkedMembersSection";
import { CharactersSection } from "@/pages/admin/sections/CharactersSection";
import { EventsSection } from "@/pages/admin/sections/EventsSection";
import { PollsSection } from "@/pages/admin/sections/PollsSection";
import { StrategiesSection } from "@/pages/admin/sections/StrategiesSection";
import { WclAttendanceSection } from "@/pages/admin/sections/WclAttendanceSection";
import { ModulesSection } from "@/pages/admin/sections/ModulesSection";
import { ModuleGuard } from "@/components/ModuleGuard";

import { StrategiesPage } from "@/pages/StrategiesPage";
import { PollsPage } from "@/pages/PollsPage";
import { PrivacyPolicy } from "@/pages/PrivacyPolicy";
import { TokenPage } from "@/pages/TokenPage";
import { CrafterHubPage } from "@/pages/CrafterHubPage";
import { OnboardingPage } from "@/pages/OnboardingPage";
import { VaultPage } from "@/pages/VaultPage";
import { Skeleton } from "@/components/ui/skeleton";
import { RoleGuard } from "@/components/RoleGuard";
import { AppRole } from "@/types/auth";

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
    const setUser = useAuthStore((s) => s.setUser);
    const logout = useAuthStore((s) => s.logout);
    const { data: meData, isLoading: isMeLoading, error: meError } = useGetMe();
    const [isAuthResolved, setIsAuthResolved] = useState(false);

    // Résout l'état d'authentification avant d'afficher le routeur
    useEffect(() => {
        if (isMeLoading) {
            return;
        }

        const syncAuthState = async () => {
            if (meData) {
                setUser(meData);
                setIsAuthResolved(true);
                return;
            }

            if (meError) {
                const error = meError as any;
                const status = error?.response?.status;

                // Sur 401, l'utilisateur est simplement non connecté.
                if (status === 401) {
                    setUser(null);
                    setIsAuthResolved(true);
                    return;
                }

                // Sur 404, on nettoie aussi le cookie côté backend si la session existe encore.
                if (status === 404) {
                    console.warn(
                        "Logout automatique - Erreur 404: compte invalide ou supprime",
                    );
                    await logout();
                    setIsAuthResolved(true);
                    return;
                }

                setUser(null);
            } else {
                setUser(null);
            }

            setIsAuthResolved(true);
        };

        void syncAuthState();
    }, [isMeLoading, meData, meError, setUser, logout]);

    // Pendant l'initialisation de la session via cookie HttpOnly
    if (isMeLoading || !isAuthResolved) {
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
                    <Route path="/onboarding" element={<OnboardingPage />} />

                    <Route element={<DashboardLayout />}>
                        <Route path="/dashboard" element={<DashboardPage />} />
                        <Route
                            path="/calendar"
                            element={
                                <ModuleGuard moduleCode="calendar">
                                    <CalendarPage />
                                </ModuleGuard>
                            }
                        />
                        <Route
                            path="/events/:id"
                            element={
                                <ModuleGuard moduleCode="calendar">
                                    <EventDetailPage />
                                </ModuleGuard>
                            }
                        />
                        <Route
                            path="/roster"
                            element={
                                <ModuleGuard moduleCode="roster">
                                    <RosterPage />
                                </ModuleGuard>
                            }
                        />
                        <Route
                            path="/members"
                            element={
                                <ModuleGuard moduleCode="members">
                                    <GuildMembersPage />
                                </ModuleGuard>
                            }
                        />
                        <Route
                            path="/guild-link"
                            element={
                                <ModuleGuard moduleCode="guild-link">
                                    <GuildLinkPage />
                                </ModuleGuard>
                            }
                        />
                        <Route
                            path="/performances"
                            element={
                                <ModuleGuard moduleCode="performances">
                                    <WclPerformancesPage />
                                </ModuleGuard>
                            }
                        />
                        <Route
                            path="/vault"
                            element={
                                <ModuleGuard moduleCode="vault">
                                    <VaultPage />
                                </ModuleGuard>
                            }
                        />
                        <Route path="/token" element={<TokenPage />} />
                        <Route
                            path="/crafter-hub"
                            element={
                                <ModuleGuard moduleCode="crafter-hub">
                                    <CrafterHubPage />
                                </ModuleGuard>
                            }
                        />
                        <Route
                            path="/polls"
                            element={
                                <ModuleGuard moduleCode="polls">
                                    <RoleGuard
                                        allowedRoles={[
                                            AppRole.MEMBER,
                                            AppRole.OFFICER,
                                            AppRole.ADMIN,
                                        ]}
                                        fallback={
                                            <Navigate to="/dashboard" replace />
                                        }
                                    >
                                        <PollsPage />
                                    </RoleGuard>
                                </ModuleGuard>
                            }
                        />
                        <Route
                            path="/strategies"
                            element={
                                <ModuleGuard moduleCode="strategies">
                                    <StrategiesPage />
                                </ModuleGuard>
                            }
                        />
                        <Route
                            path="/strategies/:id"
                            element={
                                <ModuleGuard moduleCode="strategies">
                                    <StrategiesPage />
                                </ModuleGuard>
                            }
                        />
                        <Route path="/admin" element={<AdminLayout />}>
                            <Route
                                index
                                element={
                                    <RoleGuard allowedRoles={[AppRole.ADMIN]} fallback={<Navigate to="/admin/unlinked-members" replace />}>
                                        <OverviewSection />
                                    </RoleGuard>
                                }
                            />
                            <Route
                                path="users"
                                element={
                                    <RoleGuard allowedRoles={[AppRole.ADMIN]} fallback={<Navigate to="/admin/unlinked-members" replace />}>
                                        <UsersSection />
                                    </RoleGuard>
                                }
                            />
                            <Route
                                path="failed-logins"
                                element={
                                    <RoleGuard allowedRoles={[AppRole.ADMIN]} fallback={<Navigate to="/admin/unlinked-members" replace />}>
                                        <FailedLoginsSection />
                                    </RoleGuard>
                                }
                            />
                            <Route
                                path="unlinked-members"
                                element={<UnlinkedMembersSection />}
                            />
                            <Route
                                path="characters"
                                element={
                                    <RoleGuard allowedRoles={[AppRole.ADMIN]} fallback={<Navigate to="/admin/unlinked-members" replace />}>
                                        <CharactersSection />
                                    </RoleGuard>
                                }
                            />
                            <Route
                                path="events"
                                element={
                                    <RoleGuard allowedRoles={[AppRole.ADMIN]} fallback={<Navigate to="/admin/unlinked-members" replace />}>
                                        <EventsSection />
                                    </RoleGuard>
                                }
                            />
                            <Route
                                path="polls"
                                element={
                                    <RoleGuard allowedRoles={[AppRole.ADMIN]} fallback={<Navigate to="/admin/unlinked-members" replace />}>
                                        <PollsSection />
                                    </RoleGuard>
                                }
                            />
                            <Route
                                path="strategies"
                                element={
                                    <RoleGuard allowedRoles={[AppRole.ADMIN]} fallback={<Navigate to="/admin/unlinked-members" replace />}>
                                        <StrategiesSection />
                                    </RoleGuard>
                                }
                            />
                            <Route
                                path="wcl-attendance"
                                element={
                                    <RoleGuard allowedRoles={[AppRole.ADMIN]} fallback={<Navigate to="/admin/unlinked-members" replace />}>
                                        <WclAttendanceSection />
                                    </RoleGuard>
                                }
                            />
                            <Route
                                path="modules"
                                element={
                                    <RoleGuard allowedRoles={[AppRole.ADMIN]} fallback={<Navigate to="/admin/unlinked-members" replace />}>
                                        <ModulesSection />
                                    </RoleGuard>
                                }
                            />
                        </Route>
                    </Route>
                </Route>
            </Routes>
        </BrowserRouter>
    );
}

function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <ThemeProvider>
                <AppContent />
            </ThemeProvider>
        </QueryClientProvider>
    );
}

export default App;
