import {
  Controller,
  Get,
  Param,
  BadGatewayException,
  Logger,
  Post,
  UseGuards,
} from '@nestjs/common';
import { BlizzardService } from './blizzard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AppRole } from '@prisma/client';

@Controller()
export class BlizzardController {
  private readonly logger = new Logger(BlizzardController.name);

  constructor(private readonly blizzardService: BlizzardService) {}

  @Get('items/:id/icon')
  async getItemIcon(@Param('id') itemId: string) {
    try {
      const iconUrl = await this.blizzardService.fetchItemIcon(
        parseInt(itemId, 10),
      );
      return { iconUrl };
    } catch (error) {
      this.logger.error(`Failed to fetch icon for item ${itemId}:`, error);
      throw new BadGatewayException('Failed to fetch item icon');
    }
  }

  @Get('blizzard/token')
  async getWowToken() {
    return this.blizzardService.getWowTokenHistory();
  }

  @Post('blizzard/token/track')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AppRole.ADMIN, AppRole.OFFICER)
  async trackWowTokenNow(): Promise<{ price: number; createdAt: Date }> {
    return this.blizzardService.trackTokenPriceNow();
  }
}
