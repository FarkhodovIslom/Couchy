import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { AgentModule } from '../../core/agent/agent.module';
import { AlertsModule } from '../alerts/alerts.module';
import { GraphModule } from '../../core/graph/graph.module';
import { OnboardingModule } from '../onboarding/onboarding.module';

@Module({
  imports: [AgentModule, AlertsModule, GraphModule, OnboardingModule],
  controllers: [ChatController],
})
export class ChatModule {}
