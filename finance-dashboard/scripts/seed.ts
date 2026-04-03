import bcrypt from 'bcryptjs';
import { query, queryOne } from '../lib/db/mysql';
import { initSchema } from '../lib/db/schema';

async function seed() {
  await initSchema();
  console.log('Schema ready.');

  const now = new Date().toISOString();
  const users = [
    { email: 'admin@finance.dev', password: 'Admin@1234', name: 'Admin User', role: 'admin' },
    { email: 'analyst@finance.dev', password: 'Analyst@1234', name: 'Analyst User', role: 'analyst' },
    { email: 'viewer@finance.dev', password: 'Viewer@1234', name: 'Viewer User', role: 'viewer' },
  ];

  const insertedUsers: { email: string; id: string }[] = [];

  for (const u of users) {
    const existing = await queryOne<{ id: string }>('SELECT id FROM users WHERE email = ?', [u.email]);
    if (existing) {
      console.log(`User ${u.email} already exists, skipping.`);
      insertedUsers.push({ email: u.email, id: existing.id });
      continue;
    }
    const id = crypto.randomUUID();
    const password_hash = await bcrypt.hash(u.password, 12);
    await query(
      'INSERT INTO users (id, email, password_hash, name, role, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, u.email, password_hash, u.name, u.role, 'active', now, now]
    );
    insertedUsers.push({ email: u.email, id });
    console.log(`Created user: ${u.email}`);
  }

  const adminId = insertedUsers.find((u) => u.email === 'admin@finance.dev')!.id;
  const analystId = insertedUsers.find((u) => u.email === 'analyst@finance.dev')!.id;

  function monthsAgo(n: number, day: number) {
    const d = new Date();
    d.setMonth(d.getMonth() - n);
    d.setDate(day);
    return d.toISOString().slice(0, 10);
  }

  const records = [
    { user_id: analystId, amount: 5000.00, type: 'income', category: 'Salary', date: monthsAgo(5, 1) },
    { user_id: analystId, amount: 1200.00, type: 'expense', category: 'Rent', date: monthsAgo(5, 5) },
    { user_id: analystId, amount: 300.00, type: 'expense', category: 'Food', date: monthsAgo(5, 10) },
    { user_id: analystId, amount: 5000.00, type: 'income', category: 'Salary', date: monthsAgo(4, 1) },
    { user_id: analystId, amount: 1200.00, type: 'expense', category: 'Rent', date: monthsAgo(4, 5) },
    { user_id: analystId, amount: 150.00, type: 'expense', category: 'Transport', date: monthsAgo(4, 12) },
    { user_id: analystId, amount: 800.00, type: 'income', category: 'Freelance', date: monthsAgo(4, 20) },
    { user_id: analystId, amount: 5000.00, type: 'income', category: 'Salary', date: monthsAgo(3, 1) },
    { user_id: analystId, amount: 1200.00, type: 'expense', category: 'Rent', date: monthsAgo(3, 5) },
    { user_id: analystId, amount: 200.00, type: 'expense', category: 'Utilities', date: monthsAgo(3, 8) },
    { user_id: adminId, amount: 7000.00, type: 'income', category: 'Salary', date: monthsAgo(3, 2) },
    { user_id: adminId, amount: 1500.00, type: 'expense', category: 'Rent', date: monthsAgo(3, 6) },
    { user_id: analystId, amount: 5000.00, type: 'income', category: 'Salary', date: monthsAgo(2, 1) },
    { user_id: analystId, amount: 1200.00, type: 'expense', category: 'Rent', date: monthsAgo(2, 5) },
    { user_id: analystId, amount: 600.00, type: 'income', category: 'Freelance', date: monthsAgo(2, 15) },
    { user_id: adminId, amount: 7000.00, type: 'income', category: 'Salary', date: monthsAgo(2, 2) },
    { user_id: adminId, amount: 250.00, type: 'expense', category: 'Food', date: monthsAgo(2, 18) },
    { user_id: analystId, amount: 5000.00, type: 'income', category: 'Salary', date: monthsAgo(1, 1) },
    { user_id: analystId, amount: 1200.00, type: 'expense', category: 'Rent', date: monthsAgo(1, 5) },
    { user_id: analystId, amount: 180.00, type: 'expense', category: 'Transport', date: monthsAgo(1, 14) },
    { user_id: adminId, amount: 7000.00, type: 'income', category: 'Salary', date: monthsAgo(0, 1) },
    { user_id: adminId, amount: 1500.00, type: 'expense', category: 'Rent', date: monthsAgo(0, 5) },
  ];

  const seedNow = new Date().toISOString();
  for (const r of records) {
    const id = crypto.randomUUID();
    await query(
      'INSERT INTO financial_records (id, user_id, amount, type, category, date, notes, deleted_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?)',
      [id, r.user_id, r.amount, r.type, r.category, r.date, seedNow, seedNow]
    );
  }

  console.log(`Inserted ${records.length} financial records.`);
  console.log('Seed complete.');
  process.exit(0);
}

seed().catch((e) => { console.error(e); process.exit(1); });
