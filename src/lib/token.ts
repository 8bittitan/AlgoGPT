import { API_URL } from "./constants";

let tokenReq: Promise<string> | null = null;
let cached: string | null = null;

type TokenPayload = { exp: number };

const decode = (token: string): TokenPayload => {
  const [b64] = token.split(".");
  return JSON.parse(atob(b64));
};

const isExpired = (token?: string | null): boolean => {
  if (!token) return true;
  try {
    const { exp } = decode(token);
    // refresh 30 s before the backend rejects it
    return Date.now() / 1000 > exp - 30;
  } catch {
    return true;
  }
};

export const getToken = (assistantId: string) => {
  if (cached && !isExpired(cached)) {
    return cached;
  }

  if (tokenReq) {
    return tokenReq;
  }

  tokenReq = fetch(`${API_URL}/token`, {
    method: "POST",
    headers: {
      "x-algolia-assistant-id": assistantId,
      "content-type": "application/json",
    },
  })
    .then((r) => r.json())
    .then(({ token }) => {
      cached = token;

      return token;
    })
    .finally(() => (tokenReq = null));

  return tokenReq;
};
