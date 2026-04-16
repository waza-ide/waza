// barrel export — packages/cocoro-bridge の公開 API
export { CocoroClient } from "./client.js";
export type {
  CocoroChatRequest,
  CocoroChatResponse,
  CocoroClientConfig,
  CocoroStreamChunk,
} from "./client.js";

export { detectLocalServices, resolveLocalBaseUrl } from "./local.js";
export type { LocalModelInfo, LocalServiceStatus } from "./local.js";
