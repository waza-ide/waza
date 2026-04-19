# 告知テキスト — Waza v1.5.0

---

## X (Twitter) 用（280文字目安）

```
Waza v1.5.0 リリース 🎉

✅ Codex風UI — ライト/ダークテーマ + OSテーマ自動検知
✅ モデルピッカー — auto/cocoro/Ollama/Claude/Gemini を直接選択
✅ LocalProvider — OpenAI互換サーバーを local-first でルーティング
✅ qwen25-72b 実機で疎通確認済み（192.168.50.112:8000）
✅ 375テスト全green

VSCode Extension (.vsix) + Linux Desktop (.deb) で配布中
https://github.com/waza-ide/waza/releases/tag/v1.5.0

#OSS #AIcoding #LocalLLM #PrivacyFirst
```

---

## Zenn / GitHub Discussions 用

### Waza v1.5.0 — プライバシーファーストなAI IDE、Codex風UIにリニューアル

mdl-systems が開発する OSS の AI IDE「Waza（技）」の **v1.5.0** をリリースしました。

#### Waza とは

コードがクラウドに送られることなく、**ローカルモデルを優先**して動作する AI IDE です。
Cursor / Windsurf / Codex のようなエージェント型コーディング体験を、プライバシーを守りながら実現します。

#### v1.5.0 の主な変更点

**🎨 UI を Codex に合わせて全面リニューアル**
- TitleBar / Sidebar / StatusBar / WelcomeScreen を Codex アプリのレイアウトに準拠
- ライト/ダークテーマ対応（OS テーマ自動検知 + 手動トグル）
- Monaco エディタのテーマも連動 (`vs` / `vs-dark`)

**🤖 モデルピッカー**
- Composer 内にインラインドロップダウンを実装
- `auto` / `cocoro-OS` / `Ollama` / `Claude Sonnet` / `Claude Opus` / `Gemini 2.0 Flash` を直接選択可能

**🖥️ LocalProvider — ローカル LLM 優先ルーティング**
- `LocalProvider`: `GET /v1/models` で死活確認、SSE ストリーミング対応
- `ModelRouter.routeWithPreference()`: ローカル優先→失敗時クラウドフォールバック
- VSCode 設定 `waza.preferLocalModel` で切り替え
- `WAZA_LOCAL_API_KEY` 環境変数対応

**実機動作確認（cocoro-llm-server、Qwen 2.5 72B AWQ）**

```bash
curl http://192.168.50.112:8000/v1/chat/completions \
  -H "Authorization: Bearer mdl-llm-2026" \
  -d '{"model":"qwen25-72b","messages":[...]}'
# → "こんにちは、Qwenです。"  ✅
```

**📊 テスト**
- 375/375 通過（ `@waza/core` 213 + `@waza/desktop` 132 + ...）

---

#### インストール

```bash
# VSCode Extension
code --install-extension waza-1.5.0.vsix

# Debian / Ubuntu
sudo dpkg -i waza_1.5.0_amd64.deb
waza
```

#### GitHub
<https://github.com/waza-ide/waza>

フィードバック・コントリビュート大歓迎です 🙏

---

## GitHub Release タイトル

```
Waza v1.5.0 — Codex-inspired UI + Light/Dark theme + Local model support
```
