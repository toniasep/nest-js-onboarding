import { PartialType } from '@nestjs/mapped-types';
import { CreateEventCategoryDto } from './create-event-category.dto.js';

/**
 * DTO untuk mengupdate kategori event
 * Menggunakan PartialType agar semua field dari CreateEventCategoryDto menjadi opsional
 */
export class UpdateEventCategoryDto extends PartialType(CreateEventCategoryDto) {}
