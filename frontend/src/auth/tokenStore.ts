/**
 * In-memory access token storage.
 *
 * Security Invariants:
 * - Stored exclusively in JavaScript module memory (heap).
 * - NEVER persisted to localStorage, sessionStorage, IndexedDB, cookies, or URL parameters.
 * - Reset to null on browser refresh or application reload.
 */

let accessToken: string | null = null;
let onTokenClearedCallback: (() => void) | null = null;
let authGeneration = 0;

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string): void {
  accessToken = token;
}

export function clearAccessToken(): void {
  accessToken = null;
  onTokenClearedCallback?.();
}

export function setOnTokenCleared(callback: (() => void) | null): void {
  onTokenClearedCallback = callback;
}

export function getAuthGeneration(): number {
  return authGeneration;
}

export function nextAuthGeneration(): number {
  authGeneration++;
  return authGeneration;
}


