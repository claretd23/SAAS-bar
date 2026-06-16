import Database from "better-sqlite3";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database(path.join(__dirname, "barpos.db"));
db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS businesses (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  owner_email TEXT,
  plan TEXT DEFAULT 'trial',
  status TEXT DEFAULT 'active',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL,
  name TEXT NOT NULL,
  pin TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('mesero','barman','admin','superadmin')),
  FOREIGN KEY(business_id) REFERENCES businesses(id)
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL,
  name TEXT NOT NULL,
  cat TEXT NOT NULL,
  price REAL NOT NULL,
  stock INTEGER NOT NULL,
  image_url TEXT DEFAULT NULL,
  FOREIGN KEY(business_id) REFERENCES businesses(id)
);

CREATE TABLE IF NOT EXISTS promos (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL,
  name TEXT NOT NULL,
  desc TEXT,
  type TEXT DEFAULT 'percent',
  discount REAL DEFAULT 0,
  active INTEGER DEFAULT 1,
  FOREIGN KEY(business_id) REFERENCES businesses(id)
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL,
  mesa INTEGER,
  items TEXT NOT NULL,
  note TEXT,
  pay TEXT,
  disc REAL DEFAULT 0,
  promo_disc REAL DEFAULT 0,
  total REAL NOT NULL,
  status TEXT DEFAULT 'pendiente',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(business_id) REFERENCES businesses(id)
);
`);

// Migraciones: agregar columnas si no existen (corren solo una vez)
const productCols = db.prepare("PRAGMA table_info(products)").all().map(c => c.name);
if (!productCols.includes("image_url")) {
  db.exec("ALTER TABLE products ADD COLUMN image_url TEXT DEFAULT NULL");
  console.log("Migracion: columna image_url agregada a products");
}

const promoCols = db.prepare("PRAGMA table_info(promos)").all().map(c => c.name);
if (!promoCols.includes("emoji")) {
  db.exec("ALTER TABLE promos ADD COLUMN emoji TEXT DEFAULT ''");
  console.log("Migracion: columna emoji agregada a promos");
}

export default db;