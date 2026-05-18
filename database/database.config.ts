import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';
import { DataSource, DataSourceOptions } from 'typeorm';

const isProduction = process.env.NODE_ENV === 'production';

config();
const configService = new ConfigService();

export const databaseConfigOptions: DataSourceOptions = {
  type: 'postgres',
  host: configService.get<string>('DB_HOST'),
  port: Number.parseInt(configService.get<string>('DB_PORT'), 10),
  username: configService.get<string>('DB_USER'),
  password: configService.get<string>('DB_PASSWORD'),
  database: configService.get<string>('DB_NAME'),
  // url: configService.get<string>('DB_URL'),

  synchronize: !isProduction,

  entities: [
    isProduction
      ? 'dist/**/*.entity.js'
      : `${__dirname}/../**/*.entity{.ts,.js}`,
  ],

  migrations: [
    isProduction
      ? 'dist/migrations/*.js'
      : `${__dirname}/../migrations/*{.ts,.js}`,
  ],

  migrationsRun: isProduction,

  extra: {
    ssl: isProduction ? { rejectUnauthorized: false } : false,
    max: isProduction ? 20 : 5, // max pool size
    min: isProduction ? 5 : 1, // min idle connections
    idleTimeoutMillis: 30_000, // close idle conns after 30s
    connectionTimeoutMillis: 5_000, // fail fast if DB unreachable
  },
};

const dataSource = new DataSource(databaseConfigOptions);

export default dataSource;
