import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { SettingsProviderService } from './settings-provider.service';

@Global()
@Module({
  imports: [ConfigModule],
  controllers: [SettingsController],
  providers: [SettingsService, SettingsProviderService],
  exports: [SettingsService, SettingsProviderService],
})
export class SettingsModule {}
