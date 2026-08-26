import crypto from "node:crypto";
import axios from "axios";
import { env } from "../../config/env";
import { AppDataSource } from "../../config/data-source";
import { BlingCredential } from "../../entities";
import { HttpError } from "../../utils/async-handler";

const credentialRepo = () => AppDataSource.getRepository(BlingCredential);
const STATE_TTL_MS = 10 * 60 * 1000;
// Refresh a bit before real expiry so a request never races an about-to-expire token.
const REFRESH_MARGIN_MS = 5 * 60 * 1000;

interface BlingTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

/** Signed, storage-free CSRF token for the OAuth authorize→callback round trip. */
function signState(): string {
  const timestamp = Date.now().toString();
  const sig = crypto.createHmac("sha256", env.bling.clientSecret).update(timestamp).digest("hex");
  return Buffer.from(`${timestamp}.${sig}`).toString("base64url");
}

function isValidState(state: string | undefined): boolean {
  if (!state) return false;
  const [timestamp, sig] = Buffer.from(state, "base64url").toString("utf8").split(".");
  if (!timestamp || !sig) return false;
  if (Date.now() - Number(timestamp) > STATE_TTL_MS) return false;
  const expected = crypto.createHmac("sha256", env.bling.clientSecret).update(timestamp).digest("hex");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function getBlingAuthorizeUrl(): string {
  if (!env.bling.clientId) {
    throw new HttpError(500, "BLING_CLIENT_ID não configurado no servidor.");
  }
  const params = new URLSearchParams({
    response_type: "code",
    client_id: env.bling.clientId,
    redirect_uri: env.bling.redirectUri,
    state: signState(),
  });
  return `${env.bling.authorizeUrl}?${params.toString()}`;
}

async function requestToken(body: URLSearchParams): Promise<BlingTokenResponse> {
  const basicAuth = Buffer.from(`${env.bling.clientId}:${env.bling.clientSecret}`).toString("base64");
  const { data } = await axios.post<BlingTokenResponse>(env.bling.tokenUrl, body, {
    timeout: 8000,
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
  });
  return data;
}

async function saveTokens(tokens: BlingTokenResponse): Promise<BlingCredential> {
  const repo = credentialRepo();
  const [existing] = await repo.find({ take: 1 });
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);
  const credential =
    existing ??
    repo.create({ accessToken: "", refreshToken: "", expiresAt: new Date() });
  credential.accessToken = tokens.access_token;
  credential.refreshToken = tokens.refresh_token;
  credential.expiresAt = expiresAt;
  return repo.save(credential);
}

export async function handleBlingCallback(code: string, state: string | undefined): Promise<void> {
  if (!isValidState(state)) {
    throw new HttpError(401, "State inválido ou expirado no callback do Bling.");
  }
  const tokens = await requestToken(
    new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: env.bling.redirectUri,
    }),
  );
  await saveTokens(tokens);
}

async function refreshTokens(credential: BlingCredential): Promise<BlingCredential> {
  const tokens = await requestToken(
    new URLSearchParams({ grant_type: "refresh_token", refresh_token: credential.refreshToken }),
  );
  return saveTokens(tokens);
}

/** Returns a valid Bearer access token, transparently refreshing it if it's close to expiring. */
export async function ensureFreshBlingAccessToken(): Promise<string> {
  let [credential] = await credentialRepo().find({ take: 1 });
  if (!credential) {
    throw new HttpError(
      412,
      "Bling ainda não foi autorizado — acesse GET /bling/authorize logado como admin para conectar.",
    );
  }
  if (credential.expiresAt.getTime() - Date.now() < REFRESH_MARGIN_MS) {
    credential = await refreshTokens(credential);
  }
  return credential.accessToken;
}
