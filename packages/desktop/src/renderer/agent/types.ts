export type AgentState =
  | { status: 'idle' }
  | { status: 'thinking'; step: number; message: string }
  | { status: 'acting'; step: number; action: string }
  | { status: 'done'; result: string }
  | { status: 'error'; message: string }
  | { status: 'stopped' };
