import { Request, Response } from 'express';
import { HTTP_STATUS } from '@ship/shared';

export type JsonObject = Record<string, unknown>;

export type Brand<T, B extends string> = T & { readonly __brand: B };

export type UserId = Brand<string, 'UserId'>;
export type WorkspaceId = Brand<string, 'WorkspaceId'>;
export type ProjectId = Brand<string, 'ProjectId'>;
export type IssueId = Brand<string, 'IssueId'>;
export type WeekId = Brand<string, 'WeekId'>;
export type ProgramId = Brand<string, 'ProgramId'>;
export type PersonId = Brand<string, 'PersonId'>;

export interface AuthContext {
  userId: UserId;
  workspaceId: WorkspaceId;
}

export function isUserId(value: string): value is UserId {
  return value.length > 0;
}

export function isWorkspaceId(value: string): value is WorkspaceId {
  return value.length > 0;
}

export function isProjectId(value: string): value is ProjectId {
  return value.length > 0;
}

export function isIssueId(value: string): value is IssueId {
  return value.length > 0;
}

export function isWeekId(value: string): value is WeekId {
  return value.length > 0;
}

export function isProgramId(value: string): value is ProgramId {
  return value.length > 0;
}

export function isPersonId(value: string): value is PersonId {
  return value.length > 0;
}

export function getAuthContext(req: Request, res: Response): AuthContext | null {
  const { userId, workspaceId } = req;
  if (!userId || !workspaceId) {
    res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: 'Authentication required' });
    return null;
  }

  if (!isUserId(userId) || !isWorkspaceId(workspaceId)) {
    res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: 'Invalid authentication context' });
    return null;
  }

  return { userId: userId as UserId, workspaceId: workspaceId as WorkspaceId };
}

// Route params are still accepted with the same runtime semantics as before this type-safety pass.
// This helper only centralizes the branded cast after a lightweight presence check.
export function ensureUuidId<T extends string>(
  value: string,
  res: Response,
  label: string,
  guard: (value: string) => value is T
): T | null {
  if (!guard(value)) {
    res.status(400).json({ error: `Invalid ${label} id` });
    return null;
  }

  return value as T;
}

export function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parsePgCount(value: number | string | null | undefined): number {
  return typeof value === 'number'
    ? value
    : Number.parseInt(value ?? '0', 10) || 0;
}

export function parsePgBoolean(value: boolean | 't' | 'f' | null | undefined): boolean {
  return value === true || value === 't';
}
