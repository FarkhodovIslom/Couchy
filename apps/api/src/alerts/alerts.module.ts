import { Module } from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { GraphModule } from '../graph/graph.module';

@Module({
  imports: [GraphModule],
  providers: [AlertsService],
  exports: [AlertsService],
})
export class AlertsModule {}
