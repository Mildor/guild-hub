import {
  Controller,
  Get,
  Param,
  BadGatewayException,
  Logger,
} from '@nestjs/common';
import { BlizzardService } from './blizzard.service';

@Controller('items')
export class BlizzardController {
  private readonly logger = new Logger(BlizzardController.name);

  constructor(private readonly blizzardService: BlizzardService) {}

  @Get(':id/icon')
  async getItemIcon(@Param('id') itemId: string) {
    try {
      const iconUrl = await this.blizzardService.fetchItemIcon(
        parseInt(itemId),
      );
      return { iconUrl };
    } catch (error) {
      this.logger.error(`Failed to fetch icon for item ${itemId}:`, error);
      throw new BadGatewayException('Failed to fetch item icon');
    }
  }
}
