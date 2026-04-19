/**
 * Skill types — Codex Mode Phase 4
 *
 * Skills are reusable system-prompt fragments that are injected into
 * the LLM context when a Task references them by ID.
 *
 * Example: Skill { id: 'json-only', name: 'Always respond in JSON', content: '...' }
 *
 * Skill IDs are stored in Task.skills[]. At runtime, the Skill content
 * is concatenated with the base system prompt before the first LLM call.
 */

// ─── Skill entity ─────────────────────────────────────────────────────────

export interface Skill {
  id:      string;
  name:    string;
  /** Markdown/plain-text content injected into the system prompt */
  content: string;
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
}

// ─── System prompt injection ───────────────────────────────────────────────

/**
 * Resolve a list of Skill IDs against the skill registry and build the
 * combined skill section to prepend to the system prompt.
 *
 * Returns empty string if no skills are active or matched.
 *
 * @param skillIds   IDs referenced by the current Task
 * @param allSkills  Full registry of Skills (from WazaSettings or store)
 */
export function buildSkillPrompt(
  skillIds: string[],
  allSkills: Skill[]
): string {
  if (skillIds.length === 0) return '';

  const usedSkills = skillIds
    .map(id => allSkills.find(s => s.id === id))
    .filter((s): s is Skill => s !== undefined && s.enabled);

  if (usedSkills.length === 0) return '';

  const sections = usedSkills
    .map(s => `## Skill: ${s.name}\n${s.content.trim()}`)
    .join('\n\n');

  return `# Active Skills\n\n${sections}`;
}

/**
 * Inject skill system-prompt sections into a base system prompt.
 *
 * The skill block is prepended so it takes precedence over the base prompt.
 */
export function injectSkills(
  basePrompt: string,
  skillIds: string[],
  allSkills: Skill[]
): string {
  const skillBlock = buildSkillPrompt(skillIds, allSkills);
  if (!skillBlock) return basePrompt;
  return `${skillBlock}\n\n---\n\n${basePrompt}`;
}

// ─── Default built-in skills ───────────────────────────────────────────────

export const BUILTIN_SKILLS: Skill[] = [
  {
    id:      'json-only',
    name:    'Always respond in JSON',
    content: 'You MUST respond with valid JSON only. No prose, no markdown fences, no explanations outside the JSON structure.',
    enabled: false,
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id:      'concise',
    name:    'Concise responses',
    content: 'Keep all responses as concise as possible. Avoid verbose explanations. Prefer code over prose.',
    enabled: false,
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id:      'test-first',
    name:    'Test-driven development',
    content: 'Always write tests before implementation. Never produce implementation code without a corresponding test file.',
    enabled: false,
    createdAt: 0,
    updatedAt: 0,
  },
];
