import { useState } from "react";
import {
    ShieldAlert,
    Activity,
    ChevronDown,
    ChevronUp,
    ExternalLink,
} from "lucide-react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useGetWclAttendanceStats } from "@/api/queries";

export function WclAttendanceSection() {
    const [showLogs, setShowLogs] = useState(false);
    const { data, isLoading, error } = useGetWclAttendanceStats();

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center p-12 space-y-4">
                <Activity className="h-12 w-12 text-primary animate-pulse" />
                <h3 className="text-xl font-semibold text-muted-foreground animate-pulse">
                    Analyse WCL en cours...
                </h3>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex p-4 text-red-500 items-center justify-center">
                <ShieldAlert className="mr-2" />
                Erreur lors du chargement des statistiques WCL.
            </div>
        );
    }

    if (!data?.stats || data.stats.length === 0) {
        return (
            <div className="flex p-4 text-muted-foreground items-center justify-center">
                Aucune donnée Warcraft Logs récente n'est disponible.
            </div>
        );
    }

    const { stats, analyzedReports } = data;

    const getAttendanceColor = (percentage: number) => {
        if (percentage >= 80)
            return "bg-green-500/10 text-green-500 border-green-500/20";
        if (percentage >= 50)
            return "bg-amber-500/10 text-amber-500 border-amber-500/20";
        return "bg-red-500/10 text-red-500 border-red-500/20";
    };

    const getProgressColor = (percentage: number) => {
        if (percentage >= 80) return "bg-green-500";
        if (percentage >= 50) return "bg-amber-500";
        return "bg-red-500";
    };

    return (
        <div className="space-y-6">
            <Card className="border-border">
                <CardHeader>
                    <CardTitle className="text-2xl font-bold flex items-center gap-2">
                        <Activity className="h-6 w-6 text-primary" />
                        Warcraft Logs - Taux de Présence
                    </CardTitle>
                    <CardDescription>
                        Statistiques de présence basées sur les 10 derniers logs
                        WCL de la guilde.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border overflow-hidden border-border bg-card">
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow>
                                    <TableHead>Personnage</TableHead>
                                    <TableHead>Rôle</TableHead>
                                    <TableHead className="text-center">
                                        Logs Analysés
                                    </TableHead>
                                    <TableHead className="text-center">
                                        Présences
                                    </TableHead>
                                    <TableHead className="w-[300px]">
                                        Taux
                                    </TableHead>
                                    <TableHead className="text-right">
                                        Statut
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {stats.map((stat) => (
                                    <TableRow
                                        key={stat.characterId}
                                        className="hover:bg-muted/50 transition-colors"
                                    >
                                        <TableCell className="font-medium whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                {stat.avatarUrl ? (
                                                    <img
                                                        src={stat.avatarUrl}
                                                        className="w-10 h-10 rounded-full border border-border bg-black/50"
                                                        alt={stat.name}
                                                    />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center font-bold text-xs uppercase">
                                                        {stat.name.slice(0, 2)}
                                                    </div>
                                                )}
                                                <div className="flex flex-col">
                                                    <span>{stat.name}</span>
                                                    <span className="text-xs text-muted-foreground">
                                                        {stat.class}
                                                    </span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>{stat.gameRole}</TableCell>
                                        <TableCell className="text-center">
                                            {stat.totalReports}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {stat.attendedReports}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-2">
                                                <div className="flex justify-between items-center text-xs">
                                                    <span className="font-semibold">
                                                        {
                                                            stat.attendancePercentage
                                                        }
                                                        %
                                                    </span>
                                                </div>
                                                <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                                                    <div
                                                        className={`h-full transition-all duration-300 ease-in-out ${getProgressColor(stat.attendancePercentage)}`}
                                                        style={{
                                                            width: `${stat.attendancePercentage}%`,
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Badge
                                                variant="outline"
                                                className={getAttendanceColor(
                                                    stat.attendancePercentage,
                                                )}
                                            >
                                                {stat.attendancePercentage >= 80
                                                    ? "Excellent"
                                                    : stat.attendancePercentage >=
                                                        50
                                                      ? "Moyen"
                                                      : "Critique"}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    <div className="mt-8 border rounded-lg border-border bg-card overflow-hidden">
                        <button
                            onClick={() => setShowLogs(!showLogs)}
                            className="w-full flex items-center justify-between p-4 bg-muted/30 hover:bg-muted/50 transition-colors"
                        >
                            <div className="flex items-center gap-2 font-medium">
                                <Activity className="h-4 w-4 text-muted-foreground" />
                                Voir les {analyzedReports.length} logs analysés
                            </div>
                            {showLogs ? (
                                <ChevronUp className="h-5 w-5 text-muted-foreground" />
                            ) : (
                                <ChevronDown className="h-5 w-5 text-muted-foreground" />
                            )}
                        </button>

                        {showLogs && (
                            <div className="p-4 bg-background grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                {analyzedReports.map((report) => (
                                    <a
                                        key={report.code}
                                        href={`https://www.warcraftlogs.com/reports/${report.code}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex items-center justify-between p-3 rounded-md border border-border bg-card hover:border-primary/50 hover:bg-muted/50 transition-colors group"
                                    >
                                        <div className="flex flex-col overflow-hidden">
                                            <span className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                                                {report.title ||
                                                    "Log sans titre"}
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                {new Date(
                                                    report.startTime,
                                                ).toLocaleDateString("fr-FR", {
                                                    day: "numeric",
                                                    month: "short",
                                                    year: "numeric",
                                                })}
                                            </span>
                                        </div>
                                        <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors ml-2 flex-shrink-0" />
                                    </a>
                                ))}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
