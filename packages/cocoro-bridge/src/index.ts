// barrel export — packages/cocoro-bridge の公開 API
export { CocoroClient } from "./client.js";
export type {
  CocoroChatRequest,
  CocoroChatResponse,
  CocoroClientConfig,
  CocoroStreamChunk,
} from "./client.js";

export { detectLocalServices, resolveLocalBaseUrl, detectLocalModels, isCocoroAvailable, isOllamaAvailable, getOllamaModels } from "./local.js";
export type { LocalModelInfo, LocalServiceStatus, LocalModelInfoExtended } from "./local.js";

export { ChatMessageSchema, ChatRequestSchema, ChatResponseSchema } from "./types.js";
export type { ChatMessage, ChatRequest, ChatResponse } from "./types.js";
