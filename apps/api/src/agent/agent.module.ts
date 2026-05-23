import { Module } from '@nestjs/common';
import { AgentService } from './agent.service';
import { LlmModule } from '../llm/llm.module';
import { MemoryModule } from '../memory/memory.module';
import { GraphModule } from '../graph/graph.module';

@Module({
  imports: [LlmModule, MemoryModule, GraphModule],
  providers: [AgentService],
  exports: [AgentService],
})
export class AgentModule {}
