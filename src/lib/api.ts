export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export const API_UNAVAILABLE_MESSAGE = `Could not reach the API server at ${API_URL}. Run npm run dev:api or npm run dev:full.`;

export const SOCKET_OPTIONS = {
  reconnectionAttempts: 1,
  timeout: 1500,
};
