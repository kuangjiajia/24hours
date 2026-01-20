import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { TaskPollerService } from './task-poller.service';
import { ReviewPollerService } from './review-poller.service';
import { MonitorModule } from '../monitor/monitor.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'task-queue',
    }),
    MonitorModule,
  ],
  providers: [TaskPollerService, ReviewPollerService],
  exports: [TaskPollerService, ReviewPollerService],
})
export class SchedulerModule {}
