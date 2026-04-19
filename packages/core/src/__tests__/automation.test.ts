/**
 * automation.test.ts — Automation type and prompt renderer tests (Phase 4)
 */
import { describe, it, expect } from 'vitest';
import { renderAutomationPrompt } from '../automation/types.js';
import type { Automation, CronTrigger, FileWatchTrigger, GitHookTrigger } from '../automation/types.js';

// ── renderAutomationPrompt ────────────────────────────────────────────────

describe('renderAutomationPrompt', () => {
  it('replaces a single placeholder', () => {
    const result = renderAutomationPrompt('Review {{event}} changes', { event: 'commit' });
    expect(result).toBe('Review commit changes');
  });

  it('replaces multiple placeholders', () => {
    const result = renderAutomationPrompt(
      'Files changed: {{files}}, trigger: {{event}}',
      { files: 'src/index.ts', event: 'post-commit' }
    );
    expect(result).toBe('Files changed: src/index.ts, trigger: post-commit');
  });

  it('leaves unknown placeholder unchanged', () => {
    const result = renderAutomationPrompt('Hello {{name}}', {});
    expect(result).toBe('Hello {{name}}');
  });

  it('handles template with no placeholders', () => {
    expect(renderAutomationPrompt('No placeholders here.', {})).toBe('No placeholders here.');
  });

  it('handles empty template', () => {
    expect(renderAutomationPrompt('', { event: 'test' })).toBe('');
  });

  it('replaces same placeholder multiple times', () => {
    const result = renderAutomationPrompt('{{x}} and {{x}}', { x: 'foo' });
    expect(result).toBe('foo and foo');
  });
});

// ── Automation type shapes ────────────────────────────────────────────────

describe('Automation trigger types', () => {
  it('CronTrigger has required expression field', () => {
    const t: CronTrigger = { type: 'cron', expression: '0 */1 * * *' };
    expect(t.type).toBe('cron');
    expect(t.expression).toBeTruthy();
  });

  it('FileWatchTrigger has patterns and events', () => {
    const t: FileWatchTrigger = {
      type: 'file-watch',
      patterns: ['src/**/*.ts'],
      debounceMs: 500,
      events: ['change'],
    };
    expect(t.patterns).toHaveLength(1);
    expect(t.events).toContain('change');
  });

  it('GitHookTrigger supports post-commit', () => {
    const t: GitHookTrigger = { type: 'git-hook', hook: 'post-commit' };
    expect(t.hook).toBe('post-commit');
  });

  it('Automation entity has required fields', () => {
    const a: Automation = {
      id: 'auto-1',
      name: 'Daily review',
      enabled: true,
      status: 'active',
      trigger: { type: 'cron', expression: '0 9 * * *' },
      task: {
        prompt: 'Review {{files}}',
        modelId: 'auto',
        skills: [],
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    expect(a.id).toBe('auto-1');
    expect(a.trigger.type).toBe('cron');
    expect(a.task.prompt).toContain('{{files}}');
  });
});
