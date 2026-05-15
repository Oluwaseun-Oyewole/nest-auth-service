import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DuplicateResourceException,
  ResourceNotFoundException,
} from 'src/shared/exceptions/domain.exceptions';
import { hashPassword } from 'src/shared/utils/index.utils';
import { Repository } from 'typeorm';
import { CreateUserDto, LoginDto, UpdatePasswordDto } from './dto/user.dto';
import { User } from './entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}
  async createUser(input: CreateUserDto) {
    const { email, password } = input;
    const userExists = await this.usersRepository.findOneBy({ email });
    if (userExists) throw new DuplicateResourceException('User', email);

    const hashedPassword = await hashPassword(password);
    const user = this.usersRepository.create({
      ...input,
      password: hashedPassword,
    });
    await this.usersRepository.save(user);
    return user;
  }

  async findUserWithPassword(email: string) {
    return await this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email })
      .getOne();
  }
  async findUserByEmail(email: string) {
    return await this.usersRepository.findOneBy({ email });
  }

  async findUserById(id: string) {
    return await this.usersRepository.findOneBy({ id });
  }

  async activateUser(input: Partial<LoginDto>) {
    const { email } = input;
    const userExists = await this.usersRepository.findOne({
      where: { email },
    });
    if (!userExists) throw new ResourceNotFoundException('User', email);

    await this.usersRepository.update(
      { id: userExists.id },
      {
        activatedAt: new Date(),
      },
    );
    return await this.usersRepository.findOne({
      where: { id: userExists.id },
    });
  }

  async updateUserPassword(input: UpdatePasswordDto) {
    const { userId, newPassword } = input;
    const user = await this.usersRepository.findOneBy({ id: userId });
    if (!user) throw new ResourceNotFoundException('User', userId);

    const hashedPassword = await hashPassword(newPassword);
    await this.usersRepository.update(
      { id: userId },
      {
        password: hashedPassword,
        passwordChangedAt: new Date(),
      },
    );
  }

  async updateLoginTimestamp(userId: string) {
    const user = await this.usersRepository.findOneBy({ id: userId });
    if (!user) throw new ResourceNotFoundException('User', userId);

    await this.usersRepository.update(
      { id: userId },
      {
        lastLoginDate: new Date(),
      },
    );
  }
}
