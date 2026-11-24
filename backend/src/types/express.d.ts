import type { Request as _R } from "express";

declare global {
  namespace Express {
    interface Request {
      // Set by requireAuth after the bearer token is resolved to a User document.
      user?: any;
    }
  }
}
export {};
