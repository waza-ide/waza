/**
 * ローカルモデル検出モジュール
 * Ollama および cocoro-core の稼働状況を確認する
 */

export type LocalModelInfo = {
  name: string;
  size?: number;
  modifiedAt?: string;
};

export type LocalServiceStatus = {
  kind: "ollama" | "cocoro";
  baseUrl: string;
  available: boolean;
  models: LocalModelInfo[];
};

const DEFAULT_OLLAMA_URL = "http://localhost:11434";
const DEFAULT_COCORO_URL = "http://localhost:8001";

/**
 * Ollama サービスの稼働状況とモデル一覧を取得する
 */
async function detectOllama(
  baseUrl = DEFAULT_OLLAMA_URL
): Promise<LocalServiceStatus> {
  try {
    const response = await fetch(`${baseUrl}/api/tags`, {
      signal: AbortSignal.timeout(2000),
    });

    if (!response.ok) {
      return { kind: "ollama", baseUrl, available: false, models: [] };
    }

    const data = (await response.json()) as {
      models: { name: string; size: number; modified_at: string }[];
    };

    return {
      kind: "ollama",
      baseUrl,
      available: true,
      models: data.models.map((m) => ({
        name: m.name,
        size: m.size,
        modifiedAt: m.modified_at,
      })),
    };
  } catch {
    return { kind: "ollama", baseUrl, available: false, models: [] };
  }
}

/**
 * cocoro-core サービスの稼働状況とモデル一覧を取得する
 */
async function detectCocoro(
  baseUrl = DEFAULT_COCORO_URL
): Promise<LocalServiceStatus> {
  try {
    const healthRes = await fetch(`${baseUrl}/health`, {
      signal: AbortSignal.timeout(2000),
    });

    if (!healthRes.ok) {
      return { kind: "cocoro", baseUrl, available: false, models: [] };
    }

    const modelsRes = await fetch(`${baseUrl}/v1/models`, {
      signal: AbortSignal.timeout(2000),
    });

    if (!modelsRes.ok) {
      return { kind: "cocoro", baseUrl, available: true, models: [] };
    }

    const data = (await modelsRes.json()) as { data: { id: string }[] };

    return {
      kind: "cocoro",
      baseUrl,
      available: true,
      models: data.data.map((m) => ({ name: m.id })),
    };
  } catch {
    return { kind: "cocoro", baseUrl, available: false, models: [] };
  }
}

/**
 * すべてのローカルサービスを並列で探索し、稼働中のものを返す
 */
export async function detectLocalServices(options?: {
  ollamaUrl?: string;
  cocoroUrl?: string;
}): Promise<LocalServiceStatus[]> {
  const [ollama, cocoro] = await Promise.all([
    detectOllama(options?.ollamaUrl),
    detectCocoro(options?.cocoroUrl),
  ]);

  return [ollama, cocoro].filter((s) => s.available);
}

/**
 * 最優先のローカルサービス URL を返す（cocoro > ollama）
 * どちらも利用不可の場合は null を返す
 */
export async function resolveLocalBaseUrl(options?: {
  ollamaUrl?: string;
  cocoroUrl?: string;
}): Promise<{ url: string; kind: "ollama" | "cocoro" } | null> {
  const services = await detectLocalServices(options);

  const cocoro = services.find((s) => s.kind === "cocoro");
  if (cocoro) return { url: cocoro.baseUrl, kind: "cocoro" };

  const ollama = services.find((s) => s.kind === "ollama");
  if (ollama) return { url: ollama.baseUrl, kind: "ollama" };

  return null;
}

/**
 * provider フィールド付きの拡張モデル情報
 */
export interface LocalModelInfoExtended {
  provider: 'cocoro' | 'ollama';
  name: string;
  size?: number;
}

/**
 * 利用可能なローカルモデルを全て列挙する（cocoro + ollama 並列取得）
 */
export async function detectLocalModels(): Promise<LocalModelInfoExtended[]> {
  const [cocoroResult, ollamaResult] = await Promise.allSettled([
    detectCocoroModels(),
    getOllamaModels(),
  ]);

  const result: LocalModelInfoExtended[] = [];
  if (cocoroResult.status === 'fulfilled') result.push(...cocoroResult.value);
  if (ollamaResult.status === 'fulfilled') result.push(...ollamaResult.value);
  return result;
}

/**
 * cocoro-OS が起動しているか確認する
 */
export async function isCocoroAvailable(): Promise<boolean> {
  try {
    const res = await fetch('http://localhost:8001/health', {
      signal: AbortSignal.timeout(2000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Ollama が起動しているか確認する
 */
export async function isOllamaAvailable(): Promise<boolean> {
  try {
    const res = await fetch('http://localhost:11434/api/tags', {
      signal: AbortSignal.timeout(2000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Ollama のモデル一覧を取得する
 */
export async function getOllamaModels(): Promise<LocalModelInfoExtended[]> {
  try {
    const res = await fetch('http://localhost:11434/api/tags', {
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { models: { name: string; size?: number }[] };
    return data.models.map((m) => ({ provider: 'ollama' as const, name: m.name, size: m.size }));
  } catch {
    return [];
  }
}

/**
 * cocoro-OS のモデル一覧を内部取得する
 */
async function detectCocoroModels(): Promise<LocalModelInfoExtended[]> {
  try {
    const healthRes = await fetch('http://localhost:8001/health', {
      signal: AbortSignal.timeout(2000),
    });
    if (!healthRes.ok) return [];
    const modelsRes = await fetch('http://localhost:8001/v1/models', {
      signal: AbortSignal.timeout(2000),
    });
    if (!modelsRes.ok) return [];
    const data = (await modelsRes.json()) as { data: { id: string }[] };
    return data.data.map((m) => ({ provider: 'cocoro' as const, name: m.id }));
  } catch {
    return [];
  }
}
