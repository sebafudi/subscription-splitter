import { betterAuth } from "better-auth";

export interface AuthEnv {
  DB: D1Database;
}

export function createAuth(env: AuthEnv, baseURL?: string) {
  return betterAuth({
    baseURL,
    database: env.DB,
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
    },
    rateLimit: {
      enabled: true,
      window: 60,
      max: 10,
    },
    advanced: {
      cookies: {
        session_token: {
          attributes: {
            sameSite: "lax",
            httpOnly: true,
            secure: true,
          },
        },
      },
    },
  });
}
