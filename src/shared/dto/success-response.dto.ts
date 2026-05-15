import { ApiProperty } from '@nestjs/swagger';
import { PaginationMeta } from '../interfaces/abstract.interface';

export class IPaginate<T> {
  @ApiProperty()
  data: T;

  @ApiProperty({ description: 'Pagination meta details' })
  meta: PaginationMeta;
}

export class APISuccessResponse<TData = unknown> {
  @ApiProperty()
  success: boolean;

  @ApiProperty({ example: 'The process completed successfully.' })
  message: string;

  @ApiProperty()
  payload: TData;
}

export class APISSuccessResponsePaginated<TData = any> {
  @ApiProperty()
  success: boolean;

  @ApiProperty({ example: 'The process completed successfully.' })
  message: string;

  @ApiProperty({ type: IPaginate<TData> })
  payload: IPaginate<TData>;
}
