import db from "./db.js";
import { nanoid } from "nanoid";

const businessId = nanoid(10);

db.prepare(`
INSERT INTO businesses (id, name, owner_email, plan, status)
VALUES (?, ?, ?, ?, ?)
`).run(
  businessId,
  "Bar Demo",
  "admin@bardemo.com",
  "trial",
  "active"
);

const users = [
  { name: "Mesero", role: "mesero", pin: "1111" },
  { name: "Barman", role: "barman", pin: "2222" },
  { name: "Administrador", role: "admin", pin: "3333" }
];

for (const u of users) {
  db.prepare(`
    INSERT INTO users (id, business_id, name, pin, role)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    nanoid(8),
    businessId,
    u.name,
    u.pin,
    u.role
  );
}

console.log("NEGOCIO CREADO");
console.log("Business ID:", businessId);
console.log("Mesero PIN: 1111");
console.log("Barman PIN: 2222");
console.log("Admin PIN: 3333");