import jwt from 'jsonwebtoken';
import DatabaseService from '../services/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'wedding_catalog_secret_token_key_2026';

export function generateToken(admin) {
  return jwt.sign(
    {
      id: admin.id,
      email: admin.email,
      name: admin.name
    },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

export async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthenticated.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const admin = await DatabaseService.getAdminById(decoded.id);
    if (!admin) {
      return res.status(401).json({ message: 'Unauthenticated.' });
    }
    req.admin = {
      id: admin.id,
      name: admin.name,
      email: admin.email
    };
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Unauthenticated.' });
  }
}
