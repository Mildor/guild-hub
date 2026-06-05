import { useMemo, useState } from "react";
import { useGetGuildUnlinkedMembers, useSyncUnlinkedMembers } from "@/api/queries";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Link2Off, RefreshCw, Loader2, CheckCircle2, CheckSquare, Square } from "lucide-react";
import { getClassColorClass } from "@/lib/wowColors";
import { GUILD_NAME, GUILD_REALM } from "../adminUtils";

export function UnlinkedMembersSection() {
    const [query, setQuery] = useState("");
    const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
    const [syncingKeys, setSyncingKeys] = useState<Set<string>>(new Set());
    const [syncResults, setSyncResults] = useState<{
        successCount: number;
        failedCount: number;
        errors: Array<{ name: string; realm: string; reason: string }>;
    } | null>(null);

    const { data: members = [], isLoading, refetch } = useGetGuildUnlinkedMembers(
        GUILD_REALM,
        GUILD_NAME,
    );

    const syncMutation = useSyncUnlinkedMembers();

    const filteredMembers = useMemo(() => {
        const search = query.trim().toLowerCase();
        if (!search) return members;

        return members.filter((member) => {
            return (
                member.name.toLowerCase().includes(search) ||
                member.realm.toLowerCase().includes(search) ||
                (member.class || "").toLowerCase().includes(search)
            );
        });
    }, [members, query]);

    const handleSelectAll = () => {
        const allKeys = filteredMembers.map(m => `${m.name}::${m.realm}`);
        const allSelected = allKeys.every(key => selectedKeys.has(key));

        const nextSelected = new Set(selectedKeys);
        if (allSelected) {
            allKeys.forEach(key => nextSelected.delete(key));
        } else {
            allKeys.forEach(key => nextSelected.add(key));
        }
        setSelectedKeys(nextSelected);
    };

    const handleSelectOne = (name: string, realm: string) => {
        const key = `${name}::${realm}`;
        const nextSelected = new Set(selectedKeys);
        if (nextSelected.has(key)) {
            nextSelected.delete(key);
        } else {
            nextSelected.add(key);
        }
        setSelectedKeys(nextSelected);
    };

    const handleSync = async (targets: Array<{ name: string; realm: string }>) => {
        const targetKeys = targets.map(t => `${t.name}::${t.realm}`);
        
        setSyncingKeys(prev => {
            const next = new Set(prev);
            targetKeys.forEach(k => next.add(k));
            return next;
        });

        try {
            const res = await syncMutation.mutateAsync(targets);
            
            setSyncResults({
                successCount: res.syncedCount || 0,
                failedCount: (res.errors || []).length,
                errors: res.errors || []
            });

            setSelectedKeys(prev => {
                const next = new Set(prev);
                targets.forEach(t => {
                    const key = `${t.name}::${t.realm}`;
                    const hasError = (res.errors || []).some((e: any) => e.name === t.name && e.realm === t.realm);
                    if (!hasError) {
                        next.delete(key);
                    }
                });
                return next;
            });
        } catch (error) {
            console.error("Sync error:", error);
        } finally {
            setSyncingKeys(prev => {
                const next = new Set(prev);
                targetKeys.forEach(k => next.delete(k));
                return next;
            });
            void refetch();
        }
    };

    const handleSyncSelected = () => {
        const targets = filteredMembers
            .filter(m => selectedKeys.has(`${m.name}::${m.realm}`))
            .map(m => ({ name: m.name, realm: m.realm }));
        if (targets.length > 0) {
            void handleSync(targets);
        }
    };

    const handleSyncOne = (name: string, realm: string) => {
        void handleSync([{ name, realm }]);
    };

    if (isLoading) {
        return (
            <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                ))}
            </div>
        );
    }

    const allFilteredSelected = filteredMembers.length > 0 && 
        filteredMembers.every(m => selectedKeys.has(`${m.name}::${m.realm}`));

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">
                        Sans compte lié
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Membres du roster Blizzard qui n'ont pas encore de
                        compte sur le Hub. Synchronisez-les pour charger leurs fiches.
                    </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    {selectedKeys.size > 0 && (
                        <Button
                            onClick={handleSyncSelected}
                            disabled={syncingKeys.size > 0}
                            className="bg-amber-600 hover:bg-amber-500 text-white font-semibold transition-all shadow-md gap-2"
                        >
                            {syncingKeys.size > 0 ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <RefreshCw className="h-4 w-4" />
                            )}
                            Synchroniser la sélection ({selectedKeys.size})
                        </Button>
                    )}
                    <div className="relative w-full md:w-72">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Rechercher personnage..."
                            className="pl-10"
                        />
                    </div>
                </div>
            </div>

            {syncResults && (
                <Alert className="border-amber-500/20 bg-amber-500/5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <AlertTitle className="text-emerald-500 font-bold">Synchronisation terminée</AlertTitle>
                    <AlertDescription className="text-muted-foreground text-sm mt-1">
                        <p>{syncResults.successCount} personnage(s) synchronisé(s) avec succès.</p>
                        {syncResults.failedCount > 0 && (
                            <div className="mt-2 space-y-1 text-red-400">
                                <p className="font-semibold">{syncResults.failedCount} erreur(s) :</p>
                                <ul className="list-disc pl-5 text-xs">
                                    {syncResults.errors.map((e, idx) => (
                                        <li key={idx}>
                                            <strong>{e.name}-{e.realm}</strong> : {e.reason}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </AlertDescription>
                </Alert>
            )}

            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6 flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-amber-500/80 uppercase tracking-wider">
                        Membres orphelins
                    </p>
                    <p className="text-3xl font-bold text-foreground">
                        {members.length}
                    </p>
                </div>
                <Link2Off className="h-10 w-10 text-amber-500/20" />
            </div>

            {filteredMembers.length === 0 ? (
                <Alert>
                    <AlertDescription>
                        Aucun membre non relié trouvé.
                    </AlertDescription>
                </Alert>
            ) : (
                <div className="rounded-2xl border border-border bg-card overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50">
                                <TableHead className="w-12 text-center">
                                    <button
                                        onClick={handleSelectAll}
                                        className="text-muted-foreground hover:text-foreground transition-colors"
                                        title="Tout sélectionner"
                                    >
                                        {allFilteredSelected ? (
                                            <CheckSquare className="h-5 w-5 text-amber-500" />
                                        ) : (
                                            <Square className="h-5 w-5" />
                                        )}
                                    </button>
                                </TableHead>
                                <TableHead className="font-semibold">
                                    Personnage
                                </TableHead>
                                <TableHead className="font-semibold">
                                    Royaume
                                </TableHead>
                                <TableHead className="font-semibold">
                                    Classe
                                </TableHead>
                                <TableHead className="font-semibold text-center">
                                    Rang Guilde
                                </TableHead>
                                <TableHead className="font-semibold text-right">
                                    Actions
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredMembers.map((member) => {
                                const key = `${member.name}::${member.realm}`;
                                const isSelected = selectedKeys.has(key);
                                const isSyncing = syncingKeys.has(key);

                                return (
                                    <TableRow
                                        key={key}
                                        className="hover:bg-accent/5 transition-colors"
                                    >
                                        <TableCell className="text-center">
                                            <button
                                                onClick={() => handleSelectOne(member.name, member.realm)}
                                                className="text-muted-foreground hover:text-foreground transition-colors"
                                            >
                                                {isSelected ? (
                                                    <CheckSquare className="h-5 w-5 text-amber-500" />
                                                ) : (
                                                    <Square className="h-5 w-5" />
                                                )}
                                            </button>
                                        </TableCell>
                                        <TableCell className="font-bold">
                                            {member.name}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-sm">
                                            {member.realm}
                                        </TableCell>
                                        <TableCell
                                            className={
                                                member.class
                                                    ? getClassColorClass(
                                                          member.class,
                                                      )
                                                    : ""
                                            }
                                        >
                                            {member.class || "Inconnu"}
                                        </TableCell>
                                        <TableCell className="text-center font-mono text-sm">
                                            {member.guildRank ?? "-"}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleSyncOne(member.name, member.realm)}
                                                disabled={isSyncing}
                                                className="hover:bg-amber-500/10 hover:text-amber-500 transition-colors gap-1.5"
                                            >
                                                {isSyncing ? (
                                                    <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
                                                ) : (
                                                    <RefreshCw className="h-4 w-4" />
                                                )}
                                                Synchroniser
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            )}
        </div>
    );
}
