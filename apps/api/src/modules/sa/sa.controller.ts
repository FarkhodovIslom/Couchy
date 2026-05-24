import { Controller, Post, Patch, Get, Param, Body, NotFoundException } from '@nestjs/common';
import { SAWriterService } from './sa-writer.service';
import type { SADraftRequest, SARefinedRequest } from '@kibo/shared';

@Controller('sa')
export class SAController {
  constructor(private readonly service: SAWriterService) {}

  @Post('draft')
  draft(@Body() body: SADraftRequest) {
    return this.service.draft(body);
  }

  @Post('refine')
  refine(@Body() body: SARefinedRequest) {
    return this.service.refine(body);
  }

  @Patch(':docId/approve')
  approve(@Param('docId') docId: string) {
    const doc = this.service.approve(docId);
    if (!doc) throw new NotFoundException(`Document "${docId}" not found`);
    return doc;
  }

  @Get('templates')
  listTemplates() {
    return { templates: this.service.listTemplates() };
  }
}
