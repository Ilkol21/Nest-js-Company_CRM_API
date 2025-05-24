import { Module, forwardRef } from '@nestjs/common';
import { EventsGateway } from './events.gateway';
import { AuthModule } from '../auth/auth.module';
import { WsAuthGuard } from '../auth/ws-auth.guard';

@Module({
  imports: [forwardRef(() => AuthModule)],
  providers: [EventsGateway, WsAuthGuard],
  exports: [EventsGateway],
})
export class EventsModule {}
