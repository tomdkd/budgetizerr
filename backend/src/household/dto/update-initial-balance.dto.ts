import { IsNumber } from 'class-validator';
import { IsInt, Max, Min } from 'class-validator';

export class UpdateInitialBalanceDto {
  @IsNumber()
  amount: number;

  @IsInt()
  year: number;

  @IsInt()
  @Min(1)
  @Max(12)
  month: number;
}
