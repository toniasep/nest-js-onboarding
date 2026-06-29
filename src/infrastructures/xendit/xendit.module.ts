import { Module, Global } from '@nestjs/common';
import { XenditService } from './xendit.service.js';

@Global()
@Module({
  providers: [XenditService],
  exports: [XenditService],
})
export class XenditModule {}
