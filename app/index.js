// app/index.js
import express from "express";
import jwt from "jsonwebtoken";
import path from "path";
import connection from "./db.js";
import { fileURLToPath } from "url";
import bcrypt from "bcrypt";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.set("port", 3000);

// Middlewares
app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(path.join(__dirname, "pages")));
app.use(express.json());

// Página principal
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "pages", "index.html"));
});

// Registro
app.post("/registro", async (req, res) => {
  const { nombre, email, password } = req.body;
  if (!nombre || !email || !password) return res.status(400).json({ error: "Faltan campos" });

  const hashedPassword = await bcrypt.hash(password, 10);
  const query = "INSERT INTO usuarios (nombre, email, password) VALUES (?, ?, ?)";
  
  connection.query(query, [nombre, email, hashedPassword], (err) => {
    if (err?.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: "Email ya registrado" });
    if (err) return res.status(500).json({ error: "Error al registrar" });
    res.status(201).json({ message: "Registro exitoso" });
  });
});

// Login
app.post("/login", (req, res) => {
  const { email, password } = req.body;
  const query = "SELECT * FROM usuarios WHERE email = ?";

  connection.query(query, [email], async (err, results) => {
    if (err || results.length === 0) return res.status(400).json({ error: "Usuario no encontrado" });

    const user = results[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: "Contraseña incorrecta" });

    const token = jwt.sign({ id: user.id, email: user.email }, "secreto", { expiresIn: "1h" });
    res.json({ 
      message: "Login exitoso", 
      token, 
      user: { id: user.id, nombre: user.nombre, email: user.email } 
    });
  });
});

// Middleware JWT
function verificarToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(403).json({ error: "Acceso denegado" });
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, "secreto", (err, user) => {
    if (err) return res.status(401).json({ error: "Token inválido" });
    req.user = user;
    next();
  });
}

// Ruta protegida: Agendar cita
app.post("/api/agendar-cita", verificarToken, (req, res) => {
  const {
    tipoCita, especialidad, fecha, hora,
    nombreCompleto, documentoIdentidad, telefono, correo, motivo
  } = req.body;

  if (!tipoCita || !especialidad || !fecha || !hora || !nombreCompleto || !documentoIdentidad) {
    return res.status(400).json({ success: false, message: "Faltan campos obligatorios" });
  }

  const idPaciente = req.user.id;

  const query = `
    INSERT INTO cita 
    (tipo_cita, especialidad, fecha, hora, nombre_completo, documento_identidad, telefono, correo, motivo, Id_Paciente_Fk)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    tipoCita, especialidad, fecha, hora,
    nombreCompleto, documentoIdentidad, telefono || null, correo || null, motivo || null,
    idPaciente
  ];

  connection.query(query, values, (err, result) => {
    if (err) {
      console.error("Error DB:", err);
      return res.status(500).json({ success: false, message: "Error al agendar" });
    }
    res.status(201).json({
      success: true,
      message: "Cita agendada con éxito",
      id_cita: result.insertId
    });
  });
});

// Ruta: Obtener citas del usuario
app.get("/api/mis-citas", verificarToken, (req, res) => {
  const query = `
    SELECT * FROM cita 
    WHERE Id_Paciente_Fk = ? 
    ORDER BY fecha DESC, hora DESC
  `;

  connection.query(query, [req.user.id], (err, results) => {
    if (err) return res.status(500).json({ error: "Error al obtener citas" });
    res.json(results);
  });
});

app.listen(app.get("port"), () => {
  console.log(`Servidor en http://localhost:${app.get("port")}`);
});