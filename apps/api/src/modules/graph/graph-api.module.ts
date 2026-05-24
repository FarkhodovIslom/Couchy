import { Module } from '@nestjs/common';
import { GraphController } from './graph.controller';
import { GraphModule } from '../../core/graph/graph.module';

@Module({
  imports: [GraphModule],
  controllers: [GraphController],
})
export class GraphApiModule {}
