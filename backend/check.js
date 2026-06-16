import db from "./db.js";

console.log("\n=== BUSINESSES ===");
console.log(
  db.prepare("SELECT * FROM businesses").all()
);

console.log("\n=== USERS ===");
console.log(
  db.prepare("SELECT id, name, role, pin, business_id FROM users").all()
);