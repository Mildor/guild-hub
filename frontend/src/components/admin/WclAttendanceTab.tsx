import { useGetWclAttendance } from "@/api/queries";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { getClassColorStyle } from "@/lib/wowColors";
import { Info } from "lucide-react";

export function WclAttendanceTab() {
    const [showLogs, setShowLogs] = useState(false);
    const { data, isLoading } = useGetWclAttendance();

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="flex flex-col items-center justify-center py-10 text-center space-y-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-muted-foreground text-sm max-w-md">
                        Aspiration et analyse des données Warcraft Logs en
                        cours... Cela peut prendre quelques secondes.
                    </p>
                </div>
                <div className="space-y-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                </div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="text-muted-foreground">Aucune donnée trouvée.</div>
        );
    }

    const { totalRaidNights, attendance, analyzedReports } = data;

    return (
        <div className="space-y-6">
            <div className="bg-muted px-4 py-3 rounded-lg border border-border flex items-start gap-4">
                <Info className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div className="space-y-1">
                    <p className="text-sm text-foreground font-medium">
                        Guide du Moteur de Fiabilité des Raideurs
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                        Analyse basée sur les <strong>{totalRaidNights}</strong>{" "}
                        dernières soirées de raid (Lundi/Mercredi).
                        <br />
                        <strong>No-Show :</strong> Inscrit ACCEPTED mais absent
                        en log.
                        <strong> Fantôme :</strong> Aucune réponse au calendrier
                        et absent.
                        <strong> Surprise :</strong> Présent en log sans annonce
                        (DECLINED ou vide).
                    </p>
                </div>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Joueur</TableHead>
                            <TableHead>Classe</TableHead>
                            <TableHead className="text-center">
                                Soirées Présent
                            </TableHead>
                            <TableHead className="text-center">Taux</TableHead>
                            <TableHead className="text-center">
                                Fiabilité
                            </TableHead>
                            <TableHead className="text-center">
                                No-Shows 🐰
                            </TableHead>
                            <TableHead className="text-right">
                                Fantômes 👻
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {attendance.map((stat) => {
                            let badgeClasses = "bg-red-500/20 text-red-400";
                            if (stat.attendancePercentage >= 80) {
                                badgeClasses =
                                    "bg-emerald-500/20 text-emerald-400";
                            } else if (stat.attendancePercentage >= 50) {
                                badgeClasses = "bg-amber-500/20 text-amber-500";
                            }

                            const initial = stat.mainCharacterName
                                ? stat.mainCharacterName[0].toUpperCase()
                                : "?";

                            return (
                                <TableRow key={stat.userId}>
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-8 w-8">
                                                <AvatarImage
                                                    src={stat.avatarUrl || ""}
                                                    alt={stat.mainCharacterName}
                                                />
                                                <AvatarFallback>
                                                    {initial}
                                                </AvatarFallback>
                                            </Avatar>
                                            <span>
                                                {stat.mainCharacterName}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <span
                                            style={
                                                stat.class
                                                    ? getClassColorStyle(
                                                          stat.class,
                                                      )
                                                    : undefined
                                            }
                                        >
                                            {stat.class || "-"}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <span className="text-muted-foreground">
                                            {stat.nightsAttended} /{" "}
                                            {totalRaidNights}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <span
                                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${badgeClasses}`}
                                        >
                                            {stat.attendancePercentage}%
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <span
                                            className={`font-bold ${
                                                stat.reliabilityScore >= 90
                                                    ? "text-emerald-400"
                                                    : stat.reliabilityScore >=
                                                        70
                                                      ? "text-amber-500"
                                                      : "text-destructive"
                                            }`}
                                        >
                                            {stat.reliabilityScore}/100
                                        </span>
                                    </TableCell>
                                    <TableCell
                                        className={`text-center font-bold ${stat.noShows > 0 ? "text-destructive" : "text-muted-foreground opacity-50"}`}
                                    >
                                        {stat.noShows}
                                    </TableCell>
                                    <TableCell
                                        className={`text-right font-bold ${stat.ghosts > 0 ? "text-amber-500" : "text-muted-foreground opacity-50"}`}
                                    >
                                        {stat.ghosts}
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>

            {analyzedReports && analyzedReports.length > 0 && (
                <div className="mt-8 border rounded-lg border-border bg-card overflow-hidden">
                    <button
                        onClick={() => setShowLogs(!showLogs)}
                        className="w-full flex items-center justify-between p-4 bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                        <div className="flex items-center gap-2 font-medium">
                            <ExternalLink className="h-4 w-4 text-muted-foreground" />
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
                            {analyzedReports.map((report: any) => (
                                <a
                                    key={report.code}
                                    href={`https://www.warcraftlogs.com/reports/${report.code}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center justify-between p-3 rounded-md border border-border bg-card hover:border-primary/50 hover:bg-muted/50 transition-colors group"
                                >
                                    <div className="flex flex-col overflow-hidden">
                                        <span className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                                            {report.title || "Log sans titre"}
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
            )}
        </div>
    );
}
