import { SelectQueryBuilder, ObjectLiteral } from 'typeorm';
import { PaginationDto } from '../dto/pagination.dto.js';

/**
 * Interface untuk paginated response
 */
export interface PaginatedResult<T> {
  items: T[];
  meta: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

/**
 * Utility function untuk menerapkan pagination dan sorting ke TypeORM QueryBuilder.
 *
 * @param queryBuilder - TypeORM SelectQueryBuilder
 * @param paginationDto - DTO pagination (page, limit, sortBy, sortOrder)
 * @param allowedSortFields - Daftar field yang boleh digunakan untuk sorting (whitelist)
 * @param alias - Alias entity di query builder
 * @returns PaginatedResult<T>
 *
 * Contoh penggunaan:
 * ```
 * const qb = this.eventRepository.createQueryBuilder('event');
 * return paginate(qb, paginationDto, ['title', 'createdAt', 'price'], 'event');
 * ```
 */
export async function paginate<T extends ObjectLiteral>(
  queryBuilder: SelectQueryBuilder<T>,
  paginationDto: PaginationDto,
  allowedSortFields: string[],
  alias: string,
): Promise<PaginatedResult<T>> {
  const { page, limit, sortBy, sortOrder } = paginationDto;

  // Guard clause: Pastikan sortBy field ada di whitelist untuk mencegah SQL injection
  const safeSortField = allowedSortFields.includes(sortBy)
    ? sortBy
    : 'createdAt';

  const skip = (page - 1) * limit;

  const [items, totalItems] = await queryBuilder
    .orderBy(`${alias}.${safeSortField}`, sortOrder)
    .skip(skip)
    .take(limit)
    .getManyAndCount();

  const totalPages = Math.ceil(totalItems / limit);

  return {
    items,
    meta: {
      page,
      limit,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
}
