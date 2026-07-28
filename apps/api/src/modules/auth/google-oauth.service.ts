import { OAuth2Client } from "google-auth-library";
import { AppDataSource } from "../../config/data-source";
import { User } from "../../entities";
import { env } from "../../config/env";
import { HttpError } from "../../utils/async-handler";
import { issueTokens, toUserDTO } from "./auth.service";

const userRepo = () => AppDataSource.getRepository(User);

function createClient(): OAuth2Client {
  return new OAuth2Client(env.google.clientId, env.google.clientSecret, env.google.callbackUrl);
}

export function getGoogleAuthUrl(): string {
  const client = createClient();
  return client.generateAuthUrl({
    access_type: "online",
    scope: ["profile", "email"],
    prompt: "select_account",
  });
}

export async function handleGoogleCallback(code: string) {
  if (!env.google.clientId || !env.google.clientSecret) {
    throw new HttpError(500, "Login com Google não está configurado no servidor.");
  }

  const client = createClient();
  const { tokens } = await client.getToken(code);
  if (!tokens.id_token) {
    throw new HttpError(502, "Falha ao autenticar com o Google.");
  }

  const ticket = await client.verifyIdToken({
    idToken: tokens.id_token,
    audience: env.google.clientId,
  });
  const payload = ticket.getPayload();
  if (!payload?.email) {
    throw new HttpError(502, "Não foi possível obter o e-mail da conta Google.");
  }

  let user = await userRepo().findOneBy({ googleId: payload.sub });
  if (!user) {
    user = await userRepo().findOneBy({ email: payload.email });
  }

  if (user) {
    if (!user.googleId) {
      user.googleId = payload.sub;
      await userRepo().save(user);
    }
  } else {
    user = await userRepo().save(
      userRepo().create({
        name: payload.name ?? payload.email.split("@")[0],
        email: payload.email,
        googleId: payload.sub,
        passwordHash: null,
        role: "customer",
      }),
    );
  }

  const issued = await issueTokens(user);
  return { user: toUserDTO(user), ...issued };
}
