import { Controller, Get, Param } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getRoot(): string {
    return 'Map and Placeholders Example - Visit /config for configuration info';
  }

  @Get('config')
  getConfig(): any {
    return this.appService.getConfigInfo();
  }

  @Get('database/:name')
  getDatabaseConnection(@Param('name') name: string): any {
    return this.appService.getDatabaseConnection(name);
  }

  @Get('service/:name')
  getServiceEndpoint(@Param('name') name: string): any {
    return this.appService.getServiceEndpoint(name);
  }
}
