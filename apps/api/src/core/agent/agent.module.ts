import { Module } from '@nestjs/common';
import { AgentService } from './agent.service';
import { LlmModule } from '../llm/llm.module';
import { MemoryModule } from '../memory/memory.module';
import { GraphModule } from '../graph/graph.module';
import { RagModule } from '../rag/rag.module';
import { ClassifyModule } from '../classify/classify.module';

@Module({
  imports: [LlmModule, MemoryModule, GraphModule, RagModule, ClassifyModule],
  providers: [AgentService],
  exports: [AgentService],
})
export class AgentModule {}
