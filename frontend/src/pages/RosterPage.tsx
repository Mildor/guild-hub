import { Fragment, useMemo, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { AppRole } from "@/types/auth";
import { GameRole } from "@/types/character";
import {
    useGetRoster,
    useGetAllCharacters,
    useToggleRoster,
    type CharacterWithUser,
} from "@/api/queries";
import { RoleGuard } from "@/components/RoleGuard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
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
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
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
    const toggleRosterMutation = useToggleRoster();
    const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());

    const usersWithCharacters = useMemo(() => {
        const grouped = new Map<string, CharacterWithUser[]>();

        for (const character of allCharacters ?? []) {
            const battletag = character.user?.battletag || "Inconnu";
            if (!grouped.has(battletag)) {
                grouped.set(battletag, []);
            }
            grouped.get(battletag)?.push(character);
        }

        return Array.from(grouped.entries())
            .map(([battletag, characters]) => ({
                battletag,
                characters: [...characters].sort((a, b) => {
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

    if (isLoading) {
        return <Skeleton className="h-56 w-full" />;
    }

    return (
        <div className="rounded-xl border border-border/60 bg-card/40 p-4">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Joueur</TableHead>
                        <TableHead>Personnage</TableHead>
                        <TableHead>Classe</TableHead>
                        <TableHead>iLvl</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Dans le Roster</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {usersWithCharacters.map((entry) => {
                        const isExpanded = expandedUsers.has(entry.battletag);

                        return (
                            <Fragment key={`group-${entry.battletag}`}>
                                <TableRow
                                    key={`group-${entry.battletag}`}
                                    className="bg-muted/25"
                                >
                                    <TableCell colSpan={6}>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                toggleUser(entry.battletag)
                                            }
                                            className="flex w-full items-center justify-between gap-2 text-left"
                                        >
                                            <span className="flex items-center gap-2 font-semibold">
                                                {isExpanded ? (
                                                    <ChevronDown className="h-4 w-4" />
                                                ) : (
                                                    <ChevronRight className="h-4 w-4" />
                                                )}
                                                {entry.battletag}
                                            </span>
                                            <Badge variant="secondary">
                                                {entry.characters.length} persos
                                            </Badge>
                                        </button>
                                    </TableCell>
                                </TableRow>

                                {isExpanded &&
                                    entry.characters.map((character) => {
                                        const isPending =
                                            toggleRosterMutation.isPending &&
                                            toggleRosterMutation.variables
                                                ?.id === character.id;

                                        return (
                                            <TableRow key={character.id}>
                                                <TableCell className="text-muted-foreground">
                                                    {entry.battletag}
                                                </TableCell>
                                                <TableCell className="font-medium">
                                                    <span className="inline-flex items-center gap-2">
                                                        {character.isMain && (
                                                            <Badge variant="outline">
                                                                Main
                                                            </Badge>
                                                        )}
                                                        {character.name}
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    {character.class}
                                                </TableCell>
                                                <TableCell>
                                                    {Math.round(character.ilvl)}
                                                </TableCell>
                                                <TableCell>
                                                    {character.gameRole}
                                                </TableCell>
                                                <TableCell>
                                                    <Switch
                                                        checked={
                                                            character.inRoster
                                                        }
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
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                            </Fragment>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
    );
}

export function RosterPage() {
    const user = useAuthStore((s) => s.user);
    const canManage =
        user?.appRole === AppRole.ADMIN || user?.appRole === AppRole.OFFICER;

    return (
        <div className="min-h-full bg-background">
            <div className="container mx-auto p-6 space-y-6">
                <div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent mb-2">
                        Roster de Guilde
                    </h1>
                    <p className="text-muted-foreground">
                        Consultez la composition actuelle et gérez les
                        personnages du roster.
                    </p>
                </div>

                <Tabs defaultValue="current" className="w-full">
                    <TabsList>
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
