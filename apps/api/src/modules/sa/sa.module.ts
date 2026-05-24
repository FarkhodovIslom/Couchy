import { Module } from '@nestjs/common';
import { SAController } from './sa.controller';
import { SAWriterService } from './sa-writer.service';
import { AgentModule } from '../../core/agent/agent.module';
import { MemoryModule } from '../../core/memory/memory.module';

@Module({
  imports: [AgentModule, MemoryModule],
  controllers: [SAController],
  providers: [SAWriterService],
})
export class SAModule {}
