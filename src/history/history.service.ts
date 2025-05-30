import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { History, ActionType, EntityType } from './history.entity';

@Injectable()
export class HistoryService {
  constructor(
    @InjectRepository(History)
    private historyRepository: Repository<History>,
  ) {}

  async createHistory(data: {
    userId: number;
    action: ActionType;
    entityType: EntityType;
    entityId?: number;
    details: string;
  }): Promise<History> {
    const historyEntry = this.historyRepository.create(data);
    return this.historyRepository.save(historyEntry);
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    sortBy: string = 'timestamp',
    sortOrder: 'DESC' | 'ASC' = 'DESC',
    userId?: number,
    actionType?: ActionType,
    entityType?: EntityType,
    entityId?: number,
    search?: string,
  ): Promise<{ history: History[]; total: number }> {
    const query = this.historyRepository.createQueryBuilder('history');
    query.leftJoinAndSelect('history.user', 'user');

    if (userId) {
      query.andWhere('history.userId = :userId', { userId });
    }
    if (actionType) {
      query.andWhere('history.action = :actionType', { actionType });
    }
    if (entityType) {
      query.andWhere('history.entityType = :entityType', { entityType });
    }
    if (entityId) {
      query.andWhere('history.entityId = :entityId', { entityId });
    }
    if (search) {
      query.andWhere('LOWER(history.details) LIKE LOWER(:search)', {
        search: `%${search}%`,
      });
    }
    const allowedSortFields = [
      'id',
      'timestamp',
      'action',
      'entityType',
      'entityId',
      'userId',
    ];
    if (!allowedSortFields.includes(sortBy)) {
      sortBy = 'timestamp';
    }

    query.orderBy(`history.${sortBy}`, sortOrder);
    query.skip((page - 1) * limit);
    query.take(limit);

    const [history, total] = await query.getManyAndCount();
    return { history, total };
  }
}
