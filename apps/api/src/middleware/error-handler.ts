import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../utils/async-handler";

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({ message: `Rota não encontrada: ${req.method} ${req.path}` });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof HttpError) {
    res.status(err.status).json({ message: err.message });
    return;
  }
  console.error(err);
  res.status(500).json({ message: "Erro interno do servidor." });
}
