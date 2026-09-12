import { Hono } from "hono";
import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { createAuth, type AuthEnv } from "./auth";

const app = new Hono<{ Bindings: AuthEnv }>();

app.on(["POST", "GET"], "/api/auth/*", (c) => {
  const auth = createAuth(c.env, new URL(c.req.url).origin);
  return auth.handler(c.req.raw);
});

// Spike-only route: proves the "seed via server-side signUp API with public
// signup disabled" pattern against a real wrangler dev + local D1 instance.
// Not part of the recommended production design (see REPORT.md).
app.post("/dev/seed", async (c) => {
  const seedingAuth = betterAuth({
    baseURL: new URL(c.req.url).origin,
    database: c.env.DB,
    emailAndPassword: { enabled: true, disableSignUp: false },
  });
  const body = await c.req.json<{ email: string; password: string; name: string }>();
  const result = await seedingAuth.api.signUpEmail({
    body: { email: body.email, password: body.password, name: body.name },
  });
  return c.json(result);
});

app.post("/login", async (c) => {
  const auth = createAuth(c.env, new URL(c.req.url).origin);
  const body = await c.req.json<{ email: string; password: string }>();
  try {
    const res = await auth.api.signInEmail({
      body: { email: body.email, password: body.password },
      asResponse: true,
    });
    return res;
  } catch (error) {
    if (error instanceof APIError) {
      return c.json({ error: error.message }, error.statusCode as 401);
    }
    throw error;
  }
});

app.post("/logout", async (c) => {
  const auth = createAuth(c.env, new URL(c.req.url).origin);
  try {
    const res = await auth.api.signOut({
      headers: c.req.raw.headers,
      asResponse: true,
    });
    return res;
  } catch (error) {
    if (error instanceof APIError) {
      return c.json({ error: error.message }, error.statusCode as 401);
    }
    throw error;
  }
});

app.get("/me", async (c) => {
  const auth = createAuth(c.env, new URL(c.req.url).origin);
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) {
    return c.json({ error: "unauthorized" }, 401);
  }
  return c.json({ user: session.user });
});

export default app;
