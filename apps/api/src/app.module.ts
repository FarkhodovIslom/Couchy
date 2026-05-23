import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { LlmModule } from './llm/llm.module';
import { MemoryModule } from './memory/memory.module';
import { GraphModule } from './graph/graph.module';
import { AgentModule } from './agent/agent.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { AlertsModule } from './alerts/alerts.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LlmModule,
    MemoryModule,
    GraphModule,
    AgentModule,
    OnboardingModule,
    AlertsModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
