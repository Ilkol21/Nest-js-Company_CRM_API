import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

export enum ActionType {
  USER_CREATED = 'USER_CREATED', // Только если админ создает пользователя/админа
  USER_UPDATED = 'USER_UPDATED',
  USER_DELETED = 'USER_DELETED',
  PROFILE_EDITED = 'PROFILE_EDITED',
  PASSWORD_CHANGED = 'PASSWORD_CHANGED',

  COMPANY_CREATED = 'COMPANY_CREATED',
  COMPANY_EDITED = 'COMPANY_EDITED',
  COMPANY_DELETED = 'COMPANY_DELETED',

  ADMIN_CREATED = 'ADMIN_CREATED',
  ADMIN_DELETED = 'ADMIN_DELETED',
  ADMIN_UPDATED = 'ADMIN_UPDATED', // Если админ меняет данные другого админа/пользователя
}

export enum EntityType {
  USER = 'USER',
  COMPANY = 'COMPANY',
}

@Entity()
export class History {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' }) // Пользователь, совершивший действие
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ nullable: true })
  userId: number;

  @Column({ type: 'enum', enum: ActionType })
  action: ActionType;

  @Column({ type: 'enum', enum: EntityType })
  entityType: EntityType; // Тип сущности, на которую повлияло действие

  @Column({ nullable: true })
  entityId: number; // ID сущности, на которую повлияло действие

  @Column('text')
  details: string; // Детальное описание действия

  @CreateDateColumn()
  timestamp: Date;
}
