import { IsNumber, Max, Min } from 'class-validator';

export class UpdateContributionRateDto {
  @IsNumber()
  @Min(0)
  @Max(100)
  rate: number;
}
