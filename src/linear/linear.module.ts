import { Module, Global } from '@nestjs/common';
import { LinearService } from './linear.service';

@Global()
@Module({
  providers: [LinearService],
  exports: [LinearService],
})
export class LinearModule {}
