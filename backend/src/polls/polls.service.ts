import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePollDto } from './dto/create-poll.dto';
import { UpdatePollDto } from './dto/update-poll.dto';

@Injectable()
export class PollsService {
  constructor(private readonly prisma: PrismaService) {}

  private formatOptions(options: string[]) {
    const cleaned = options.map((option) => option.trim()).filter((option) => option.length > 0);
    const deduplicated = Array.from(new Set(cleaned.map((option) => option.toLowerCase())));

    if (cleaned.length < 2) {
      throw new BadRequestException('Un sondage doit contenir au moins 2 options.');
    }

    if (cleaned.length > 5) {
      throw new BadRequestException('Un sondage ne peut pas contenir plus de 5 options.');
    }

    if (deduplicated.length !== cleaned.length) {
      throw new BadRequestException('Les options doivent etre uniques.');
    }

    return cleaned;
  }

  create(createdById: string, dto: CreatePollDto) {
    const options = this.formatOptions(dto.options);
    const db = this.prisma as any;

    return db.poll.create({
      data: {
        question: dto.question.trim(),
        description: dto.description?.trim() || null,
        createdById,
        options: {
          create: options.map((option) => ({ text: option })),
        },
      },
      include: {
        createdBy: {
          select: {
            id: true,
            battletag: true,
          },
        },
        options: {
          orderBy: { text: 'asc' },
        },
        votes: {
          include: {
            user: {
              select: {
                id: true,
                battletag: true,
              },
            },
            option: {
              select: {
                id: true,
                text: true,
              },
            },
          },
        },
      },
    });
  }

  findAll() {
    const db = this.prisma as any;

    return db.poll.findMany({
      include: {
        createdBy: {
          select: {
            id: true,
            battletag: true,
          },
        },
        options: {
          orderBy: { id: 'asc' },
        },
        votes: {
          include: {
            user: {
              select: {
                id: true,
                battletag: true,
              },
            },
            option: {
              select: {
                id: true,
                text: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async vote(pollId: string, userId: string, optionId: string) {
    const db = this.prisma as any;

    const poll = await db.poll.findUnique({
      where: { id: pollId },
      select: {
        id: true,
        isActive: true,
        options: {
          select: { id: true },
        },
      },
    });

    if (!poll) {
      throw new NotFoundException('Sondage introuvable.');
    }

    if (!poll.isActive) {
      throw new BadRequestException('Ce sondage est ferme.');
    }

    const optionExists = poll.options.some((option) => option.id === optionId);
    if (!optionExists) {
      throw new BadRequestException('Option invalide pour ce sondage.');
    }

    return db.pollVote.upsert({
      where: {
        pollId_userId: {
          pollId,
          userId,
        },
      },
      update: {
        optionId,
      },
      create: {
        pollId,
        optionId,
        userId,
      },
    });
  }

  async toggle(pollId: string) {
    const db = this.prisma as any;
    const poll = await db.poll.findUnique({ where: { id: pollId } });

    if (!poll) {
      throw new NotFoundException('Sondage introuvable.');
    }

    return db.poll.update({
      where: { id: pollId },
      data: {
        isActive: !poll.isActive,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            battletag: true,
          },
        },
        options: true,
        votes: {
          include: {
            user: {
              select: {
                id: true,
                battletag: true,
              },
            },
            option: {
              select: {
                id: true,
                text: true,
              },
            },
          },
        },
      },
    });
  }

  async update(pollId: string, dto: UpdatePollDto) {
    const db = this.prisma as any;

    const existing = await db.poll.findUnique({ where: { id: pollId } });
    if (!existing) {
      throw new NotFoundException('Sondage introuvable.');
    }

    const hasOptionsUpdate = Array.isArray(dto.options);
    const options = hasOptionsUpdate ? this.formatOptions(dto.options ?? []) : null;

    const result = await db.$transaction(async (tx: any) => {
      if (hasOptionsUpdate) {
        await tx.pollVote.deleteMany({ where: { pollId } });
        await tx.pollOption.deleteMany({ where: { pollId } });
      }

      return tx.poll.update({
        where: { id: pollId },
        data: {
          ...(dto.question !== undefined ? { question: dto.question.trim() } : {}),
          ...(dto.description !== undefined
            ? { description: dto.description?.trim() || null }
            : {}),
          ...(hasOptionsUpdate
            ? {
                options: {
                  create: (options ?? []).map((option) => ({ text: option })),
                },
              }
            : {}),
        },
        include: {
          createdBy: {
            select: {
              id: true,
              battletag: true,
            },
          },
          options: {
            orderBy: { id: 'asc' },
          },
          votes: {
            include: {
              user: {
                select: {
                  id: true,
                  battletag: true,
                },
              },
              option: {
                select: {
                  id: true,
                  text: true,
                },
              },
            },
          },
        },
      });
    });

    return result;
  }

  async remove(pollId: string) {
    const db = this.prisma as any;
    const existing = await db.poll.findUnique({ where: { id: pollId } });

    if (!existing) {
      throw new NotFoundException('Sondage introuvable.');
    }

    return db.poll.delete({ where: { id: pollId } });
  }
}
