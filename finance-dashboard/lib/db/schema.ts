import { query } from './mysql';

export async function initSchema() {
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(36) NOT NULL DEFAULT (UUID()),
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      name VARCHAR(100) NOT NULL,
      role ENUM('viewer','analyst','admin') NOT NULL DEFAULT 'viewer',
      status ENUM('active','inactive') NOT NULL DEFAULT 'active',
      created_at VARCHAR(30) NOT NULL,
      updated_at VARCHAR(30) NOT NULL,
      PRIMARY KEY (id)
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS financial_records (
      id VARCHAR(36) NOT NULL DEFAULT (UUID()),
      user_id VARCHAR(36) NOT NULL,
      amount DECIMAL(15,2) NOT NULL,
      type ENUM('income','expense') NOT NULL,
      category VARCHAR(100) NOT NULL,
      date VARCHAR(10) NOT NULL,
      notes VARCHAR(500) DEFAULT NULL,
      deleted_at VARCHAR(30) DEFAULT NULL,
      created_at VARCHAR(30) NOT NULL,
      updated_at VARCHAR(30) NOT NULL,
      PRIMARY KEY (id),
      INDEX idx_user_id (user_id),
      INDEX idx_date (date),
      INDEX idx_deleted_at (deleted_at)
    )
  `);
}
