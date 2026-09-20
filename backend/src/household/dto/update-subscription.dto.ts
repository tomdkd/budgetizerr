import { IsInt, IsNumber, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

export class UpdateSubscriptionDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  debitDay?: number;

  @IsOptional()
  @IsString()
  description?: string;
}
