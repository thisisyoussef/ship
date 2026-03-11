import type { NextFunction, Request, Response } from 'express';

const LIST_CACHE_TTL_MS = 3000;
const IS_TEST_ENV = process.env.NODE_ENV === 'test';

type CacheEntry = {
  body: string;
  expiresAt: number;
};

type DocumentsListCacheKey = {
  workspaceId: string;
  userId: string;
  isAdmin: boolean;
  type?: string;
  parentId?: string;
};

type IssuesListCacheKey = {
  workspaceId: string;
  userId: string;
  isAdmin: boolean;
  state?: string;
  priority?: string;
  assigneeId?: string;
  programId?: string;
  sprintId?: string;
  source?: string;
  parentFilter?: string;
};

class JsonListResponseCache {
  private entries = new Map<string, CacheEntry>();
  private inFlight = new Map<string, Promise<string>>();

  async getOrCreate(key: string, build: () => Promise<string>): Promise<string> {
    const cached = this.entries.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.body;
    }

    const pending = this.inFlight.get(key);
    if (pending) {
      return pending;
    }

    const promise = build()
      .then((body) => {
        this.entries.set(key, { body, expiresAt: Date.now() + LIST_CACHE_TTL_MS });
        return body;
      })
      .finally(() => {
        this.inFlight.delete(key);
      });

    this.inFlight.set(key, promise);
    return promise;
  }

  invalidateMatching(match: (key: string) => boolean): void {
    for (const key of this.entries.keys()) {
      if (match(key)) {
        this.entries.delete(key);
      }
    }
  }
}

const listResponseCache = new JsonListResponseCache();

function toCacheSegment(value: string | undefined): string {
  return value ?? '';
}

export function getFirstQueryValue(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    const first = value[0];
    return typeof first === 'string' ? first : undefined;
  }

  return typeof value === 'string' ? value : undefined;
}

export function buildDocumentsListCacheKey(key: DocumentsListCacheKey): string {
  return [
    'documents',
    key.workspaceId,
    key.userId,
    key.isAdmin ? '1' : '0',
    `type=${toCacheSegment(key.type)}`,
    `parent=${toCacheSegment(key.parentId)}`,
  ].join('|');
}

export function buildIssuesListCacheKey(key: IssuesListCacheKey): string {
  return [
    'issues',
    key.workspaceId,
    key.userId,
    key.isAdmin ? '1' : '0',
    `state=${toCacheSegment(key.state)}`,
    `priority=${toCacheSegment(key.priority)}`,
    `assignee=${toCacheSegment(key.assigneeId)}`,
    `program=${toCacheSegment(key.programId)}`,
    `sprint=${toCacheSegment(key.sprintId)}`,
    `source=${toCacheSegment(key.source)}`,
    `parent=${toCacheSegment(key.parentFilter)}`,
  ].join('|');
}

export async function getCachedListResponse(
  key: string,
  build: () => Promise<string>
): Promise<string> {
  if (IS_TEST_ENV) {
    return build();
  }

  return listResponseCache.getOrCreate(key, build);
}

export function invalidateDocumentAndIssueListCaches(workspaceId: string): void {
  if (IS_TEST_ENV) {
    return;
  }

  listResponseCache.invalidateMatching((key) => {
    return key.startsWith(`documents|${workspaceId}|`) || key.startsWith(`issues|${workspaceId}|`);
  });
}

export function listCacheInvalidationMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (IS_TEST_ENV) {
    next();
    return;
  }

  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    next();
    return;
  }

  res.on('finish', () => {
    if (res.statusCode < 400 && req.workspaceId) {
      invalidateDocumentAndIssueListCaches(String(req.workspaceId));
    }
  });

  next();
}
