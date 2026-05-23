import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';

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
    // Gemini 3.5 Flash — GA since May 2026
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });
  }

  /**
   * Non-streaming completion — for gap detection, summarization, etc.
   * Uses higher reasoning for accuracy.
   */
  async complete(prompt: string, systemPrompt?: string): Promise<string> {
    try {
      const parts: any[] = [];

      if (systemPrompt) {
        parts.push({ text: systemPrompt + '\n\n---\n\n' + prompt });
      } else {
        parts.push({ text: prompt });
      }

      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts }],
        generationConfig: {
          maxOutputTokens: 2048,
          temperature: 0.3,
        },
      });

      const response = result.response;
      return response.text();
    } catch (error) {
      this.logger.error('LLM complete error:', error);
      throw error;
    }
  }

  /**
   * Streaming completion — for chat responses, token by token.
   * Uses lower latency settings for real-time UX.
   * Yields tokens as AsyncGenerator.
   */
  async *streamCompletion(
    prompt: string,
    systemPrompt?: string,
  ): AsyncGenerator<string> {
    try {
      const parts: any[] = [];

      if (systemPrompt) {
        parts.push({ text: systemPrompt + '\n\n---\n\n' + prompt });
      } else {
        parts.push({ text: prompt });
      }

      const streamResult = await this.model.generateContentStream({
        contents: [{ role: 'user', parts }],
        generationConfig: {
          maxOutputTokens: 2048,
          temperature: 0.7,
        },
      });

      for await (const chunk of streamResult.stream) {
        const text = chunk.text();
        if (text) {
          yield text;
        }
      }
    } catch (error) {
      this.logger.error('LLM streamCompletion error:', error);
      throw error;
    }
  }

  /**
   * Utility: full completion with streaming, collected into one string.
   * Useful for gap detection where we want accuracy but don't need streaming.
   */
  async completeWithStream(
    prompt: string,
    systemPrompt?: string,
  ): Promise<string> {
    const chunks: string[] = [];
    for await (const token of this.streamCompletion(prompt, systemPrompt)) {
      chunks.push(token);
    }
    return chunks.join('');
  }
}
