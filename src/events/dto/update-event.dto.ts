import { PartialType } from '@nestjs/mapped-types';
import { CreateEventDto } from './create-event.dto.js';

/**
 * DTO untuk mengupdate event
 */
export class UpdateEventDto extends PartialType(CreateEventDto) {}
