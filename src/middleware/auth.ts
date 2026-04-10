import type { NextFunction, Request, Response } from "express";
import { AuthorizationError } from "../errors/app-error";
import { ROLE_PRIORITY, type Role } from "../types/auth";

function isRole(value: string): value is Role {
  return value in ROLE_PRIORITY;
}

export function requireRole(...allowedRoles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const roleHeader = req.header("X-Role");
    if (!roleHeader || !isRole(roleHeader)) {
      next(new AuthorizationError("Missing or invalid X-Role header"));
      return;
    }

    req.role = roleHeader;

    const hasAccess = allowedRoles.some(
      (allowedRole) => ROLE_PRIORITY[roleHeader] >= ROLE_PRIORITY[allowedRole],
    );

    if (!hasAccess) {
      next(new AuthorizationError("Forbidden"));
      return;
    }

    next();
  };
}
