import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { RegisterDto } from '../auth/dto/register.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';
import { HistoryService } from '../history/history.service';
import { ActionType, EntityType } from '../history/history.entity';
import { Role } from '../common/constants';
import { EventsGateway } from '../events/events.gateway';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private readonly historyService: HistoryService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  async create(registerDto: RegisterDto): Promise<Omit<User, 'password'>> {
    const user = this.usersRepository.create(registerDto);
    await this.usersRepository.save(user);
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    sortBy: string = 'createdAt',
    sortOrder: 'ASC' | 'DESC' = 'DESC',
    roleFilter?: Role,
    search?: string,
  ): Promise<{ users: Omit<User, 'password'>[]; total: number }> {
    const query = this.usersRepository.createQueryBuilder('user');

    if (roleFilter) {
      query.andWhere('user.role = :roleFilter', { roleFilter });
    }

    if (search) {
      query.andWhere(
        '(LOWER(user.fullName) LIKE LOWER(:search) OR LOWER(user.email) LIKE LOWER(:search))',
        { search: `%${search}%` },
      );
    }

    const allowedSortFields = [
      'id',
      'email',
      'fullName',
      'role',
      'createdAt',
      'updatedAt',
    ];
    if (!allowedSortFields.includes(sortBy)) {
      sortBy = 'createdAt';
    }

    query.orderBy(`user.${sortBy}`, sortOrder);
    query.skip((page - 1) * limit);
    query.take(limit);

    const [users, total] = await query.getManyAndCount();

    const usersWithoutPasswords = users.map(({ password, ...rest }) => rest);

    return { users: usersWithoutPasswords, total };
  }

  async findOneById(id: number): Promise<Omit<User, 'password'>> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async findOneByEmail(email: string): Promise<User | null> {
    const user = await this.usersRepository.findOne({ where: { email } });
    return user ?? null;
  }

  async update(
    id: number,
    updateUserDto: UpdateUserDto,
    requestingUser: User,
  ): Promise<Omit<User, 'password'>> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found.`);
    }

    // Проверки прав
    if (requestingUser.role === Role.User && requestingUser.id !== id) {
      throw new ForbiddenException(
        'You do not have permission to update this user.',
      );
    }

    if (
      updateUserDto.role &&
      (updateUserDto.role === Role.SuperAdmin ||
        user.role === Role.SuperAdmin) &&
      requestingUser.role !== Role.SuperAdmin
    ) {
      throw new ForbiddenException(
        'Only SuperAdmins can manage SuperAdmin roles or assign SuperAdmin role.',
      );
    }

    if (
      user.role === Role.User &&
      updateUserDto.role === Role.Admin &&
      requestingUser.role === Role.Admin
    ) {
      throw new ForbiddenException(
        'Admins cannot promote users to Admin role via this endpoint. Use specific admin creation endpoint.',
      );
    }

    if (
      requestingUser.id === id &&
      updateUserDto.role &&
      updateUserDto.role !== requestingUser.role
    ) {
      if (
        requestingUser.role === Role.User &&
        updateUserDto.role !== Role.User
      ) {
        throw new ForbiddenException(
          'Users cannot change their own role to Admin or SuperAdmin.',
        );
      }
      if (
        requestingUser.role === Role.Admin &&
        updateUserDto.role === Role.SuperAdmin
      ) {
        throw new ForbiddenException(
          'Admins cannot change their own role to SuperAdmin.',
        );
      }
    }

    const updatedUser = await this.usersRepository.save({
      ...user,
      ...updateUserDto,
    });

    await this.historyService.createHistory({
      userId: requestingUser.id,
      action: ActionType.USER_UPDATED,
      entityType: EntityType.USER,
      entityId: updatedUser.id,
      details: `Updated user: ${updatedUser.fullName}`,
    });

    this.eventsGateway.emitToAll('userUpdated', updatedUser); // realtime update

    const { password, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
  }

  async updatePassword(
    userId: number,
    newPasswordPlain: string,
  ): Promise<void> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with ID "${userId}" not found`);
    }
    user.password = await bcrypt.hash(newPasswordPlain, 10);
    await this.usersRepository.save(user);
    await this.historyService.createHistory({
      userId: userId,
      action: ActionType.PASSWORD_CHANGED,
      entityType: EntityType.USER,
      entityId: userId,
      details: `User ${user.fullName} (ID: ${user.id}) changed their password.`,
    });
  }

  async remove(id: number, requestingUser: User): Promise<{ message: string }> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found.`);
    }

    if (
      requestingUser.role === Role.Admin &&
      (user.role === Role.Admin || user.role === Role.SuperAdmin)
    ) {
      throw new ForbiddenException(
        'Admins cannot delete other Admins or SuperAdmins.',
      );
    }

    if (
      requestingUser.role === Role.SuperAdmin &&
      user.role === Role.SuperAdmin &&
      requestingUser.id !== user.id
    ) {
      throw new ForbiddenException(
        'SuperAdmins cannot delete other SuperAdmins via this endpoint.',
      );
    }

    if (requestingUser.id === id) {
      throw new ForbiddenException('You cannot delete your own account.');
    }

    await this.usersRepository.remove(user);
    await this.historyService.createHistory({
      userId: requestingUser.id,
      action: ActionType.USER_DELETED,
      entityType: EntityType.USER,
      entityId: id,
      details: `Deleted user: ${user.fullName}`,
    });

    this.eventsGateway.emitToAll('userDeleted', { id });

    return { message: `User with ID ${id} has been deleted.` };
  }

  async setCurrentRefreshToken(
    refreshToken: string,
    userId: number,
  ): Promise<void> {
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await this.usersRepository.update(userId, {
      refreshToken: hashedRefreshToken,
    });
  }

  async getUserIfRefreshTokenMatches(
    refreshToken: string,
    userId: number,
  ): Promise<User | null> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });

    if (!user || !user.refreshToken) {
      return null;
    }

    const isRefreshTokenMatching = await bcrypt.compare(
      refreshToken,
      user.refreshToken,
    );

    if (isRefreshTokenMatching) {
      return user;
    }
    return null;
  }

  async removeRefreshToken(userId: number): Promise<void> {
    await this.usersRepository.update(userId, { refreshToken: undefined });
  }

  async createAdmin(
    registerDto: RegisterDto,
    creatorId: number,
  ): Promise<Omit<User, 'password'>> {
    const existingUser = await this.usersRepository.findOne({
      where: { email: registerDto.email },
    });
    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);
    const adminUser = this.usersRepository.create({
      ...registerDto,
      password: hashedPassword,
      role: Role.Admin,
    });
    await this.usersRepository.save(adminUser);

    await this.historyService.createHistory({
      userId: creatorId,
      action: ActionType.ADMIN_CREATED,
      entityType: EntityType.USER,
      entityId: adminUser.id,
      details: `SuperAdmin (ID: ${creatorId}) created new Admin: ${adminUser.fullName} (ID: ${adminUser.id}).`,
    });

    const { password, ...userWithoutPassword } = adminUser;
    return userWithoutPassword;
  }
}
