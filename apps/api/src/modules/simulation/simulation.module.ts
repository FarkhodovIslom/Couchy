import { Module } from '@nestjs/common';
import { SimulationController } from './simulation.controller';
import { SimulationService } from './simulation.service';
import { GraphModule } from '../../core/graph/graph.module';
import { MemoryModule } from '../../core/memory/memory.module';
import { AlertsModule } from '../alerts/alerts.module';

@Module({
  imports: [GraphModule, MemoryModule, AlertsModule],
  controllers: [SimulationController],
  providers: [SimulationService],
  exports: [SimulationService],
})
export class SimulationModule {}
