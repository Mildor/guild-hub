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

      // Vérification temporelle : Lundi ou Mercredi soir (19h00 -> 23h59)
      const optionsStr = new Intl.DateTimeFormat('fr-FR', {
        timeZone: 'Europe/Paris',
        weekday: 'long',
        hour: 'numeric',
      }).format(reportDate); // ex: "mercredi 20 h"

      const isLundi = optionsStr.includes('lundi');
      const isMercredi = optionsStr.includes('mercredi');

      const hourStr = optionsStr.match(/\d+/);
      const hour = hourStr ? parseInt(hourStr[0], 10) : 0;

      // Raids entre 200h00 et 00h00 (heures de départ 20, 21, 22, 23)
      if (!(isLundi || isMercredi) || hour < 20 || hour >= 24) {
        this.logger.log(
          `Skipped WCL Log ${report.code} - Ne correspond pas à une soirée de raid Lundi/Mercredi 20h-00h (${optionsStr}).`,
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

      // Si le log survit au filtre horaire, difficulté et qu'il était issu du raid correct (id: 46),
      // il est considéré légitime pour affichage
      validReports.push(report);

      // Grouper les présences par Soirée Unique
      // Permet de contourner le problème des doublons (2 logs uploadés le même soir pour le même raid)
      const dateKey = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Europe/Paris',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(reportDate);

      if (!evenings[dateKey]) {
        evenings[dateKey] = new Set<string>();
      }

      for (const actor of actors) {
        evenings[dateKey].add(actor.name.toLowerCase());
      }
    }

    const playerAttendanceCount: Record<string, number> = {};
    const totalReports = Object.keys(evenings).length;

    // Compte +1 présence par joueur unique pour chaque Soirée détectée
    for (const attendedPlayersSet of Object.values(evenings)) {
      for (const playerName of attendedPlayersSet) {
        playerAttendanceCount[playerName] =
          (playerAttendanceCount[playerName] || 0) + 1;
      }
    }

    // 4. Récupère tous les personnages du Roster
    const rosterCharacters = await this.prisma.character.findMany({
      where: { inRoster: true },
    });

    // 5 & 6. Calcule le taux pour chacun
    const result = rosterCharacters.map((character) => {
      const nameKey = character.name.toLowerCase();
      const attendedReports = playerAttendanceCount[nameKey] || 0;
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
