import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompaniesService } from './companies.service';
import { CompaniesController } from './companies.controller';
import { Company } from './company.entity';
import { HistoryModule } from '../history/history.module'; // Для записи истории действий
import { EventsModule } from '../events/events.module';

@Module({
  imports: [TypeOrmModule.forFeature([Company]), HistoryModule, EventsModule],
  providers: [CompaniesService],
  controllers: [CompaniesController],
  exports: [CompaniesService],
})
export class CompaniesModule {}
