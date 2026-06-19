import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import prisma from '../../db';
import { requireAuth } from '../../middleware/auth';

const router = Router();

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(4),
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = LoginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email },
      include: { userRoles: true },
    });

    if (!user || !user.passwordHash) {
      res.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'פרטי התחברות שגויים' });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'פרטי התחברות שגויים' });
      return;
    }

    if (user.status !== 'active') {
      res.status(403).json({ error: 'USER_INACTIVE', message: 'חשבון המשתמש אינו פעיל' });
      return;
    }

    req.session.userId = user.id;
    req.session.userEmail = user.email ?? undefined;
    req.session.userDisplayName = user.displayName;
    req.session.userRoles = user.userRoles.map((r) => r.role);

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    res.json({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      roles: req.session.userRoles,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

router.get('/me', requireAuth, async (req, res) => {
  res.json({
    id: req.user!.id,
    email: req.user!.email,
    displayName: req.user!.displayName,
    roles: req.user!.roles,
  });
});

export default router;
