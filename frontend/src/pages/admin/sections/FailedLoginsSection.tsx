import { useMemo, useState } from "react";
import { useGetFailedLoginAttempts } from "@/api/queries";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { formatDateTime, formatFailedLoginReason } from "../adminUtils";

export function FailedLoginsSection() {
    const [page, setPage] = useState(1);
    const [query, setQuery] = useState("");
    const { data, isLoading } = useGetFailedLoginAttempts(page, 50);

    const rows = data?.items ?? [];
    const total = data?.total ?? 0;
    const totalPages = data?.totalPages ?? 1;

    const filteredRows = useMemo(() => {
        const search = query.trim().toLowerCase();
        if (!search) return rows;

        return rows.filter((attempt) => {
            const identifier = attempt.identifier?.toLowerCase() ?? "";
            const ipAddress = attempt.ipAddress?.toLowerCase() ?? "";
            const reason = attempt.reason.toLowerCase();
            const provider = attempt.provider.toLowerCase();

            return (
                identifier.includes(search) ||
                ipAddress.includes(search) ||
                reason.includes(search) ||
                provider.includes(search)
            );
        });
    }, [rows, query]);

    if (isLoading) {
        return (
            <div className="space-y-4">
                <div className="h-24 w-full animate-pulse rounded-2xl bg-muted" />
                {[...Array(5)].map((_, i) => (
                    <div
                        key={i}
                        className="h-12 w-full animate-pulse rounded-lg bg-muted"
                    />
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">
                        Tentatives échouées
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Surveillez les erreurs de connexion et la sécurité.
                    </p>
                </div>
                <div className="relative w-full md:w-72">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="IP, identifiant, raison..."
                        className="pl-10"
                    />
                </div>
            </div>

            <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6 flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-red-500/80 uppercase tracking-wider">
                        Total global
                    </p>
                    <p className="text-3xl font-bold text-foreground">
                        {total}
                    </p>
                </div>
                <AlertTriangleIcon className="h-10 w-10 text-red-500/20" />
            </div>

            {filteredRows.length === 0 ? (
                <Alert>
                    <AlertDescription>
                        Aucune tentative trouvée avec les filtres actuels.
                    </AlertDescription>
                </Alert>
            ) : (
                <div className="rounded-2xl border border-border bg-card overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50">
                                <TableHead className="font-semibold">
                                    Date
                                </TableHead>
                                <TableHead className="font-semibold">
                                    Provider
                                </TableHead>
                                <TableHead className="font-semibold">
                                    Identifiant
                                </TableHead>
                                <TableHead className="font-semibold">
                                    IP
                                </TableHead>
                                <TableHead className="font-semibold">
                                    Raison
                                </TableHead>
                                <TableHead className="font-semibold">
                                    Appareil
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredRows.map((attempt) => (
                                <TableRow
                                    key={attempt.id}
                                    className="hover:bg-accent/5 transition-colors"
                                >
                                    <TableCell className="whitespace-nowrap text-xs">
                                        {formatDateTime(attempt.createdAt)}
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant="secondary"
                                            className="text-[10px] uppercase"
                                        >
                                            {attempt.provider}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="font-medium">
                                        {attempt.identifier || "-"}
                                    </TableCell>
                                    <TableCell className="font-mono text-[11px]">
                                        {attempt.ipAddress || "-"}
                                    </TableCell>
                                    <TableCell className="text-sm text-red-400">
                                        {formatFailedLoginReason(
                                            attempt.reason,
                                        )}
                                    </TableCell>
                                    <TableCell className="max-w-[200px] truncate text-[10px] text-muted-foreground">
                                        {attempt.userAgent || "-"}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}

            <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                    Page {page} sur {totalPages}
                </p>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={page <= 1}
                        onClick={() => setPage(page - 1)}
                    >
                        <ChevronLeft className="mr-1 h-4 w-4" /> Précédent
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={page >= totalPages}
                        onClick={() => setPage(page + 1)}
                    >
                        Suivant <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}

function AlertTriangleIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
        </svg>
    );
}
