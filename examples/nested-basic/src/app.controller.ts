import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getConfig(): any {
    return this.appService.getConfigSummary();
  }

  @Get('/health')
  health(): { status: string } {
    return { status: 'ok' };
  }
}
