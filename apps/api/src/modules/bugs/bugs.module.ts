import { Module } from '@nestjs/common';
import { BugsController } from './bugs.controller';
import { BugLearnService } from './bug-learn.service';
import { AgentModule } from '../../core/agent/agent.module';
import { GraphModule } from '../../core/graph/graph.module';

@Module({
  imports: [AgentModule, GraphModule],
  controllers: [BugsController],
  providers: [BugLearnService],
})
export class BugsModule {}
