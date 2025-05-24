import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateCompanyDto {
  @ApiProperty({
    example: 'Tech Innovations Inc.',
    description: 'Name of the company',
  })
  @IsNotEmpty({ message: 'Company name is required' })
  @IsString({ message: 'Company name must be a string' })
  name: string;

  @ApiProperty({
    example: 'Software Development',
    description: 'Type of service provided by the company',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Service must be a string' })
  service?: string;

  @ApiProperty({
    example: 100000.5,
    description: 'Company capital',
    required: false,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Capital must be a number' })
  @Min(0, { message: 'Capital cannot be negative' })
  capital?: number;

  @ApiProperty({
    example: 'https://example.com/logo.png',
    description: 'URL or path to company logo',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Logo must be a string (URL or path)' })
  logo?: string;

  @ApiProperty({
    example: 34.052235,
    description: 'Latitude of company location',
    required: false,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Latitude must be a number' })
  locationLat?: number;

  @ApiProperty({
    example: -118.243683,
    description: 'Longitude of company location',
    required: false,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Longitude must be a number' })
  locationLon?: number;
}
