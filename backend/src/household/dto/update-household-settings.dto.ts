import { IsInt, Max, Min } from 'class-validator';

export class UpdateHouseholdSettingsDto {
  @IsInt()
  @Min(1)
  @Max(31)
  reminderDay: number;
}