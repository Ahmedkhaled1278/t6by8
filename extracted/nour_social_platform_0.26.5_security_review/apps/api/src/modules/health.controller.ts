import { Controller, Get } from '@nestjs/common';

@Controller()
export class HealthController {
  @Get('/health')
  health() {
    return {
      status: 'ok',
      service: 'nour-api',
      version: '0.26.5',
      stage: 'mvp',
    };
  }
}
