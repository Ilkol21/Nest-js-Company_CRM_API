import { IsOptional, IsString, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateCompanyDto {
  @ApiProperty({
    example: 'Innovative Solutions LLC',
    description: 'New name of the company',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Company name must be a string' })
  name?: string;

  @ApiProperty({
    example: 'IT Consulting',
    description: 'New type of service provided by the company',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Service must be a string' })
  service?: string;

  @ApiProperty({
    example: 150000.75,
    description: 'New company capital',
    required: false,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Capital must be a number' })
  @Min(0, { message: 'Capital cannot be negative' })
  capital?: number;

  @ApiProperty({
    example: 'https://example.com/new_logo.png',
    description: 'New URL or path to company logo',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Logo must be a string (URL or path)' })
  logo?: string;

  @ApiProperty({
    example: 34.052235,
    description: 'New latitude of company location',
    required: false,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Latitude must be a number' })
  locationLat?: number;

  @ApiProperty({
    example: -118.243683,
    description: 'New longitude of company location',
    required: false,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Longitude must be a number' })
  locationLon?: number;
}
