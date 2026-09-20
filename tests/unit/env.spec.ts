import { expect, test } from "@playwright/test";
import { EnvNotConfiguredError, getEnv, isAuthEnabled, missingEnv } from "../../src/lib/env";

const secret = "0123456789abcdef0123456789abcdef";

test("الحماية معطّلة بدون APP_PASSWORD", () => {
  expect(isAuthEnabled({})).toBe(false);
  expect(isAuthEnabled({ APP_PASSWORD: "   " })).toBe(false);
  expect(missingEnv({})).toEqual([]);
  expect(missingEnv({ AUTH_SECRET: secret })).toEqual([]);
});

test("الحماية مفعّلة مع APP_PASSWORD وتطلب AUTH_SECRET صالحاً", () => {
  expect(isAuthEnabled({ APP_PASSWORD: "x" })).toBe(true);
  expect(missingEnv({ APP_PASSWORD: "x" })).toEqual(["AUTH_SECRET"]);
  expect(missingEnv({ APP_PASSWORD: "x", AUTH_SECRET: "short" })).toEqual(["AUTH_SECRET"]);
  expect(missingEnv({ APP_PASSWORD: "x", AUTH_SECRET: secret })).toEqual([]);
});

test("getEnv يرمي خطأً واضحاً عند النقص", () => {
  expect(getEnv({ APP_PASSWORD: "x", AUTH_SECRET: secret })).toEqual({ APP_PASSWORD: "x", AUTH_SECRET: secret });
  expect(() => getEnv({ APP_PASSWORD: "x" })).toThrow(EnvNotConfiguredError);
  try {
    getEnv({});
  } catch (error) {
    expect((error as EnvNotConfiguredError).missing.sort()).toEqual(["APP_PASSWORD", "AUTH_SECRET"]);
  }
});
