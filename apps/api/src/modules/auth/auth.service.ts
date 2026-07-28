import bcrypt from "bcryptjs";
import type { LoginInput, RegisterInput, UserDTO } from "@vortex/shared";
import { AppDataSource } from "../../config/data-source";
import { User } from "../../entities";
import { HttpError } from "../../utils/async-handler";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../../utils/jwt";

const userRepo = () => AppDataSource.getRepository(User);

export function toUserDTO(user: User): UserDTO {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    cpf: user.cpf ?? null,
    phone: user.phone ?? null,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
  };
}

export async function issueTokens(user: User) {
  const payload = { sub: user.id, role: user.role };
  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
  };
}

export async function register(input: RegisterInput) {
  const existing = await userRepo().findOneBy({ email: input.email });
  if (existing) {
    throw new HttpError(409, "Já existe uma conta com este e-mail.");
  }
  const passwordHash = await bcrypt.hash(input.password, 10);
  const user = await userRepo().save(
    userRepo().create({
      name: input.name,
      email: input.email,
      passwordHash,
      cpf: input.cpf,
      phone: input.phone,
      role: "customer",
    }),
  );
  const tokens = await issueTokens(user);
  return { user: toUserDTO(user), ...tokens };
}

export async function login(input: LoginInput) {
  const user = await userRepo().findOneBy({ email: input.email });
  if (!user || !user.passwordHash) {
    throw new HttpError(401, "E-mail ou senha inválidos.");
  }
  const valid = await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) {
    throw new HttpError(401, "E-mail ou senha inválidos.");
  }
  const tokens = await issueTokens(user);
  return { user: toUserDTO(user), ...tokens };
}

export async function refresh(refreshToken: string) {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new HttpError(401, "Refresh token inválido ou expirado.");
  }
  const user = await userRepo().findOneBy({ id: payload.sub });
  if (!user) {
    throw new HttpError(401, "Usuário não encontrado.");
  }
  const tokens = await issueTokens(user);
  return { user: toUserDTO(user), ...tokens };
}

export async function getProfile(userId: string) {
  const user = await userRepo().findOneBy({ id: userId });
  if (!user) {
    throw new HttpError(404, "Usuário não encontrado.");
  }
  return toUserDTO(user);
}
