import { useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { WowIcon } from "@/components/ui/WowIcon";
import { classIcons } from "@/lib/wowData";
import { Crown, Medal, Trophy } from "lucide-react";

interface PodiumEntry {
    name: string;
    realm: string;
    class: string;
    avatarUrl?: string;
    rioScore: number;
}

interface PodiumProps {
    entries: PodiumEntry[];
}

export function Podium({ entries }: PodiumProps) {
    if (entries.length === 0) return null;

    // We want to display as [2nd, 1st, 3rd]
    const podiumOrder = useMemo(() => {
        const top3 = entries.slice(0, 3);
        if (top3.length === 1) return [top3[0]];
        if (top3.length === 2) return [top3[1], top3[0]];
        return [top3[1], top3[0], top3[2]];
    }, [entries]);

    const getRankInfo = (entry: PodiumEntry) => {
        const rank = entries.findIndex((e) => e.name === entry.name) + 1;
        switch (rank) {
            case 1:
                return {
                    color: "text-primary",
                    bgColor: "from-primary/40 via-primary/20 to-transparent",
                    borderColor: "border-primary/70",
                    glow: "glow-gold-lg",
                    height: "h-40 md:h-48",
                    stepBg: "bg-primary/10",
                    icon: (
                        <Crown className="h-8 w-8 text-primary fill-primary/40" />
                    ),
                    label: "1er",
                };
            case 2:
                return {
                    color: "text-slate-100",
                    bgColor:
                        "from-slate-400/40 via-slate-400/20 to-transparent",
                    borderColor: "border-slate-400/60",
                    glow: "glow-epic",
                    height: "h-28 md:h-32",
                    stepBg: "bg-slate-400/5",
                    icon: (
                        <Medal className="h-6 w-6 text-slate-300 fill-slate-300/30" />
                    ),
                    label: "2ème",
                };
            case 3:
                return {
                    color: "text-amber-400",
                    bgColor:
                        "from-amber-700/40 via-amber-700/20 to-transparent",
                    borderColor: "border-amber-700/60",
                    glow: "",
                    height: "h-20 md:h-24",
                    stepBg: "bg-amber-700/5",
                    icon: (
                        <Trophy className="h-6 w-6 text-amber-600 fill-amber-600/30" />
                    ),
                    label: "3ème",
                };
            default:
                return {
                    color: "text-muted-foreground",
                    bgColor: "bg-muted/30",
                    borderColor: "border-border",
                    glow: "",
                    height: "h-16",
                    stepBg: "bg-muted/10",
                    icon: null,
                    label: `${rank}e`,
                };
        }
    };

    return (
        <div className="flex justify-center items-end gap-2 md:gap-8 my-16 px-4">
            {podiumOrder.map((entry) => {
                const rankInfo = getRankInfo(entry);
                const isFirst = rankInfo.label === "1er";

                return (
                    <div
                        key={entry.name}
                        className={`flex flex-col items-center flex-1 max-w-[160px] transition-all duration-500 animate-fade-in-up ${isFirst ? "z-10 scale-105" : "z-0"}`}
                    >
                        {/* Avatar & Icon Section */}
                        <div className={`relative mb-6 group`}>
                            {isFirst && (
                                <div className="absolute -top-10 left-1/2 -translate-x-1/2 animate-float drop-shadow-[0_0_15px_rgba(212,164,74,0.6)]">
                                    {rankInfo.icon}
                                </div>
                            )}

                            <div
                                className={`relative rounded-full p-1.5 transition-transform duration-300 group-hover:scale-110 ${isFirst ? rankInfo.glow : ""}`}
                            >
                                {/* More opaque background for the avatar glow */}
                                <div
                                    className={`absolute inset-0 rounded-full bg-gradient-to-b ${rankInfo.bgColor} blur-xl opacity-90`}
                                />
                                <Avatar
                                    className={`h-20 w-20 md:h-24 md:w-24 border-3 ${rankInfo.borderColor} relative z-10 shadow-2xl bg-card`}
                                >
                                    <AvatarImage
                                        src={entry.avatarUrl || undefined}
                                        alt={entry.name}
                                    />
                                    <AvatarFallback className="bg-muted text-sm font-bold text-foreground">
                                        {entry.name.slice(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>

                                <div className="absolute -bottom-1 -right-1 z-20 shadow-lg scale-110">
                                    <WowIcon
                                        name={
                                            classIcons[entry.class] ||
                                            "inv_misc_questionmark"
                                        }
                                        size={28}
                                        className="rounded-full border-2 border-background"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Text Info */}
                        <div className="text-center mb-6 min-w-0 w-full px-1">
                            <h3
                                className={`font-black text-sm md:text-lg truncate drop-shadow-md ${isFirst ? "text-primary" : "text-slate-100"}`}
                            >
                                {entry.name}
                            </h3>
                            <p
                                className={`text-xs md:text-sm font-black tracking-wider ${isFirst ? "text-fuchsia-400" : "text-fuchsia-300"}`}
                            >
                                {Math.round(entry.rioScore)} RIO
                            </p>
                        </div>

                        {/* The Pedestal Step - SIGNIFICANTLY MORE OPAQUE */}
                        <div
                            className={`w-full ${rankInfo.height} relative rounded-t-2xl flex flex-col items-center pt-6 overflow-hidden border border-b-0 ${rankInfo.borderColor} bg-card shadow-[0_-10px_30px_-5px_rgba(0,0,0,0.6)]`}
                        >
                            {/* Gradient overlay to give some depth but less transparency */}
                            <div
                                className={`absolute inset-0 ${rankInfo.stepBg} opacity-50`}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />

                            <div
                                className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-transparent via-current to-transparent opacity-80 ${rankInfo.color}`}
                            />

                            <span
                                className={`text-xl md:text-3xl font-black tracking-tighter ${rankInfo.color} opacity-90 select-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]`}
                            >
                                {rankInfo.label}
                            </span>

                            {!isFirst && (
                                <div className="mt-4 opacity-70 scale-110 drop-shadow-md">
                                    {rankInfo.icon}
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
