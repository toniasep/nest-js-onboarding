import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

/**
 * Enum untuk arah sorting
 */
export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC',
}

/**
 * Reusable Pagination & Sorting DTO
 *
 * Digunakan sebagai base DTO untuk semua endpoint yang memerlukan pagination.
 * Extend class ini dan tambahkan filter query sesuai kebutuhan.
 *
 * Contoh penggunaan:
 * ```
 * export class ListEventsDto extends PaginationDto {
 *   @IsOptional()
 *   @IsString()
 *   search?: string;
 * }
 * ```
 */
export class PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 10;

  @IsOptional()
  @IsString()
  sortBy: string = 'createdAt';

  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder: SortOrder = SortOrder.DESC;

  @IsOptional()
  @IsString()
  search?: string;
}
