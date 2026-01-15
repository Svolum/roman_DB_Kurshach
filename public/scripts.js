let accessLevel = null;

const loginDiv = document.getElementById('login');
const menuDiv = document.getElementById('menu');
const adminMenuDiv = document.getElementById('adminMenu');
const tableDiv = document.getElementById('table');

function doLogin() {
  fetch('/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: document.getElementById('loginName').value,
      password: document.getElementById('loginPass').value
    })
  })
  .then(r => {
    if (!r.ok) throw new Error('login failed');
    return r.json();
  })
  .then(data => {
    accessLevel = data.access_level;

    loginDiv.style.display = 'none';
    menuDiv.style.display = 'block';

    if (accessLevel !== 'admin') {
      adminMenuDiv.style.display = 'none';
    }
  })
  .catch(() => {
    alert('Неверный логин или пароль');
  });
}


function renderTable(data) {
  if (!data || data.length === 0) {
    tableDiv.innerHTML = '<div class="alert alert-secondary">Нет данных</div>';
    return;
  }

  let html = '<table class="table table-bordered table-striped table-sm">';
  html += '<thead class="table-dark"><tr>';

  Object.keys(data[0]).forEach(k => {
    html += `<th>${k}</th>`;
  });

  html += '</tr></thead><tbody>';

  data.forEach(row => {
    html += '<tr>';
    Object.values(row).forEach(v => {
      html += `<td>${v ?? ''}</td>`;
    });
    html += '</tr>';
  });

  html += '</tbody></table>';

  tableDiv.innerHTML = html;
}



// ---------- LOADERS ----------
function loadEmployees() {
  fetch('/employees')
    .then(r => r.json())
    .then(renderTable);
}

function loadPositions() {
  fetch('/positions')
    .then(r => r.json())
    .then(renderTable);
}

function loadDepartments() {
  fetch('/departments')
    .then(r => r.json())
    .then(renderTable);
}

function loadPhoneReport() {
  fetch('/reports/phone-directory')
    .then(r => r.json())
    .then(renderTable);
}

function loadExperienceReport() {
  fetch('/reports/experience/15')
    .then(r => r.json())
    .then(renderTable);
}

function loadAcademicReport() {
  fetch('/reports/academic')
    .then(r => r.json())
    .then(renderTable);
}
