import { Injectable, Logger, OnModuleInit, Optional } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import * as fs from 'fs';
import * as path from 'path';

const TOKEN_LIMIT = parseInt(process.env.TOKEN_LIMIT ?? '8000', 10);
const FLUSH_THRESHOLD = 0.8;

@Injectable()
export class MemoryService implements OnModuleInit {
  private readonly logger = new Logger(MemoryService.name);
  private readonly memoryDir: string;
  private readonly sessionsDir: string;
  private readonly dailyDir: string;
  private readonly memoryFilePath: string;

  constructor(private readonly moduleRef: ModuleRef) {
    this.memoryDir = path.resolve(
      process.cwd(),
      process.env.MEMORY_DIR ?? '../../memory',
    );
    this.sessionsDir = path.join(this.memoryDir, 'sessions');
    this.dailyDir = path.join(this.memoryDir, 'daily');
    this.memoryFilePath = path.join(this.memoryDir, 'MEMORY.md');
  }

  onModuleInit() {
    [this.memoryDir, this.sessionsDir, this.dailyDir].forEach((dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        this.logger.log(`Created memory directory: ${dir}`);
      }
    });

    if (!fs.existsSync(this.memoryFilePath)) {
      fs.writeFileSync(
        this.memoryFilePath,
        `# Архитектурные решения команды\n\n(Seed data not found — создайте memory/MEMORY.md)\n`,
        'utf-8',
      );
      this.logger.warn('MEMORY.md not found, created empty file.');
    }

    this.logger.log(`MemoryService initialized. Memory dir: ${this.memoryDir}`);
  }

  estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  readLongTerm(): string {
    try {
      return fs.readFileSync(this.memoryFilePath, 'utf-8');
    } catch (err) {
      this.logger.error('Failed to read MEMORY.md:', err);
      return '';
    }
  }

  readSession(sessionId: string): string {
    const sessionFile = path.join(this.sessionsDir, `${sessionId}.md`);
    try {
      if (fs.existsSync(sessionFile)) {
        return fs.readFileSync(sessionFile, 'utf-8');
      }
      return '';
    } catch (err) {
      this.logger.error(`Failed to read session ${sessionId}:`, err);
      return '';
    }
  }

  appendSession(
    sessionId: string,
    userMessage: string,
    assistantMessage: string,
    sources?: string[],
  ): void {
    const sessionFile = path.join(this.sessionsDir, `${sessionId}.md`);
    const timestamp = new Date().toISOString();

    let header = '';
    if (!fs.existsSync(sessionFile)) {
      header = `# Session Log: ${sessionId}\nCreated: ${timestamp}\n\n---\n\n`;
    }

    const entry = [
      `## ${timestamp}`,
      `**User:** ${userMessage}`,
      '',
      `**Kibo:** ${assistantMessage}`,
      ...(sources && sources.length > 0
        ? [``, `**Sources:** ${sources.join(', ')}`]
        : []),
      '',
      '---',
      '',
    ].join('\n');

    try {
      fs.appendFileSync(sessionFile, header + entry, 'utf-8');
      // Auto-flush check after write
      const content = fs.readFileSync(sessionFile, 'utf-8');
      if (this.estimateTokens(content) > TOKEN_LIMIT * FLUSH_THRESHOLD) {
        this.flush(sessionId).catch((e) => this.logger.error('Flush failed:', e));
      }
    } catch (err) {
      this.logger.error(`Failed to append to session ${sessionId}:`, err);
    }
  }

  async flush(sessionId: string): Promise<void> {
    const sessionFile = path.join(this.sessionsDir, `${sessionId}.md`);
    if (!fs.existsSync(sessionFile)) return;

    try {
      const content = fs.readFileSync(sessionFile, 'utf-8');
      if (this.estimateTokens(content) <= TOKEN_LIMIT * FLUSH_THRESHOLD) return;

      // Lazy-resolve LlmService to avoid circular DI
      let LlmService: any;
      try {
        LlmService = this.moduleRef.get('LlmService', { strict: false });
      } catch {
        this.logger.warn('LlmService not available for flush, skipping compaction.');
        return;
      }

      const summary = await LlmService.complete(
        `Summarize the key learnings and decisions from this conversation log in 10 bullet points, in Russian:\n\n${content.slice(-3000)}`,
      );

      const timestamp = new Date().toISOString();
      const compacted = `# Session Log: ${sessionId}\nCompacted: ${timestamp}\n\n## Summary\n${summary}\n\n---\n\n`;
      fs.writeFileSync(sessionFile, compacted, 'utf-8');
      this.appendDaily(`[FLUSH] Session ${sessionId} compacted at ${timestamp}`);
      this.logger.log(`Session ${sessionId} flushed and compacted.`);
    } catch (err) {
      this.logger.error(`Failed to flush session ${sessionId}:`, err);
    }
  }

  appendDaily(note: string): void {
    const today = new Date().toISOString().split('T')[0];
    const dailyFile = path.join(this.dailyDir, `${today}.md`);
    const timestamp = new Date().toISOString();

    let header = '';
    if (!fs.existsSync(dailyFile)) {
      header = `# Daily Log: ${today}\n\n---\n\n`;
    }

    const entry = `### ${timestamp}\n${note}\n\n`;

    try {
      fs.appendFileSync(dailyFile, header + entry, 'utf-8');
    } catch (err) {
      this.logger.error(`Failed to append to daily log:`, err);
    }
  }

  appendLongTerm(section: string, content: string): void {
    const timestamp = new Date().toISOString().split('T')[0];
    const entry = `\n## ${section} (auto-logged: ${timestamp})\n${content}\n`;
    try {
      fs.appendFileSync(this.memoryFilePath, entry, 'utf-8');
    } catch (err) {
      this.logger.error('Failed to append to MEMORY.md:', err);
    }
  }
}
