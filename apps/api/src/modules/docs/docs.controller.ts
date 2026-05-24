import { Controller, Post, Get, Delete, Param, Body, NotFoundException } from '@nestjs/common';
import { DocGeneratorService } from './doc-generator.service';
import type { GenerateDocRequest } from '@kibo/shared';

@Controller('docs')
export class DocsController {
  constructor(private readonly service: DocGeneratorService) {}

  @Post('generate')
  generate(@Body() body: GenerateDocRequest) {
    return this.service.generate(body);
  }

  @Get(':featureId')
  getDoc(@Param('featureId') featureId: string) {
    const doc = this.service.getDoc(featureId);
    if (!doc) throw new NotFoundException(`Doc "${featureId}" not found`);
    return doc;
  }

  @Get()
  listDocs() {
    return { docs: this.service.listDocs() };
  }

  @Delete(':featureId')
  deleteDoc(@Param('featureId') featureId: string) {
    const ok = this.service.deleteDoc(featureId);
    if (!ok) throw new NotFoundException(`Doc "${featureId}" not found`);
    return { ok: true };
  }
}
