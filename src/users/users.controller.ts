import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  Req,
  UploadedFile,
  UseInterceptors,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../common/roles.decorator';
import { Role } from '../common/constants';
import {
  ApiTags,
  ApiBearerAuth,
  ApiResponse,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { ChangePasswordDto } from './dto/change-password.dto';
import { RegisterDto } from '../auth/dto/register.dto';
import * as bcrypt from 'bcrypt';
import { BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuid } from 'uuid';
import { ConfigService } from '@nestjs/config';

const getHostUrl = (req: any): string => {
  const protocol = req.protocol;
  const host = req.get('host');
  return `${protocol}://${host}`;
};

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
  ) {}
  @Get('profile')
  @Roles(Role.User, Role.Admin, Role.SuperAdmin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile data.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async getProfile(@Req() req: any) {
    return this.usersService.findOneById(req.user.id);
  }

  @Patch('profile')
  @Roles(Role.User, Role.Admin, Role.SuperAdmin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({
    status: 200,
    description: 'User profile successfully updated.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async updateProfile(@Req() req: any, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(req.user.id, updateUserDto, req.user);
  }

  @Patch('profile/change-password')
  @Roles(Role.User, Role.Admin, Role.SuperAdmin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change current user password' })
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: 200, description: 'Password successfully changed.' })
  @ApiResponse({
    status: 400,
    description:
      'Bad Request (e.g., current password mismatch, new passwords do not match).',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async changePassword(
    @Req() req: any,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    const user = await this.usersService.findOneByEmail(req.user.email);

    if (!user) {
      throw new BadRequestException('User not found');
    }

    const isPasswordValid = await bcrypt.compare(
      changePasswordDto.currentPassword,
      user.password,
    );

    if (!isPasswordValid) {
      throw new BadRequestException('Current password does not match');
    }

    await this.usersService.updatePassword(
      req.user.id,
      changePasswordDto.newPassword,
    );

    return { message: 'Password has been successfully changed.' };
  }

  @Post('profile/avatar')
  @Roles(Role.User, Role.Admin, Role.SuperAdmin)
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: diskStorage({
        destination: './uploads/avatars',
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
      limits: { fileSize: 1024 * 1024 * 5 },
    }),
  )
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload avatar for current user' })
  @ApiResponse({ status: 200, description: 'Avatar uploaded successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid file upload.' })
  async uploadAvatar(
    @Req() req: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const avatarPath = `/uploads/avatars/${file.filename}`;
    const backendUrl = this.configService.get<string>('BACKEND_URL') || `${req.protocol}://${req.get('host')}`;
    const fullAvatarUrl = `${backendUrl}${avatarPath}`;

    const updatedUser = await this.usersService.update(
      req.user.id,
      { avatar: fullAvatarUrl },
      req.user,
    );

    return {
      avatar: fullAvatarUrl,
      message: 'Avatar uploaded successfully',
      user: updatedUser,
    };
  }

  @Get()
  @Roles(Role.Admin, Role.SuperAdmin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all users (Admin/SuperAdmin only)' })
  @ApiResponse({ status: 200, description: 'List of users.' })
  @ApiResponse({ status: 403, description: 'Forbidden resource.' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'] })
  @ApiQuery({ name: 'roleFilter', required: false, enum: Role })
  @ApiQuery({ name: 'search', required: false, type: String })
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('sortBy') sortBy: string = 'createdAt',
    @Query('sortOrder') sortOrder: 'ASC' | 'DESC' = 'DESC',
    @Query('roleFilter') roleFilter?: Role,
    @Query('search') search?: string,
  ) {
    return this.usersService.findAll(
      page,
      limit,
      sortBy,
      sortOrder,
      roleFilter,
      search,
    );
  }

  @Get(':id')
  @Roles(Role.Admin, Role.SuperAdmin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user by ID (Admin/SuperAdmin only)' })
  @ApiResponse({ status: 200, description: 'User data.' })
  @ApiResponse({ status: 403, description: 'Forbidden resource.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async findOne(@Param('id') id: string) {
    return this.usersService.findOneById(+id);
  }

  @Post('admin')
  @Roles(Role.SuperAdmin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new Admin user (SuperAdmin only)' })
  @ApiResponse({ status: 201, description: 'Admin user successfully created.' })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 403, description: 'Forbidden resource.' })
  async createAdmin(@Body() registerDto: RegisterDto, @Req() req: any) {
    const admin = await this.usersService.createAdmin(registerDto, req.user.id);
    return admin;
  }

  @Patch(':id')
  @Roles(Role.Admin, Role.SuperAdmin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update user by ID (Admin/SuperAdmin only)' })
  @ApiResponse({ status: 200, description: 'User successfully updated.' })
  @ApiResponse({ status: 403, description: 'Forbidden resource.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Req() req: any,
  ) {
    return this.usersService.update(+id, updateUserDto, req.user);
  }

  @Delete(':id')
  @Roles(Role.SuperAdmin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete user by ID (SuperAdmin only)' })
  @ApiResponse({ status: 204, description: 'User successfully deleted.' })
  @ApiResponse({ status: 403, description: 'Forbidden resource.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @Req() req: any) {
    await this.usersService.remove(+id, req.user);
  }
}
