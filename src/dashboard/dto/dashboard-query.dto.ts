import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, Max, Min } from 'class-validator';

/**
 * DTO untuk query date range pada dashboard endpoints.
 *
 * Query parameter:
 * - startDate: tanggal awal (ISO 8601)
 * - endDate: tanggal akhir (ISO 8601)
 *
 * Referensi: rules.md §1 — DTO + Validation Pipe
 */
export class DateRangeDto {
  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;
}

/**
 * DTO untuk query top events / top categories.
 * Extends DateRangeDto dengan tambahan `limit`.
 */
export class TopRankedDto extends DateRangeDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 10;
}

/**
 * DTO untuk export laporan penjualan.
 */
export class ExportQueryDto extends DateRangeDto {}
