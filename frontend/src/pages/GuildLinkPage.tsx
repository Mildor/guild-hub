import { useMemo } from "react";
import {
    useGetGuildLeaderboard,
    useGetGuildProfile,
    type RaiderIoGuildLeaderboardEntry,
} from "@/api/queries";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { WowIcon } from "@/components/ui/WowIcon";

import { Podium } from "@/components/Podium";
import { classIcons } from "@/lib/wowData";

const GUILD_REALM = "archimonde";
const GUILD_NAME = "The Good Place";
const TWW_RAID_PRIORITY_SLUGS = ["liberation-of-undermine", "nerubar-palace"];

const RAID_NAMES: Record<string, string> = {
    "liberation-of-undermine": "Liberation of Undermine",
    "nerubar-palace": "Nerubar Palace",
};

const RAID_BACKGROUNDS: Record<string, string> = {
    "liberation-of-undermine":
        "https://wow.zamimg.com/images/wow/journal/ui-ej-bkgd-mechagoncity.jpg",
    "nerubar-palace":
        "https://wow.zamimg.com/images/wow/journal/ui-ej-bkgd-nyalotha.jpg",
};

const formatRaidName = (slug: string): string => {
    if (RAID_NAMES[slug]) {
        return RAID_NAMES[slug];
    }

    return slug
        .split("-")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
};

const getRioScoreClassName = (score: number): string => {
    if (score >= 3500) return "text-fuchsia-300";
    if (score >= 3000) return "text-orange-300";
    if (score >= 2500) return "text-violet-300";
    if (score >= 2000) return "text-sky-300";
    if (score >= 1500) return "text-emerald-300";
    return "text-slate-300";
};

const extractProgressPercent = (summary: string): number => {
    const match = summary.match(/(\d+)\s*\/\s*(\d+)/);
    if (!match) {
        return 0;
    }

    const current = Number(match[1]);
    const total = Number(match[2]);

    if (!Number.isFinite(current) || !Number.isFinite(total) || total <= 0) {
        return 0;
    }

    return Math.max(0, Math.min(100, Math.round((current / total) * 100)));
};

const getCharacterInitials = (name: string): string => {
    if (!name) return "?";
    return name
        .trim()
        .split(/\s+/)
        .map((part) => part.charAt(0))
        .join("")
        .slice(0, 2)
        .toUpperCase();
};

type RaidProgressView = {
    slug: string;
    raidName: string;
    summary: string;
    percent: number;
    backgroundUrl?: string;
};

const getRaidProgressView = (
    progression?: Record<string, { summary: string }>,
): RaidProgressView => {
    for (const slug of TWW_RAID_PRIORITY_SLUGS) {
        const summary = progression?.[slug]?.summary;
        if (summary) {
            return {
                slug,
                raidName: formatRaidName(slug),
                summary,
                percent: extractProgressPercent(summary),
                backgroundUrl: RAID_BACKGROUNDS[slug],
            };
        }
    }

    const fallbackEntry = Object.entries(progression ?? {}).find(
        ([, value]) => !!value?.summary,
    );

    if (fallbackEntry) {
        const [slug, value] = fallbackEntry;
        return {
            slug,
            raidName: formatRaidName(slug),
            summary: value.summary,
            percent: extractProgressPercent(value.summary),
            backgroundUrl: RAID_BACKGROUNDS[slug],
        };
    }

    return {
        slug: "unknown-raid",
        raidName: "Raid en cours",
        summary: "0/8 N",
        percent: 0,
    };
};

const sortByScoreDesc = (
    entries?: RaiderIoGuildLeaderboardEntry[],
): RaiderIoGuildLeaderboardEntry[] => {
    if (!entries) {
        return [];
    }

    return [...entries].sort((a, b) => b.rioScore - a.rioScore);
};

export function GuildLinkPage() {
    const {
        data: guildProfile,
        isLoading: isGuildProfileLoading,
        isError: isGuildProfileError,
    } = useGetGuildProfile(GUILD_REALM, GUILD_NAME);

    const {
        data: leaderboard,
        isLoading: isLeaderboardLoading,
        isError: isLeaderboardError,
    } = useGetGuildLeaderboard(GUILD_REALM, GUILD_NAME);

    const raidProgress = useMemo(
        () => getRaidProgressView(guildProfile?.raid_progression),
        [guildProfile?.raid_progression],
    );

    const sortedLeaderboard = useMemo(
        () => sortByScoreDesc(leaderboard),
        [leaderboard],
    );

    return (
        <div className="min-h-full bg-background">
            <div className="container mx-auto space-y-8 p-4 md:p-8">
                <section className="space-y-4">
                    <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-primary/70">
                            Guild Link
                        </p>
                        <h1 className="text-2xl font-bold text-foreground md:text-3xl">
                            Classement & Progress
                        </h1>
                    </div>

                    {isGuildProfileLoading ? (
                        <Skeleton className="h-52 w-full rounded-2xl" />
                    ) : isGuildProfileError ? (
                        <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-6 text-sm text-destructive">
                            Impossible de charger la progression de guilde
                            Raider.IO.
                        </div>
                    ) : (
                        <div
                            className="relative overflow-hidden rounded-2xl border border-slate-700/70 bg-slate-900 p-6 md:p-8"
                            style={{
                                backgroundImage: raidProgress.backgroundUrl
                                    ? `linear-gradient(120deg, rgba(2, 6, 23, 0.95), rgba(15, 23, 42, 0.8)), url(${raidProgress.backgroundUrl})`
                                    : "linear-gradient(120deg, rgba(2, 6, 23, 1), rgba(30, 41, 59, 1))",
                                backgroundSize: "cover",
                                backgroundPosition: "center",
                            }}
                        >
                            <div className="relative z-10">
                                <p className="mb-2 text-xs uppercase tracking-[0.16em] text-slate-300">
                                    Section Progress
                                </p>
                                <h2 className="text-2xl font-bold text-slate-50">
                                    Tier 1
                                </h2>
                                <p className="mt-2 text-sm text-slate-300">
                                    {guildProfile?.name || GUILD_NAME} -{" "}
                                    {raidProgress.summary}
                                </p>

                                <div className="mt-6 w-full bg-slate-800 h-4 rounded-full">
                                    <div
                                        className="bg-primary h-full rounded-full transition-all duration-500"
                                        style={{
                                            width: `${raidProgress.percent}%`,
                                        }}
                                    ></div>
                                </div>
                                <p className="mt-2 text-xs text-slate-300">
                                    {raidProgress.percent}% de boss vaincus
                                </p>
                            </div>
                        </div>
                    )}
                </section>

                <section className="space-y-4">
                    <h2 className="text-xl font-bold text-foreground md:text-2xl">
                        Section Leaderboard
                    </h2>

                    {isLeaderboardLoading ? (
                        <div className="space-y-2">
                            {[1, 2, 3, 4, 5].map((row) => (
                                <Skeleton
                                    key={row}
                                    className="h-12 w-full rounded-lg"
                                />
                            ))}
                        </div>
                    ) : isLeaderboardError ? (
                        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
                            Impossible de charger le classement Mythique+ de la
                            guilde.
                        </div>
                    ) : (
                        <>
                            <Podium entries={sortedLeaderboard.slice(0, 3)} />
                            <div className="rounded-xl border border-border/60 bg-card/30 p-2 md:p-4">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Rang</TableHead>
                                            <TableHead>Joueur</TableHead>
                                            <TableHead>Classe</TableHead>
                                            <TableHead>Score RIO</TableHead>
                                            <TableHead>Meilleure Cle</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {sortedLeaderboard.map(
                                            (entry, index) => (
                                                <TableRow
                                                    key={entry.characterId}
                                                >
                                                    <TableCell className="font-semibold text-slate-200">
                                                        #{index + 1}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <Avatar className="h-8 w-8 border border-border/60">
                                                                <AvatarImage
                                                                    src={
                                                                        entry.avatarUrl ||
                                                                        undefined
                                                                    }
                                                                    alt={
                                                                        entry.name
                                                                    }
                                                                />
                                                                <AvatarFallback className="bg-primary/20 text-xs font-semibold text-primary">
                                                                    {getCharacterInitials(
                                                                        entry.name,
                                                                    )}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <div className="min-w-0">
                                                                <p className="truncate text-sm font-semibold text-foreground">
                                                                    {entry.name}
                                                                </p>
                                                                <p className="truncate text-xs text-muted-foreground">
                                                                    {
                                                                        entry.realm
                                                                    }
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/70 px-2 py-1 text-xs text-muted-foreground">
                                                            <WowIcon
                                                                name={
                                                                    classIcons[
                                                                        entry
                                                                            .class
                                                                    ] ||
                                                                    "inv_misc_questionmark"
                                                                }
                                                                size={16}
                                                            />
                                                            {entry.class}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell>
                                                        <span
                                                            className={`text-sm font-bold ${getRioScoreClassName(entry.rioScore)}`}
                                                        >
                                                            {Math.round(
                                                                entry.rioScore,
                                                            )}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-sm font-semibold text-amber-300">
                                                        {entry.bestKeyLevel
                                                            ? `+${entry.bestKeyLevel}`
                                                            : "-"}
                                                    </TableCell>
                                                </TableRow>
                                            ),
                                        )}

                                        {sortedLeaderboard.length === 0 ? (
                                            <TableRow>
                                                <TableCell
                                                    colSpan={5}
                                                    className="text-center text-sm text-muted-foreground"
                                                >
                                                    Aucun joueur principal
                                                    trouve pour le classement.
                                                </TableCell>
                                            </TableRow>
                                        ) : null}
                                    </TableBody>
                                </Table>
                            </div>
                        </>
                    )}
                </section>
            </div>
        </div>
    );
}
