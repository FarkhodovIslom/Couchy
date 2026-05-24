import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EmbeddingService } from '../embed/embed.service';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

interface RagDocument {
  id: string;
  content: string;
  embedding: number[];
  source: string;
  createdAt: string;
}

@Injectable()
export class RagIndexService implements OnModuleInit {
  private readonly logger = new Logger(RagIndexService.name);
  private readonly docs: Map<string, RagDocument> = new Map();
  private readonly CHUNK_SIZE = parseInt(process.env.CHUNK_SIZE ?? '512', 10);
  private readonly TOP_K = parseInt(process.env.RAG_TOP_K ?? '5', 10);

  constructor(private readonly embedding: EmbeddingService) {}

  onModuleInit() {
    this.logger.log('RagIndexService initialized (in-memory store).');
  }

  async indexFile(filePath: string): Promise<void> {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const chunks = this.chunkText(content, this.CHUNK_SIZE);
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const id = crypto.createHash('sha256').update(`${filePath}:${i}`).digest('hex').slice(0, 16);
        const embedding = await this.embedding.embed(chunk);
        this.docs.set(id, { id, content: chunk, embedding, source: filePath, createdAt: new Date().toISOString() });
      }
      this.logger.log(`Indexed ${chunks.length} chunks from ${filePath}`);
    } catch (err) {
      this.logger.error(`Failed to index ${filePath}:`, err);
    }
  }

  async indexCodebase(dir: string): Promise<{ indexed: number }> {
    let count = 0;
    const walk = (d: string) => {
      if (!fs.existsSync(d)) return;
      for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
        const full = path.join(d, entry.name);
        if (entry.isDirectory() && !['node_modules', '.git', '.next', 'dist'].includes(entry.name)) {
          walk(full);
        } else if (entry.isFile() && /\.(ts|tsx|md|txt|json)$/.test(entry.name)) {
          this.indexFile(full).then(() => { count++; });
        }
      }
    };
    walk(dir);
    return { indexed: count };
  }

  async searchCode(query: string, topK = this.TOP_K): Promise<{ content: string; source: string; score: number }[]> {
    if (this.docs.size === 0) return [];
    const queryEmbedding = await this.embedding.embed(query);
    if (queryEmbedding.length === 0) return [];

    const results = [...this.docs.values()]
      .map((doc) => ({ doc, score: this.cosineSimilarity(queryEmbedding, doc.embedding) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    return results.map((r) => ({ content: r.doc.content, source: r.doc.source, score: r.score }));
  }

  removeDoc(docId: string): void {
    this.docs.delete(docId);
  }

  private chunkText(text: string, maxChars: number): string[] {
    const words = text.split(/\s+/);
    const chunks: string[] = [];
    let current = '';
    for (const word of words) {
      if ((current + ' ' + word).length > maxChars) {
        if (current) chunks.push(current.trim());
        current = word;
      } else {
        current += (current ? ' ' : '') + word;
      }
    }
    if (current) chunks.push(current.trim());
    return chunks.filter((c) => c.length > 0);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) return 0;
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    return dot / (Math.sqrt(normA) * Math.sqrt(normB) || 1);
  }
}
