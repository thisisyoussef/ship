export function createAuditEmitter(reportEvent) {
  return (event) => {
    if (typeof reportEvent !== 'function') {
      return;
    }

    reportEvent({
      timestamp: new Date().toISOString(),
      level: 'info',
      ...event,
    });
  };
}

export function createCommandCallbacks(emitEvent, context) {
  return {
    onStart(record) {
      emitEvent({
        type: 'command-start',
        targetLabel: context.targetLabel ?? null,
        categoryId: context.categoryId ?? null,
        phase: context.phase ?? 'command',
        commandId: record.id,
        message: record.command,
        payload: {
          cwd: record.cwd,
          env: record.env,
        },
      });
    },
    onStdout(chunk) {
      emitStreamChunk({
        emitEvent,
        context,
        stream: 'stdout',
        level: 'stdout',
        chunk,
      });
    },
    onStderr(chunk) {
      emitStreamChunk({
        emitEvent,
        context,
        stream: 'stderr',
        level: 'stderr',
        chunk,
      });
    },
    onFinish(record) {
      emitEvent({
        type: 'command-end',
        targetLabel: context.targetLabel ?? null,
        categoryId: context.categoryId ?? null,
        phase: context.phase ?? 'command',
        commandId: record.id,
        level: record.exitCode === 0 ? 'success' : 'error',
        message:
          record.exitCode === 0
            ? `Finished ${record.id}`
            : `Failed ${record.id} (${record.exitCode ?? 'null'})`,
        payload: {
          exitCode: record.exitCode,
          signal: record.signal,
          stdoutPath: record.stdoutPath,
          stderrPath: record.stderrPath,
        },
      });
    },
    onReady(record) {
      emitEvent({
        type: 'command-ready',
        targetLabel: context.targetLabel ?? null,
        categoryId: context.categoryId ?? null,
        phase: context.phase ?? 'command',
        commandId: record.id,
        message: `Ready ${record.id}`,
      });
    },
    onStop(record) {
      emitEvent({
        type: 'command-end',
        targetLabel: context.targetLabel ?? null,
        categoryId: context.categoryId ?? null,
        phase: context.phase ?? 'command',
        commandId: record.id,
        level: record.exitCode === 0 ? 'success' : 'info',
        message:
          record.exitCode === 0
            ? `Stopped ${record.id}`
            : `Stopped ${record.id} (${record.signal ?? 'signal'})`,
        payload: {
          exitCode: record.exitCode,
          signal: record.signal,
          stdoutPath: record.stdoutPath,
          stderrPath: record.stderrPath,
        },
      });
    },
  };
}

function emitStreamChunk({
  emitEvent,
  context,
  stream,
  level,
  chunk,
}) {
  const message = String(chunk ?? '');
  if (!message.trim()) {
    return;
  }

  emitEvent({
    type: 'command-output',
    targetLabel: context.targetLabel ?? null,
    categoryId: context.categoryId ?? null,
    phase: context.phase ?? 'command',
    commandId: context.commandId ?? null,
    stream,
    level,
    message,
  });
}
