import { IsOptional, IsUUID } from 'class-validator';
import { PaginationDto } from '../../../../../shared/dtos/pagination.dto.js';

/**
 * DTO untuk list event dengan pagination dan search
 */
export class ListEventDto extends PaginationDto {
  @IsOptional()
  @IsUUID()
  categoryId?: string;
}
