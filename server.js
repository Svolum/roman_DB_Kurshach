const express = require('express');
const path = require('path');
const pool = require('./db');

const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');


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
  await pool.query('SELECT create_department($1, $2)', [req.body.name, req.body.type_name]);
  res.sendStatus(200);
});

app.put('/departments', async (req, res) => {
  await pool.query(
    'SELECT update_department($1,$2, $3)',
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
  try {
    await pool.query(
      'SELECT create_phone($1,$2,$3)',
      [p.employee_id, p.phone_number, p.phone_type_name]
    );
    res.sendStatus(200);
  } catch (error) {
    console.error('Error creating phone:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


app.put('/phones', async (req, res) => {
  const p = req.body;
  try {
    await pool.query(
      'SELECT update_phone($1,$2,$3,$4)',
      [
        p.employee_id,
        p.old_phone_number,
        p.phone_number, // Используем phone_number вместо new_phone_number
        p.phone_type_name // Используем phone_type_name вместо new_phone_type_name
      ]
    );
    res.sendStatus(200);
  } catch (error) {
    console.error('Error updating phone:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


app.delete('/phones', async (req, res) => {
  try {
    await pool.query(
      'SELECT delete_phone($1,$2)',
      [req.body.employee_id, req.body.phone_number]
    );
    res.sendStatus(200);
  } catch (error) {
    console.error('Error deleting phone:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
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


// ---------- DEPARTMENT TYPES ----------
app.get('/department-types', async (req, res) => {
  try {
    const r = await pool.query('SELECT name FROM Department_type ORDER BY name');
    res.json(r.rows);
  } catch (error) {
    console.error('Error fetching department types:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// ---------- POSITIONS LIST ----------
app.get('/positions-list', async (req, res) => {
  try {
    const r = await pool.query('SELECT name FROM Position ORDER BY name');
    res.json(r.rows);
  } catch (error) {
    console.error('Error fetching positions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------- DEPARTMENTS LIST ----------
app.get('/departments-list', async (req, res) => {
  try {
    const r = await pool.query('SELECT name FROM Department ORDER BY name');
    res.json(r.rows);
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------- EMPLOYEES LIST (для выпадающего списка) ----------
app.get('/employees-list', async (req, res) => {
  try {
    const r = await pool.query('SELECT id, fio, department_name, position_name, birth_year FROM Employee ORDER BY fio');
    res.json(r.rows);
  } catch (error) {
    console.error('Error fetching employees list:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------- PHONE TYPES ----------
app.get('/phone-types', async (req, res) => {
  try {
    const r = await pool.query('SELECT name FROM Phone_type ORDER BY name');
    res.json(r.rows);
  } catch (error) {
    console.error('Error fetching phone types:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// EXPORT ---------------
app.get('/export/pdf/:report', async (req, res) => {
  let title = '';
  let rows = [];

  switch (req.params.report) {
    case 'phone-directory':
      title = 'Телефонный справочник';
      rows = (await pool.query('SELECT * FROM get_phone_directory()')).rows;
      break;

    case 'experience':
      title = 'Стаж работы ≤ 15 лет';
      rows = (await pool.query('SELECT * FROM get_employees_by_experience(15)')).rows;
      break;

    case 'academic':
      title = 'Сведения об учёных степенях';
      rows = (await pool.query('SELECT * FROM get_academic_staff()')).rows;
      break;

    default:
      return res.sendStatus(404);
  }

  const doc = new PDFDocument({ margin: 40 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${req.params.report}.pdf"`);

  doc.pipe(res);

  // Заголовок
  doc.fontSize(16).text(title, { align: 'center' });
  doc.moveDown();

  // Таблица
  doc.fontSize(10);
  rows.forEach(row => {
    Object.values(row).forEach(v => {
      doc.text(String(v));
    });
    doc.moveDown(0.5);
  });

  // Дата
  doc.moveDown();
  doc.fontSize(9).text(
    `Отчёт сформирован: ${new Date().toLocaleString()}`,
    { align: 'right' }
  );

  doc.end();
});

app.get('/export/excel/:report', async (req, res) => {
  let title = '';
  let rows = [];

  switch (req.params.report) {
    case 'phone-directory':
      title = 'Телефонный справочник';
      rows = (await pool.query('SELECT department_name AS Подразделение, fio AS ФИО, phone_number AS Номер_телефона, phone_type AS Тип_телефона FROM get_phone_directory()')).rows;
      break;

    case 'experience':
      title = 'Стаж работы ≤ 15 лет';
      rows = (await pool.query('SELECT * FROM get_employees_by_experience(15)')).rows;
      break;

    case 'academic':
      title = 'Сведения об учёных степенях';
      rows = (await pool.query(`
          SELECT
            FIO AS ФИО, 
            specialty AS Специальность,
            academic_degree AS Учёная_степень,
            academic_title AS Учёное_звание,
            scientific_pedagogical_experience AS Стаж_педагога,
            department_name AS Подразделение,
            position_name AS Должность
          FROM get_academic_staff()
        `)).rows;
      break;

    default:
      return res.sendStatus(404);
  }

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Отчёт');

  ws.addRow([title]);
  ws.mergeCells(1, 1, 1, Object.keys(rows[0]).length);
  ws.getRow(1).font = { bold: true };

  ws.addRow(Object.keys(rows[0]));
  rows.forEach(r => ws.addRow(Object.values(r)));

  if (req.params.report === 'academic') {
    ws.addRow([]);
    ws.addRow([`Общая численность преподавателей, привлекаемых к реализации соответсвующих циклов дисциплин: ${rows.length}`]);
    const res = await pool.query(`
      SELECT COUNT(*) FROM Employee 
      WHERE academic_degree IS NOT NULL AND academic_title IS NOT NULL
    `);
    // По умолчанию Postgres называет колонку "count"
    const count = Number(res.rows[0].count); // Теперь это число (number)
    ws.addRow([`Лиц с учёными степенями и учёными званиями: ${count}`]);
  }

  ws.addRow([]);
  ws.addRow([`Отчёт сформирован: ${new Date().toLocaleString()}`]);

  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${req.params.report}.xlsx"`
  );
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );

  await wb.xlsx.write(res);
  res.end();
});

app.get('/export/experience_exel/:stageval', async (req, res) => {
  let title = '';
  let rows = [];
  title = `Стаж работы ≤ ${req.params.stageval} лет`;
  rows = (await pool.query(`SELECT department_name AS Подразделение, fio AS ФИО, work_experience AS Стаж, position_name AS Должность FROM get_employees_by_experience(${req.params.stageval})`)).rows;

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Отчёт');

  ws.addRow([title]);
  ws.mergeCells(1, 1, 1, Object.keys(rows[0]).length);
  ws.getRow(1).font = { bold: true };

  ws.addRow(Object.keys(rows[0]));
  rows.forEach(r => ws.addRow(Object.values(r)));

  ws.addRow([]);
  ws.addRow([`Отчёт сформирован: ${new Date().toLocaleString()}`]);

  res.setHeader(
    'Content-Disposition',
    `attachment; filename="phone_book.xlsx"`
  );
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );

  await wb.xlsx.write(res);
  res.end();
});



// ---------- START ----------
app.listen(3000, () => {
  console.log('Server started on http://localhost:3000');
});
