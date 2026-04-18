import { z } from 'zod';

export const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
});

export const ChatRequestSchema = z.object({
  model: z.string(),
  messages: z.array(ChatMessageSchema),
  stream: z.boolean().optional().default(false),
  max_tokens: z.number().optional(),
  temperature: z.number().optional(),
});

export const ChatResponseSchema = z.object({
  id: z.string(),
  model: z.string(),
  choices: z.array(z.object({
    message: ChatMessageSchema,
    finish_reason: z.string(),
  })),
  usage: z.object({
    prompt_tokens: z.number(),
    completion_tokens: z.number(),
  }).optional(),
});

export type ChatMessage = z.infer<typeof ChatMessageSchema>;
export type ChatRequest = z.infer<typeof ChatRequestSchema>;
export type ChatResponse = z.infer<typeof ChatResponseSchema>;
