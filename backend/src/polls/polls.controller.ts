import {
  Body,
  Controller,
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
import { VotePollDto } from './dto/vote-poll.dto';

const ADMIN_OFFICER_ROLES = ['ADMIN', 'OFFICER'] as const;
const MEMBER_ROLES = ['ADMIN', 'OFFICER', 'MEMBER'] as const;

@ApiTags('polls')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('polls')
export class PollsController {
  constructor(private readonly pollsService: PollsService) {}

  private getAuthUserId(req: { user: { userId?: string; id?: string } }): string {
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
    return this.pollsService.vote(pollId, this.getAuthUserId(req), dto.optionId);
  }

  @Patch(':pollId/toggle')
  @Roles(...(ADMIN_OFFICER_ROLES as any))
  @ApiOperation({ summary: 'Ouvrir ou fermer un sondage' })
  @ApiResponse({ status: 200, description: 'Etat du sondage mis a jour.' })
  toggle(@Param('pollId') pollId: string) {
    return this.pollsService.toggle(pollId);
  }
}
