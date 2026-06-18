import Database from "better-sqlite3";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, "barpos.db");
const db = new Database(dbPath);

// Borra TODO el contenido de orders y payments (y la tabla orders_new
// residual si quedo de algun intento anterior), dejando intactos
// businesses, users, products y promos.
db.exec("DROP TABLE IF EXISTS orders_new");
db.exec("DELETE FROM payments");
db.exec("DELETE FROM orders");

console.log("Listo: orders y payments vaciados. businesses, users, products y promos quedaron intactos.");
console.log("Ahora puedes levantar el backend normalmente (node server.js o npm run dev).");

db.close();
