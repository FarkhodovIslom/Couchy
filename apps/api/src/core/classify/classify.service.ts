import { Injectable, Logger } from '@nestjs/common';
import { LlmService } from '../llm/llm.service';

@Injectable()
export class ClassifyService {
  private readonly logger = new Logger(ClassifyService.name);

  constructor(private readonly llm: LlmService) {}

  async topicOf(text: string): Promise<string> {
    try {
      const prompt = `Определи главную тему следующего текста одним словом или кратким названием (сервис, компонент, технология).
Текст: "${text}"
Ответь одним словом или коротким названием, без объяснений.`;
      const result = await this.llm.complete(prompt);
      return result.trim().split('\n')[0].slice(0, 50);
    } catch {
      return 'unknown';
    }
  }

  async severityOf(text: string): Promise<'info' | 'warning' | 'critical'> {
    try {
      const prompt = `Определи уровень серьёзности следующего сообщения для разработчика.
Сообщение: "${text}"
Ответь одним словом: info, warning, или critical. Только одно слово.`;
      const result = (await this.llm.complete(prompt)).trim().toLowerCase();
      if (result.includes('critical')) return 'critical';
      if (result.includes('warning')) return 'warning';
      return 'info';
    } catch {
      return 'info';
    }
  }

  async relationOf(source: string, target: string): Promise<string> {
    try {
      const prompt = `Какое архитектурное отношение между "${source}" и "${target}"?
Выбери одно: влияет_на, зависит_от, использует, описан_в, владеет, связан_с.
Только одно слово/фраза без объяснений.`;
      const result = await this.llm.complete(prompt);
      return result.trim().split('\n')[0].slice(0, 30);
    } catch {
      return 'связан_с';
    }
  }

  async stepCoveredBy(stepTitle: string, conversationContext: string): Promise<boolean> {
    try {
      const prompt = `Шаг обучения: "${stepTitle}"
Контекст разговора: "${conversationContext.slice(-1000)}"
Был ли этот шаг достаточно рассмотрен в разговоре? Ответь только: да или нет.`;
      const result = (await this.llm.complete(prompt)).trim().toLowerCase();
      return result.startsWith('да') || result.startsWith('yes');
    } catch {
      return false;
    }
  }
}
