import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { AppService } from './app.service';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { ApiProtectedRoute } from './shared/decorators/swagger.decorator';

@UseGuards(JwtAuthGuard)
@SkipThrottle()
@ApiTags('App')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @SkipThrottle({ default: false })
  @ApiProtectedRoute(
    'Service greeting endpoint',
    'Simple public endpoint to verify the API is responsive.',
  )
  @ApiOkResponse({
    description: 'Service is reachable.',
    schema: {
      type: 'string',
      example: 'Hello World!',
    },
  })
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
