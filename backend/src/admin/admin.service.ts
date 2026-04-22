import { Injectable, Logger } from '@nestjs/common';
import { WclService } from '../wcl/wcl.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly wclService: WclService,
    private readonly prisma: PrismaService,
  ) {}

  async calculateGuildAttendance() {
    this.logger.log('Calculating Guild Attendance from WCL...');

    // 1. Appelle getRecentReports() pour obtenir les 10 derniers logs
    const allReports = await this.wclService.getRecentReports();

    if (!allReports || allReports.length === 0) {
      return { stats: [], analyzedReports: [] };
    }

    const validReports: any[] = [];
    const evenings: Record<string, Set<string>> = {};

    // 2. Boucle sur ces logs (séquentiellement)
    for (const report of allReports) {
      const reportDate = new Date(report.startTime);

      // Utilisation d'un format universel (en-US) et extraction de parties
      // pour éviter que des serveurs de production n'ayant pas la locale "fr-FR"
      // ne retournent des strings différentes et font échouer le "includes('lundi')".
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Europe/Paris',
        weekday: 'short',
        hour: 'numeric',
        hour12: false,
      });

      const parts = formatter.formatToParts(reportDate);
      const partsObj = Object.fromEntries(parts.map((p) => [p.type, p.value]));

      const weekday = partsObj.weekday; // 'Mon', 'Wed' ...
      const hour = parseInt(partsObj.hour, 10);

      // Raids entre 20h00 et 00h00 (heures de départ 20, 21, 22, 23)
      if (
        !(weekday === 'Mon' || weekday === 'Wed') ||
        hour < 20 ||
        hour >= 24
      ) {
        this.logger.log(
          `Skipped WCL Log ${report.code} - Ne correspond pas à Lundi/Mercredi 20h-00h (${weekday} ${hour}h).`,
        );
        continue;
      }

      // Récupération des détails (Fights + Acteurs)
      const reportDetails = await this.wclService.getReportDetails(report.code);
      if (!reportDetails) continue;

      // Vérification que le log contient au moins un fight en difficulté Normal (3) ou supérieure
      const fights = reportDetails.fights || [];
      const hasNMOrHigher = fights.some((f: any) => f.difficulty >= 3);

      if (!hasNMOrHigher) {
        this.logger.log(
          `Skipped WCL Log ${report.code} - Aucun combat de boss de difficulté NM (3) ou supérieure.`,
        );
        continue;
      }

      const actors = reportDetails.masterData?.actors || [];

      validReports.push(report);

      // Groupement mathématique strict (-12h)
      // Si on RAID à 21:00 UTC ou 01:00 UTC (le lendemain civil), en reculant de 12h,
      // les deux "logs" du même soir retombent exactement sur le VRAI jour d'origine !
      // Plus aucun bug de formatage string (YYYY-MM-DD différent) possible.
      const shiftedTime = report.startTime - 12 * 3600 * 1000;
      const dateKey = new Date(shiftedTime).toISOString().split('T')[0];

      if (!evenings[dateKey]) {
        evenings[dateKey] = new Set<string>();
      }

      for (const actor of actors) {
        evenings[dateKey].add(actor.name.toLowerCase());
      }
    }

    // ON fetch TOUS les personnages existants dans la base pour relier le nom WCL à un Compte Joueur (User)
    const allCharacters = await this.prisma.character.findMany({
      select: { name: true, userId: true },
    });

    const nameToUserId: Record<string, string> = {};
    for (const char of allCharacters) {
      nameToUserId[char.name.toLowerCase()] = char.userId;
    }

    const userAttendanceCount: Record<string, number> = {};
    const totalReports = Object.keys(evenings).length;

    // Compte +1 présence par JOUEUR (User) unique pour chaque Soirée détectée.
    // Cela fusionne parfaitement l'assiduité d'un joueur qui vient avec un reroll différent chaque soir.
    for (const attendedPlayersSet of Object.values(evenings)) {
      const userIdsForEvening = new Set<string>();

      for (const playerName of attendedPlayersSet) {
        const userId = nameToUserId[playerName.toLowerCase()];
        if (userId) {
          userIdsForEvening.add(userId);
        }
      }

      for (const userId of userIdsForEvening) {
        userAttendanceCount[userId] = (userAttendanceCount[userId] || 0) + 1;
      }
    }

    // 4. Récupère tous les personnages du Roster pour l'affichage
    const rosterCharacters = await this.prisma.character.findMany({
      where: { inRoster: true },
    });

    // 5 & 6. Calcule le taux pour chacun
    const result = rosterCharacters.map((character) => {
      // Un personnage bénéficie du taux de présence aggrégé de son Joueur complet !
      const attendedReports = userAttendanceCount[character.userId] || 0;
      let attendancePercentage = 0;

      if (totalReports > 0) {
        attendancePercentage = Math.round(
          (attendedReports / totalReports) * 100,
        );
      }

      return {
        characterId: character.id,
        name: character.name,
        class: character.class,
        gameRole: character.gameRole,
        avatarUrl: character.avatarUrl,
        totalReports,
        attendedReports,
        attendancePercentage,
      };
    });

    // Trie par ordre décroissant de taux de présence pour un affichage plus sympas
    result.sort((a, b) => b.attendancePercentage - a.attendancePercentage);

    return {
      stats: result,
      analyzedReports: validReports.map((r) => ({
        code: r.code,
        title: r.title,
        startTime: r.startTime,
      })),
    };
  }
}
