import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { TaskProcessor } from './task.processor';
import { ClaudeModule } from '../claude/claude.module';
import { MonitorModule } from '../monitor/monitor.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'task-queue',
    }),
    forwardRef(() => ClaudeModule),
    forwardRef(() => MonitorModule),
  ],
  providers: [TaskProcessor],
  exports: [TaskProcessor],
})
export class QueueModule {}
