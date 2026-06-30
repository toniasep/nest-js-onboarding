export class ExportResultResponseDto {
  downloadUrl!: string;
  fileName!: string;
  generatedAt!: string;

  constructor(partial: Partial<ExportResultResponseDto>) {
    Object.assign(this, partial);
  }
}
