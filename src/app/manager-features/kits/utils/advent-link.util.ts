export interface AdventLinkPayload {
  kitId: number;
  exp: number; // epoch en milisegundos
}

export function encodeAdventLink(kitId: number, days: number): string {
  const payload: AdventLinkPayload = { kitId, exp: Date.now() + days * 86_400_000 };
  return btoa(JSON.stringify(payload))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function decodeAdventLink(code: string): AdventLinkPayload | null {
  try {
    const base64 = code.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64));
    if (typeof payload?.kitId !== 'number' || typeof payload?.exp !== 'number') return null;
    return payload;
  } catch {
    return null;
  }
}

export function isAdventLinkExpired(payload: AdventLinkPayload): boolean {
  return Date.now() > payload.exp;
}