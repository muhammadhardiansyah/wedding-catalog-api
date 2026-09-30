import 'dotenv/config';
import bcrypt from 'bcryptjs';
import dbClient from './lib/drivemyadmin.js';
import DatabaseService from './services/db.js';

async function seed() {
  console.log('--- Seeding Wedding Catalog Database ---');

  const defaultAdmin = {
    name: 'Super Admin',
    email: 'admin@weddingcatalog.com',
    password: bcrypt.hashSync('password123', 10)
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

  // 1. Check DriveMyAdmin
  const tables = await dbClient.fetchTables(true);
  console.log(`DriveMyAdmin Tables found (${tables.length}):`, tables.map((t) => t.name).join(', ') || 'None');

  const adminTable = tables.find((t) => t.name.toLowerCase() === 'admins');
  const catTable = tables.find((t) => t.name.toLowerCase() === 'categories');
  const tagTable = tables.find((t) => t.name.toLowerCase() === 'tags');

  if (adminTable) {
    console.log(`Checking DriveMyAdmin 'admins' table [${adminTable.id}]...`);
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
      console.log('Super Admin inserted into DriveMyAdmin.');
    } else {
      console.log('Super Admin already exists in DriveMyAdmin.');
    }
  }

  if (catTable) {
    console.log(`Checking DriveMyAdmin 'categories' table [${catTable.id}]...`);
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
    console.log(`Checking DriveMyAdmin 'tags' table [${tagTable.id}]...`);
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

  // 2. Ensure Local Store is also ready
  const localAdmins = await DatabaseService.getTableRows('admins');
  console.log(`Local Store contains ${localAdmins.length} admin(s).`);

  console.log('--- Seeding Complete! ---');
  console.log('Login credentials:');
  console.log('  Email:    admin@weddingcatalog.com');
  console.log('  Password: password123');
}

seed().catch(console.error);
