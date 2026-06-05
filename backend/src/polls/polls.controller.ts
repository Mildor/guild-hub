import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PollsService } from './polls.service';
import { CreatePollDto } from './dto/create-poll.dto';
import { UpdatePollDto } from './dto/update-poll.dto';
import { VotePollDto } from './dto/vote-poll.dto';

const ADMIN_OFFICER_ROLES = ['ADMIN', 'OFFICER'] as const;
const MEMBER_ROLES = ['ADMIN', 'OFFICER', 'MEMBER'] as const;

@ApiTags('polls')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('polls')
export class PollsController {
  constructor(private readonly pollsService: PollsService) {}

  private getAuthUserId(req: {
    user: { userId?: string; id?: string };
  }): string {
    const authUserId = req.user?.userId ?? req.user?.id;
    if (!authUserId) {
      throw new UnauthorizedException('Utilisateur non authentifie');
    }
    return authUserId;
  }

  @Post()
  @Roles(...(ADMIN_OFFICER_ROLES as any))
  @ApiOperation({ summary: 'Creer un sondage' })
  @ApiResponse({ status: 201, description: 'Sondage cree avec succes.' })
  create(
    @Req() req: { user: { userId?: string; id?: string } },
    @Body() dto: CreatePollDto,
  ) {
    return this.pollsService.create(this.getAuthUserId(req), dto);
  }

  @Get()
  @Roles(...(MEMBER_ROLES as any))
  @ApiOperation({ summary: 'Recuperer tous les sondages' })
  @ApiResponse({ status: 200, description: 'Liste des sondages.' })
  findAll() {
    return this.pollsService.findAll();
  }

  @Post(':pollId/vote')
  @Roles(...(MEMBER_ROLES as any))
  @ApiOperation({ summary: 'Voter sur un sondage' })
  @ApiResponse({ status: 201, description: 'Vote enregistre.' })
  vote(
    @Param('pollId') pollId: string,
    @Req() req: { user: { userId?: string; id?: string } },
    @Body() dto: VotePollDto,
  ) {
    return this.pollsService.voteMultiple(
      pollId,
      this.getAuthUserId(req),
      dto.optionIds,
    );
  }

  @Patch(':pollId/toggle')
  @Roles(...(ADMIN_OFFICER_ROLES as any))
  @ApiOperation({ summary: 'Ouvrir ou fermer un sondage' })
  @ApiResponse({ status: 200, description: 'Etat du sondage mis a jour.' })
  toggle(@Param('pollId') pollId: string) {
    return this.pollsService.toggle(pollId);
  }

  @Patch(':pollId')
  @Roles(...(ADMIN_OFFICER_ROLES as any))
  @ApiOperation({ summary: 'Mettre a jour un sondage' })
  @ApiResponse({ status: 200, description: 'Sondage mis a jour.' })
  update(@Param('pollId') pollId: string, @Body() dto: UpdatePollDto) {
    return this.pollsService.update(pollId, dto);
  }

  @Delete(':pollId')
  @Roles(...(ADMIN_OFFICER_ROLES as any))
  @ApiOperation({ summary: 'Supprimer un sondage' })
  @ApiResponse({ status: 200, description: 'Sondage supprime.' })
  remove(@Param('pollId') pollId: string) {
    return this.pollsService.remove(pollId);
  }
}
