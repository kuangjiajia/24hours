import { Module, Global } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { MonitorGateway } from './monitor.gateway';
import { MonitorService } from './monitor.service';
import { MonitorController } from './monitor.controller';
import { SessionStoreService } from './session-store.service';

@Global()
@Module({
  imports: [
    BullModule.registerQueue({
      name: 'task-queue',
    }),
  ],
  providers: [MonitorGateway, MonitorService, SessionStoreService],
  controllers: [MonitorController],
  exports: [MonitorService, MonitorGateway, SessionStoreService],
})
export class MonitorModule {}
