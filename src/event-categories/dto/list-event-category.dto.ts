import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto.js';

/**
 * DTO untuk list kategori event dengan pagination dan search
 */
export class ListEventCategoryDto extends PaginationDto {
  @IsOptional()
  @IsString()
  search?: string;
}
