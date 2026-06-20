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
  mesa TEXT,
  items TEXT NOT NULL,
  note TEXT,
  disc REAL DEFAULT 0,
  promo_disc REAL DEFAULT 0,
  total REAL NOT NULL,
  is_closed INTEGER NOT NULL DEFAULT 0,
  created_by_id TEXT,
  created_by_name TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(business_id) REFERENCES businesses(id)
);

-- Cada pago (parcial o total) hecho contra una orden/mesa. Una mesa puede
-- tener varios pagos (ej. cada persona paga lo suyo) antes de cerrarse.
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL,
  order_id TEXT NOT NULL,
  amount REAL NOT NULL,
  pay TEXT NOT NULL,
  charged_by_id TEXT,
  charged_by_name TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(order_id) REFERENCES orders(id),
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

if (!productCols.includes("unlimited_stock")) {
  // Para bebidas preparadas (mojito, cocteles) donde no tiene sentido
  // llevar inventario unidad por unidad. 0 = lleva stock normal, 1 = ilimitado.
  db.exec("ALTER TABLE products ADD COLUMN unlimited_stock INTEGER NOT NULL DEFAULT 0");
  console.log("Migracion: columna unlimited_stock agregada a products");
}

// Migración de orders al modelo de "cuenta por mesa": antes cada orden tenía
// un solo status y un solo método de pago para toda la orden. Ahora cada
// item dentro de la orden tiene su propio status (pendiente/preparando/listo)
// y su propio estado de pago (paid/paidQty), y la orden completa se cierra
// con is_closed cuando ya no queda nada pendiente de cobrar.
const orderCols = db.prepare("PRAGMA table_info(orders)").all().map(c => c.name);
if (orderCols.includes("status") && !orderCols.includes("is_closed")) {
  console.log("Migracion: convirtiendo orders al modelo de cuenta por mesa...");

  // Si una corrida anterior se interrumpio a la mitad (ej. nodemon
  // reinicio el proceso justo durante la migracion), puede quedar una
  // orders_new residual, y/o pagos de migracion ya insertados (ids con
  // el prefijo mig_) de una corrida previa que si alcanzo a insertar
  // pagos antes de fallar en otro punto. Limpiamos ambos antes de
  // empezar para que esta migracion sea segura de reintentar las veces
  // que sea necesario.
  db.exec("DROP TABLE IF EXISTS orders_new");
  db.exec("DELETE FROM payments WHERE id LIKE 'mig_%'");

  // PRAGMA foreign_keys no se puede cambiar dentro de una transaccion (SQLite
  // lo ignora silenciosamente si se intenta en medio de un BEGIN). Como vamos
  // a hacer DROP TABLE orders mientras 'payments' tiene filas que la
  // referencian via FOREIGN KEY, hay que desactivarlo ANTES de abrir la
  // transaccion, y reactivarlo despues de que termine (haya tenido exito o
  // fallado) para no dejar la conexion sin esa proteccion en el uso normal.
  const fkWasOn = db.pragma("foreign_keys", { simple: true });
  db.pragma("foreign_keys = OFF");

  // Todo el bloque corre en una sola transaccion: si algo falla o el
  // proceso se reinicia a la mitad, SQLite revierte todo y la tabla
  // 'orders' original queda intacta para reintentar limpio la proxima vez.
  const migrateOrders = db.transaction(() => {
    db.exec(`
      CREATE TABLE orders_new (
        id TEXT PRIMARY KEY,
        business_id TEXT NOT NULL,
        mesa TEXT,
        items TEXT NOT NULL,
        note TEXT,
        disc REAL DEFAULT 0,
        promo_disc REAL DEFAULT 0,
        total REAL NOT NULL,
        is_closed INTEGER NOT NULL DEFAULT 0,
        created_by_id TEXT,
        created_by_name TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const oldOrders = db.prepare("SELECT * FROM orders").all();
    const insertNew = db.prepare(`
      INSERT INTO orders_new (id, business_id, mesa, items, note, disc, promo_disc, total, is_closed, created_by_id, created_by_name, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertPayment = db.prepare(`
      INSERT INTO payments (id, business_id, order_id, amount, pay, charged_by_id, charged_by_name, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const o of oldOrders) {
      let items = [];
      try { items = JSON.parse(o.items); } catch { items = []; }
      const wasCharged = o.status === "cobrado";
      // Mapea el status viejo de toda la orden al status por item nuevo.
      const itemStatus = wasCharged ? "listo" : (o.status || "pendiente");
      const migratedItems = items.map(it => ({
        ...it,
        status: itemStatus,
        paid: wasCharged,
      }));

      insertNew.run(
        o.id, o.business_id, String(o.mesa ?? ""), JSON.stringify(migratedItems),
        o.note || "", o.disc || 0, o.promo_disc || 0, o.total,
        wasCharged ? 1 : 0, null, null, o.created_at
      );

      // Si ya estaba cobrada, registra el pago histórico para que los
      // reportes (que ahora leen de payments) no pierdan ventas pasadas.
      if (wasCharged) {
        insertPayment.run(
          `mig_${o.id}`, o.business_id, o.id, o.total, o.pay || "ef", null, null, o.created_at
        );
      }
    }

    db.exec("DROP TABLE orders");
    db.exec("ALTER TABLE orders_new RENAME TO orders");
    return oldOrders.length;
  });

  try {
    const migratedCount = migrateOrders();
    console.log(`Migracion: ${migratedCount} ordenes migradas al nuevo modelo`);
  } finally {
    // Se reactiva siempre, exito o fallo, para no dejar la conexion sin
    // esta proteccion en el resto de la vida del proceso.
    if (fkWasOn) db.pragma("foreign_keys = ON");
  }
}

export default db;