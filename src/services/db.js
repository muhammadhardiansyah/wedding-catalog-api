import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import dbClient from '../lib/drivemyadmin.js';

const DATA_FILE = path.join(process.cwd(), 'data', 'store.json');

export function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
}

function randomStr(len = 5) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let str = '';
  for (let i = 0; i < len; i++) {
    str += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return str;
}

// Initial seed data
const initialData = {
  admins: [
    {
      id: 1,
      name: 'Super Admin',
      email: 'admin@weddingcatalog.com',
      password: bcrypt.hashSync('password123', 10),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ],
  categories: [
    { id: 1, name: 'Rustic', slug: 'rustic', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 2, name: 'Modern', slug: 'modern', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 3, name: 'Islami', slug: 'islami', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 4, name: 'Floral', slug: 'floral', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 5, name: 'Minimalist', slug: 'minimalist', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 6, name: 'Elegant', slug: 'elegant', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
  ],
  tags: [
    { id: 1, name: 'Bunga', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 2, name: 'Vintage', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 3, name: 'Gold', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
  ],
  designs: []
};

function readLocalStore() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('[Store] Could not read local store, creating new:', e.message);
  }
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
  return JSON.parse(JSON.stringify(initialData));
}

function writeLocalStore(data) {
  try {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.warn('[Store] Write local store error:', e.message);
  }
}

export class DatabaseService {
  static async getTableId(tableName) {
    return await dbClient.getTableId(tableName);
  }

  // Fetch all rows for a table (checking DriveMyAdmin first, falling back to persistent store)
  static async getTableRows(tableName) {
    const tableId = await this.getTableId(tableName);
    if (tableId) {
      try {
        const { rows } = await dbClient.table(tableId).select();
        if (Array.isArray(rows)) {
          return rows.map((r) => {
            const copy = { ...r };
            if (copy.id) copy.id = Number(copy.id);
            if (copy.category_id) copy.category_id = Number(copy.category_id);
            if (copy.price !== undefined && copy.price !== null && copy.price !== '') {
              copy.price = Number(copy.price);
            }
            if (copy.is_featured !== undefined) {
              copy.is_featured = copy.is_featured === true || copy.is_featured === 'true' || copy.is_featured === 1 || copy.is_featured === '1';
            }
            if (copy.is_active !== undefined) {
              copy.is_active = copy.is_active === true || copy.is_active === 'true' || copy.is_active === 1 || copy.is_active === '1';
            }
            if (copy.view_count !== undefined) {
              copy.view_count = Number(copy.view_count || 0);
            }
            if (copy.tags && typeof copy.tags === 'string') {
              try {
                copy.tags = JSON.parse(copy.tags);
              } catch {
                copy.tags = copy.tags.split(',').map((t) => Number(t.trim())).filter(Boolean);
              }
            } else if (!Array.isArray(copy.tags)) {
              copy.tags = [];
            }
            return copy;
          });
        }
      } catch (err) {
        console.warn(`[DriveMyAdmin] Failed to query table '${tableName}':`, err.message);
      }
    }

    const store = readLocalStore();
    return store[tableName] || [];
  }

  // Save row
  static async insertRow(tableName, data) {
    const tableId = await this.getTableId(tableName);
    const store = readLocalStore();
    const list = store[tableName] || [];

    const nextId = list.length > 0 ? Math.max(...list.map((item) => Number(item.id) || 0)) + 1 : 1;
    const now = new Date().toISOString();
    const record = {
      id: nextId,
      ...data,
      created_at: data.created_at || now,
      updated_at: data.updated_at || now
    };

    list.push(record);
    store[tableName] = list;
    writeLocalStore(store);

    if (tableId) {
      try {
        const payloadForDrive = { ...record };
        if (Array.isArray(payloadForDrive.tags)) {
          payloadForDrive.tags = JSON.stringify(payloadForDrive.tags);
        }
        await dbClient.table(tableId).insert(payloadForDrive);
      } catch (e) {
        console.warn(`[DriveMyAdmin] Could not sync insert to table '${tableName}':`, e.message);
      }
    }

    return record;
  }

  static async updateRow(tableName, id, data) {
    const numericId = Number(id);
    const tableId = await this.getTableId(tableName);
    const store = readLocalStore();
    const list = store[tableName] || [];

    const index = list.findIndex((item) => Number(item.id) === numericId);
    if (index === -1) {
      return null;
    }

    const now = new Date().toISOString();
    list[index] = {
      ...list[index],
      ...data,
      id: numericId,
      updated_at: now
    };

    store[tableName] = list;
    writeLocalStore(store);

    if (tableId) {
      try {
        const { rows } = await dbClient.table(tableId).select();
        const driveRow = rows?.find((r) => Number(r.id) === numericId);
        if (driveRow && driveRow._rowIndex) {
          const payloadForDrive = { ...list[index] };
          if (Array.isArray(payloadForDrive.tags)) {
            payloadForDrive.tags = JSON.stringify(payloadForDrive.tags);
          }
          await dbClient.table(tableId).update(driveRow._rowIndex, payloadForDrive);
        }
      } catch (e) {
        console.warn(`[DriveMyAdmin] Could not sync update to table '${tableName}':`, e.message);
      }
    }

    return list[index];
  }

  static async deleteRow(tableName, id) {
    const numericId = Number(id);
    const tableId = await this.getTableId(tableName);
    const store = readLocalStore();
    const list = store[tableName] || [];

    const index = list.findIndex((item) => Number(item.id) === numericId);
    if (index === -1) {
      return false;
    }

    list.splice(index, 1);
    store[tableName] = list;
    writeLocalStore(store);

    if (tableId) {
      try {
        const { rows } = await dbClient.table(tableId).select();
        const driveRow = rows?.find((r) => Number(r.id) === numericId);
        if (driveRow && driveRow._rowIndex) {
          await dbClient.table(tableId).delete(driveRow._rowIndex);
        }
      } catch (e) {
        console.warn(`[DriveMyAdmin] Could not sync delete from table '${tableName}':`, e.message);
      }
    }

    return true;
  }

  // --- HIGHER LEVEL QUERIES MATCHING LARAVEL ---

  static async getCategories() {
    const categories = await this.getTableRows('categories');
    const designs = await this.getTableRows('designs');

    return categories.map((cat) => {
      const count = designs.filter(
        (d) => Number(d.category_id) === Number(cat.id) && (d.is_active === true || d.is_active === 'true' || d.is_active === 1)
      ).length;
      return {
        ...cat,
        id: Number(cat.id),
        designs_count: count
      };
    });
  }

  static async getCategoryById(id) {
    const categories = await this.getTableRows('categories');
    return categories.find((c) => Number(c.id) === Number(id)) || null;
  }

  static async createCategory(name) {
    const slug = slugify(name);
    return await this.insertRow('categories', { name, slug });
  }

  static async updateCategory(id, name) {
    const slug = slugify(name);
    return await this.updateRow('categories', id, { name, slug });
  }

  static async deleteCategory(id) {
    return await this.deleteRow('categories', id);
  }

  static async getTags() {
    const tags = await this.getTableRows('tags');
    const designs = await this.getTableRows('designs');

    return tags.map((tag) => {
      const count = designs.filter((d) => {
        if (!d.is_active) return false;
        const tagIds = Array.isArray(d.tags) ? d.tags : [];
        return tagIds.some((t) => Number(t) === Number(tag.id) || (typeof t === 'object' && Number(t.id) === Number(tag.id)));
      }).length;

      return {
        ...tag,
        id: Number(tag.id),
        designs_count: count
      };
    });
  }

  static async getTagById(id) {
    const tags = await this.getTableRows('tags');
    return tags.find((t) => Number(t.id) === Number(id)) || null;
  }

  static async createTag(name) {
    return await this.insertRow('tags', { name });
  }

  static async updateTag(id, name) {
    return await this.updateRow('tags', id, { name });
  }

  static async deleteTag(id) {
    return await this.deleteRow('tags', id);
  }

  static async getAdminByEmail(email) {
    const admins = await this.getTableRows('admins');
    return admins.find((a) => a.email.toLowerCase() === email.toLowerCase()) || null;
  }

  static async getAdminById(id) {
    const admins = await this.getTableRows('admins');
    return admins.find((a) => Number(a.id) === Number(id)) || null;
  }

  // Format a design record with category & tags populated
  static async populateDesign(design, categoriesMap, tagsMap) {
    const cat = categoriesMap[design.category_id] || {
      id: Number(design.category_id),
      name: 'Uncategorized',
      slug: 'uncategorized'
    };

    const tagIds = Array.isArray(design.tags) ? design.tags : [];
    const populatedTags = tagIds
      .map((t) => {
        if (typeof t === 'object' && t.name) return t;
        const found = tagsMap[Number(t)];
        return found ? { id: Number(found.id), name: found.name } : null;
      })
      .filter(Boolean);

    return {
      id: Number(design.id),
      title: design.title,
      slug: design.slug,
      description: design.description || null,
      thumbnail_url: design.thumbnail_url || '',
      canva_embed_url: design.canva_embed_url || '',
      canva_public_url: design.canva_public_url || '',
      category_id: Number(design.category_id),
      category: {
        id: Number(cat.id),
        name: cat.name,
        slug: cat.slug
      },
      tags: populatedTags,
      is_featured: design.is_featured === true || design.is_featured === 'true' || design.is_featured === 1,
      is_active: design.is_active === true || design.is_active === 'true' || design.is_active === 1,
      price_type: design.price_type || 'free',
      price: design.price !== null && design.price !== undefined && design.price !== '' ? Number(design.price) : null,
      view_count: Number(design.view_count || 0),
      created_at: design.created_at || new Date().toISOString(),
      updated_at: design.updated_at || new Date().toISOString()
    };
  }

  static async getDesigns(params = {}) {
    const {
      category,
      tag,
      search,
      price_type,
      featured,
      page = 1,
      per_page = 12,
      admin = false
    } = params;

    let designs = await this.getTableRows('designs');
    const categories = await this.getTableRows('categories');
    const tags = await this.getTableRows('tags');

    const catMap = Object.fromEntries(categories.map((c) => [c.id, c]));
    const tagMap = Object.fromEntries(tags.map((t) => [t.id, t]));

    // Only active unless admin
    if (!admin) {
      designs = designs.filter((d) => d.is_active === true || d.is_active === 'true' || d.is_active === 1);
    }

    if (category) {
      const targetCat = categories.find((c) => c.slug === category);
      if (targetCat) {
        designs = designs.filter((d) => Number(d.category_id) === Number(targetCat.id));
      } else {
        designs = [];
      }
    }

    if (tag) {
      const targetTag = tags.find((t) => t.name.toLowerCase() === tag.toLowerCase());
      if (targetTag) {
        designs = designs.filter((d) => {
          const tIds = Array.isArray(d.tags) ? d.tags : [];
          return tIds.some((id) => Number(id) === Number(targetTag.id));
        });
      } else {
        designs = [];
      }
    }

    if (search) {
      const term = search.toLowerCase();
      designs = designs.filter((d) => d.title && d.title.toLowerCase().includes(term));
    }

    if (price_type) {
      designs = designs.filter((d) => d.price_type === price_type);
    }

    if (featured) {
      designs = designs.filter((d) => d.is_featured === true || d.is_featured === 'true' || d.is_featured === 1);
    }

    // Sort by latest created_at
    designs.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

    const total = designs.length;
    const limit = Number(per_page) || 12;
    const currentPage = Math.max(1, Number(page) || 1);
    const offset = (currentPage - 1) * limit;
    const pagedDesigns = designs.slice(offset, offset + limit);

    const populated = await Promise.all(
      pagedDesigns.map((d) => this.populateDesign(d, catMap, tagMap))
    );

    return {
      data: populated,
      current_page: currentPage,
      last_page: Math.ceil(total / limit) || 1,
      per_page: limit,
      total
    };
  }

  static async getDesignBySlug(slug, admin = false) {
    let designs = await this.getTableRows('designs');
    const design = designs.find((d) => d.slug === slug);
    if (!design) return null;
    if (!admin && !(design.is_active === true || design.is_active === 'true' || design.is_active === 1)) {
      return null;
    }

    const categories = await this.getTableRows('categories');
    const tags = await this.getTableRows('tags');
    const catMap = Object.fromEntries(categories.map((c) => [c.id, c]));
    const tagMap = Object.fromEntries(tags.map((t) => [t.id, t]));

    return await this.populateDesign(design, catMap, tagMap);
  }

  static async getDesignById(id) {
    let designs = await this.getTableRows('designs');
    const design = designs.find((d) => Number(d.id) === Number(id));
    if (!design) return null;

    const categories = await this.getTableRows('categories');
    const tags = await this.getTableRows('tags');
    const catMap = Object.fromEntries(categories.map((c) => [c.id, c]));
    const tagMap = Object.fromEntries(tags.map((t) => [t.id, t]));

    return await this.populateDesign(design, catMap, tagMap);
  }

  static async incrementView(slug) {
    let designs = await this.getTableRows('designs');
    const design = designs.find((d) => d.slug === slug);
    if (!design) return null;

    const currentCount = Number(design.view_count || 0);
    const newCount = currentCount + 1;
    await this.updateRow('designs', design.id, { view_count: newCount });
    return newCount;
  }

  static async createDesign(data) {
    const slug = `${slugify(data.title)}-${randomStr(5)}`;
    const record = await this.insertRow('designs', {
      title: data.title,
      slug,
      description: data.description || '',
      thumbnail_url: data.thumbnail_url,
      canva_embed_url: data.canva_embed_url,
      canva_public_url: data.canva_public_url,
      category_id: Number(data.category_id),
      tags: Array.isArray(data.tags) ? data.tags.map(Number) : [],
      is_featured: data.is_featured === true || data.is_featured === 'true' || data.is_featured === 1,
      is_active: data.is_active !== undefined ? (data.is_active === true || data.is_active === 'true' || data.is_active === 1) : true,
      price_type: data.price_type || 'free',
      price: data.price ? Number(data.price) : null,
      view_count: 0
    });

    return await this.getDesignById(record.id);
  }

  static async updateDesign(id, data) {
    const updateData = { ...data };
    if (updateData.title && !updateData.slug) {
      // keep existing slug unless explicitly changing
    }
    if (updateData.category_id) updateData.category_id = Number(updateData.category_id);
    if (updateData.tags !== undefined) {
      updateData.tags = Array.isArray(updateData.tags) ? updateData.tags.map(Number) : [];
    }
    if (updateData.is_featured !== undefined) {
      updateData.is_featured = updateData.is_featured === true || updateData.is_featured === 'true' || updateData.is_featured === 1;
    }
    if (updateData.is_active !== undefined) {
      updateData.is_active = updateData.is_active === true || updateData.is_active === 'true' || updateData.is_active === 1;
    }
    if (updateData.price !== undefined) {
      updateData.price = updateData.price ? Number(updateData.price) : null;
    }

    await this.updateRow('designs', id, updateData);
    return await this.getDesignById(id);
  }

  static async deleteDesign(id) {
    return await this.deleteRow('designs', id);
  }
}

export default DatabaseService;
