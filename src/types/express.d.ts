import type { Role } from "./auth";

declare global {
  namespace Express {
    interface Request {
      role?: Role;
      validated?: {
        body?: unknown;
        query?: unknown;
        params?: unknown;
      };
    }
  }
}

export {};
