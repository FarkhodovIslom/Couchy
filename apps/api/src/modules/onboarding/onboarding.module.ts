import { Module } from '@nestjs/common';
import { OnboardingService } from './onboarding.service';
import { OnboardingController } from './onboarding.controller';
import { GraphModule } from '../../core/graph/graph.module';
import { LlmModule } from '../../core/llm/llm.module';

@Module({
  imports: [GraphModule, LlmModule],
  controllers: [OnboardingController],
  providers: [OnboardingService],
  exports: [OnboardingService],
})
export class OnboardingModule {}
