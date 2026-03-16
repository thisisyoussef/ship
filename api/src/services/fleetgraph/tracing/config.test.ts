import { describe, expect, it } from 'vitest';

import { resolveFleetGraphTracingSettings } from './config.js';

describe('resolveFleetGraphTracingSettings', () => {
  it('stays disabled without an API key even when tracing is requested', () => {
    const settings = resolveFleetGraphTracingSettings({
      LANGSMITH_TRACING: 'true',
    });

    expect(settings.enabled).toBe(false);
    expect(settings.projectName).toBe('ship-fleetgraph');
  });

  it('supports LangChain env aliases and FleetGraph public share opt-in', () => {
    const settings = resolveFleetGraphTracingSettings({
      FLEETGRAPH_LANGSMITH_SHARE_TRACES: 'true',
      LANGCHAIN_API_KEY: 'ls-test-key',
      LANGCHAIN_ENDPOINT: 'https://api.smith.langchain.com',
      LANGCHAIN_PROJECT: 'ship-fleetgraph-dev',
      LANGCHAIN_TRACING_V2: 'true',
      LANGSMITH_WORKSPACE_ID: 'workspace-123',
    });

    expect(settings).toMatchObject({
      apiKey: 'ls-test-key',
      apiUrl: 'https://api.smith.langchain.com',
      enabled: true,
      projectName: 'ship-fleetgraph-dev',
      sharePublicTraces: true,
      workspaceId: 'workspace-123',
    });
  });
});
