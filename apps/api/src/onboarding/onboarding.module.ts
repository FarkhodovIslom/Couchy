import { Module } from '@nestjs/common';
import { OnboardingService } from './onboarding.service';
import { GraphModule } from '../graph/graph.module';
import { LlmModule } from '../llm/llm.module';

@Module({
  imports: [GraphModule, LlmModule],
  providers: [OnboardingService],
  exports: [OnboardingService],
})
export class OnboardingModule {}
