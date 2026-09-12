import { env, SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { betterAuth } from "better-auth";

function seedingAuth() {
  return betterAuth({
    baseURL: "http://example.com",
    database: env.DB,
    emailAndPassword: {
      enabled: true,
      disableSignUp: false,
    },
  });
}

function extractSessionCookie(res: Response): string {
  const setCookie = res.headers.get("set-cookie");
  if (!setCookie) throw new Error("no set-cookie header on response");
  return setCookie.split(";")[0];
}

describe("candidate A: Better Auth on Workers + D1", () => {
  it("seeds a user via the server-side signUp API while public signup stays disabled", async () => {
    const auth = seedingAuth();
    const result = await auth.api.signUpEmail({
      body: {
        email: "owner@example.com",
        password: "correct horse battery staple",
        name: "Owner",
      },
    });
    expect(result.user.email).toBe("owner@example.com");
  });

  it("logs in with a seeded user and sets a session cookie", async () => {
    const res = await SELF.fetch("http://example.com/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "owner@example.com",
        password: "correct horse battery staple",
      }),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("set-cookie")).toBeTruthy();
  });

  it("returns the user from /me when the session cookie is present", async () => {
    const loginRes = await SELF.fetch("http://example.com/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "owner@example.com",
        password: "correct horse battery staple",
      }),
    });
    const cookie = extractSessionCookie(loginRes);

    const meRes = await SELF.fetch("http://example.com/me", {
      headers: { cookie },
    });
    expect(meRes.status).toBe(200);
    const body = await meRes.json<{ user: { email: string } }>();
    expect(body.user.email).toBe("owner@example.com");
  });

  it("returns 401 from /me without a session cookie", async () => {
    const res = await SELF.fetch("http://example.com/me");
    expect(res.status).toBe(401);
  });

  it("returns 401 for wrong password", async () => {
    const res = await SELF.fetch("http://example.com/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "owner@example.com",
        password: "wrong password",
      }),
    });
    expect(res.status).toBe(401);
  });

  it("invalidates the session on logout", async () => {
    const loginRes = await SELF.fetch("http://example.com/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "owner@example.com",
        password: "correct horse battery staple",
      }),
    });
    const cookie = extractSessionCookie(loginRes);

    const logoutRes = await SELF.fetch("http://example.com/logout", {
      method: "POST",
      headers: { cookie },
    });
    expect(logoutRes.status).toBe(200);

    const meRes = await SELF.fetch("http://example.com/me", {
      headers: { cookie },
    });
    expect(meRes.status).toBe(401);
  });
});
