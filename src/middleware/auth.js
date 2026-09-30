import jwt from 'jsonwebtoken';
import DatabaseService from '../services/db.js';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('FATAL: JWT_SECRET environment variable is missing.');
}
const SECRET_KEY = JWT_SECRET || 'wedding_catalog_dev_secret_key_change_in_production';

export function generateToken(admin) {
  return jwt.sign(
    {
      id: admin.id,
      email: admin.email,
      name: admin.name
    },
    SECRET_KEY,
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
    const decoded = jwt.verify(token, SECRET_KEY);
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
