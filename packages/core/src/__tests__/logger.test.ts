import { describe, it, expect, vi } from 'vitest';
import { Logger, createCaptureSink, consoleSink } from '../../src/logging/logger.js';

describe('Logger', () => {
  it('calls the sink with a LogEntry', () => {
    const { sink, entries } = createCaptureSink();
    const logger = new Logger([sink]);
    logger.info('system', 'Hello');
    expect(entries).toHaveLength(1);
    expect(entries[0]!.message).toBe('Hello');
    expect(entries[0]!.source).toBe('system');
    expect(entries[0]!.level).toBe('info');
  });

  it('generates a unique id for each entry', () => {
    const { sink, entries } = createCaptureSink();
    const logger = new Logger([sink]);
    logger.info('llm', 'A');
    logger.info('llm', 'B');
    expect(entries[0]!.id).not.toBe(entries[1]!.id);
  });

  it('sets timestamp to a recent unix ms', () => {
    const { sink, entries } = createCaptureSink();
    const before = Date.now();
    new Logger([sink]).info('system', 'ts test');
    const after = Date.now();
    expect(entries[0]!.timestamp).toBeGreaterThanOrEqual(before);
    expect(entries[0]!.timestamp).toBeLessThanOrEqual(after);
  });

  it('warn() sets level=warn', () => {
    const { sink, entries } = createCaptureSink();
    new Logger([sink]).warn('fs', 'disk low');
    expect(entries[0]!.level).toBe('warn');
    expect(entries[0]!.source).toBe('fs');
  });

  it('error() sets level=error', () => {
    const { sink, entries } = createCaptureSink();
    new Logger([sink]).error('shell', 'command failed', { code: 1 });
    expect(entries[0]!.level).toBe('error');
    expect(entries[0]!.metadata).toEqual({ code: 1 });
  });

  it('debug() sets level=debug', () => {
    const { sink, entries } = createCaptureSink();
    new Logger([sink]).debug('git', 'status check');
    expect(entries[0]!.level).toBe('debug');
  });

  it('broadcasts to multiple sinks', () => {
    const s1 = createCaptureSink();
    const s2 = createCaptureSink();
    const logger = new Logger([s1.sink, s2.sink]);
    logger.info('system', 'broadcast');
    expect(s1.entries).toHaveLength(1);
    expect(s2.entries).toHaveLength(1);
  });

  it('uses consoleSink by default (no crash)', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const logger = new Logger([consoleSink]);
    logger.info('system', 'default sink');
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('does not include metadata key if not provided', () => {
    const { sink, entries } = createCaptureSink();
    new Logger([sink]).info('system', 'no meta');
    expect('metadata' in entries[0]!).toBe(false);
  });
});
