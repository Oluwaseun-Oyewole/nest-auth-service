import { Exclude } from 'class-transformer';
import { UserSession } from 'src/psql-sessions/entity/session.entity';
import { VerificationToken } from 'src/psql-tokens/entity/user-token.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ name: 'fullname' })
  fullname: string;

  @Exclude()
  @Column({ select: false })
  password: string;

  @OneToMany(() => VerificationToken, (token) => token.user)
  tokens: VerificationToken[];

  @OneToMany(() => UserSession, (session) => session.user)
  sessions: UserSession[];

  @Column({ type: 'timestamp', nullable: true, name: 'activated_at' })
  activatedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true, name: 'password_changed_at' })
  passwordChangedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true, name: 'last_login_date' })
  lastLoginDate: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
