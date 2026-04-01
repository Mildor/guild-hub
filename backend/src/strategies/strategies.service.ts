import { Injectable, NotFoundException } from '@nestjs/common';
import { join } from 'path';
import { mkdirSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import type { Express } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStrategyDto } from './dto/create-strategy.dto';
import { UpdateStrategyDto } from './dto/update-strategy.dto';

@Injectable()
export class StrategiesService {
  constructor(private prisma: PrismaService) {}

  private async processAndSaveImage(fileBuffer: Buffer): Promise<string> {
    // Créer le répertoire s'il n'existe pas
    const uploadsDir = join(process.cwd(), 'public', 'uploads');
    mkdirSync(uploadsDir, { recursive: true });

    // Générer un nom de fichier unique
    const filename = `${uuidv4()}.webp`;
    const filepath = join(uploadsDir, filename);

    // Traiter l'image avec sharp
    await sharp(fileBuffer)
      .resize(1600, 1600, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 80 })
      .toFile(filepath);

    // Retourner l'URL relative
    return `/uploads/${filename}`;
  }

  findAll() {
    return this.prisma.strategy.findMany({
      include: { createdBy: { select: { id: true, battletag: true } } },
      orderBy: [{ raidName: 'asc' }, { bossName: 'asc' }],
    });
  }

  async findOne(id: string) {
    const strategy = await this.prisma.strategy.findUnique({
      where: { id },
      include: { createdBy: { select: { id: true, battletag: true } } },
    });
    if (!strategy) throw new NotFoundException(`Strategy #${id} not found`);
    return strategy;
  }

  async create(
    userId: string,
    dto: CreateStrategyDto,
    file?: Express.Multer.File,
  ) {
    let imageUrl = dto.positioningImageUrl;

    // Si un fichier est uploadé, le traiter
    if (file) {
      imageUrl = await this.processAndSaveImage(file.buffer);
    }

    return this.prisma.strategy.create({
      data: {
        ...dto,
        positioningImageUrl: imageUrl,
        createdById: userId,
      },
      include: { createdBy: { select: { id: true, battletag: true } } },
    });
  }

  async update(id: string, dto: UpdateStrategyDto, file?: Express.Multer.File) {
    await this.findOne(id);

    let updateData = { ...dto };

    // Si un fichier est uploadé, le traiter
    if (file) {
      const imageUrl = await this.processAndSaveImage(file.buffer);
      updateData.positioningImageUrl = imageUrl;
    }

    return this.prisma.strategy.update({
      where: { id },
      data: updateData,
      include: { createdBy: { select: { id: true, battletag: true } } },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.strategy.delete({ where: { id } });
  }
}
