import connection from '../app/db.js';

connection.query('SHOW COLUMNS FROM cita', (err, results) => {
  if (err) { console.error('ERROR', err); process.exit(1); }
  console.log(results);
  process.exit(0);
});
