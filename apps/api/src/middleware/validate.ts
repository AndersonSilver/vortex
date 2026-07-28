import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";
import { HttpError } from "../utils/async-handler";

export function validateBody<T>(schema: ZodType<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      throw new HttpError(400, result.error.issues.map((i) => i.message).join("; "));
    }
    req.body = result.data;
    next();
  };
}

export function validateQuery<T>(schema: ZodType<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      throw new HttpError(400, result.error.issues.map((i) => i.message).join("; "));
    }
    req.query = result.data as never;
    next();
  };
}
