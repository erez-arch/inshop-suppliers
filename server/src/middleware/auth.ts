import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../domain/statuses';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email?: string;
        displayName: string;
        roles: string[];
        supplierId?: string; // for supplier_accountant
      };
    }
  }
}

declare module 'express-session' {
  interface SessionData {
    userId?: string;
    userEmail?: string;
    userDisplayName?: string;
    userRoles?: string[];
    supplierId?: string;
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.session?.userId) {
    res.status(401).json({ error: 'UNAUTHORIZED', message: 'יש להתחבר למערכת' });
    return;
  }
  req.user = {
    id: req.session.userId,
    email: req.session.userEmail,
    displayName: req.session.userDisplayName ?? '',
    roles: req.session.userRoles ?? [],
    supplierId: req.session.supplierId,
  };
  next();
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'UNAUTHORIZED', message: 'יש להתחבר למערכת' });
      return;
    }
    const hasRole = roles.some((r) => req.user!.roles.includes(r));
    if (!hasRole) {
      res.status(403).json({ error: 'FORBIDDEN', message: 'אין הרשאה לביצוע פעולה זו' });
      return;
    }
    next();
  };
}

export const requireAdmin = requireRole(UserRole.ADMIN);
export const requireInventoryCounter = requireRole(UserRole.ADMIN, UserRole.INVENTORY_COUNTER);
export const requireSupplierAccountant = requireRole(
  UserRole.ADMIN,
  UserRole.SUPPLIER_ACCOUNTANT
);
