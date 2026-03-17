/**
 * SSM Parameter Store - Application Configuration
 *
 * This file loads application configuration from AWS SSM Parameter Store.
 *
 * Secrets Storage:
 * ─────────────────
 * SSM Parameter Store (/ship/{env}/):
 *   - DATABASE_URL, SESSION_SECRET, CORS_ORIGIN
 *   - Application config that changes per environment
 *   - CAIA OAuth credentials (CAIA_ISSUER_URL, CAIA_CLIENT_ID, etc.)
 */
import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';

const OPTIONAL_FLEETGRAPH_KEYS = [
  'FLEETGRAPH_BEDROCK_MODEL_ID',
  'FLEETGRAPH_ENTRY_ENABLED',
  'FLEETGRAPH_EVENT_DEBOUNCE_MS',
  'FLEETGRAPH_LANGSMITH_FLUSH_TIMEOUT_MS',
  'FLEETGRAPH_LANGSMITH_SHARE_TRACES',
  'FLEETGRAPH_LLM_PROVIDER',
  'FLEETGRAPH_MAX_ATTEMPTS',
  'FLEETGRAPH_OPENAI_MODEL',
  'FLEETGRAPH_RETRY_DELAY_MS',
  'FLEETGRAPH_SERVICE_TOKEN',
  'FLEETGRAPH_SWEEP_BATCH_SIZE',
  'FLEETGRAPH_SWEEP_INTERVAL_MS',
  'FLEETGRAPH_WORKER_ENABLED',
  'FLEETGRAPH_WORKER_POLL_INTERVAL_MS',
  'LANGCHAIN_API_KEY',
  'LANGCHAIN_ENDPOINT',
  'LANGCHAIN_PROJECT',
  'LANGCHAIN_TRACING',
  'LANGCHAIN_TRACING_V2',
  'LANGSMITH_API_KEY',
  'LANGSMITH_ENDPOINT',
  'LANGSMITH_PROJECT',
  'LANGSMITH_TRACING',
  'LANGSMITH_TRACING_V2',
  'LANGSMITH_WEB_URL',
  'LANGSMITH_WORKSPACE_ID',
  'OPENAI_API_KEY',
  'OPENAI_BASE_URL',
] as const;

// Lazy-initialized client to avoid keeping Node.js alive during import tests
let _client: SSMClient | null = null;

function getClient(): SSMClient {
  if (!_client) {
    _client = new SSMClient({ region: process.env.AWS_REGION || 'us-east-1' });
  }
  return _client;
}

export async function getSSMSecret(name: string): Promise<string> {
  const command = new GetParameterCommand({
    Name: name,
    WithDecryption: true,
  });

  const response = await getClient().send(command);
  if (!response.Parameter?.Value) {
    throw new Error(`SSM parameter ${name} not found`);
  }
  return response.Parameter.Value;
}

async function getOptionalSSMSecret(name: string): Promise<string | undefined> {
  try {
    return await getSSMSecret(name);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('not found')
    ) {
      return undefined;
    }
    throw error;
  }
}

function isCredentialProviderError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.name === 'CredentialsProviderError' ||
    error.message.includes('Could not load credentials from any providers')
  );
}

export async function loadProductionSecrets(): Promise<void> {
  if (process.env.NODE_ENV !== 'production') {
    return; // Use .env files for local dev
  }

  const hasExplicitCoreConfig = Boolean(
    process.env.DATABASE_URL &&
    process.env.SESSION_SECRET &&
    process.env.CORS_ORIGIN
  );

  const environment = process.env.ENVIRONMENT || 'prod';
  const basePath = `/ship/${environment}`;
  console.log(`Loading production configuration from SSM path: ${basePath}`);

  if (!hasExplicitCoreConfig) {
    const [databaseUrl, sessionSecret, corsOrigin, cdnDomain, appBaseUrl] = await Promise.all([
      getSSMSecret(`${basePath}/DATABASE_URL`),
      getSSMSecret(`${basePath}/SESSION_SECRET`),
      getSSMSecret(`${basePath}/CORS_ORIGIN`),
      getSSMSecret(`${basePath}/CDN_DOMAIN`),
      getSSMSecret(`${basePath}/APP_BASE_URL`),
    ]);

    process.env.DATABASE_URL = databaseUrl;
    process.env.SESSION_SECRET = sessionSecret;
    process.env.CORS_ORIGIN = corsOrigin;
    process.env.CDN_DOMAIN = cdnDomain;
    process.env.APP_BASE_URL = appBaseUrl;

    console.log('Core app configuration loaded from SSM Parameter Store');
    console.log(`CORS_ORIGIN: ${corsOrigin}`);
    console.log(`CDN_DOMAIN: ${cdnDomain}`);
    console.log(`APP_BASE_URL: ${appBaseUrl}`);
  } else {
    console.log('Using explicit production environment variables for core app config');
  }

  const missingOptionalKeys = OPTIONAL_FLEETGRAPH_KEYS.filter((key) => !process.env[key]);
  if (missingOptionalKeys.length === 0) {
    return;
  }

  let optionalValues: ReadonlyArray<readonly [typeof OPTIONAL_FLEETGRAPH_KEYS[number], string | undefined]>;
  try {
    optionalValues = await Promise.all(
      missingOptionalKeys.map(async (key) => [
        key,
        await getOptionalSSMSecret(`${basePath}/${key}`),
      ] as const)
    );
  } catch (error) {
    if (isCredentialProviderError(error)) {
      console.warn(
        'Skipping optional FleetGraph/LangSmith SSM loading because AWS credentials are unavailable; continuing with explicit environment variables only.'
      );
      return;
    }

    throw error;
  }

  let loadedOptionalCount = 0;
  for (const [key, value] of optionalValues) {
    if (value && !process.env[key]) {
      process.env[key] = value;
      loadedOptionalCount += 1;
    }
  }

  if (loadedOptionalCount > 0) {
    console.log(`Loaded ${loadedOptionalCount} optional FleetGraph/LangSmith settings from SSM`);
  }
}
