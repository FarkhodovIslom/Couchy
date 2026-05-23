import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class MemoryService implements OnModuleInit {
  private readonly logger = new Logger(MemoryService.name);
  private readonly memoryDir: string;
  private readonly sessionsDir: string;
  private readonly dailyDir: string;
  private readonly memoryFilePath: string;

  constructor() {
    // Resolve relative to monorepo root (apps/api runs from project root)
    this.memoryDir = path.resolve(
      process.cwd(),
      process.env.MEMORY_DIR ?? '../../memory',
    );
    this.sessionsDir = path.join(this.memoryDir, 'sessions');
    this.dailyDir = path.join(this.memoryDir, 'daily');
    this.memoryFilePath = path.join(this.memoryDir, 'MEMORY.md');
  }

  onModuleInit() {
    // Ensure directories exist at startup
    [this.memoryDir, this.sessionsDir, this.dailyDir].forEach((dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        this.logger.log(`Created memory directory: ${dir}`);
      }
    });

    // Ensure MEMORY.md exists with seed content
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

  /**
   * Read the global long-term memory (MEMORY.md).
   * This is the "soul" of the agent — all team-wide architectural decisions.
   */
  readLongTerm(): string {
    try {
      return fs.readFileSync(this.memoryFilePath, 'utf-8');
    } catch (err) {
      this.logger.error('Failed to read MEMORY.md:', err);
      return '';
    }
  }

  /**
   * Read a session-specific Q&A log from sessions/{sessionId}.md
   * Returns empty string if no session log exists yet.
   */
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

  /**
   * Append a Q&A exchange to a session log.
   * Auto-creates the file if it doesn't exist.
   * This is the OpenClaw-style auto-flush mechanic.
   */
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
      `**Couchy:** ${assistantMessage}`,
      ...(sources && sources.length > 0
        ? [``, `**Sources:** ${sources.join(', ')}`]
        : []),
      '',
      '---',
      '',
    ].join('\n');

    try {
      fs.appendFileSync(sessionFile, header + entry, 'utf-8');
    } catch (err) {
      this.logger.error(`Failed to append to session ${sessionId}:`, err);
    }
  }

  /**
   * Append a note to today's daily log (memory/daily/YYYY-MM-DD.md).
   * Used for gap detection reports or system-level events.
   */
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

  /**
   * Append an important architectural decision to MEMORY.md.
   * This is the auto-flush mechanism: agent writes important learnings before compaction.
   */
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
