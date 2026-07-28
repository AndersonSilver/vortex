import "dotenv/config";

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  apiPort: Number(process.env.API_PORT ?? 3333),
  webOrigin: process.env.WEB_ORIGIN ?? "http://localhost:5173",
  databaseUrl: required("DATABASE_URL", "postgres://vortex:vortex@localhost:5432/vortex"),

  jwt: {
    accessSecret: required("JWT_ACCESS_SECRET", "dev-access-secret"),
    refreshSecret: required("JWT_REFRESH_SECRET", "dev-refresh-secret"),
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? "15m",
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? "7d",
  },

  mercadoPago: {
    accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN ?? "",
    webhookSecret: process.env.MERCADOPAGO_WEBHOOK_SECRET ?? "",
  },

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID ?? "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    callbackUrl: process.env.GOOGLE_CALLBACK_URL ?? "http://localhost:3333/auth/google/callback",
  },

  shipping: {
    cepOrigem: process.env.CORREIOS_CEP_ORIGEM ?? "01001000",
    melhorEnvio: {
      token: process.env.MELHOR_ENVIO_TOKEN ?? "",
      baseUrl:
        process.env.MELHOR_ENVIO_ENV === "production"
          ? "https://melhorenvio.com.br/api/v2"
          : "https://sandbox.melhorenvio.com.br/api/v2",
    },
    fallback: {
      pacPrice: Number(process.env.CORREIOS_FALLBACK_PAC_PRICE ?? 24.9),
      sedexPrice: Number(process.env.CORREIOS_FALLBACK_SEDEX_PRICE ?? 39.9),
      pacDays: Number(process.env.CORREIOS_FALLBACK_PAC_DAYS ?? 5),
      sedexDays: Number(process.env.CORREIOS_FALLBACK_SEDEX_DAYS ?? 2),
    },
  },

  minio: {
    endpoint: process.env.MINIO_ENDPOINT ?? "http://localhost:9010",
    // URL used when returning file URLs to clients (browser). Inside Docker,
    // MINIO_ENDPOINT points at the internal service name ("minio"), which
    // browsers on the host cannot resolve — this must be the host-reachable address.
    publicEndpoint: process.env.MINIO_PUBLIC_ENDPOINT ?? process.env.MINIO_ENDPOINT ?? "http://localhost:9010",
    bucket: process.env.MINIO_BUCKET ?? "vortex-quotes",
    accessKey: process.env.MINIO_ACCESS_KEY ?? "vortex",
    secretKey: process.env.MINIO_SECRET_KEY ?? "vortex12345",
  },
};
