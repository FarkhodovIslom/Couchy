import { Module } from '@nestjs/common';
import { DocsController } from './docs.controller';
import { DocGeneratorService } from './doc-generator.service';
import { AgentModule } from '../../core/agent/agent.module';

@Module({
  imports: [AgentModule],
  controllers: [DocsController],
  providers: [DocGeneratorService],
})
export class DocsModule {}
