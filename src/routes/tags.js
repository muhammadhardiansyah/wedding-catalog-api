import express from 'express';
import DatabaseService from '../services/db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Public
router.get('/', async (req, res) => {
  try {
    const tags = await DatabaseService.getTags();
    return res.json(tags);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// Admin Protected
router.post('/admin/tags', authMiddleware, async (req, res) => {
  const { name } = req.body;
  if (!name || typeof name !== 'string' || name.trim() === '') {
    return res.status(422).json({
      message: 'The name field is required.',
      errors: { name: ['The name field is required.'] }
    });
  }

  const existing = (await DatabaseService.getTableRows('tags')).find(
    (t) => t.name.toLowerCase() === name.trim().toLowerCase()
  );
  if (existing) {
    return res.status(422).json({
      message: 'The name has already been taken.',
      errors: { name: ['The name has already been taken.'] }
    });
  }

  const created = await DatabaseService.createTag(name.trim());
  return res.status(201).json(created);
});

router.put('/admin/tags/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;

  if (!name || typeof name !== 'string' || name.trim() === '') {
    return res.status(422).json({
      message: 'The name field is required.',
      errors: { name: ['The name field is required.'] }
    });
  }

  const existing = (await DatabaseService.getTableRows('tags')).find(
    (t) => t.name.toLowerCase() === name.trim().toLowerCase() && Number(t.id) !== Number(id)
  );
  if (existing) {
    return res.status(422).json({
      message: 'The name has already been taken.',
      errors: { name: ['The name has already been taken.'] }
    });
  }

  const updated = await DatabaseService.updateTag(id, name.trim());
  if (!updated) {
    return res.status(404).json({ message: 'Tag tidak ditemukan.' });
  }
  return res.json(updated);
});

router.delete('/admin/tags/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const deleted = await DatabaseService.deleteTag(id);
  if (!deleted) {
    return res.status(404).json({ message: 'Tag tidak ditemukan.' });
  }
  return res.json({ message: 'Tag berhasil dihapus.' });
});

export default router;
