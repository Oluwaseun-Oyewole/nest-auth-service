import { ApiProperty } from '@nestjs/swagger';

export interface IPaginateResult<T> {
  data: T;
  meta: IMeta;
}

export interface IDefaultPaginationOptions {
  limit: number;
  page: number;
}

export interface IMeta {
  totalItems: number;
  count: number;
  itemsPerPage: number;
  currentPage: number;
  totalPages: number;
}

export class PaginationMeta implements IMeta {
  @ApiProperty({ description: 'total items' })
  totalItems: number;

  @ApiProperty({ description: 'length of data' })
  count: number;

  @ApiProperty({
    description: 'default limit or limit passed as query parameter ',
  })
  itemsPerPage: number;

  @ApiProperty({
    description: 'default page or page passed as query parameter ',
  })
  currentPage: number;

  @ApiProperty({
    description: 'total pages depending on total items and limit',
  })
  totalPages: number;
}

export interface IGetMetaProps<T> {
  total: number;
  data: T[];
  limit: number;
  page: number;
}
