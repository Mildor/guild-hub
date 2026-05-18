import { useMemo, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { AppRole } from "@/types/auth";
import { GameRole } from "@/types/character";
import {
    useGetRoster,
    useGetAllCharacters,
    useGetMyCharacters,
    useToggleRoster,
    type CharacterWithUser,
} from "@/api/queries";
import { RoleGuard } from "@/components/RoleGuard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronDown, ChevronRight } from "lucide-react";
import { getClassColorStyle } from "@/lib/wowColors";

const roleLabels: Record<GameRole, string> = {
    TANK: "Tanks",
    HEALER: "Healers",
    DPS: "DPS",
};

function CharacterCard({ character }: { character: CharacterWithUser }) {
    return (
        <div className="rounded-lg border border-border/60 bg-card/70 p-4 space-y-2">
            <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-base truncate">
                    {character.name}
                </p>
                <Badge variant="outline" className="font-semibold">
                    iLvl {Math.round(character.ilvl)}
                </Badge>
            </div>
            <p className="text-sm" style={getClassColorStyle(character.class)}>
                {character.class}
            </p>
            <p className="text-xs text-muted-foreground truncate">
                {character.user?.battletag || "Inconnu"}
            </p>
        </div>
    );
}

function RosterCurrentTab() {
    const { data: roster, isLoading } = useGetRoster();

    const groupedRoster = useMemo(() => {
        const base: Record<GameRole, CharacterWithUser[]> = {
            TANK: [],
            HEALER: [],
            DPS: [],
        };

        for (const character of roster ?? []) {
            if (!character.inRoster) {
                continue;
            }
            base[character.gameRole].push(character);
        }

        return base;
    }, [roster]);

    if (isLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-40 w-full" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {(Object.keys(roleLabels) as GameRole[]).map((role) => (
                <Card key={role} className="bg-card/40 border-border/50">
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            <span>{roleLabels[role]}</span>
                            <Badge variant="secondary">
                                {groupedRoster[role].length}
                            </Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {groupedRoster[role].length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                Aucun personnage pour ce rôle.
                            </p>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {groupedRoster[role].map((character) => (
                                    <CharacterCard
                                        key={character.id}
                                        character={character}
                                    />
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

function RosterManagementTab() {
    const user = useAuthStore((s) => s.user);
    const canManage =
        user?.appRole === AppRole.ADMIN || user?.appRole === AppRole.OFFICER;
    const { data: allCharacters, isLoading } = useGetAllCharacters(canManage);
    const toggleRosterMutation = useToggleRoster(user?.userId);
    const [searchTerm, setSearchTerm] = useState("");
    const [roleFilter, setRoleFilter] = useState<"ALL" | GameRole>("ALL");
    const [rosterFilter, setRosterFilter] = useState<"ALL" | "IN" | "OUT">("ALL");
    const [conflictFilter, setConflictFilter] = useState<"ALL" | "ONLY">("ALL");
    const [sortBy, setSortBy] = useState<"BATTLETAG" | "ILVL_DESC" | "ILVL_ASC" | "NAME">("BATTLETAG");
    const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());

    const usersWithCharacters = useMemo(() => {
        const grouped = new Map<
            string,
            { battletag: string; characters: CharacterWithUser[] }
        >();

        for (const character of allCharacters ?? []) {
            const userId = character.user?.id ?? "unknown-user";
            const battletag = character.user?.battletag || "Inconnu";
            if (!grouped.has(userId)) {
                grouped.set(userId, {
                    battletag,
                    characters: [],
                });
            }
            grouped.get(userId)?.characters.push(character);
        }

        return Array.from(grouped.entries())
            .map(([userId, value]) => ({
                userId,
                battletag: value.battletag,
                characters: [...value.characters].sort((a, b) => {
                    if (a.isMain !== b.isMain) {
                        return a.isMain ? -1 : 1;
                    }
                    if (a.ilvl !== b.ilvl) {
                        return b.ilvl - a.ilvl;
                    }
                    return a.name.localeCompare(b.name, "fr");
                }),
            }))
            .sort((a, b) => a.battletag.localeCompare(b.battletag, "fr"));
    }, [allCharacters]);

    const stats = useMemo(() => {
        const totalCharacters = allCharacters?.length ?? 0;
        const totalRoster = (allCharacters ?? []).filter(
            (character) => character.inRoster,
        ).length;
        const totalConflicts = usersWithCharacters.filter((entry) => {
            const rosterCount = entry.characters.filter(
                (character) => character.inRoster,
            ).length;
            return rosterCount !== 1;
        }).length;

        return {
            totalCharacters,
            totalRoster,
            totalOutsideRoster: totalCharacters - totalRoster,
            totalUsers: usersWithCharacters.length,
            totalConflicts,
        };
    }, [allCharacters, usersWithCharacters.length]);

    const filteredUsers = useMemo(() => {
        const normalizedSearch = searchTerm.trim().toLowerCase();

        return usersWithCharacters
            .map((entry) => {
                const characters = entry.characters.filter((character) => {
                    if (roleFilter !== "ALL" && character.gameRole !== roleFilter) {
                        return false;
                    }

                    if (rosterFilter === "IN" && !character.inRoster) {
                        return false;
                    }

                    if (rosterFilter === "OUT" && character.inRoster) {
                        return false;
                    }

                    if (!normalizedSearch) {
                        return true;
                    }

                    const searchable = [
                        entry.battletag,
                        character.name,
                        character.class,
                        character.gameRole,
                    ]
                        .join(" ")
                        .toLowerCase();

                    return searchable.includes(normalizedSearch);
                });

                return {
                    ...entry,
                    filteredCharacters: characters,
                    rosterCount: entry.characters.filter(
                        (character) => character.inRoster,
                    ).length,
                };
            })
            .filter((entry) => entry.filteredCharacters.length > 0)
            .filter((entry) => {
                if (conflictFilter === "ONLY") {
                    return entry.rosterCount !== 1;
                }
                return true;
            })
            .sort((a, b) => {
                if (sortBy === "ILVL_DESC") {
                    const maxA = Math.max(...a.filteredCharacters.map((c) => c.ilvl));
                    const maxB = Math.max(...b.filteredCharacters.map((c) => c.ilvl));
                    return maxB - maxA;
                }

                if (sortBy === "ILVL_ASC") {
                    const minA = Math.min(...a.filteredCharacters.map((c) => c.ilvl));
                    const minB = Math.min(...b.filteredCharacters.map((c) => c.ilvl));
                    return minA - minB;
                }

                if (sortBy === "NAME") {
                    const nameA = a.filteredCharacters[0]?.name ?? "";
                    const nameB = b.filteredCharacters[0]?.name ?? "";
                    return nameA.localeCompare(nameB, "fr");
                }

                return a.battletag.localeCompare(b.battletag, "fr");
            });
    }, [usersWithCharacters, searchTerm, roleFilter, rosterFilter, conflictFilter, sortBy]);

    const filteredCount = useMemo(() => {
        return filteredUsers.reduce(
            (sum, entry) => sum + entry.filteredCharacters.length,
            0,
        );
    }, [filteredUsers]);

    const toggleUser = (battletag: string) => {
        setExpandedUsers((prev) => {
            const next = new Set(prev);
            if (next.has(battletag)) {
                next.delete(battletag);
            } else {
                next.add(battletag);
            }
            return next;
        });
    };

    const toggleAllUsers = (expand: boolean) => {
        if (expand) {
            setExpandedUsers(new Set(filteredUsers.map((entry) => entry.userId)));
            return;
        }
        setExpandedUsers(new Set());
    };

    if (isLoading) {
        return (
            <div className="space-y-3">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-48 w-full" />
            </div>
        );
    }

    return (
        <Card className="border-border/60 bg-card/40">
            <CardHeader className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <CardTitle className="text-lg">Gestion du roster</CardTitle>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                        <Badge variant="secondary">
                            {stats.totalUsers} joueurs
                        </Badge>
                        <Badge variant="outline">
                            {stats.totalCharacters} persos
                        </Badge>
                        <Badge className="border border-emerald-500/30 bg-emerald-500/15 text-emerald-300">
                            {stats.totalRoster} en roster
                        </Badge>
                        <Badge className="border border-amber-500/30 bg-amber-500/15 text-amber-300">
                            {stats.totalConflicts} conflit(s)
                        </Badge>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-2 md:grid-cols-5">
                    <Input
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Rechercher joueur, perso, classe..."
                        className="md:col-span-2"
                    />

                    <Select
                        value={roleFilter}
                        onChange={(e) =>
                            setRoleFilter(e.target.value as "ALL" | GameRole)
                        }
                    >
                        <option value="ALL">Tous les roles</option>
                        <option value="TANK">Tanks</option>
                        <option value="HEALER">Healers</option>
                        <option value="DPS">DPS</option>
                    </Select>

                    <Select
                        value={rosterFilter}
                        onChange={(e) =>
                            setRosterFilter(
                                e.target.value as "ALL" | "IN" | "OUT",
                            )
                        }
                    >
                        <option value="ALL">Tout statut</option>
                        <option value="IN">Dans roster</option>
                        <option value="OUT">Hors roster</option>
                    </Select>

                    <Select
                        value={sortBy}
                        onChange={(e) =>
                            setSortBy(
                                e.target.value as
                                    | "BATTLETAG"
                                    | "ILVL_DESC"
                                    | "ILVL_ASC"
                                    | "NAME",
                            )
                        }
                    >
                        <option value="BATTLETAG">Tri joueur (A-Z)</option>
                        <option value="ILVL_DESC">Tri iLvl (max - min)</option>
                        <option value="ILVL_ASC">Tri iLvl (min - max)</option>
                        <option value="NAME">Tri personnage (A-Z)</option>
                    </Select>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setConflictFilter("ALL")}
                        className={conflictFilter === "ALL"
                            ? "rounded-md border border-primary/40 bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-primary"
                            : "rounded-md border border-border/70 px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-background/70"}
                    >
                        Tous les joueurs
                    </button>
                    <button
                        type="button"
                        onClick={() => setConflictFilter("ONLY")}
                        className={conflictFilter === "ONLY"
                            ? "rounded-md border border-amber-500/40 bg-amber-500/10 px-2.5 py-1.5 text-xs font-medium text-amber-300"
                            : "rounded-md border border-border/70 px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-background/70"}
                    >
                        Conflits uniquement
                    </button>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm text-muted-foreground">
                        {filteredUsers.length} joueur(s), {filteredCount} personnage(s) affiche(s)
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => toggleAllUsers(true)}
                            className="rounded-md border border-border/70 px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-background/70"
                        >
                            Tout ouvrir
                        </button>
                        <button
                            type="button"
                            onClick={() => toggleAllUsers(false)}
                            className="rounded-md border border-border/70 px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-background/70"
                        >
                            Tout fermer
                        </button>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="space-y-3">
                {filteredUsers.length === 0 ? (
                    <div className="rounded-lg border border-border/60 bg-background/50 p-4 text-sm text-muted-foreground">
                        Aucun resultat avec ces filtres.
                    </div>
                ) : (
                    filteredUsers.map((entry) => {
                        const isExpanded = expandedUsers.has(entry.userId);
                        const rosterCharacter = entry.characters.find(
                            (character) => character.inRoster,
                        );
                        const hasConflict = entry.rosterCount !== 1;

                        return (
                            <div
                                key={entry.userId}
                                className="rounded-xl border border-border/70 bg-background/40"
                            >
                                <button
                                    type="button"
                                    onClick={() => toggleUser(entry.userId)}
                                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                                >
                                    <div>
                                        <p className="font-semibold">{entry.battletag}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {entry.filteredCharacters.length}/{entry.characters.length} persos visibles
                                            {rosterCharacter
                                                ? ` - Roster: ${rosterCharacter.name}`
                                                : " - Aucun roster actif"}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {hasConflict && (
                                            <Badge className="border border-amber-500/30 bg-amber-500/15 text-amber-300">
                                                Conflit
                                            </Badge>
                                        )}
                                        <Badge variant="secondary">
                                            {entry.filteredCharacters.length}
                                        </Badge>
                                        {isExpanded ? (
                                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                        ) : (
                                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                        )}
                                    </div>
                                </button>

                                {isExpanded && (
                                    <div className="space-y-2 border-t border-border/60 p-3">
                                        {entry.filteredCharacters.map((character) => {
                                            const isPending =
                                                toggleRosterMutation.isPending &&
                                                toggleRosterMutation.variables?.id ===
                                                    character.id;

                                            return (
                                                <div
                                                    key={character.id}
                                                    className="flex flex-col gap-3 rounded-lg border border-border/60 bg-background/60 p-3 md:flex-row md:items-center md:justify-between"
                                                >
                                                    <div className="space-y-1">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <p className="font-medium">
                                                                {character.name}
                                                            </p>
                                                            {character.isMain && (
                                                                <Badge variant="outline">
                                                                    Main
                                                                </Badge>
                                                            )}
                                                            {character.inRoster && (
                                                                <Badge className="border border-emerald-500/30 bg-emerald-500/15 text-emerald-300">
                                                                    Roster
                                                                </Badge>
                                                            )}
                                                        </div>

                                                        <p
                                                            className="text-sm"
                                                            style={getClassColorStyle(
                                                                character.class,
                                                            )}
                                                        >
                                                            {character.class}
                                                        </p>

                                                        <p className="text-xs text-muted-foreground">
                                                            Role {character.gameRole} - iLvl {Math.round(character.ilvl)}
                                                        </p>
                                                    </div>

                                                    <div className="flex items-center gap-3">
                                                        <span className="text-xs text-muted-foreground">
                                                            Dans le roster
                                                        </span>
                                                        <Switch
                                                            checked={character.inRoster}
                                                            disabled={isPending}
                                                            onChange={(e) => {
                                                                toggleRosterMutation.mutate(
                                                                    {
                                                                        id: character.id,
                                                                        inRoster:
                                                                            e.target
                                                                                .checked,
                                                                    },
                                                                );
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </CardContent>
        </Card>
    );
}

function PersonalRosterSelector() {
    const user = useAuthStore((s) => s.user);
    const activeSharedProfile = useAuthStore((s) => s.activeSharedProfile);
    const canSelectRoster =
        user?.appRole === AppRole.MEMBER ||
        user?.appRole === AppRole.OFFICER ||
        user?.appRole === AppRole.ADMIN;

    const { data: myCharacters, isLoading } = useGetMyCharacters(
        user?.userId,
        activeSharedProfile,
    );

    const charactersSorted = useMemo(() => {
        return [...(myCharacters ?? [])].sort((a, b) => {
            if (a.isMain !== b.isMain) {
                return a.isMain ? -1 : 1;
            }
            if (a.ilvl !== b.ilvl) {
                return b.ilvl - a.ilvl;
            }
            return a.name.localeCompare(b.name, "fr");
        });
    }, [myCharacters]);

    const selectedRoster = useMemo(() => {
        return charactersSorted.find((character) => character.inRoster) ?? null;
    }, [charactersSorted]);

    if (!canSelectRoster) {
        return null;
    }

    if (isLoading) {
        return <Skeleton className="h-36 w-full" />;
    }

    return (
        <Card className="border-border/60 bg-card/40">
            <CardHeader>
                <CardTitle className="text-lg">Mon personnage roster</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                    Choisissez le personnage a inclure dans le roster.
                </p>

                {selectedRoster ? (
                    <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3">
                        <p className="text-sm font-semibold text-emerald-300">
                            Actuellement selectionne: {selectedRoster.name}
                        </p>
                        <p className="text-xs text-emerald-200/80">
                            {selectedRoster.class} - iLvl {Math.round(selectedRoster.ilvl)}
                        </p>
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground">
                        Aucun personnage roster defini pour le moment.
                    </p>
                )}
            </CardContent>
        </Card>
    );
}

export function RosterPage() {
    const user = useAuthStore((s) => s.user);
    const canManage =
        user?.appRole === AppRole.ADMIN || user?.appRole === AppRole.OFFICER;

    return (
        <div className="min-h-full bg-background">
            <div className="container mx-auto p-4 md:p-8 space-y-6">
                <div>
                    <h1 className="mb-2 text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent md:text-3xl">
                        Roster de Guilde
                    </h1>
                    <p className="text-muted-foreground">
                        Consultez la composition actuelle et gérez les
                        personnages du roster.
                    </p>
                </div>

                <PersonalRosterSelector />

                <Tabs defaultValue="current" className="w-full">
                    <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2 md:w-auto md:inline-flex">
                        <TabsTrigger value="current">Roster Actuel</TabsTrigger>
                        {canManage && (
                            <TabsTrigger value="manage">Gestion</TabsTrigger>
                        )}
                    </TabsList>

                    <TabsContent value="current" className="pt-4">
                        <RosterCurrentTab />
                    </TabsContent>

                    <TabsContent value="manage" className="pt-4">
                        <RoleGuard
                            allowedRoles={[AppRole.ADMIN, AppRole.OFFICER]}
                        >
                            <RosterManagementTab />
                        </RoleGuard>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
