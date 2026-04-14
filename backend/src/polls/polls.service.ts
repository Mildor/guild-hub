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
        allowMultipleSelections: dto.allowMultipleSelections ?? false,
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

  private normalizeVoteOptions(optionIds: string[]) {
    const cleaned = optionIds.map((optionId) => optionId.trim()).filter((optionId) => optionId.length > 0);

    if (cleaned.length < 1) {
      throw new BadRequestException('Au moins une option doit etre selectionnee.');
    }

    if (new Set(cleaned).size !== cleaned.length) {
      throw new BadRequestException('Les options selectionnees doivent etre uniques.');
    }

    return cleaned;
  }

  private async voteWithOptions(
    db: any,
    pollId: string,
    userId: string,
    selectedOptionIds: string[],
  ) {
    const poll = await db.poll.findUnique({
      where: { id: pollId },
      select: {
        id: true,
        isActive: true,
        allowMultipleSelections: true,
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

    if (!poll.allowMultipleSelections && selectedOptionIds.length !== 1) {
      throw new BadRequestException('Ce sondage n autorise qu une seule reponse.');
    }

    const pollOptionIds = new Set(poll.options.map((option) => option.id));
    const invalidOptionIds = selectedOptionIds.filter((optionId) => !pollOptionIds.has(optionId));

    if (invalidOptionIds.length > 0) {
      throw new BadRequestException('Option invalide pour ce sondage.');
    }

    return db.$transaction(async (tx: any) => {
      if (poll.allowMultipleSelections) {
        await tx.pollVote.deleteMany({
          where: {
            pollId,
            userId,
            optionId: {
              notIn: selectedOptionIds,
            },
          },
        });

        const existingVotes = await tx.pollVote.findMany({
          where: {
            pollId,
            userId,
          },
          select: {
            optionId: true,
          },
        });

        const existingOptionIds = new Set(existingVotes.map((vote: { optionId: string }) => vote.optionId));
        const optionIdsToCreate = selectedOptionIds.filter((selectedOptionId) => !existingOptionIds.has(selectedOptionId));

        if (optionIdsToCreate.length > 0) {
          await tx.pollVote.createMany({
            data: optionIdsToCreate.map((optionId) => ({
              pollId,
              userId,
              optionId,
            })),
            skipDuplicates: true,
          });
        }
      } else {
        await tx.pollVote.deleteMany({ where: { pollId, userId } });
        await tx.pollVote.create({
          data: {
            pollId,
            userId,
            optionId: selectedOptionIds[0],
          },
        });
      }

      return tx.pollVote.findMany({
        where: {
          pollId,
          userId,
        },
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
      });
    });
  }

  async voteMultiple(pollId: string, userId: string, optionIds: string[]) {
    const db = this.prisma as any;
    const selectedOptionIds = this.normalizeVoteOptions(optionIds);

    return this.voteWithOptions(db, pollId, userId, selectedOptionIds);
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
    const shouldResetVotes =
      hasOptionsUpdate ||
      (dto.allowMultipleSelections !== undefined && dto.allowMultipleSelections === false && existing.allowMultipleSelections);

    const result = await db.$transaction(async (tx: any) => {
      if (shouldResetVotes) {
        await tx.pollVote.deleteMany({ where: { pollId } });
      }

      if (hasOptionsUpdate) {
        await tx.pollOption.deleteMany({ where: { pollId } });
      }

      return tx.poll.update({
        where: { id: pollId },
        data: {
          ...(dto.question !== undefined ? { question: dto.question.trim() } : {}),
          ...(dto.description !== undefined
            ? { description: dto.description?.trim() || null }
            : {}),
          ...(dto.allowMultipleSelections !== undefined
            ? { allowMultipleSelections: dto.allowMultipleSelections }
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
