import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health.controller';
import { LlmModule } from './core/llm/llm.module';
import { MemoryModule } from './core/memory/memory.module';
import { GraphModule } from './core/graph/graph.module';
import { AgentModule } from './core/agent/agent.module';
import { EmbedModule } from './core/embed/embed.module';
import { RagModule } from './core/rag/rag.module';
import { ClassifyModule } from './core/classify/classify.module';
import { OnboardingModule } from './modules/onboarding/onboarding.module';
import { AlertsModule } from './modules/alerts/alerts.module';
import { ChatModule } from './modules/chat/chat.module';
import { GraphApiModule } from './modules/graph/graph-api.module';
import { DocsModule } from './modules/docs/docs.module';
import { ReviewModule } from './modules/review/review.module';
import { BugsModule } from './modules/bugs/bugs.module';
import { SAModule } from './modules/sa/sa.module';
import { SimulationModule } from './modules/simulation/simulation.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LlmModule,
    MemoryModule,
    GraphModule,
    EmbedModule,
    RagModule,
    ClassifyModule,
    AgentModule,
    OnboardingModule,
    AlertsModule,
    ChatModule,
    GraphApiModule,
    DocsModule,
    ReviewModule,
    BugsModule,
    SAModule,
    SimulationModule,
  ],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
