import {
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { RaiderioService } from './raiderio.service';

@ApiTags('raiderio')
@ApiBearerAuth()
@Controller('characters')
export class RaiderioController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly raiderioService: RaiderioService,
  ) {}

  @Get(':id/raiderio')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Retourne le profil Raider.IO d'un personnage" })
  @ApiResponse({ status: 200, description: 'Profil Raider.IO recupere.' })
  @ApiResponse({ status: 404, description: 'Personnage introuvable.' })
  async getCharacterRaiderIo(
    @Param('id') id: string,
    @Req() req: { user: { userId: string } },
  ) {
    const character = await this.prisma.character.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        name: true,
        realm: true,
      },
    });

    if (!character) {
      throw new NotFoundException(`Character #${id} not found`);
    }

    if (character.userId !== req.user.userId) {
      throw new ForbiddenException(
        "Vous ne pouvez acceder qu'a vos propres personnages",
      );
    }

    return this.raiderioService.getCharacterProfile(
      character.realm,
      character.name,
    );
  }
}
