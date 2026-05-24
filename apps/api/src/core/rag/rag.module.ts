import { Module } from '@nestjs/common';
import { RagIndexService } from './rag-index.service';
import { EmbedModule } from '../embed/embed.module';

@Module({
  imports: [EmbedModule],
  providers: [RagIndexService],
  exports: [RagIndexService],
})
export class RagModule {}
