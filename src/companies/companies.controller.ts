import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { Roles } from '../common/roles.decorator';
import { Role } from '../common/constants';
import {
  ApiTags,
  ApiBearerAuth,
  ApiResponse,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuid } from 'uuid';
import { RolesGuard } from '../auth/roles.guard';

const getHostUrl = (req: any): string => {
  const protocol = req.protocol;
  const host = req.get('host');
  return `${protocol}://${host}`;
};

@ApiTags('Companies')
@Controller('companies')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Post()
  @ApiBearerAuth()
  @Roles(Role.User, Role.Admin, Role.SuperAdmin)
  @UseInterceptors(
    FileInterceptor('logo', {
      storage: diskStorage({
        destination: './uploads/company-logos',
        filename: (req, file, cb) => {
          const randomName = uuid();
          cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
          return cb(new Error('Only image files are allowed!'), false);
        }
        cb(null, true);
      },
      limits: {
        fileSize: 1024 * 1024 * 5,
      },
    }),
  )
  @ApiOperation({ summary: 'Create a new company with logo' })
  @ApiResponse({ status: 201, description: 'Company successfully created.' })
  async create(
    @UploadedFile() file: Express.Multer.File,
    @Body() createCompanyDto: CreateCompanyDto,
    @Req() req: any,
  ) {
    if (file) {
      createCompanyDto.logo = `/uploads/company-logos/${file.filename}`;
    }

    const company = await this.companiesService.create(
      createCompanyDto,
      req.user.id,
    );
    return {
      ...company,
      logo: company.logo ? getHostUrl(req) + company.logo : null,
    };
  }

  @Post(':id/logo')
  @ApiBearerAuth()
  @Roles(Role.User, Role.Admin, Role.SuperAdmin)
  @UseInterceptors(
    FileInterceptor('logo', {
      storage: diskStorage({
        destination: './uploads/company-logos',
        filename: (req, file, cb) => {
          const randomName = uuid();
          cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
          return cb(new Error('Only image files are allowed!'), false);
        }
        cb(null, true);
      },
      limits: {
        fileSize: 1024 * 1024 * 5,
      },
    }),
  )
  @ApiOperation({ summary: 'Upload a company logo' })
  @ApiResponse({ status: 200, description: 'Logo uploaded successfully' })
  async uploadLogo(
    @Param('id') id: string,
    @Req() req: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const logoPath = `/uploads/company-logos/${file.filename}`;
    const company = await this.companiesService.update(
      +id,
      { logo: logoPath },
      req.user.id,
      req.user.role,
    );
    return {
      logo: getHostUrl(req) + logoPath,
      message: 'Company logo uploaded successfully',
      company: {
        ...company,
        logo: company.logo ? getHostUrl(req) + company.logo : null,
      },
    };
  }

  @Get()
  @ApiBearerAuth()
  @Roles(Role.User, Role.Admin, Role.SuperAdmin)
  @ApiOperation({ summary: 'Get a list of companies' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'] })
  @ApiQuery({ name: 'nameSearch', required: false, type: String })
  @ApiQuery({ name: 'serviceSearch', required: false, type: String })
  @ApiQuery({
    name: 'createdAtStart',
    required: false,
    type: String,
    format: 'date-time',
  })
  @ApiQuery({
    name: 'createdAtEnd',
    required: false,
    type: String,
    format: 'date-time',
  })
  @ApiQuery({ name: 'capitalMin', required: false, type: Number })
  @ApiQuery({ name: 'capitalMax', required: false, type: Number })
  async findAll(
    @Req() req: any,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('sortBy') sortBy = 'createdAt',
    @Query('sortOrder') sortOrder: 'ASC' | 'DESC' = 'DESC',
    @Query('nameSearch') nameSearch?: string,
    @Query('serviceSearch') serviceSearch?: string,
    @Query('createdAtStart') createdAtStart?: string,
    @Query('createdAtEnd') createdAtEnd?: string,
    @Query('capitalMin') capitalMin?: string,
    @Query('capitalMax') capitalMax?: string,
  ) {
    const parsedCreatedAtStart = createdAtStart
      ? new Date(createdAtStart)
      : undefined;
    const parsedCreatedAtEnd = createdAtEnd
      ? new Date(createdAtEnd)
      : undefined;
    const parsedCapitalMin = capitalMin ? parseFloat(capitalMin) : undefined;
    const parsedCapitalMax = capitalMax ? parseFloat(capitalMax) : undefined;

    const result = await this.companiesService.findAll(
      page,
      limit,
      sortBy,
      sortOrder,
      nameSearch,
      serviceSearch,
      parsedCreatedAtStart,
      parsedCreatedAtEnd,
      parsedCapitalMin,
      parsedCapitalMax,
      req.user.id,
      req.user.role,
    );

    return {
      total: result.total,
      companies: result.companies.map((company) => ({
        ...company,
        logo: company.logo ? getHostUrl(req) + company.logo : null,
      })),
    };
  }

  @Get(':id')
  @ApiBearerAuth()
  @Roles(Role.User, Role.Admin, Role.SuperAdmin)
  @ApiOperation({ summary: 'Get company by ID' })
  async findOne(@Param('id') id: string, @Req() req: any) {
    const company = await this.companiesService.findOne(
      +id,
      req.user.id,
      req.user.role,
    );
    return {
      ...company,
      logo: company.logo ? getHostUrl(req) + company.logo : null,
    };
  }

  @Patch(':id')
  @ApiBearerAuth()
  @Roles(Role.User, Role.Admin, Role.SuperAdmin)
  @ApiOperation({ summary: 'Update company by ID' })
  async update(
    @Param('id') id: string,
    @Body() updateCompanyDto: UpdateCompanyDto,
    @Req() req: any,
  ) {
    const company = await this.companiesService.update(
      +id,
      updateCompanyDto,
      req.user.id,
      req.user.role,
    );
    return {
      ...company,
      logo: company.logo ? getHostUrl(req) + company.logo : null,
    };
  }

  @Delete(':id')
  @ApiBearerAuth()
  @Roles(Role.User, Role.Admin, Role.SuperAdmin)
  @ApiOperation({ summary: 'Delete company by ID' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @Req() req: any) {
    await this.companiesService.remove(+id, req.user.id, req.user.role);
  }

  @Get('dashboard/stats')
  @ApiBearerAuth()
  @Roles(Role.Admin, Role.SuperAdmin)
  @ApiOperation({ summary: 'Get dashboard statistics (Admin/SuperAdmin only)' })
  @ApiResponse({
    status: 200,
    description: 'Companies count and total capital.',
    schema: {
      example: {
        totalCompanies: 10,
        totalCapital: 123456.78,
      },
    },
  })
  async getDashboardStats() {
    const totalCompanies = await this.companiesService.getCompaniesCount();
    const totalCapital = await this.companiesService.getTotalCapital();
    return { totalCompanies, totalCapital };
  }
}
