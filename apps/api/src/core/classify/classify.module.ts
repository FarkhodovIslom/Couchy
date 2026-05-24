import { Module } from '@nestjs/common';
import { ClassifyService } from './classify.service';
import { LlmModule } from '../llm/llm.module';

@Module({
  imports: [LlmModule],
  providers: [ClassifyService],
  exports: [ClassifyService],
})
export class ClassifyModule {}
