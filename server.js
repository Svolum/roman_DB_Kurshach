const express = require('express');
const path = require('path');
const pool = require('./db');

const app = express();
app.use(express.json());
app.use(express.static('public'));


// ---------- LOGIN ----------
app.post('/login', async (req, res) => {
  const { name, password } = req.body;
  console.log(`Login attempt: ${name} / ${password}`);
  const result = await pool.query(
    'SELECT access_level FROM App_users WHERE name=$1 AND password=$2',
    [name, password]
  );

  if (result.rows.length === 0) {
    console.log(`Login failed`);
    return res.status(401).json({ error: 'invalid credentials' });
  }
  console.log(`Login successful`);

  res.json({ access_level: result.rows[0].access_level });
});


// ---------- POSITIONS ----------
app.get('/positions', async (req, res) => {
  const r = await pool.query('SELECT * FROM get_positions()');
  res.json(r.rows);
});

app.post('/positions', async (req, res) => {
  await pool.query('SELECT create_position($1)', [req.body.name]);
  res.sendStatus(200);
});

app.put('/positions', async (req, res) => {
  await pool.query(
    'SELECT update_position($1,$2)',
    [req.body.old_name, req.body.new_name]
  );
  res.sendStatus(200);
});

app.delete('/positions', async (req, res) => {
  await pool.query('SELECT delete_position($1)', [req.body.name]);
  res.sendStatus(200);
});

// ---------- DEPARTMENTS ----------
app.get('/departments', async (req, res) => {
  const r = await pool.query('SELECT * FROM get_departments()');
  res.json(r.rows);
});

app.post('/departments', async (req, res) => {
  await pool.query('SELECT create_department($1)', [req.body.name]);
  res.sendStatus(200);
});

app.put('/departments', async (req, res) => {
  await pool.query(
    'SELECT update_department($1,$2)',
    [req.body.old_name, req.body.new_name, req.body.new_type_name]
  );
  res.sendStatus(200);
});

app.delete('/departments', async (req, res) => {
  await pool.query('SELECT delete_department($1)', [req.body.name]);
  res.sendStatus(200);
});

// ---------- EMPLOYEES ----------
app.get('/employees', async (req, res) => {
  const r = await pool.query('SELECT * FROM get_employees()');
  res.json(r.rows);
});

app.post('/employees', async (req, res) => {
  const e = req.body;
  const r = await pool.query(
    'SELECT create_employee($1,$2,$3,$4,$5,$6,$7,$8,$9)',
    [
      e.department_name,
      e.position_name,
      e.fio,
      e.birth_year,
      e.specialty,
      e.qualification,
      e.work_experience,
      e.academic_degree,
      e.academic_title
    ]
  );
  res.json({ id: r.rows[0].create_employee });
});

app.put('/employees', async (req, res) => {
  const e = req.body;
  await pool.query(
    'SELECT update_employee($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',
    [
      e.id,
      e.department_name,
      e.position_name,
      e.fio,
      e.birth_year,
      e.specialty,
      e.qualification,
      e.work_experience,
      e.academic_degree,
      e.academic_title
    ]
  );
  res.sendStatus(200);
});

app.delete('/employees/:id', async (req, res) => {
  await pool.query('SELECT delete_employee($1)', [req.params.id]);
  res.sendStatus(200);
});


// ---------- PHONES ----------
app.get('/phones/:employeeId', async (req, res) => {
  const r = await pool.query(
    'SELECT * FROM get_phones_by_employee($1)',
    [req.params.employeeId]
  );
  res.json(r.rows);
});

app.post('/phones', async (req, res) => {
  const p = req.body;
  await pool.query(
    'SELECT create_phone($1,$2,$3)',
    [p.employee_id, p.phone_number, p.phone_type_name]
  );
  res.sendStatus(200);
});

app.put('/phones', async (req, res) => {
  const p = req.body;
  await pool.query(
    'SELECT update_phone($1,$2,$3,$4)',
    [
      p.employee_id,
      p.old_phone_number,
      p.new_phone_number,
      p.new_phone_type_name
    ]
  );
  res.sendStatus(200);
});

app.delete('/phones', async (req, res) => {
  await pool.query(
    'SELECT delete_phone($1,$2)',
    [req.body.employee_id, req.body.phone_number]
  );
  res.sendStatus(200);
});


// ---------- REPORTS ----------
app.get('/reports/phone-directory', async (req, res) => {
  const r = await pool.query('SELECT * FROM get_phone_directory()');
  res.json(r.rows);
});

app.get('/reports/experience/:max', async (req, res) => {
  const r = await pool.query(
    'SELECT * FROM get_employees_by_experience($1)',
    [req.params.max]
  );
  res.json(r.rows);
});

app.get('/reports/academic', async (req, res) => {
  const r = await pool.query('SELECT * FROM get_academic_staff()');
  res.json(r.rows);
});


// ---------- START ----------
app.listen(3000, () => {
  console.log('Server started on http://localhost:3000');
});
