/**
 * Structured Logger — Codex Mode Phase 1
 *
 * Pluggable LogSink[] architecture:
 * - Default: console sink (development)
 * - Tests: capture sink (no output, inspect entries)
 * - Future: IPC sink (push to Renderer via task:update)
 */
import type { LogEntry, LogLevel, LogSource } from '../task/types.js';

export type LogSink = (entry: LogEntry) => void;

/** Console sink — pretty-prints to stdout */
export const consoleSink: LogSink = (entry: LogEntry): void => {
  const prefix = `[${entry.level.toUpperCase()}][${entry.source}]`;
  const msg = `${prefix} ${entry.message}`;
  switch (entry.level) {
    case 'error': console.error(msg, entry.metadata ?? ''); break;
    case 'warn':  console.warn(msg,  entry.metadata ?? ''); break;
    case 'debug': console.debug(msg, entry.metadata ?? ''); break;
    default:      console.log(msg,   entry.metadata ?? ''); break;
  }
};

/**
 * Logger — emits structured LogEntry objects to registered sinks.
 *
 * @example
 * const logger = new Logger([consoleSink]);
 * logger.info('llm', 'Request sent', { model: 'gpt-4o' });
 */
export class Logger {
  private readonly sinks: LogSink[];

  constructor(sinks: LogSink[] = [consoleSink]) {
    this.sinks = sinks;
  }

  log(
    level: LogLevel,
    source: LogSource,
    message: string,
    metadata?: Record<string, unknown>
  ): LogEntry {
    const entry: LogEntry = {
      id:        crypto.randomUUID(),
      timestamp: Date.now(),
      level,
      source,
      message,
      ...(metadata !== undefined ? { metadata } : {}),
    };
    for (const sink of this.sinks) {
      sink(entry);
    }
    return entry;
  }

  info(source: LogSource, message: string, metadata?: Record<string, unknown>): LogEntry {
    return this.log('info', source, message, metadata);
  }

  warn(source: LogSource, message: string, metadata?: Record<string, unknown>): LogEntry {
    return this.log('warn', source, message, metadata);
  }

  error(source: LogSource, message: string, metadata?: Record<string, unknown>): LogEntry {
    return this.log('error', source, message, metadata);
  }

  debug(source: LogSource, message: string, metadata?: Record<string, unknown>): LogEntry {
    return this.log('debug', source, message, metadata);
  }
}

/** Convenience: create a capturing sink for tests */
export function createCaptureSink(): { sink: LogSink; entries: LogEntry[] } {
  const entries: LogEntry[] = [];
  const sink: LogSink = (entry) => { entries.push(entry); };
  return { sink, entries };
}
