import express from 'express';
import DatabaseService from '../services/db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Public
router.get('/', async (req, res) => {
  try {
    const categories = await DatabaseService.getCategories();
    return res.json(categories);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// Admin Protected
router.post('/admin/categories', authMiddleware, async (req, res) => {
  const { name } = req.body;
  if (!name || typeof name !== 'string' || name.trim() === '') {
    return res.status(422).json({
      message: 'The name field is required.',
      errors: { name: ['The name field is required.'] }
    });
  }

  const existing = (await DatabaseService.getTableRows('categories')).find(
    (c) => c.name.toLowerCase() === name.trim().toLowerCase()
  );
  if (existing) {
    return res.status(422).json({
      message: 'The name has already been taken.',
      errors: { name: ['The name has already been taken.'] }
    });
  }

  const created = await DatabaseService.createCategory(name.trim());
  return res.status(201).json(created);
});

router.put('/admin/categories/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;

  if (!name || typeof name !== 'string' || name.trim() === '') {
    return res.status(422).json({
      message: 'The name field is required.',
      errors: { name: ['The name field is required.'] }
    });
  }

  const existing = (await DatabaseService.getTableRows('categories')).find(
    (c) => c.name.toLowerCase() === name.trim().toLowerCase() && Number(c.id) !== Number(id)
  );
  if (existing) {
    return res.status(422).json({
      message: 'The name has already been taken.',
      errors: { name: ['The name has already been taken.'] }
    });
  }

  const updated = await DatabaseService.updateCategory(id, name.trim());
  if (!updated) {
    return res.status(404).json({ message: 'Kategori tidak ditemukan.' });
  }
  return res.json(updated);
});

router.delete('/admin/categories/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const deleted = await DatabaseService.deleteCategory(id);
  if (!deleted) {
    return res.status(404).json({ message: 'Kategori tidak ditemukan.' });
  }
  return res.json({ message: 'Kategori berhasil dihapus.' });
});

export default router;
