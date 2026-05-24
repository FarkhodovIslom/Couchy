import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';

export type ThinkingLevel = 'low' | 'medium' | 'high';

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private readonly genAI: GoogleGenerativeAI;
  private readonly model: GenerativeModel;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not set in environment variables');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });
  }

  private temperatureFor(level: ThinkingLevel): number {
    if (level === 'high') return 0.1;
    if (level === 'medium') return 0.3;
    return 0.7;
  }

  async complete(
    prompt: string,
    systemPrompt?: string,
    options?: { thinkingLevel?: ThinkingLevel },
  ): Promise<string> {
    try {
      const temperature = this.temperatureFor(options?.thinkingLevel ?? 'low');
      const fullPrompt = systemPrompt
        ? systemPrompt + '\n\n---\n\n' + prompt
        : prompt;

      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
        generationConfig: { maxOutputTokens: 2048, temperature },
      });

      return result.response.text();
    } catch (error) {
      this.logger.error('LLM complete error:', error);
      throw error;
    }
  }

  async *streamCompletion(
    prompt: string,
    systemPrompt?: string,
    options?: { thinkingLevel?: ThinkingLevel },
  ): AsyncGenerator<string> {
    try {
      const temperature = this.temperatureFor(options?.thinkingLevel ?? 'medium');
      const fullPrompt = systemPrompt
        ? systemPrompt + '\n\n---\n\n' + prompt
        : prompt;

      const streamResult = await this.model.generateContentStream({
        contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
        generationConfig: { maxOutputTokens: 4096, temperature },
      });

      for await (const chunk of streamResult.stream) {
        const text = chunk.text();
        if (text) yield text;
      }
    } catch (error) {
      this.logger.error('LLM streamCompletion error:', error);
      throw error;
    }
  }

  async embed(text: string): Promise<number[]> {
    try {
      const embedModel = this.genAI.getGenerativeModel({ model: 'text-embedding-004' });
      const result = await embedModel.embedContent(text);
      return result.embedding.values;
    } catch (error) {
      this.logger.error('LLM embed error:', error);
      return [];
    }
  }

  async completeWithStream(prompt: string, systemPrompt?: string): Promise<string> {
    const chunks: string[] = [];
    for await (const token of this.streamCompletion(prompt, systemPrompt)) {
      chunks.push(token);
    }
    return chunks.join('');
  }
}
