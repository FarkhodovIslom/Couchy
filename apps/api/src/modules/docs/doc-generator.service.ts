import { Injectable } from '@nestjs/common';
import type { GenerateDocRequest, GeneratedDoc } from '@kibo/shared';
import { AgentService } from '../../core/agent/agent.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class DocGeneratorService {
  private readonly store = new Map<string, GeneratedDoc>();
  private readonly docsDir = path.resolve(process.cwd(), 'docs');

  constructor(private readonly agent: AgentService) {
    if (!fs.existsSync(this.docsDir)) {
      fs.mkdirSync(this.docsDir, { recursive: true });
    }
  }

  async generate(request: GenerateDocRequest): Promise<GeneratedDoc> {
    const doc = await this.agent.generateDoc(request);
    this.store.set(doc.id, doc);
    fs.writeFileSync(path.join(this.docsDir, `${doc.featureId}.md`), doc.content, 'utf8');
    return doc;
  }

  getDoc(featureId: string): GeneratedDoc | undefined {
    for (const doc of this.store.values()) {
      if (doc.featureId === featureId) return doc;
    }
    return undefined;
  }

  listDocs(): GeneratedDoc[] {
    return [...this.store.values()].sort(
      (a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime(),
    );
  }

  deleteDoc(featureId: string): boolean {
    for (const [id, doc] of this.store) {
      if (doc.featureId === featureId) {
        this.store.delete(id);
        const filePath = path.join(this.docsDir, `${featureId}.md`);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        return true;
      }
    }
    return false;
  }
}
