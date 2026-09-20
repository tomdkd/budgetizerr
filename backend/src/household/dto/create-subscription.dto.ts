import { IsInt, IsNumber, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

export class CreateSubscriptionDto {
  @IsString()
  @MinLength(1)
  title: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsInt()
  @Min(1)
  @Max(31)
  debitDay: number;

  @IsOptional()
  @IsString()
  description?: string;
}