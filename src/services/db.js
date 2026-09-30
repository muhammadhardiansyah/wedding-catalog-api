import bcrypt from 'bcryptjs';
import dbClient from '../lib/drivemyadmin.js';

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

export class DatabaseService {
  static async getTableId(tableName) {
    const tableId = await dbClient.getTableId(tableName);
    if (!tableId) {
      throw new Error(`Tabel '${tableName}' belum tersedia di database DriveMyAdmin.`);
    }
    return tableId;
  }

  static async getTableRows(tableName) {
    const tableId = await this.getTableId(tableName);
    const { rows } = await dbClient.table(tableId).select();
    if (!Array.isArray(rows)) return [];

    return rows.map((r, index) => {
      const copy = { ...r };
      const actualRowIndex = r._rowIndex ? Number(r._rowIndex) : index + 2;
      copy._rowIndex = actualRowIndex;

      if (copy.id) copy.id = Number(copy.id);
      if (copy.category_id) copy.category_id = Number(copy.category_id);
      if (copy.price !== undefined && copy.price !== null && copy.price !== '') {
        copy.price = Number(copy.price);
      }
      if (copy.is_featured !== undefined) {
        const val = String(copy.is_featured).toLowerCase().trim();
        copy.is_featured = val === 'true' || val === '1';
      }
      if (copy.is_active !== undefined) {
        const val = String(copy.is_active).toLowerCase().trim();
        copy.is_active = val === 'true' || val === '1';
      }
      if (copy.view_count !== undefined) {
        copy.view_count = Number(copy.view_count || 0);
      }
      if (copy.tags && typeof copy.tags === 'string') {
        try {
          copy.tags = JSON.parse(copy.tags);
        } catch {
          copy.tags = copy.tags.split(',').map((t) => t.trim()).filter(Boolean);
        }
      } else if (!Array.isArray(copy.tags)) {
        copy.tags = [];
      }
      return copy;
    });
  }

  static async insertRow(tableName, data) {
    const tableId = await this.getTableId(tableName);
    const existing = await this.getTableRows(tableName);
    const nextId = existing.length > 0 ? Math.max(...existing.map((item) => Number(item.id) || 0)) + 1 : 1;
    const now = new Date().toISOString();

    const record = {
      id: nextId,
      ...data,
      created_at: data.created_at || now,
      updated_at: data.updated_at || now
    };

    const payload = { ...record };
    if (Array.isArray(payload.tags)) {
      payload.tags = JSON.stringify(payload.tags);
    }

    await dbClient.table(tableId).insert(payload);
    return record;
  }

  static async updateRow(tableName, id, data) {
    const tableId = await this.getTableId(tableName);
    const existing = await this.getTableRows(tableName);
    const found = existing.find((r) => Number(r.id) === Number(id));
    if (!found) return null;

    const rowIndex = found._rowIndex;
    const updated = {
      ...found,
      ...data,
      id: Number(found.id),
      updated_at: new Date().toISOString()
    };
    delete updated._rowIndex;

    const payload = { ...updated };
    if (Array.isArray(payload.tags)) {
      payload.tags = JSON.stringify(payload.tags);
    }

    await dbClient.table(tableId).update(rowIndex, payload);
    return updated;
  }

  static async deleteRow(tableName, id) {
    const tableId = await this.getTableId(tableName);
    const existing = await this.getTableRows(tableName);
    const found = existing.find((r) => Number(r.id) === Number(id));
    if (!found) return false;

    await dbClient.table(tableId).delete(found._rowIndex);
    return true;
  }

  static async getCategories() {
    const [categories, designs] = await Promise.all([
      this.getTableRows('categories'),
      this.getTableRows('designs')
    ]);

    const activeDesigns = designs.filter((d) => d.is_active);
    return categories.map((cat) => ({
      ...cat,
      designs_count: activeDesigns.filter((d) => Number(d.category_id) === Number(cat.id)).length
    }));
  }

  static async createCategory(name) {
    return await this.insertRow('categories', {
      name,
      slug: slugify(name)
    });
  }

  static async updateCategory(id, name) {
    return await this.updateRow('categories', id, {
      name,
      slug: slugify(name)
    });
  }

  static async deleteCategory(id) {
    return await this.deleteRow('categories', id);
  }

  static async getTags() {
    const [tags, designs] = await Promise.all([
      this.getTableRows('tags'),
      this.getTableRows('designs')
    ]);

    const activeDesigns = designs.filter((d) => d.is_active);
    return tags.map((t) => {
      const count = activeDesigns.filter((d) => {
        const dTags = Array.isArray(d.tags) ? d.tags : [];
        return dTags.some((dt) => (typeof dt === 'object' ? Number(dt.id) === Number(t.id) : Number(dt) === Number(t.id)));
      }).length;
      return {
        ...t,
        designs_count: count
      };
    });
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
    if (!email) return null;
    const envEmail = process.env.ADMIN_EMAIL;
    const envPassword = process.env.ADMIN_PASSWORD;
    const envHash = process.env.ADMIN_PASSWORD_HASH;

    if (envEmail && email.toLowerCase() === envEmail.toLowerCase() && (envPassword || envHash)) {
      const password = envHash || bcrypt.hashSync(envPassword, 10);
      return {
        id: 1,
        name: process.env.ADMIN_NAME || 'Super Admin',
        email: envEmail,
        password
      };
    }

    try {
      const admins = await this.getTableRows('admins');
      return admins.find((a) => a.email && a.email.toLowerCase() === email.toLowerCase()) || null;
    } catch {
      return null;
    }
  }

  static async getAdminById(id) {
    if (Number(id) === 1 && (process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD_HASH)) {
      return {
        id: 1,
        name: process.env.ADMIN_NAME || 'Super Admin',
        email: process.env.ADMIN_EMAIL || 'admin@weddingcatalog.com'
      };
    }
    try {
      const admins = await this.getTableRows('admins');
      return admins.find((a) => Number(a.id) === Number(id)) || null;
    } catch {
      return null;
    }
  }

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
      ...design,
      category: cat,
      tags: populatedTags
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

    if (!admin) {
      designs = designs.filter((d) => d.is_active);
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
          const dTags = Array.isArray(d.tags) ? d.tags : [];
          return dTags.some((t) => (typeof t === 'object' ? Number(t.id) === Number(targetTag.id) : Number(t) === Number(targetTag.id)));
        });
      } else {
        designs = [];
      }
    }

    if (search) {
      const s = search.toLowerCase();
      designs = designs.filter((d) =>
        (d.title && d.title.toLowerCase().includes(s)) ||
        (d.description && d.description.toLowerCase().includes(s))
      );
    }

    if (price_type && price_type !== 'all') {
      designs = designs.filter((d) => d.price_type === price_type);
    }

    if (featured) {
      designs = designs.filter((d) => d.is_featured);
    }

    designs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const total = designs.length;
    const p = Math.max(1, parseInt(page, 10) || 1);
    const limit = Math.max(1, parseInt(per_page, 10) || 12);
    const start = (p - 1) * limit;
    const paginated = designs.slice(start, start + limit);

    const populated = await Promise.all(
      paginated.map((d) => this.populateDesign(d, catMap, tagMap))
    );

    return {
      data: populated,
      current_page: p,
      last_page: Math.ceil(total / limit) || 1,
      per_page: limit,
      total
    };
  }

  static async getDesignBySlug(slug, admin = false) {
    let designs = await this.getTableRows('designs');
    if (!admin) {
      designs = designs.filter((d) => d.is_active);
    }
    const design = designs.find((d) => d.slug === slug);
    if (!design) return null;

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
    return await this.insertRow('designs', {
      ...data,
      slug,
      view_count: 0
    });
  }

  static async updateDesign(id, data) {
    const updateData = { ...data };
    if (updateData.title && !updateData.slug) {
      updateData.slug = `${slugify(updateData.title)}-${randomStr(5)}`;
    }
    return await this.updateRow('designs', id, updateData);
  }

  static async deleteDesign(id) {
    return await this.deleteRow('designs', id);
  }
}

export default DatabaseService;
