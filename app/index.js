import express from "express";
import jwt from "jsonwebtoken";
import path from "path";
import connection from "./db.js";
import { fileURLToPath } from "url";
import bcrypt from "bcrypt";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.set("port", 3000);

// Middleware para configurar Content Security Policy relajada (permite fetch a localhost:3000)



// Middleware para servir archivos estáticos y JSON
app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(path.join(__dirname, "pages")));
app.use(express.json());

// Servir página principal
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "pages", "index.html"));
});

// Registro usuario
app.post("/registro", async (req, res) => {
  const { nombre, email, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);

  const query = "INSERT INTO usuarios (nombre, email, password) VALUES (?, ?, ?)";
  connection.query(query, [nombre, email, hashedPassword], (err) => {
    if (err) return res.status(500).json({ error: "Error al registrar usuario" });
    res.status(201).json({ message: "✅ Registro exitoso" });
  });
});

// Login usuario
app.post("/login", (req, res) => {
  const { email, password } = req.body;
  const query = "SELECT * FROM usuarios WHERE email = ?";

  connection.query(query, [email], async (err, results) => {
    if (err || results.length === 0) {
      return res.status(400).json({ error: "❌ Usuario no encontrado" });
    }

    const user = results[0];
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({ error: "❌ Contraseña incorrecta" });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, "secreto", { expiresIn: "1h" });
    res.status(200).json({ message: "✅ Inicio de sesión exitoso", token, user });
  });
});

// Middleware para verificar token JWT
function verificarToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  console.log("📦 Encabezado de autorización:", authHeader);

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(403).json({ error: "❌ Acceso denegado" });
  }

  const token = authHeader.split(" ")[1];

  jwt.verify(token, "secreto", (err, user) => {
    if (err) return res.status(401).json({ error: "❌ Token inválido" });

    req.user = user;
    next();
  });
}

// Ruta API protegida para validar token
app.get("/api/usuario", verificarToken, (req, res) => {
  res.json({ message: "Usuario autenticado", user: req.user });
});

app.listen(app.get("port"), () => {
  console.log("✅ Servidor corriendo en puerto", app.get("port"));
});



