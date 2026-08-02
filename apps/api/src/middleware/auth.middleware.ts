import { createRemoteJWKSet, jwtVerify } from "jose";
import { createMiddleware } from "hono/factory";

import { env } from "@/config/env.js";
import type { AuthUser, AuthVariables } from "@/types/auth.types.js";

type JwtPayload = {
  sub?: string;
  email?: string;
  role?: string;
};

const jwks = createRemoteJWKSet(new URL(env.GOTRUE_JWKS_URL));

function extractBearerToken(
  authorizationHeader: string | undefined
): string | null {
  if (!authorizationHeader) {
    return null;
  }

  const [scheme, token] = authorizationHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return null;
  }

  return token;
}

export const requireAuth = createMiddleware<{
  Variables: AuthVariables;
}>(async (context, next) => {
  const token = extractBearerToken(context.req.header("Authorization"));

  if (!token) {
    return context.json(
      {
        error: "unauthorized",
        message: "Missing bearer token",
      },
      401
    );
  }

  try {
    const { payload } = await jwtVerify<JwtPayload>(token, jwks, {
      algorithms: ["ES256"],
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
    });

    if (!payload.sub) {
      return context.json(
        {
          error: "unauthorized",
          message: "Invalid token subject",
        },
        401
      );
    }

    const user: AuthUser = {
      id: payload.sub,
      email: payload.email ?? null,
      role: payload.role ?? null,
    };

    context.set("user", user);
    await next();
  } catch {
    return context.json(
      {
        error: "unauthorized",
        message: "Invalid or expired token",
      },
      401
    );
  }
});
