import type { NextFunction, Request, Response } from "express";
import type { UserRole } from "@vortex/shared";
import { verifyAccessToken } from "../utils/jwt";
import { HttpError } from "../utils/async-handler";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: { userId: string; role: UserRole };
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw new HttpError(401, "Token de autenticação ausente.");
  }
  const token = header.slice("Bearer ".length);
  try {
    const payload = verifyAccessToken(token);
    req.auth = { userId: payload.sub, role: payload.role };
    next();
  } catch {
    throw new HttpError(401, "Token de autenticação inválido ou expirado.");
  }
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    try {
      const payload = verifyAccessToken(header.slice("Bearer ".length));
      req.auth = { userId: payload.sub, role: payload.role };
    } catch {
      // ignore invalid token for optional auth
    }
  }
  next();
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.auth || !roles.includes(req.auth.role)) {
      throw new HttpError(403, "Acesso negado para este perfil.");
    }
    next();
  };
}
