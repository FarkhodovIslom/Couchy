import { Injectable } from '@nestjs/common';
import type { SADraftRequest, SARefinedRequest, SADocument } from '@kibo/shared';
import { AgentService } from '../../core/agent/agent.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class SAWriterService {
  private readonly docs = new Map<string, SADocument>();
  private readonly templatesDir = path.resolve(process.cwd(), 'templates');

  constructor(private readonly agent: AgentService) {
    if (!fs.existsSync(this.templatesDir)) {
      fs.mkdirSync(this.templatesDir, { recursive: true });
    }
  }

  async draft(request: SADraftRequest): Promise<SADocument> {
    const content = await this.agent.writeSA(request);
    const titleMatch = content.match(/^##?\s+(.+)/m);
    const title = titleMatch ? titleMatch[1].trim() : request.description.slice(0, 60);

    const doc: SADocument = {
      id: crypto.randomUUID(),
      title,
      content,
      templateId: request.templateId ?? 'default',
      status: 'draft',
      filePath: `templates/${Date.now()}.md`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.docs.set(doc.id, doc);
    fs.writeFileSync(path.join(this.templatesDir, `${doc.id}.md`), content, 'utf8');
    return doc;
  }

  async refine(request: SARefinedRequest): Promise<SADocument> {
    const existing = this.docs.get(request.draftId);
    if (!existing) throw new Error(`Document ${request.draftId} not found`);

    const refined = await this.agent.writeSA({
      description: `${existing.title}\n\nEdits requested:\n${request.edits}\n\nExisting draft:\n${existing.content}`,
      templateId: existing.templateId,
    });

    existing.content = refined;
    existing.updatedAt = new Date().toISOString();
    fs.writeFileSync(path.join(this.templatesDir, `${existing.id}.md`), refined, 'utf8');
    return existing;
  }

  approve(docId: string): SADocument | null {
    const doc = this.docs.get(docId);
    if (!doc) return null;
    doc.status = 'approved';
    doc.updatedAt = new Date().toISOString();
    return doc;
  }

  listTemplates(): SADocument[] {
    return [...this.docs.values()].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }
}
