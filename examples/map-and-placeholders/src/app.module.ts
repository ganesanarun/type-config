import { Module } from '@nestjs/common';
import { TypeConfigModule } from '@snow-tzu/type-config-nestjs';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import * as path from 'path';

@Module({
  imports: [
    TypeConfigModule.forRoot({
      configDir: path.join(__dirname, '../config'),
      profile: process.env.NODE_ENV || 'development',
      enableHotReload: false,
      validateOnBind: true,
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
