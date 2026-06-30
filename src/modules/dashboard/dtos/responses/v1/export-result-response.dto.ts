import { ExportResult } from '../../../services/v1/dashboard.v1.service.js';

export class ExportResultResponseDto {
  downloadUrl!: string;
  fileName!: string;
  generatedAt!: string;

  constructor(data: ExportResult) {
    this.downloadUrl = data.downloadUrl;
    this.fileName = data.fileName;
    this.generatedAt = data.generatedAt;
  }

  static MapEntity(data: ExportResult): ExportResultResponseDto {
    return new ExportResultResponseDto(data);
  }
}
