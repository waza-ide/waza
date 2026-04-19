/**
 * SkillsPanel — Codex Mode Phase 5
 *
 * Displays built-in and custom Skills. Allows toggling, preview,
 * and creating new custom skills.
 *
 * Rendered inside SettingsPanel under the "Skills" section.
 */
import { useState } from 'react';
import { useTheme } from '../../context/ThemeContext.js';
import { useSettings } from '../../context/SettingsContext.js';
import { BUILTIN_SKILLS } from '@waza/core';
import type { Skill } from '@waza/core';

// ─── Types ────────────────────────────────────────────────────────────────

interface SkillCardProps {
  skill: Skill;
  active: boolean;
  onToggle: () => void;
}

// ─── SkillCard ────────────────────────────────────────────────────────────

function SkillCard({ skill, active, onToggle }: SkillCardProps): JSX.Element {
  const { tokens } = useTheme();
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{
      borderRadius: tokens.radius.md,
      border: `1px solid ${active ? tokens.color.accent.blue + '55' : tokens.color.bg.border}`,
      background: active ? tokens.color.accent.blue + '08' : tokens.color.bg.surface,
      overflow: 'hidden',
      transition: 'border-color 150ms, background 150ms',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: tokens.space.sm,
        padding: `${tokens.space.sm}px ${tokens.space.md}px`,
      }}>
        {/* Toggle */}
        <div
          id={`skill-toggle-${skill.id}`}
          onClick={onToggle}
          title={active ? 'Disable skill' : 'Enable skill'}
          style={{
            width: 32,
            height: 18,
            borderRadius: tokens.radius.full,
            background: active ? tokens.color.accent.blue : tokens.color.bg.border,
            position: 'relative',
            flexShrink: 0,
            cursor: 'pointer',
            transition: 'background 150ms ease',
          }}
        >
          <div style={{
            position: 'absolute',
            top: 2,
            left: active ? 16 : 2,
            width: 14,
            height: 14,
            borderRadius: '50%',
            background: '#fff',
            boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
            transition: 'left 150ms ease',
          }} />
        </div>

        {/* Name */}
        <span style={{
          flex: 1,
          fontSize: tokens.font.size.sm,
          fontWeight: tokens.font.weight.medium,
          color: tokens.color.text.primary,
        }}>
          {skill.name}
        </span>

        {/* Active badge */}
        {active && (
          <span style={{
            fontSize: 10,
            fontWeight: 600,
            color: tokens.color.accent.blue,
            background: tokens.color.accent.blue + '18',
            padding: '2px 7px',
            borderRadius: tokens.radius.full,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
          }}>
            Active
          </span>
        )}

        {/* Expand */}
        <button
          id={`skill-expand-${skill.id}`}
          onClick={() => setExpanded(v => !v)}
          style={{
            color: tokens.color.text.tertiary,
            fontSize: 11,
            padding: '2px 6px',
            borderRadius: tokens.radius.sm,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            lineHeight: 1,
            fontFamily: tokens.font.mono,
          }}
          title={expanded ? 'Collapse' : 'Preview prompt'}
        >
          {expanded ? '▲' : '▼'}
        </button>
      </div>

      {/* Preview */}
      {expanded && (
        <div style={{
          padding: `0 ${tokens.space.md}px ${tokens.space.md}px`,
          borderTop: `1px solid ${tokens.color.bg.borderSub}`,
          marginTop: 0,
        }}>
          <pre style={{
            margin: '8px 0 0',
            fontSize: tokens.font.size.xs,
            color: tokens.color.text.tertiary,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            fontFamily: tokens.font.mono,
            background: tokens.color.bg.base,
            borderRadius: tokens.radius.sm,
            padding: `${tokens.space.sm}px ${tokens.space.md}px`,
            maxHeight: 140,
            overflow: 'auto',
          }}>
            {skill.content}
          </pre>
        </div>
      )}
    </div>
  );
}

// ─── SkillsPanel ──────────────────────────────────────────────────────────

export function SkillsPanel(): JSX.Element {
  const { tokens } = useTheme();
  const { settings, toggleSkill } = useSettings();
  const [customSkills, setCustomSkills] = useState<Skill[]>([]);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newContent, setNewContent] = useState('');

  const allSkills: Skill[] = [...BUILTIN_SKILLS, ...customSkills];
  const activeCount = settings.activeSkillIds.length;

  function handleCreateSkill(): void {
    if (!newName.trim() || !newContent.trim()) return;
    const skill: Skill = {
      id:        `custom-${Date.now()}`,
      name:      newName.trim(),
      content:   newContent.trim(),
      enabled:   false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setCustomSkills(prev => [...prev, skill]);
    setNewName('');
    setNewContent('');
    setCreating(false);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.space.md }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: tokens.font.size.sm, color: tokens.color.text.secondary }}>
            Skills are system-prompt fragments injected when a task runs.
          </div>
          {activeCount > 0 && (
            <div style={{
              fontSize: tokens.font.size.xs,
              color: tokens.color.accent.blue,
              marginTop: 4,
            }}>
              {activeCount} skill{activeCount !== 1 ? 's' : ''} active
            </div>
          )}
        </div>
        <button
          id="skill-create-btn"
          onClick={() => setCreating(v => !v)}
          style={{
            padding: `${tokens.space.xs}px ${tokens.space.md}px`,
            borderRadius: tokens.radius.md,
            border: `1px solid ${tokens.color.accent.blue}55`,
            background: creating ? tokens.color.accent.blue + '18' : 'transparent',
            color: tokens.color.accent.blue,
            fontSize: tokens.font.size.sm,
            fontWeight: tokens.font.weight.medium,
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          {creating ? 'Cancel' : '+ New Skill'}
        </button>
      </div>

      {/* Create form */}
      {creating && (
        <div style={{
          padding: tokens.space.md,
          borderRadius: tokens.radius.md,
          border: `1px solid ${tokens.color.accent.blue}44`,
          background: tokens.color.accent.blue + '06',
          display: 'flex',
          flexDirection: 'column',
          gap: tokens.space.sm,
        }}>
          <input
            id="skill-name-input"
            placeholder="Skill name..."
            value={newName}
            onChange={e => setNewName(e.target.value)}
            style={{
              padding: '6px 10px',
              borderRadius: tokens.radius.md,
              border: `1px solid ${tokens.color.bg.border}`,
              background: tokens.color.bg.base,
              color: tokens.color.text.primary,
              fontSize: tokens.font.size.sm,
              outline: 'none',
              fontFamily: tokens.font.sans,
            }}
          />
          <textarea
            id="skill-content-input"
            placeholder="System prompt content..."
            value={newContent}
            onChange={e => setNewContent(e.target.value)}
            rows={4}
            style={{
              padding: '6px 10px',
              borderRadius: tokens.radius.md,
              border: `1px solid ${tokens.color.bg.border}`,
              background: tokens.color.bg.base,
              color: tokens.color.text.primary,
              fontSize: tokens.font.size.sm,
              outline: 'none',
              fontFamily: tokens.font.mono,
              resize: 'vertical',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              id="skill-save-btn"
              onClick={handleCreateSkill}
              disabled={!newName.trim() || !newContent.trim()}
              style={{
                padding: `${tokens.space.xs}px ${tokens.space.md}px`,
                borderRadius: tokens.radius.md,
                border: 'none',
                background: tokens.color.accent.blue,
                color: '#fff',
                fontSize: tokens.font.size.sm,
                fontWeight: tokens.font.weight.medium,
                cursor: 'pointer',
                opacity: !newName.trim() || !newContent.trim() ? 0.5 : 1,
              }}
            >
              Save Skill
            </button>
          </div>
        </div>
      )}

      {/* Skill list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.space.sm }}>
        {/* Built-in */}
        <div style={{
          fontSize: tokens.font.size.xs,
          fontWeight: 600,
          color: tokens.color.text.tertiary,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          paddingBottom: tokens.space.xs,
        }}>
          Built-in Skills
        </div>
        {BUILTIN_SKILLS.map(skill => (
          <SkillCard
            key={skill.id}
            skill={skill}
            active={settings.activeSkillIds.includes(skill.id)}
            onToggle={() => toggleSkill(skill.id)}
          />
        ))}

        {/* Custom */}
        {customSkills.length > 0 && (
          <>
            <div style={{
              fontSize: tokens.font.size.xs,
              fontWeight: 600,
              color: tokens.color.text.tertiary,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              paddingBottom: tokens.space.xs,
              paddingTop: tokens.space.sm,
            }}>
              Custom Skills
            </div>
            {customSkills.map(skill => (
              <SkillCard
                key={skill.id}
                skill={skill}
                active={settings.activeSkillIds.includes(skill.id)}
                onToggle={() => toggleSkill(skill.id)}
              />
            ))}
          </>
        )}
      </div>

      {/* Helper note */}
      {allSkills.length > 0 && activeCount === 0 && (
        <div style={{
          fontSize: tokens.font.size.xs,
          color: tokens.color.text.tertiary,
          textAlign: 'center',
          padding: `${tokens.space.sm}px 0`,
          fontStyle: 'italic',
        }}>
          Toggle a skill on to inject it into every agent task.
        </div>
      )}
    </div>
  );
}
