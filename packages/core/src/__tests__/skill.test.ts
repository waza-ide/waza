/**
 * skill.test.ts — Skill injection tests (Phase 4)
 *
 * Verifies:
 * - buildSkillPrompt() correctly combines enabled skills
 * - injectSkills() prepends skill block to base prompt
 * - Disabled skills are excluded
 * - Unknown skill IDs are ignored
 * - Minimum viable skill: "Always respond in JSON"
 */
import { describe, it, expect } from 'vitest';
import {
  buildSkillPrompt,
  injectSkills,
  BUILTIN_SKILLS,
} from '../skill/types.js';
import type { Skill } from '../skill/types.js';

// ── Helpers ────────────────────────────────────────────────────────────────

function makeSkill(override: Partial<Skill> = {}): Skill {
  return {
    id:        'skill-1',
    name:      'Test Skill',
    content:   'Always respond in JSON.',
    enabled:   true,
    createdAt: 0,
    updatedAt: 0,
    ...override,
  };
}

// ── buildSkillPrompt ───────────────────────────────────────────────────────

describe('buildSkillPrompt', () => {
  it('returns empty string when no skills IDs provided', () => {
    const skills = [makeSkill()];
    expect(buildSkillPrompt([], skills)).toBe('');
  });

  it('returns empty string when registry is empty', () => {
    expect(buildSkillPrompt(['skill-1'], [])).toBe('');
  });

  it('returns empty string when skill is disabled', () => {
    const skill = makeSkill({ enabled: false });
    expect(buildSkillPrompt(['skill-1'], [skill])).toBe('');
  });

  it('ignores unknown skill IDs', () => {
    const skill = makeSkill({ id: 'real-skill' });
    expect(buildSkillPrompt(['ghost-skill'], [skill])).toBe('');
  });

  it('includes enabled skill content', () => {
    const skill = makeSkill({ id: 's1', content: 'Respond in JSON only.' });
    const result = buildSkillPrompt(['s1'], [skill]);
    expect(result).toContain('Respond in JSON only.');
  });

  it('includes skill name in the output', () => {
    const skill = makeSkill({ id: 's1', name: 'JSON Mode' });
    const result = buildSkillPrompt(['s1'], [skill]);
    expect(result).toContain('JSON Mode');
  });

  it('combines multiple enabled skills', () => {
    const s1 = makeSkill({ id: 's1', name: 'Skill A', content: 'Rule A.' });
    const s2 = makeSkill({ id: 's2', name: 'Skill B', content: 'Rule B.' });
    const result = buildSkillPrompt(['s1', 's2'], [s1, s2]);
    expect(result).toContain('Rule A.');
    expect(result).toContain('Rule B.');
  });

  it('respects the ID ordering in skillIds arg', () => {
    const s1 = makeSkill({ id: 's1', content: 'First rule.' });
    const s2 = makeSkill({ id: 's2', content: 'Second rule.' });
    const result = buildSkillPrompt(['s1', 's2'], [s1, s2]);
    expect(result.indexOf('First rule.')).toBeLessThan(result.indexOf('Second rule.'));
  });

  it('skips only the disabled skill in a mixed list', () => {
    const active   = makeSkill({ id: 'a', name: 'Active',   enabled: true  });
    const disabled = makeSkill({ id: 'd', name: 'Disabled', enabled: false });
    const result = buildSkillPrompt(['a', 'd'], [active, disabled]);
    expect(result).toContain('Active');
    expect(result).not.toContain('Disabled');
  });
});

// ── injectSkills ──────────────────────────────────────────────────────────

describe('injectSkills', () => {
  const BASE = 'You are Waza, an AI coding assistant.';

  it('returns base prompt unchanged when no skills match', () => {
    expect(injectSkills(BASE, [], [])).toBe(BASE);
  });

  it('prepends skill block before base prompt', () => {
    const skill = makeSkill({ id: 's1', content: 'Respond in JSON.' });
    const result = injectSkills(BASE, ['s1'], [skill]);
    expect(result.indexOf('Respond in JSON.')).toBeLessThan(result.indexOf(BASE));
  });

  it('includes a separator between skills and base', () => {
    const skill = makeSkill({ id: 's1' });
    const result = injectSkills(BASE, ['s1'], [skill]);
    expect(result).toContain('---');
  });

  it('minimum viable skill: "Always respond in JSON"', () => {
    const jsonSkill: Skill = {
      ...BUILTIN_SKILLS.find(s => s.id === 'json-only')!,
      enabled: true,
    };
    const result = injectSkills(BASE, ['json-only'], [jsonSkill]);
    expect(result).toContain('valid JSON');
    expect(result).toContain(BASE);
  });

  it('returns base when all referenced skills are disabled', () => {
    const dead = makeSkill({ id: 's1', enabled: false });
    expect(injectSkills(BASE, ['s1'], [dead])).toBe(BASE);
  });
});

// ── BUILTIN_SKILLS ────────────────────────────────────────────────────────

describe('BUILTIN_SKILLS', () => {
  it('contains json-only skill', () => {
    expect(BUILTIN_SKILLS.find(s => s.id === 'json-only')).toBeDefined();
  });

  it('contains concise skill', () => {
    expect(BUILTIN_SKILLS.find(s => s.id === 'concise')).toBeDefined();
  });

  it('contains test-first skill', () => {
    expect(BUILTIN_SKILLS.find(s => s.id === 'test-first')).toBeDefined();
  });

  it('all builtin skills are disabled by default', () => {
    expect(BUILTIN_SKILLS.every(s => !s.enabled)).toBe(true);
  });

  it('all builtin skills have non-empty content', () => {
    expect(BUILTIN_SKILLS.every(s => s.content.trim().length > 0)).toBe(true);
  });
});
