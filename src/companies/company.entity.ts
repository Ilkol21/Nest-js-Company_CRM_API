import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

@Entity()
export class Company {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  service: string; // Тип услуг, предоставляемых компанией

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  capital: number; // Капитал компании

  @Column({ nullable: true })
  logo: string; // URL или путь к логотипу компании

  @Column({ type: 'double precision', nullable: true })
  locationLat: number;

  @Column({ type: 'double precision', nullable: true })
  locationLon: number;

  @ManyToOne(() => User, (user) => user.companies, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ownerId' })
  owner: User;

  @Column()
  ownerId: number; // ID владельца компании

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
