import { Module } from '@nestjs/common';
import { ReviewController } from './review.controller';
import { CodeReviewService } from './code-review.service';
import { AgentModule } from '../../core/agent/agent.module';

@Module({
  imports: [AgentModule],
  controllers: [ReviewController],
  providers: [CodeReviewService],
})
export class ReviewModule {}
