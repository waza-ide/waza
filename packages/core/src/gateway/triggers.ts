/**
 * Gateway Triggers — Codex Mode Phase 2
 *
 * Pure functions that decide whether an AgentAction must pass through
 * the Review Gateway before execution.
 *
 * Design rules (Codex spec §4.2.1):
 * - write_file / delete_file → always review
 * - run_shell  → review if command contains a dangerous token
 * - git_cmd    → review if subcommand is destructive
 * - read_file  → never review
 * - Batch: any batch with 2+ mutating actions → always review
 */
import type { TaskAction } from '../task/types.js';

// ─── Token lists ──────────────────────────────────────────────────────────

/**
 * Shell tokens that indicate a destructive or irreversible side-effect.
 * Kept as a readonly tuple so tests can import and cross-check against it.
 */
export const DANGEROUS_SHELL_TOKENS = [
  // Deletion / movement
  'rm',
  'rmdir',
  'mv',
  'unlink',
  // Privilege escalation
  'sudo',
  'su',
  'chmod',
  'chown',
  'chgrp',
  // Redirection overwrite
  '>',
  '>>',
  // Kill / signal
  'kill',
  'killall',
  'pkill',
  // Install / uninstall
  'apt',
  'apt-get',
  'dpkg',
  'brew',
  'pip',
  'npm',
  'npx',
  'pnpm',
  'yarn',
  // Disk / partition
  'dd',
  'mkfs',
  'fdisk',
  'parted',
  'shred',
  // Network mutation
  'curl',
  'wget',
  'ssh',
  'scp',
  'rsync',
  // Cron / scheduler
  'crontab',
  // Shell eval patterns
  'eval',
  'exec',
  'source',
  '. ',   // POSIX source shorthand (". foo.sh")
] as const;

/**
 * Git subcommands that mutate history or remote state.
 */
export const DANGEROUS_GIT_SUBCOMMANDS = [
  'commit',
  'push',
  'push --force',
  'force-push',
  'checkout',
  'switch',
  'branch -D',
  'branch -d',
  'reset',
  'revert',
  'clean',
  'stash drop',
  'stash clear',
  'tag -d',
  'tag -f',
  'merge',
  'rebase',
  'cherry-pick',
  'am',
  'apply',
  'rm',
  'mv',
  'submodule deinit',
  'worktree remove',
] as const;

// ─── Single-action judgment ───────────────────────────────────────────────

/**
 * Returns true when the action must pass through Review Gateway before
 * being dispatched to the file-system or shell.
 *
 * @pure — no side effects, safe to call in tests without mocking.
 */
export function requiresReview(action: TaskAction): boolean {
  switch (action.type) {
    case 'write_file':
    case 'delete_file':
      return true;

    case 'run_shell': {
      const cmd = action.command;
      return DANGEROUS_SHELL_TOKENS.some((token) => {
        // Redirection operators: substring match is sufficient
        if (token === '>' || token === '>>') {
          return cmd.includes(token);
        }
        // POSIX source shorthand ". script.sh" — starts-with or preceded by delimiter
        if (token === '. ') {
          return /(?:^|[;|&]\s*)\. /.test(cmd);
        }
        // Escape special regex chars in the token
        const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // Some commands have dot-variants (e.g. mkfs.ext4, mkfs.vfat).
        // Match as word-start; following char may be dot, whitespace, or delimiter.
        const re = new RegExp(`(?:^|[\\s;|&])${escaped}(?:[\\s;|&.$]|$)`);
        return re.test(cmd);
      });
    }

    case 'git_cmd': {
      const joined = action.args.join(' ');
      return DANGEROUS_GIT_SUBCOMMANDS.some((sub) => {
        // args[0] must be the git subcommand (or args may include flags)
        const escaped = sub.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const re = new RegExp(`(?:^|\\s)${escaped}(?:\\s|$)`);
        return re.test(joined) || action.args[0] === sub.split(' ')[0];
      });
    }

    case 'read_file':
      return false;
  }
}

// ─── Batch judgment ───────────────────────────────────────────────────────

/**
 * Returns true when a batch of actions collectively requires review.
 *
 * Rule: 2+ mutating actions (write/delete) in a single batch → always review,
 * even if each individual action would pass alone (Codex spec §4.1).
 */
export function batchRequiresReview(actions: TaskAction[]): boolean {
  if (actions.length === 0) return false;
  const mutating = actions.filter(
    (a) => a.type === 'write_file' || a.type === 'delete_file'
  );
  if (mutating.length > 1) return true;
  return actions.some(requiresReview);
}

// ─── Reason helper ────────────────────────────────────────────────────────

/**
 * Returns a human-readable explanation for why an action requires review.
 * Used in ReviewModal to give the user context.
 */
export function reviewReason(action: TaskAction): string {
  switch (action.type) {
    case 'write_file':
      return `Writing to file: ${action.path}`;
    case 'delete_file':
      return `Deleting file: ${action.path}`;
    case 'run_shell':
      return `Shell command may have destructive side-effects: ${action.command}`;
    case 'git_cmd':
      return `Git command mutates history or remote: git ${action.args.join(' ')}`;
    case 'read_file':
      return 'No review required (read-only)';
  }
}
