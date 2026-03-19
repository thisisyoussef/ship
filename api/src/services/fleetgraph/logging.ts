type FleetGraphLogLevel = 'error' | 'info' | 'warn'

function stripUndefined(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stripUndefined)
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entry]) => entry !== undefined)
        .map(([key, entry]) => [key, stripUndefined(entry)])
    )
  }

  return value
}

export function logFleetGraph(
  level: FleetGraphLogLevel,
  event: string,
  details: Record<string, unknown>
) {
  const payload = stripUndefined({
    at: new Date().toISOString(),
    event,
    ...details,
  })

  const logger = level === 'error'
    ? console.error
    : level === 'warn'
      ? console.warn
      : console.info

  logger(`[FleetGraph][${event}]`, payload)
}
