import { IsBoolean } from 'class-validator';

export class ToggleBenchStatusDto {
  @IsBoolean()
  inBench: boolean;
}
