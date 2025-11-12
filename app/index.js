// index.js
import express from "express";
import jwt from "jsonwebtoken";
import path from "path";
import { fileURLToPath } from "url";
import connection from "./db.js";
import bcrypt from "bcrypt";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3000;
const SECRET_KEY = "arcdata_citas_2025";

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(path.join(__dirname, "pages")));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "pages", "index.html"));
});

app.get("/index-inicial.html", (req, res) => {
    const filePath = path.join(__dirname, "pages", "index-inicial.html");
    res.sendFile(filePath, (err) => {
        if (err) {
            console.error("Error al enviar archivo:", err);
            res.status(404).send("Archivo no encontrado");
        }
    });
});

// === MIDDLEWARE DE AUTENTICACIÓN ===
function autenticar(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Token requerido" });

    const token = authHeader.split(" ")[1];
    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.status(403).json({ error: "Token inválido" });
        req.user = user;
        next();
    });
}

// === REGISTRO ===
app.post("/registro", async (req, res) => {
    const { documento, nombre, apellido, correo, contraseña, direccion, fecha_nacimiento, nit_eps, especialidad, tipo } = req.body;

    if (!documento || !nombre || !apellido || !correo || !contraseña || !tipo) {
        return res.status(400).json({ error: "Faltan campos básicos" });
    }

    try {
        const hashedPassword = await bcrypt.hash(contraseña, 10);

        if (tipo === "paciente") {
            connection.query(
                `INSERT INTO paciente 
                (id_paciente, Nombre_Paciente, Apellido_Paciente, Correo_Paciente, contraseña, Direccion_Paciente, Fecha_Nacimiento_Paciente, Id_Eps_Fk) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [documento, nombre, apellido, correo, hashedPassword, direccion, fecha_nacimiento, nit_eps],
                (err) => {
                    if (err?.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: "Documento o correo ya registrado" });
                    if (err) return res.status(500).json({ error: "Error al registrar paciente: " + err.message });
                    res.status(201).json({ message: "Paciente registrado" });
                }
            );
        } else {
            connection.query(
                `INSERT INTO doctor 
                (id_doctor, Nombre_Doctor, Apellido_Doctor, Correo_Doctor, Id_Especialidad_Fk, Id_Eps_Fk, Direccion_Doctor, Fecha_Nacimiento_Doctor) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [documento, nombre, apellido, correo, especialidad, nit_eps, direccion, fecha_nacimiento],
                (err) => {
                    if (err?.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: "Documento o correo ya registrado" });
                    if (err) return res.status(500).json({ error: "Error al registrar doctor: " + err.message });
                    res.status(201).json({ message: "Doctor registrado" });
                }
            );
        }
    } catch (err) {
        res.status(500).json({ error: "Error interno: " + err.message });
    }
});

// === LOGIN ===
app.post("/login", async (req, res) => {
    const { correo, contraseña } = req.body;

    if (!correo || !contraseña) {
        return res.status(400).json({ error: "Faltan credenciales" });
    }

    connection.query(
        "SELECT id_paciente as id, 'paciente' as tipo, Nombre_Paciente as nombre, Apellido_Paciente as apellido, contraseña FROM paciente WHERE Correo_Paciente = ?",
        [correo],
        async (err, results) => {
            if (err) return res.status(500).json({ error: "Error en BD" });
            if (results.length > 0) {
                return verificarUsuario(results[0], res, contraseña);
            }

            connection.query(
                "SELECT id_doctor as id, 'doctor' as tipo, Nombre_Doctor as nombre, Apellido_Doctor as apellido, NULL as contraseña FROM doctor WHERE Correo_Doctor = ?",
                [correo],
                async (err, results) => {
                    if (err) return res.status(500).json({ error: "Error en BD" });
                    if (results.length === 0) return res.status(400).json({ error: "Usuario no encontrado" });
                    verificarUsuario(results[0], res, contraseña);
                }
            );
        }
    );

    async function verificarUsuario(user, res, contraseña) {
        if (user.contraseña) {
            const match = await bcrypt.compare(contraseña, user.contraseña);
            if (!match) return res.status(401).json({ error: "Contraseña incorrecta" });
        }
        const token = jwt.sign(
            { id: user.id, nombre: `${user.nombre} ${user.apellido}`, tipo: user.tipo },
            SECRET_KEY,
            { expiresIn: "1h" }
        );
        res.json({
            message: "Login exitoso",
            token,
            user: { id: user.id, nombre: `${user.nombre} ${user.apellido}`, tipo: user.tipo }
        });
    }
});

// === OBTENER DOCTORES ===
app.get("/api/doctores", (req, res) => {
    connection.query(
        `SELECT d.id_doctor, d.Nombre_Doctor, e.Nombre_Esp as Nombre_Especialidad
         FROM doctor d
         JOIN especialidad e ON d.Id_Especialidad_Fk = e.Id_Especialidad`,
        (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(results);
        }
    );
});

// === OBTENER ESPECIALIDADES ===
app.get('/api/especialidades', (req, res) => {
    connection.query(
        `SELECT Id_Especialidad as id, Nombre_Esp as nombre FROM especialidad`,
        (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(results);
        }
    );
});

// === AGENDAR CITA ===
app.post("/api/agendar-cita", autenticar, (req, res) => {
    const {
        tipoCita, especialidad, fecha, hora,
        nombreCompleto, documentoIdentidad, telefono, correo, motivo
    } = req.body;

    if (!tipoCita || !especialidad || !fecha || !hora || !nombreCompleto || !documentoIdentidad) {
        return res.status(400).json({ error: "Faltan campos obligatorios" });
    }

    connection.query(
    `SELECT id_doctor FROM doctor d 
     JOIN especialidad e ON d.Id_Especialidad_Fk = e.Id_Especialidad 
     WHERE e.Nombre_Esp = ? LIMIT 1`,
        [especialidad],
        (err, results) => {
            if (err || results.length === 0) {
                return res.status(400).json({ error: "Especialidad no disponible" });
            }

            const id_doctor = results[0].id_doctor;

            connection.query(
                "SELECT Id_cita FROM cita WHERE Id_Doctor_Fk = ? AND Fecha = ? AND hora = ?",
                [id_doctor, fecha, hora],
                (err, results) => {
                    if (err) return res.status(500).json({ error: err.message });
                    if (results.length > 0) {
                        return res.status(400).json({ error: "Hora ocupada" });
                    }

                    connection.query(
                        `INSERT INTO cita 
                        (Id_Paciente_Fk, Id_Doctor_Fk, Tipo_Cita, especialidad, nombre_completo, 
                         documento_identidad, Telefono, Correo, motivo, Fecha, hora)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [
                            req.user.id, id_doctor, tipoCita, especialidad, nombreCompleto,
                            documentoIdentidad, telefono || "", correo || "", motivo || "", fecha, hora
                        ],
                        (err, result) => {
                            if (err) return res.status(500).json({ error: err.message });
                            res.json({
                                success: true,
                                message: "Cita agendada",
                                id_cita: result.insertId
                            });
                        }
                    );
                }
            );
        }
    );
});

// === MIS CITAS ===
app.get("/api/mis-citas", autenticar, (req, res) => {
    connection.query(
    `SELECT c.*, d.Nombre_Doctor, e.Nombre_Esp as especialidad
     FROM cita c 
     JOIN doctor d ON c.Id_Doctor_Fk = d.id_doctor
     JOIN especialidad e ON d.Id_Especialidad_Fk = e.Id_Especialidad
     WHERE c.Id_Paciente_Fk = ?
     ORDER BY c.Fecha DESC, c.hora DESC`,
        [req.user.id],
        (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(results);
        }
    );
});

// === ELIMINAR CITA ===
app.delete("/api/cita/:id", autenticar, (req, res) => {
    const { id } = req.params;

    connection.query(
        "DELETE FROM cita WHERE Id_cita = ? AND Id_Paciente_Fk = ?",
        [id, req.user.id],
        (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            if (result.affectedRows === 0) {
                return res.status(404).json({ error: "Cita no encontrada o no autorizada" });
            }
            res.json({ success: true, message: "Cita eliminada" });
        }
    );
});

app.listen(PORT, () => console.log(`Servidor en http://localhost:${PORT}`));