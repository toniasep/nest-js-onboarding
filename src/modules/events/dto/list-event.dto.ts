import { IsOptional, IsUUID } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto.js';

/**
 * DTO untuk list event dengan pagination dan search
 */
export class ListEventDto extends PaginationDto {
  @IsOptional()
  @IsUUID()
  categoryId?: string;
}
