import connection from '../app/db.js';
const especialidad = 'Medicina General';
connection.query(`SELECT id_doctor FROM doctor d JOIN especialidad e ON d.Id_Especialidad_Fk = e.Id_Especialidad WHERE e.Nombre_Esp = ? LIMIT 1`, [especialidad], (err, results) => {
  if (err) { console.error('ERR', err); process.exit(1); }
  console.log('RESULTS', results);
  process.exit(0);
});
