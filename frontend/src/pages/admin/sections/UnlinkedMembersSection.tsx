import { useMemo, useState } from "react";
import { useGetGuildUnlinkedMembers } from "@/api/queries";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Link2Off } from "lucide-react";
import { getClassColorClass } from "@/lib/wowColors";
import { GUILD_NAME, GUILD_REALM } from "../adminUtils";

export function UnlinkedMembersSection() {
    const [query, setQuery] = useState("");
    const { data: members = [], isLoading } = useGetGuildUnlinkedMembers(
        GUILD_REALM,
        GUILD_NAME,
    );

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

    if (isLoading) {
        return (
            <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">
                        Sans compte lié
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Membres du roster Blizzard qui n'ont pas encore de
                        compte sur le Hub.
                    </p>
                </div>
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
                                <TableHead className="font-semibold">
                                    Personnage
                                </TableHead>
                                <TableHead className="font-semibold">
                                    Royaume
                                </TableHead>
                                <TableHead className="font-semibold">
                                    Classe
                                </TableHead>
                                <TableHead className="font-semibold text-right">
                                    Rang Guilde
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredMembers.map((member) => (
                                <TableRow
                                    key={`${member.name}-${member.realm}`}
                                    className="hover:bg-accent/5 transition-colors"
                                >
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
                                    <TableCell className="text-right font-mono text-sm">
                                        {member.guildRank ?? "-"}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}
        </div>
    );
}
