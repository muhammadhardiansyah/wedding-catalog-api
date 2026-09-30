import express from 'express';
import multer from 'multer';
import DatabaseService from '../services/db.js';
import { authMiddleware } from '../middleware/auth.js';
import dbClient from '../lib/drivemyadmin.js';

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// Public catalog routes
router.get('/', async (req, res) => {
  try {
    const result = await DatabaseService.getDesigns({
      category: req.query.category,
      tag: req.query.tag,
      search: req.query.search,
      price_type: req.query.price_type,
      featured: req.query.featured === '1' || req.query.featured === 'true',
      page: req.query.page,
      per_page: req.query.per_page || 12,
      admin: false
    });
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

router.get('/:slug', async (req, res) => {
  try {
    const design = await DatabaseService.getDesignBySlug(req.params.slug, false);
    if (!design) {
      return res.status(404).json({ message: 'Desain tidak ditemukan.' });
    }
    return res.json(design);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

router.post('/:slug/view', async (req, res) => {
  try {
    const newCount = await DatabaseService.incrementView(req.params.slug);
    if (newCount === null) {
      return res.status(404).json({ message: 'Desain tidak ditemukan.' });
    }
    return res.json({ view_count: newCount });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// Admin management routes
router.get('/admin/designs', authMiddleware, async (req, res) => {
  try {
    const result = await DatabaseService.getDesigns({
      category: req.query.category,
      search: req.query.search,
      price_type: req.query.price_type,
      page: req.query.page,
      per_page: req.query.per_page || 10,
      admin: true
    });
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

router.get('/admin/designs/:id', authMiddleware, async (req, res) => {
  try {
    const design = await DatabaseService.getDesignById(req.params.id);
    if (!design) {
      return res.status(404).json({ message: 'Desain tidak ditemukan.' });
    }
    return res.json(design);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

router.post('/admin/designs', authMiddleware, async (req, res) => {
  const {
    title,
    description,
    thumbnail_url,
    canva_embed_url,
    canva_public_url,
    category_id,
    is_featured,
    is_active,
    price_type,
    price,
    tags
  } = req.body;

  const errors = {};
  if (!title) errors.title = ['The title field is required.'];
  if (!thumbnail_url) errors.thumbnail_url = ['The thumbnail url field is required.'];
  if (!canva_embed_url) errors.canva_embed_url = ['The canva embed url field is required.'];
  if (!canva_public_url) errors.canva_public_url = ['The canva public url field is required.'];
  if (!category_id) errors.category_id = ['The category id field is required.'];

  if (Object.keys(errors).length > 0) {
    return res.status(422).json({
      message: 'The given data was invalid.',
      errors
    });
  }

  try {
    const design = await DatabaseService.createDesign({
      title,
      description,
      thumbnail_url,
      canva_embed_url,
      canva_public_url,
      category_id,
      is_featured,
      is_active,
      price_type,
      price,
      tags
    });
    return res.status(201).json(design);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

router.put('/admin/designs/:id', authMiddleware, async (req, res) => {
  try {
    const design = await DatabaseService.updateDesign(req.params.id, req.body);
    if (!design) {
      return res.status(404).json({ message: 'Desain tidak ditemukan.' });
    }
    return res.json(design);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

router.patch('/admin/designs/:id', authMiddleware, async (req, res) => {
  try {
    const design = await DatabaseService.updateDesign(req.params.id, req.body);
    if (!design) {
      return res.status(404).json({ message: 'Desain tidak ditemukan.' });
    }
    return res.json(design);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

router.delete('/admin/designs/:id', authMiddleware, async (req, res) => {
  try {
    const deleted = await DatabaseService.deleteDesign(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Desain tidak ditemukan.' });
    }
    return res.json({ message: 'Desain berhasil dihapus.' });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

router.post('/admin/upload', authMiddleware, upload.single('thumbnail'), async (req, res) => {
  if (!req.file) {
    return res.status(422).json({
      message: 'The thumbnail field is required.',
      errors: { thumbnail: ['The thumbnail field is required.'] }
    });
  }

  try {
    // Upload to DriveMyAdmin Object Storage
    const uploaded = await dbClient
      .storage('designs')
      .upload(req.file.buffer, req.file.originalname, req.file.mimetype);

    return res.json({
      thumbnail_url: uploaded.directUrl
    });
  } catch (err) {
    console.warn('[DriveMyAdmin Storage] Upload failed, falling back to base64 Data URL:', err.message);
    const b64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    return res.json({
      thumbnail_url: b64
    });
  }
});

export default router;
