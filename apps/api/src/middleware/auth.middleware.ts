import { createMiddleware } from "hono/factory";
import { jwtVerify } from "jose";

import { env } from "@/config/env.js";
import type { AuthUser, AuthVariables } from "@/types/auth.types.js";

type JwtPayload = {
  sub?: string;
  email?: string;
  role?: string;
  aud?: string | string[];
  iss?: string;
};

const jwtSecret = new TextEncoder().encode(env.JWT_SECRET);

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
    const { payload } = await jwtVerify<JwtPayload>(token, jwtSecret, {
      algorithms: ["HS256"],
      issuer: "api",
      audience: "authenticated",
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
