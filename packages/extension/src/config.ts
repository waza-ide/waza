/**
 * config.ts — VSCode workspace 設定の読み取り (Waza Extension)
 *
 * 読み取るキー:
 *   waza.preferLocalModel  boolean  default: false
 *   waza.localModelUrl     string   default: ""
 *   waza.localModel        string   default: "qwen25-72b"
 *   waza.localApiKey       string   default: ""
 *
 * セキュリティ:
 *   - API キーのハードコード禁止
 *   - localApiKey は WAZA_LOCAL_API_KEY 環境変数を優先する
 */
import * as vscode from 'vscode';

export interface WazaConfig {
  /** ローカルモデルを優先するか (false → クラウドを使用) */
  preferLocalModel: boolean;
  /** LiteLLM ゲートウェイの base URL */
  localModelUrl: string;
  /** モデル名 (例: "qwen25-72b") */
  localModel: string;
  /**
   * Bearer トークン
   * 優先度: 環境変数 WAZA_LOCAL_API_KEY > VSCode 設定 waza.localApiKey
   */
  localApiKey: string;
}

const SECTION = 'waza';

/**
 * 現在の VSCode ワークスペース設定を読み取り WazaConfig を返す。
 * テスト時は workspace.getConfiguration のモックを注入できる。
 */
export function readConfig(
  cfg: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration(SECTION)
): WazaConfig {
  const localApiKey =
    process.env['WAZA_LOCAL_API_KEY'] ??
    cfg.get<string>('localApiKey', '');

  return {
    preferLocalModel: cfg.get<boolean>('preferLocalModel', false),
    localModelUrl:    cfg.get<string>('localModelUrl', ''),
    localModel:       cfg.get<string>('localModel', 'qwen25-72b'),
    localApiKey,
  };
}
