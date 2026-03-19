export interface FleetGraphReviewFact {
  label: string
  value: string
}

export interface FleetGraphReviewEvidence {
  facts: FleetGraphReviewFact[]
  notes: string[]
}

const FRIENDLY_LABELS: Record<string, string> = {
  entityTitle: 'Week name',
  hoursSinceStart: 'Time since planned start',
  sprintStartDate: 'Scheduled start',
  status: 'Current Ship status',
}

function humanizeKey(rawKey: string) {
  return FRIENDLY_LABELS[rawKey]
    ?? rawKey.replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/[_-]+/g, ' ')
      .replace(/^\w/, (char) => char.toUpperCase())
}

function formatDurationFromHours(rawValue: string) {
  const hours = Math.round(Number(rawValue))
  if (!Number.isFinite(hours) || hours < 0) {
    return rawValue
  }

  if (hours < 24) {
    return `${hours} hour${hours === 1 ? '' : 's'}`
  }

  const days = Math.floor(hours / 24)
  const remainingHours = hours % 24
  if (remainingHours === 0) {
    return `${days} day${days === 1 ? '' : 's'}`
  }

  return `${days} day${days === 1 ? '' : 's'}, ${remainingHours} hour${remainingHours === 1 ? '' : 's'}`
}

function formatFactValue(key: string, rawValue: string) {
  if (key === 'hoursSinceStart') {
    return formatDurationFromHours(rawValue)
  }

  if (key.toLowerCase().includes('date')) {
    const date = new Date(rawValue)
    if (!Number.isNaN(date.getTime())) {
      return new Intl.DateTimeFormat('en-US', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(date)
    }
  }

  if (key === 'status') {
    return rawValue.charAt(0).toUpperCase() + rawValue.slice(1)
  }

  return rawValue
}

export function partitionFleetGraphReviewEvidence(
  evidence: string[]
): FleetGraphReviewEvidence {
  const facts: FleetGraphReviewFact[] = []
  const notes: string[] = []

  for (const item of evidence) {
    const separatorIndex = item.indexOf(':')
    if (separatorIndex <= 0) {
      notes.push(item)
      continue
    }

    const key = item.slice(0, separatorIndex).trim()
    const rawValue = item.slice(separatorIndex + 1).trim()
    if (!key || !rawValue) {
      notes.push(item)
      continue
    }

    facts.push({
      label: humanizeKey(key),
      value: formatFactValue(key, rawValue),
    })
  }

  return { facts, notes }
}
