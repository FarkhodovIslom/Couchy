import { Module } from '@nestjs/common';
import { EmbeddingService } from './embed.service';

@Module({
  providers: [EmbeddingService],
  exports: [EmbeddingService],
})
export class EmbedModule {}
