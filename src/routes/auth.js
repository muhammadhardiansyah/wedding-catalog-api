import express from 'express';
import bcrypt from 'bcryptjs';
import DatabaseService from '../services/db.js';
import { generateToken, authMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(422).json({
      message: 'Email dan password wajib diisi.',
      errors: {
        email: !email ? ['The email field is required.'] : [],
        password: !password ? ['The password field is required.'] : []
      }
    });
  }

  const admin = await DatabaseService.getAdminByEmail(email);
  if (!admin) {
    return res.status(401).json({ message: 'Kredensial tidak valid.' });
  }

  const matches = await bcrypt.compare(password, admin.password);
  if (!matches) {
    return res.status(401).json({ message: 'Kredensial tidak valid.' });
  }

  const token = generateToken(admin);
  return res.json({
    admin: {
      id: Number(admin.id),
      name: admin.name,
      email: admin.email
    },
    token
  });
});

router.post('/logout', authMiddleware, (req, res) => {
  return res.json({ message: 'Berhasil logout.' });
});

router.get('/me', authMiddleware, (req, res) => {
  return res.json(req.admin);
});

export default router;
