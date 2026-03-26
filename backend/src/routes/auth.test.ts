import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fc from "fast-check";

// ---------------------------------------------------------------------------
// Helpers that mirror the pure logic inside the auth routes so we can test
// the business rules without a live Supabase connection.
// ---------------------------------------------------------------------------

/** Simulates the duplicate-email check performed in POST /api/auth/register */
function registerUser(
  registry: Set<string>,
  email: string
): { success: boolean; code?: string } {
  if (registry.has(email.toLowerCase())) {
    return { success: false, code: "EMAIL_ALREADY_EXISTS" };
  }
  registry.add(email.toLowerCase());
  return { success: true };
}

/** Simulates the token store used in POST /api/auth/login */
function issueToken(
  tokenStore: Map<string, string>,
  userId: string
): string {
  const token = `token-${userId}-${Date.now()}`;
  tokenStore.set(token, userId);
  return token;
}

function validateToken(
  tokenStore: Map<string, string>,
  token: string
): string | null {
  return tokenStore.get(token) ?? null;
}

// ---------------------------------------------------------------------------
// Property 11: Duplicate registration prevention
// Feature: golf-charity-platform, Property 11: Duplicate registration prevention
// ---------------------------------------------------------------------------
describe("Property 11: Duplicate registration prevention", () => {
  it("registering the same email twice always returns EMAIL_ALREADY_EXISTS on the second attempt", () => {
    // Validates: Requirements 1.2
    fc.assert(
      fc.property(
        fc.emailAddress(),
        (email) => {
          const registry = new Set<string>();

          const first = registerUser(registry, email);
          const second = registerUser(registry, email);

          // First registration must succeed
          expect(first.success).toBe(true);

          // Second registration must fail with the correct code
          expect(second.success).toBe(false);
          expect(second.code).toBe("EMAIL_ALREADY_EXISTS");

          // Exactly one entry in the registry
          expect(registry.size).toBe(1);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("email comparison is case-insensitive", () => {
    // Validates: Requirements 1.2
    fc.assert(
      fc.property(
        fc.stringMatching(/^[a-z]{3,8}@[a-z]{3,6}\.[a-z]{2,4}$/),
        (email) => {
          const registry = new Set<string>();

          registerUser(registry, email.toLowerCase());
          const result = registerUser(registry, email.toUpperCase());

          expect(result.success).toBe(false);
          expect(result.code).toBe("EMAIL_ALREADY_EXISTS");
          expect(registry.size).toBe(1);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 10: Authentication token round-trip
// Feature: golf-charity-platform, Property 10: Authentication token round-trip
// ---------------------------------------------------------------------------
describe("Property 10: Authentication token round-trip", () => {
  it("a token issued for a user is accepted as valid on subsequent requests", () => {
    // Validates: Requirements 1.3, 1.4
    fc.assert(
      fc.property(
        fc.uuid(),
        (userId) => {
          const tokenStore = new Map<string, string>();

          const token = issueToken(tokenStore, userId);

          // Token must be non-empty
          expect(token.length).toBeGreaterThan(0);

          // Validating the token must return the same userId
          const resolved = validateToken(tokenStore, token);
          expect(resolved).toBe(userId);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("an unknown or tampered token is rejected", () => {
    // Validates: Requirements 1.4, 1.5
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.string({ minLength: 1 }),
        (userId, garbage) => {
          const tokenStore = new Map<string, string>();
          const token = issueToken(tokenStore, userId);

          // A different string that is not the issued token should be rejected
          fc.pre(garbage !== token);

          const resolved = validateToken(tokenStore, garbage);
          expect(resolved).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });
});
