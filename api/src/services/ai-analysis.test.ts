import { beforeEach, describe, expect, it, vi } from 'vitest';

const { credentialsMock, sendMock } = vi.hoisted(() => ({
  credentialsMock: vi.fn(),
  sendMock: vi.fn(),
}));

vi.mock('@aws-sdk/client-bedrock-runtime', () => {
  class InvokeModelCommand {
    input: unknown;

    constructor(input: unknown) {
      this.input = input;
    }
  }

  class BedrockRuntimeClient {
    config = {
      credentials: credentialsMock,
    };

    send = sendMock;
  }

  return {
    BedrockRuntimeClient,
    InvokeModelCommand,
  };
});

function makeDoc(text: string) {
  return {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [{ type: 'text', text }],
      },
    ],
  };
}

describe('ai-analysis availability gating', () => {
  beforeEach(() => {
    vi.resetModules();
    credentialsMock.mockReset();
    sendMock.mockReset();
  });

  it('reports unavailable and skips retro analysis when Bedrock credentials cannot be resolved', async () => {
    const credentialsError = Object.assign(
      new Error('Could not load credentials from any providers'),
      { name: 'CredentialsProviderError' }
    );
    credentialsMock.mockRejectedValue(credentialsError);

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const { isAiAvailable, analyzeRetro } = await import('./ai-analysis.js');

    await expect(isAiAvailable()).resolves.toBe(false);

    const result = await analyzeRetro(makeDoc('Delivered the report with links.'), makeDoc('Deliver the report.'));

    expect(result).toEqual({ error: 'ai_unavailable' });
    expect(sendMock).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('reports available and invokes Bedrock when credentials resolve', async () => {
    credentialsMock.mockResolvedValue({
      accessKeyId: 'test-key',
      secretAccessKey: 'test-secret',
    });
    sendMock.mockResolvedValue({
      body: new TextEncoder().encode(
        JSON.stringify({
          content: [
            {
              text: JSON.stringify({
                overall_score: 0.85,
                plan_coverage: [
                  {
                    plan_item: 'Deliver the report.',
                    addressed: true,
                    has_evidence: true,
                    feedback: 'Addressed with specific proof.',
                  },
                ],
                suggestions: [],
              }),
            },
          ],
        })
      ),
    });

    const { isAiAvailable, analyzeRetro } = await import('./ai-analysis.js');

    await expect(isAiAvailable()).resolves.toBe(true);

    const result = await analyzeRetro(makeDoc('Delivered the report with links.'), makeDoc('Deliver the report.'));

    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      overall_score: 0.85,
      plan_coverage: [
        expect.objectContaining({
          plan_item: 'Deliver the report.',
          addressed: true,
          has_evidence: true,
        }),
      ],
    });
  });
});
