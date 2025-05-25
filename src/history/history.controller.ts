import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { HistoryService } from './history.service';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../common/roles.decorator';
import { Role } from '../common/constants';
import { ActionType, EntityType } from './history.entity';

@ApiTags('History')
@Controller('history')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.Admin, Role.SuperAdmin)
export class HistoryController {
  constructor(private readonly historyService: HistoryService) {}

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user/admin history (Admin/SuperAdmin only)' })
  @ApiResponse({ status: 200, description: 'List of history entries.' })
  @ApiResponse({ status: 403, description: 'Forbidden resource.' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    type: String,
    description: 'Field to sort by (e.g., timestamp, action)',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['ASC', 'DESC'],
    description: 'Sort order (ASC or DESC)',
  })
  @ApiQuery({
    name: 'userId',
    required: false,
    type: Number,
    description: 'Filter by user ID who performed the action',
  })
  @ApiQuery({
    name: 'actionType',
    required: false,
    enum: ActionType,
    description: 'Filter by action type',
  })
  @ApiQuery({
    name: 'entityType',
    required: false,
    enum: EntityType,
    description: 'Filter by entity type',
  })
  @ApiQuery({
    name: 'entityId',
    required: false,
    type: Number,
    description: 'Filter by entity ID',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search in details field',
  })
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('sortBy') sortBy: string = 'timestamp',
    @Query('sortOrder') sortOrder: 'DESC' | 'ASC' = 'DESC',
    @Query('userId') userId?: string,
    @Query('actionType') actionType?: ActionType,
    @Query('entityType') entityType?: EntityType,
    @Query('entityId') entityId?: string,
    @Query('search') search?: string,
  ) {
    return this.historyService.findAll(
      page,
      limit,
      sortBy,
      sortOrder,
      userId ? +userId : undefined,
      actionType,
      entityType,
      entityId ? +entityId : undefined,
      search,
    );
  }
}
