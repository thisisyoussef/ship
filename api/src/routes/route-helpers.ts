import { Request, Response } from 'express';
import { HTTP_STATUS } from '@ship/shared';

export type JsonObject = Record<string, unknown>;

export interface AuthContext {
  userId: string;
  workspaceId: string;
}

export function getAuthContext(req: Request, res: Response): AuthContext | null {
  const { userId, workspaceId } = req;
  if (!userId || !workspaceId) {
    res.status(HTTP_STATUS.UNAUTHORIZED).json({ error: 'Authentication required' });
    return null;
  }

  return { userId, workspaceId };
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
