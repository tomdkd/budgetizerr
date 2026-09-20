import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class MemberContributionDto {
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @IsNumber()
  @Min(1)
  @Max(100)
  contributionPercentage: number;
}

export class CreateHouseholdDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsBoolean()
  isShared: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MemberContributionDto)
  members?: MemberContributionDto[];
}