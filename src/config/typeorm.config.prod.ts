import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';
import { DataSource, DataSourceOptions } from 'typeorm';

config();
const configService = new ConfigService();

export const databaseConfigOptions: DataSourceOptions = {
  type: 'postgres',
  host: configService.get<string>('DB_HOST'),
  port: Number.parseInt(configService.get<string>('DB_PORT'), 10),
  username: configService.get<string>('DB_USER'),
  password: configService.get<string>('DB_PASSWORD'),
  database: configService.get<string>('DB_NAME'),
  ssl: { rejectUnauthorized: false },
  synchronize: false,
  entities: ['dist/**/*.entity.js'],

  migrations: ['dist/migrations/*.js'],

  migrationsRun: true,

  extra: {
    max: 20,
    min: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  },
};

const dataSource = new DataSource(databaseConfigOptions);

export default dataSource;
