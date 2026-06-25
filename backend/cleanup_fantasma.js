// Script de un solo uso: elimina el negocio duplicado/fantasma y sus
// usuarios, dejando solo el negocio real (XaLerjUDxB) intacto.
// Uso: node cleanup_fantasma.js
import db from "./db.js";

const FANTASMA_ID = "Kb5PpDqiJU";
const REAL_ID = "XaLerjUDxB";

const fantasma = db.prepare("SELECT * FROM businesses WHERE id = ?").get(FANTASMA_ID);
const real = db.prepare("SELECT * FROM businesses WHERE id = ?").get(REAL_ID);

if (!fantasma) {
  console.log(`No existe ningun negocio con id ${FANTASMA_ID}. Nada que borrar.`);
  process.exit(0);
}
if (!real) {
  console.log(`ADVERTENCIA: no se encontro el negocio real (${REAL_ID}). Abortando por seguridad.`);
  process.exit(1);
}

// Verifica que el fantasma no tenga productos, ordenes ni pagos reales
// antes de borrar, para no perder datos por accidente.
const products = db.prepare("SELECT COUNT(*) as n FROM products WHERE business_id = ?").get(FANTASMA_ID).n;
const orders   = db.prepare("SELECT COUNT(*) as n FROM orders WHERE business_id = ?").get(FANTASMA_ID).n;
const promos   = db.prepare("SELECT COUNT(*) as n FROM promos WHERE business_id = ?").get(FANTASMA_ID).n;
const users    = db.prepare("SELECT COUNT(*) as n FROM users WHERE business_id = ?").get(FANTASMA_ID).n;

console.log(`Negocio fantasma ${FANTASMA_ID}: ${users} usuarios, ${products} productos, ${orders} ordenes, ${promos} promos.`);

if (products > 0 || orders > 0 || promos > 0) {
  console.log("ADVERTENCIA: el negocio fantasma tiene datos reales (productos/ordenes/promos).");
  console.log("Este script NO los borra por seguridad. Revisa manualmente antes de continuar.");
  process.exit(1);
}

const cleanup = db.transaction(() => {
  db.prepare("DELETE FROM users WHERE business_id = ?").run(FANTASMA_ID);
  db.prepare("DELETE FROM businesses WHERE id = ?").run(FANTASMA_ID);
});

cleanup();
console.log(`Listo. Negocio fantasma ${FANTASMA_ID} y sus ${users} usuarios fueron eliminados.`);
console.log(`Tu negocio real (${REAL_ID}) no fue tocado.`);
