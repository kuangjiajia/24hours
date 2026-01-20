import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bull';
import configuration from './config/configuration';
import { LinearModule } from './linear/linear.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { QueueModule } from './queue/queue.module';
import { ClaudeModule } from './claude/claude.module';
import { MonitorModule } from './monitor/monitor.module';
import { SettingsModule } from './settings/settings.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),

    // Schedule for polling
    ScheduleModule.forRoot(),

    // Bull queue with Redis
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get('redis.host'),
          port: configService.get('redis.port'),
        },
      }),
      inject: [ConfigService],
    }),

    // Feature modules
    LinearModule,
    SchedulerModule,
    QueueModule,
    ClaudeModule,
    MonitorModule,
    SettingsModule,
  ],
})
export class AppModule {}
