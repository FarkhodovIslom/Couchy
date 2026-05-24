import { Controller, Post, Get, Patch, Body, Param, HttpException, HttpStatus } from '@nestjs/common';
import { OnboardingService } from './onboarding.service';
import type { UserRole } from '@kibo/shared';

@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly onboarding: OnboardingService) {}

  @Post('start')
  async startOnboarding(@Body() body: { name?: string; role?: UserRole }) {
    const name = (body.name ?? 'Аноним').trim();
    const role: UserRole = body.role ?? 'junior_backend';
    return this.onboarding.startOnboarding(name, role);
  }

  @Get(':sessionId/path')
  getLearningPath(@Param('sessionId') sessionId: string) {
    const session = this.onboarding.getSession(sessionId);
    if (!session) throw new HttpException('Session not found', HttpStatus.NOT_FOUND);
    return { steps: this.onboarding.getLearningPath(sessionId) };
  }

  @Patch(':sessionId/step/:stepId')
  updateLearningStep(
    @Param('sessionId') sessionId: string,
    @Param('stepId') stepId: string,
    @Body() body: { completed: boolean },
  ) {
    const ok = this.onboarding.updateStep(sessionId, stepId, !!body.completed);
    if (!ok) throw new HttpException('Session or step not found', HttpStatus.NOT_FOUND);
    return { ok };
  }

  @Get(':sessionId/progress')
  getProgress(@Param('sessionId') sessionId: string) {
    const steps = this.onboarding.getLearningPath(sessionId);
    if (!steps) throw new HttpException('Session not found', HttpStatus.NOT_FOUND);
    const total = steps.length;
    const completed = steps.filter((s) => s.completed).length;
    return { total, completed, percent: total > 0 ? Math.round((completed / total) * 100) : 0 };
  }
}
