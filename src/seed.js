import 'dotenv/config';
import bcrypt from 'bcryptjs';
import dbClient from './lib/drivemyadmin.js';

async function seed() {
  console.log('--- Seeding Wedding Catalog Database to DriveMyAdmin ---');

  const defaultAdmin = {
    name: 'Super Admin',
    email: process.env.ADMIN_EMAIL || 'admin@weddingcatalog.com',
    password: bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'password123', 10)
  };

  const defaultCategories = [
    { name: 'Rustic', slug: 'rustic' },
    { name: 'Modern', slug: 'modern' },
    { name: 'Islami', slug: 'islami' },
    { name: 'Floral', slug: 'floral' },
    { name: 'Minimalist', slug: 'minimalist' },
    { name: 'Elegant', slug: 'elegant' }
  ];

  const defaultTags = [
    { name: 'Bunga' },
    { name: 'Vintage' },
    { name: 'Gold' }
  ];

  const defaultDesigns = [
    {
      id: 1,
      title: 'Midnight Luxe',
      slug: 'midnight-luxe-TT5qe',
      description: 'Desain mewah bernuansa gelap dengan aksen gold. Cocok untuk pernikahan eksklusif dan tak terlupakan.',
      thumbnail_url: '/storage/thumbnails/COlzDE8a1ZhAzWL16C3YRqqK9WqhLNB4yQwUkKtK.png',
      canva_embed_url: 'https://www.canva.com/design/DAHGqO8D8vY/4JzwICZsVJlF4U_i1tY4fw/view?embed',
      canva_public_url: 'https://www.canva.com/design/DAHGqO8D8vY/4JzwICZsVJlF4U_i1tY4fw/view',
      category_id: 6,
      tags: '[]',
      is_featured: true,
      is_active: true,
      price_type: 'premium',
      price: 1000000,
      view_count: 10
    },
    {
      id: 2,
      title: 'Garden Wedding',
      slug: 'garden-wedding-5Q5Mi',
      description: 'Pernikahan di taman dengan nuansa floral asri.',
      thumbnail_url: '/storage/thumbnails/PHnRKwPXkAs6dT7QrUsNu4AtmHdYenBAX06oeyFs.png',
      canva_embed_url: 'https://www.canva.com/design/DAHGrhzD_Z0/eNk46eOCqLStCOhcUE3-cg/view?embed',
      canva_public_url: 'https://www.canva.com/design/DAHGrhzD_Z0/eNk46eOCqLStCOhcUE3-cg/view',
      category_id: 2,
      tags: '[]',
      is_featured: true,
      is_active: true,
      price_type: 'premium',
      price: 70000,
      view_count: 16
    },
    {
      id: 3,
      title: 'Flower Design',
      slug: 'flower-design-d3Zuo',
      description: 'Desain undangan penuh dengan keindahan bunga romantis.',
      thumbnail_url: '/storage/thumbnails/qSTaYQuKq06dEj1BFEntYH9LtCBuuo1Vs8rhIz1Y.png',
      canva_embed_url: 'https://www.canva.com/design/DAHGs30Z6Do/BZAnL5wqWrsmI-TWa4-w_A/view?embed',
      canva_public_url: 'https://www.canva.com/design/DAHGs30Z6Do/BZAnL5wqWrsmI-TWa4-w_A/view',
      category_id: 4,
      tags: '[]',
      is_featured: true,
      is_active: true,
      price_type: 'premium',
      price: 50000,
      view_count: 12
    }
  ];

  const tables = await dbClient.fetchTables(true);
  console.log(`DriveMyAdmin Tables found (${tables.length}):`, tables.map((t) => t.name).join(', '));

  const adminTable = tables.find((t) => t.name.toLowerCase() === 'admins');
  const catTable = tables.find((t) => t.name.toLowerCase() === 'categories');
  const tagTable = tables.find((t) => t.name.toLowerCase() === 'tags');
  const designTable = tables.find((t) => t.name.toLowerCase() === 'designs');

  if (adminTable) {
    const { rows } = await dbClient.table(adminTable.id).select();
    if (!rows.some((r) => r.email === defaultAdmin.email)) {
      console.log(`Inserting Super Admin into DriveMyAdmin...`);
      await dbClient.table(adminTable.id).insert({
        id: 1,
        name: defaultAdmin.name,
        email: defaultAdmin.email,
        password: defaultAdmin.password,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }
  }

  if (catTable) {
    const { rows } = await dbClient.table(catTable.id).select();
    for (let i = 0; i < defaultCategories.length; i++) {
      const cat = defaultCategories[i];
      if (!rows.some((r) => r.slug === cat.slug)) {
        console.log(`Inserting category '${cat.name}' into DriveMyAdmin...`);
        await dbClient.table(catTable.id).insert({
          id: i + 1,
          name: cat.name,
          slug: cat.slug,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }
    }
  }

  if (tagTable) {
    const { rows } = await dbClient.table(tagTable.id).select();
    for (let i = 0; i < defaultTags.length; i++) {
      const tag = defaultTags[i];
      if (!rows.some((r) => r.name === tag.name)) {
        console.log(`Inserting tag '${tag.name}' into DriveMyAdmin...`);
        await dbClient.table(tagTable.id).insert({
          id: i + 1,
          name: tag.name,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }
    }
  }

  if (designTable) {
    const { rows } = await dbClient.table(designTable.id).select();
    for (const d of defaultDesigns) {
      if (!rows.some((r) => r.slug === d.slug)) {
        console.log(`Inserting design '${d.title}' into DriveMyAdmin...`);
        await dbClient.table(designTable.id).insert({
          ...d,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }
    }
  }

  console.log('--- DriveMyAdmin Seeding Complete! ---');
}

seed().catch(console.error);
