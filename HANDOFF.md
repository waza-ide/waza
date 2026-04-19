# Waza — セッション引き継ぎ

## 最終更新
- 日時: 2026-04-19
- 担当エージェント: Antigravity (GitHub Release v1.5.0)
- Branch: `phase-11-codex-ui`
- Release: **v1.5.0 — リリース準備完了**

## バージョン履歴

| Tag | Branch | 内容 |
|---|---|---|
| v0.6.0 | codex-mode/phase-1-foundation | Task/Step 型 + Zustand + Logger |
| v0.7.0 | codex-mode/phase-2-gateway | Review Gateway |
| v0.8.0 | codex-mode/phase-3-scheduler | TaskQueue + IPC |
| v0.9.0 | codex-mode/phase-4-skill-automation | Skill / Automation / Telemetry |
| v1.0.0 | codex-mode/phase-5-ui-integration | UI MVP 完成 |
| **v1.5.0** | **phase-11-codex-ui** | **Codex UI + LocalProvider + GitHub Release** |

## 生成アーティファクト (v1.5.0)

| ファイル | サイズ | 場所 |
|---|---|---|
| `waza-1.5.0.vsix` | 398 KB | `packages/extension/` |
| `waza_1.5.0_amd64.deb` | 81 MB | `packages/desktop/release/` |
| `waza_1.5.0_x86_64.AppImage` | 120 MB | `packages/desktop/release/` |

## GitHub Release 手順（gh CLI 未インストールのため手動）

`gh` のインストール（要 sudo パスワード）:
```bash
sudo apt-get install -y gh
gh auth login
```

インストール後のリリースコマンド:
```bash
gh release create v1.5.0 \
  packages/extension/waza-1.5.0.vsix \
  packages/desktop/release/waza_1.5.0_amd64.deb \
  packages/desktop/release/waza_1.5.0_x86_64.AppImage \
  --title "Waza v1.5.0 — Codex-inspired UI + Light/Dark theme + Local model support" \
  --notes-file docs/release-notes/v1.5.0.md \
  --repo waza-ide/waza

# push タグも送る
git push origin phase-11-codex-ui
git push origin v1.5.0
```

または手動: https://github.com/waza-ide/waza/releases/new
- Tag: `v1.5.0`
- Title: `Waza v1.5.0 — Codex-inspired UI + Light/Dark theme + Local model support`
- Description: `docs/release-notes/v1.5.0.md` の内容を貼り付け
- Assets: vsix + deb + AppImage をアップロード

過去の Draft Release 整理:
```bash
for v in v0.1.0 v0.2.0 v0.3.0 v0.4.0 v0.5.0 v0.5.1 v0.5.2 v0.5.3 v0.5.4; do
  gh release delete $v --repo waza-ide/waza --yes 2>/dev/null && echo "deleted $v"
done
```

## リリースドキュメント

| ファイル | 内容 |
|---|---|
| `docs/release-notes/v1.5.0.md` | English リリースノート (GitHub Release 掲載用) |
| `docs/release-notes/announce_v150.md` | X / Zenn / GitHub Discussions 告知テキスト |
| `README.md` | v1.5.0 対応全面更新済み |

## テスト (375/375 ✅)

| パッケージ | テスト数 |
|---|---|
| core | 213 |
| desktop | 132 |
| extension | 15 |
| cocoro-bridge | 10 |
| ui | 5 |
| **Total** | **375** |

## cocoro-llm-server 接続

| 項目 | 値 |
|---|---|
| エンドポイント | http://192.168.50.112:8000/v1 |
| モデル | qwen25-72b |
| ヘルスチェック | GET /v1/models |
| API キー | 環境変数 `WAZA_LOCAL_API_KEY` |

## 残件 (v1.6.0)

1. GitHub Release v1.5.0 正式公開（`gh release create` 実行）
2. 過去 Draft Release クリーンアップ
3. **Automation Engine** — cron/file-watch を Main process で実装
4. **task:update applyPatch()** — IPC push → taskStore 自動更新
5. **TaskRunner drain-loop** — 真の非同期スケジューリング
6. **SkillsPanel カスタム Skill 永続化** — localStorage
7. **StatusBar branch 表示** — `wazaAPI.git.branch()` IPC

## 注意事項

- **FROZEN**: `base.ts` / `models/types.ts` / `extension.ts`
- **gitignore**: `.vscode/settings.json` → `.vscode/settings.json.example` 参照
- **qwen25-72b** が正式モデル名（gpt-4o エイリアス非推奨）
- `useTheme()` 経由で tokens を取得。ハードコード色禁止
- StatusBar cocoro 死活: GET /v1/models (not /health)
- pnpm: `~/.local/share/pnpm/pnpm` (PATH export 必須)
- core build → test 順序を守ること
