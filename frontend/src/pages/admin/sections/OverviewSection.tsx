import { useMemo } from "react";
import {
    useGetAllUsers,
    useGetAllCharacters,
    useGetAllEvents,
    useGetPolls,
    useGetStrategies,
} from "@/api/queries";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Users,
    UserSquare2,
    Calendar,
    BarChart3,
    TrendingUp,
} from "lucide-react";

export function OverviewSection() {
    const { data: users = [], isLoading: isUsersLoading } = useGetAllUsers();
    const { data: characters = [], isLoading: isCharactersLoading } =
        useGetAllCharacters();
    const { data: events = [], isLoading: isEventsLoading } = useGetAllEvents();
    const { data: polls = [], isLoading: isPollsLoading } = useGetPolls();
    const { data: strategies = [], isLoading: isStrategiesLoading } =
        useGetStrategies();

    const isLoading =
        isUsersLoading ||
        isCharactersLoading ||
        isEventsLoading ||
        isPollsLoading ||
        isStrategiesLoading;

    const upcomingEvents = useMemo(
        () => events.filter((event) => new Date(event.eventDate) > new Date()),
        [events],
    );

    const activePolls = useMemo(
        () => polls.filter((poll) => poll.isActive),
        [polls],
    );

    const rosterCount = useMemo(
        () => characters.filter((character) => character.inRoster).length,
        [characters],
    );

    if (isLoading) {
        return (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-32 rounded-2xl" />
                ))}
            </div>
        );
    }

    const stats = [
        {
            label: "Utilisateurs",
            value: users.length,
            description: "Gestion des rôles et accès",
            icon: Users,
            color: "text-amber-500",
            bgColor: "bg-amber-500/10",
            borderColor: "border-amber-500/20",
        },
        {
            label: "Personnages",
            value: characters.length,
            description: `${rosterCount} membres du roster`,
            icon: UserSquare2,
            color: "text-sky-500",
            bgColor: "bg-sky-500/10",
            borderColor: "border-sky-500/20",
        },
        {
            label: "Événements",
            value: events.length,
            description: `${upcomingEvents.length} à venir`,
            icon: Calendar,
            color: "text-emerald-500",
            bgColor: "bg-emerald-500/10",
            borderColor: "border-emerald-500/20",
        },
        {
            label: "Contenus",
            value: polls.length + strategies.length,
            description: `${activePolls.length} sondages actifs`,
            icon: BarChart3,
            color: "text-violet-500",
            bgColor: "bg-violet-500/10",
            borderColor: "border-violet-500/20",
        },
    ];

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">
                        Vue d'ensemble
                    </h1>
                    <p className="text-muted-foreground">
                        Bienvenue dans votre centre d'administration.
                    </p>
                </div>
                <div className="hidden md:block">
                    <div className="flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm font-medium text-primary">
                        <TrendingUp className="h-4 w-4" />
                        <span>Activité constante</span>
                    </div>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat) => (
                    <div
                        key={stat.label}
                        className={`rounded-2xl border ${stat.borderColor} ${stat.bgColor} p-6 transition-all hover:shadow-lg hover:shadow-primary/5`}
                    >
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">
                                    {stat.label}
                                </p>
                                <p className="mt-2 text-3xl font-bold text-foreground">
                                    {stat.value}
                                </p>
                            </div>
                            <div
                                className={`rounded-xl ${stat.bgColor} p-3 ${stat.color}`}
                            >
                                <stat.icon className="h-6 w-6" />
                            </div>
                        </div>
                        <p className="mt-4 text-xs text-muted-foreground">
                            {stat.description}
                        </p>
                    </div>
                ))}
            </div>

            {/* Quick Links or Recent Activity can be added here */}
            <div className="grid gap-6 md:grid-cols-2">
                <div className="rounded-2xl border border-border bg-card p-6">
                    <h3 className="text-lg font-semibold text-foreground">
                        Événements récents
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        Les derniers événements programmés.
                    </p>
                    <div className="mt-6 space-y-4">
                        {events.slice(0, 5).map((event) => (
                            <div
                                key={event.id}
                                className="flex items-center justify-between border-b border-border/50 pb-4 last:border-0 last:pb-0"
                            >
                                <div>
                                    <p className="text-sm font-medium text-foreground">
                                        {event.title}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {new Date(
                                            event.eventDate,
                                        ).toLocaleDateString("fr-FR")}
                                    </p>
                                </div>
                                <div className="rounded-full bg-accent px-2 py-1 text-[10px] font-bold text-accent-foreground uppercase">
                                    {event._count?.attendances ?? 0} Inscrits
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="rounded-2xl border border-border bg-card p-6">
                    <h3 className="text-lg font-semibold text-foreground">
                        Derniers sondages
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        Sondages actifs et résultats récents.
                    </p>
                    <div className="mt-6 space-y-4">
                        {polls.slice(0, 5).map((poll) => (
                            <div
                                key={poll.id}
                                className="flex items-center justify-between border-b border-border/50 pb-4 last:border-0 last:pb-0"
                            >
                                <div>
                                    <p className="text-sm font-medium text-foreground">
                                        {poll.question}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {poll.isActive ? "Actif" : "Terminé"}
                                    </p>
                                </div>
                                <div
                                    className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${poll.isActive ? "bg-emerald-500/10 text-emerald-500" : "bg-muted text-muted-foreground"}`}
                                >
                                    {poll.isActive ? "Ouvert" : "Clos"}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
