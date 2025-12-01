import { Module } from '@nestjs/common';
import { TypeConfigModule, CONFIG_MANAGER_TOKEN } from '@snow-tzu/type-config-nestjs';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppConfig } from './config/app.config';
import { ConfigManager } from '@snow-tzu/type-config';
import * as path from 'path';

@Module({
  imports: [
    TypeConfigModule.forRoot({
      profile: process.env.NODE_ENV || 'development',
      configDir: path.join(__dirname, '../config'),
      validateOnBind: true,
      isGlobal: true,
    }),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: AppConfig,
      useFactory: (configManager: ConfigManager) => {
        console.log(configManager.getAll())
        return configManager.bind(AppConfig);
      },
      inject: [CONFIG_MANAGER_TOKEN],
    },
  ],
})
export class AppModule {}
