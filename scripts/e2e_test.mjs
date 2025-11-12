import fs from 'fs/promises';
const token = (await fs.readFile(new URL('./token.txt', import.meta.url))).toString().trim();
const base = 'http://localhost:3000';
const header = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

async function create() {
  const body = {
    tipoCita: 'Primera Vez',
    especialidad: 'Medicina General',
    fecha: new Date().toISOString().slice(0,10),
    hora: '09:30',
    nombreCompleto: 'Prueba Usuario',
    documentoIdentidad: '99999999',
    telefono: '3000000000',
    correo: 'prueba@local.test',
    motivo: 'Prueba automatizada'
  };
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(base + '/api/agendar-cita', { method: 'POST', headers: header, body: JSON.stringify(body), signal: controller.signal });
    const text = await res.text();
    try { const data = JSON.parse(text); console.log('CREATE_STATUS', res.status); console.log('CREATE_BODY', data); return data; } catch (e) { console.log('CREATE_STATUS', res.status); console.log('CREATE_RAW', text); return null; }
  } finally { clearTimeout(t); }
}

async function del(id) {
  const res = await fetch(base + `/api/cita/${id}`, { method: 'DELETE', headers: header });
  const data = await res.json();
  console.log('DELETE_STATUS', res.status);
  console.log('DELETE_BODY', data);
  return data;
}

try {
  const created = await create();
  if (created && (created.id_cita || created.insertId)) {
    const id = created.id_cita || created.insertId;
    await del(id);
  } else if (created && created.success && created.id_cita) {
    await del(created.id_cita);
  } else {
    console.log('No se obtuvo id de la creación, no se ejecutará DELETE');
  }
} catch (err) {
  console.error('ERROR e2e:', err);
  process.exit(1);
}
