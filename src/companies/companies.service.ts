import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Company } from './company.entity';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';

import { HistoryService } from '../history/history.service';
import { ActionType, EntityType } from '../history/history.entity';
import { Role } from '../common/constants';

import { EventsGateway } from '../events/events.gateway';

@Injectable()
export class CompaniesService {
  constructor(
    @InjectRepository(Company)
    private companiesRepository: Repository<Company>,
    private historyService: HistoryService,
    private eventsGateway: EventsGateway,
  ) {}

  async create(
    createCompanyDto: CreateCompanyDto,
    ownerId: number,
  ): Promise<Company> {
    const company = this.companiesRepository.create({
      ...createCompanyDto,
      ownerId,
    });

    await this.companiesRepository.save(company);

    await this.historyService.createHistory({
      userId: ownerId,
      action: ActionType.COMPANY_CREATED,
      entityType: EntityType.COMPANY,
      entityId: company.id,
      details: `User (ID: ${ownerId}) created company: ${company.name} (ID: ${company.id}).`,
    });

    this.eventsGateway.emitToAll('companyCreated', company);

    return company;
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    sortBy: string = 'createdAt',
    sortOrder: 'ASC' | 'DESC' = 'DESC',
    nameSearch?: string,
    serviceSearch?: string,
    createdAtStart?: Date,
    createdAtEnd?: Date,
    capitalMin?: number,
    capitalMax?: number,
    userId?: number,
    userRole?: Role,
  ): Promise<{ companies: Company[]; total: number }> {
    const query = this.companiesRepository.createQueryBuilder('company');

    if (userId && userRole === Role.User) {
      query.andWhere('company.ownerId = :userId', { userId });
    } else if (
      userId &&
      (userRole === Role.Admin || userRole === Role.SuperAdmin)
    ) {
      // Admin and Superadmin can see all companies
    }

    if (nameSearch) {
      query.andWhere('LOWER(company.name) LIKE LOWER(:nameSearch)', {
        nameSearch: `%${nameSearch}%`,
      });
    }
    if (serviceSearch) {
      query.andWhere('LOWER(company.service) LIKE LOWER(:serviceSearch)', {
        serviceSearch: `%${serviceSearch}%`,
      });
    }

    if (createdAtStart && createdAtEnd) {
      query.andWhere(
        'company.createdAt BETWEEN :createdAtStart AND :createdAtEnd',
        { createdAtStart, createdAtEnd },
      );
    } else if (createdAtStart) {
      query.andWhere('company.createdAt >= :createdAtStart', {
        createdAtStart,
      });
    } else if (createdAtEnd) {
      query.andWhere('company.createdAt <= :createdAtEnd', { createdAtEnd });
    }

    if (capitalMin !== undefined && capitalMax !== undefined) {
      query.andWhere('company.capital BETWEEN :capitalMin AND :capitalMax', {
        capitalMin,
        capitalMax,
      });
    } else if (capitalMin !== undefined) {
      query.andWhere('company.capital >= :capitalMin', { capitalMin });
    } else if (capitalMax !== undefined) {
      query.andWhere('company.capital <= :capitalMax', { capitalMax });
    }

    const allowedSortFields = [
      'id',
      'name',
      'service',
      'capital',
      'createdAt',
      'updatedAt',
    ];
    if (!allowedSortFields.includes(sortBy)) {
      sortBy = 'createdAt';
    }

    query.orderBy(`company.${sortBy}`, sortOrder);
    query.skip((page - 1) * limit);
    query.take(limit);

    const [companies, total] = await query.getManyAndCount();
    return { companies, total };
  }

  async findOne(
    id: number,
    userId?: number,
    userRole?: Role,
  ): Promise<Company> {
    const company = await this.companiesRepository.findOne({ where: { id } });
    if (!company) {
      throw new NotFoundException(`Company with ID "${id}" not found`);
    }

    if (userRole === Role.User && company.ownerId !== userId) {
      throw new ForbiddenException('You do not have access to this company');
    }

    return company;
  }

  async update(
    id: number,
    updateCompanyDto: UpdateCompanyDto,
    userId: number,
    userRole: Role,
  ): Promise<Company> {
    const company = await this.companiesRepository.findOne({ where: { id } });

    if (!company) {
      throw new NotFoundException(`Company with ID "${id}" not found`);
    }

    if (userRole === Role.User && company.ownerId !== userId) {
      throw new ForbiddenException(
        'You are not authorized to update this company',
      );
    }

    const updatedCompany = this.companiesRepository.merge(
      company,
      updateCompanyDto,
    );
    await this.companiesRepository.save(updatedCompany);

    await this.historyService.createHistory({
      userId: userId,
      action: ActionType.COMPANY_EDITED,
      entityType: EntityType.COMPANY,
      entityId: company.id,
      details: `${userRole} (ID: ${userId}) updated company: ${company.name} (ID: ${company.id}).`,
    });

    // Эмитим событие обновления компании
    this.eventsGateway.emitToAll('companyUpdated', updatedCompany);

    return updatedCompany;
  }

  async remove(id: number, userId: number, userRole: Role): Promise<void> {
    const company = await this.companiesRepository.findOne({ where: { id } });

    if (!company) {
      throw new NotFoundException(`Company with ID "${id}" not found`);
    }

    if (userRole === Role.User && company.ownerId !== userId) {
      throw new ForbiddenException(
        'You are not authorized to delete this company',
      );
    }

    await this.companiesRepository.remove(company);

    await this.historyService.createHistory({
      userId: userId,
      action: ActionType.COMPANY_DELETED,
      entityType: EntityType.COMPANY,
      entityId: id,
      details: `${userRole} (ID: ${userId}) deleted company: ${company.name} (ID: ${company.id}).`,
    });

    this.eventsGateway.emitToAll('companyDeleted', { id });
  }

  async getCompaniesCount(): Promise<number> {
    return this.companiesRepository.count();
  }

  async getTotalCapital(): Promise<number> {
    const result = await this.companiesRepository
      .createQueryBuilder('company')
      .select('SUM(company.capital)', 'totalCapital')
      .getRawOne();
    return parseFloat(result.totalCapital) || 0;
  }
}
