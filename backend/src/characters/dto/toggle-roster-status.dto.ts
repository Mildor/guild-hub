import { IsBoolean } from 'class-validator';

export class ToggleRosterStatusDto {
  @IsBoolean()
  inRoster: boolean;
}
