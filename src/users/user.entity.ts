import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Role } from '../common/constants';
import { Company } from '../companies/company.entity'; // Импортируем Company
import { History } from '../history/history.entity'; // Импортируем History

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column()
  fullName: string;

  @Column({
    type: 'enum',
    enum: Role,
    default: Role.User,
  })
  role: Role;

  @Column({ nullable: true })
  avatar: string; // URL или путь к аватару пользователя

  @Column({ nullable: true })
  refreshToken: string; // Хэш рефреш-токена

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Связь с компаниями (один пользователь может владеть многими компаниями)
  @OneToMany(() => Company, (company) => company.owner)
  companies: Company[];

  // Связь с историей (один пользователь может иметь много записей истории)
  @OneToMany(() => History, (history) => history.user)
  history: History[];
}
