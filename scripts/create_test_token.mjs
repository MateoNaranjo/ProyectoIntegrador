import jwt from 'jsonwebtoken';

// Adjust the payload as needed
const SECRET = 'arcdata_citas_2025';
const payload = { id: 10000, nombre: 'Usuario Prueba', tipo: 'paciente' };
const token = jwt.sign(payload, SECRET, { expiresIn: '2h' });
console.log(token);
