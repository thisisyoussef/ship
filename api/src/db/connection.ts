import type { ConnectionOptions } from 'tls';

function getDatabaseHostname(connectionString: string | undefined): string | null {
  if (!connectionString) {
    return null;
  }

  try {
    return new URL(connectionString).hostname;
  } catch {
    return null;
  }
}

function isRenderInternalHostname(hostname: string | null): boolean {
  if (!hostname) {
    return false;
  }

  return hostname.startsWith('dpg-') && !hostname.includes('.');
}

export function getDatabaseSslConfig(
  connectionString: string | undefined,
  nodeEnv: string | undefined,
): ConnectionOptions | false {
  if (nodeEnv !== 'production') {
    return false;
  }

  const hostname = getDatabaseHostname(connectionString);

  if (isRenderInternalHostname(hostname)) {
    return false;
  }

  return { rejectUnauthorized: false };
}
