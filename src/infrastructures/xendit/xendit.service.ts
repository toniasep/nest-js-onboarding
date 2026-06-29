import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Xendit } from 'xendit-node';

@Injectable()
export class XenditService {
  private readonly logger = new Logger(XenditService.name);
  public readonly client: Xendit;

  constructor(private configService: ConfigService) {
    const secretKey = this.configService.get<string>('XENDIT_SECRET_KEY') || '';
    if (!secretKey) {
      this.logger.warn(
        'XENDIT_SECRET_KEY is not defined in environment variables.',
      );
    }
    this.client = new Xendit({
      secretKey,
    });
    this.logger.log('Xendit client initialized successfully.');
  }
}
