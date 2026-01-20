import { Module, Global } from '@nestjs/common';
import { ClaudeService } from './claude.service';
import { ClaudeController } from './claude.controller';

@Global()
@Module({
  controllers: [ClaudeController],
  providers: [ClaudeService],
  exports: [ClaudeService],
})
export class ClaudeModule {}
