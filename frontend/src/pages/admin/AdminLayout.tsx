import { useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import {
    Shield,
    LayoutDashboard,
    Users,
    AlertTriangle,
    Link2Off,
    UserSquare2,
    Calendar,
    BarChart3,
    BookOpen,
    Menu,
    X,
    ChevronLeft,
    Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { RoleGuard } from "@/components/RoleGuard";
import { AppRole } from "@/types/auth";

interface NavItem {
    label: string;
    href: string;
    icon: any;
}

const navItems: NavItem[] = [
    { label: "Vue globale", href: "/admin", icon: LayoutDashboard },
    { label: "Utilisateurs", href: "/admin/users", icon: Users },
    {
        label: "Connexions KO",
        href: "/admin/failed-logins",
        icon: AlertTriangle,
    },
    { label: "Sans compte", href: "/admin/unlinked-members", icon: Link2Off },
    { label: "Personnages", href: "/admin/characters", icon: UserSquare2 },
    { label: "Evénements", href: "/admin/events", icon: Calendar },
    { label: "Sondages", href: "/admin/polls", icon: BarChart3 },
    { label: "Stratégies", href: "/admin/strategies", icon: BookOpen },
    { label: "Warcraft Logs", href: "/admin/wcl-attendance", icon: Activity },
];

export function AdminLayout() {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const location = useLocation();

    const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
    const toggleMobileMenu = () => setMobileMenuOpen(!mobileMenuOpen);

    return (
        <RoleGuard allowedRoles={[AppRole.ADMIN]}>
            <div className="flex min-h-screen bg-background">
                {/* Mobile Menu Overlay */}
                {mobileMenuOpen && (
                    <div
                        className="fixed inset-0 z-40 bg-black/50 md:hidden"
                        onClick={toggleMobileMenu}
                    />
                )}

                {/* Sidebar */}
                <aside
                    className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-border bg-card transition-all duration-300 md:relative ${
                        sidebarOpen ? "w-64" : "w-20"
                    } ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
                >
                    <div className="flex h-16 items-center border-b border-border px-6">
                        <Shield className="h-6 w-6 text-primary" />
                        {sidebarOpen && (
                            <span className="ml-3 text-lg font-bold tracking-tight text-foreground">
                                Admin Center
                            </span>
                        )}
                        <button
                            onClick={toggleSidebar}
                            className="ml-auto hidden h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground md:flex"
                        >
                            <ChevronLeft
                                className={`h-4 w-4 transition-transform duration-300 ${
                                    !sidebarOpen ? "rotate-180" : ""
                                }`}
                            />
                        </button>
                    </div>

                    <nav className="flex-1 space-y-1 overflow-y-auto p-4">
                        {navItems.map((item) => {
                            const isActive =
                                item.href === "/admin"
                                    ? location.pathname === "/admin"
                                    : location.pathname.startsWith(item.href);

                            return (
                                <Link
                                    key={item.href}
                                    to={item.href}
                                    onClick={() => setMobileMenuOpen(false)}
                                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                                        isActive
                                            ? "bg-primary/15 text-primary"
                                            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                                    }`}
                                >
                                    <item.icon className="h-5 w-5 flex-shrink-0" />
                                    {sidebarOpen && <span>{item.label}</span>}
                                </Link>
                            );
                        })}
                    </nav>

                    <div className="border-t border-border p-4">
                        <Link
                            to="/dashboard"
                            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                        >
                            <X className="h-5 w-5 flex-shrink-0" />
                            {sidebarOpen && <span>Quitter l'admin</span>}
                        </Link>
                    </div>
                </aside>

                {/* Main Content */}
                <div className="flex flex-1 flex-col overflow-hidden">
                    {/* Header */}
                    <header className="flex h-16 items-center border-b border-border bg-card/50 px-4 backdrop-blur-sm md:px-8">
                        <button
                            onClick={toggleMobileMenu}
                            className="mr-4 rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground md:hidden"
                        >
                            <Menu className="h-6 w-6" />
                        </button>
                        <h2 className="text-lg font-semibold text-foreground">
                            {navItems.find(
                                (item) => location.pathname === item.href,
                            )?.label || "Administration"}
                        </h2>
                    </header>

                    {/* Content Area */}
                    <main className="flex-1 overflow-y-auto p-4 md:p-8">
                        <div className="mx-auto max-w-7xl">
                            <Outlet />
                        </div>
                    </main>
                </div>
            </div>
        </RoleGuard>
    );
}
