import { Request, Response } from 'express';
import { HTTP_STATUS } from '@ship/shared';
import { z } from 'zod';

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

const uuidSchema = z.string().uuid();

function isUuidBrand<B extends string>(value: string): value is Brand<string, B> {
  return uuidSchema.safeParse(value).success;
}

export function isUserId(value: string): value is UserId {
  return isUuidBrand<'UserId'>(value);
}

export function isWorkspaceId(value: string): value is WorkspaceId {
  return isUuidBrand<'WorkspaceId'>(value);
}

export function isProjectId(value: string): value is ProjectId {
  return isUuidBrand<'ProjectId'>(value);
}

export function isIssueId(value: string): value is IssueId {
  return isUuidBrand<'IssueId'>(value);
}

export function isWeekId(value: string): value is WeekId {
  return isUuidBrand<'WeekId'>(value);
}

export function isProgramId(value: string): value is ProgramId {
  return isUuidBrand<'ProgramId'>(value);
}

export function isPersonId(value: string): value is PersonId {
  return isUuidBrand<'PersonId'>(value);
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

  return { userId, workspaceId };
}
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

  return value;
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
