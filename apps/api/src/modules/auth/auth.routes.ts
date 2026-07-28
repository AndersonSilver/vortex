import { Router } from "express";
import { loginSchema, registerSchema } from "@vortex/shared";
import { asyncHandler, HttpError } from "../../utils/async-handler";
import { validateBody } from "../../middleware/validate";
import { requireAuth } from "../../middleware/auth";
import { env } from "../../config/env";
import * as authService from "./auth.service";
import { getGoogleAuthUrl, handleGoogleCallback } from "./google-oauth.service";

export const authRouter = Router();

authRouter.post(
  "/register",
  validateBody(registerSchema),
  asyncHandler(async (req, res) => {
    const result = await authService.register(req.body);
    res.status(201).json(result);
  }),
);

authRouter.post(
  "/login",
  validateBody(loginSchema),
  asyncHandler(async (req, res) => {
    const result = await authService.login(req.body);
    res.json(result);
  }),
);

authRouter.post(
  "/refresh",
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.body as { refreshToken?: string };
    if (!refreshToken) {
      throw new HttpError(400, "refreshToken é obrigatório.");
    }
    const result = await authService.refresh(refreshToken);
    res.json(result);
  }),
);

authRouter.get(
  "/google",
  asyncHandler(async (_req, res) => {
    res.redirect(getGoogleAuthUrl());
  }),
);

authRouter.get(
  "/google/callback",
  asyncHandler(async (req, res) => {
    const code = req.query.code as string | undefined;
    if (!code) {
      res.redirect(`${env.webOrigin}/entrar?googleError=1`);
      return;
    }
    try {
      const { accessToken, refreshToken } = await handleGoogleCallback(code);
      const params = new URLSearchParams({ accessToken, refreshToken });
      res.redirect(`${env.webOrigin}/auth/google/callback?${params.toString()}`);
    } catch (error) {
      console.error("Google OAuth callback failed", error);
      res.redirect(`${env.webOrigin}/entrar?googleError=1`);
    }
  }),
);

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const profile = await authService.getProfile(req.auth!.userId);
    res.json(profile);
  }),
);
