let accessLevel = null;
let currentTable = null;
let selectedRow = null;
let selectedRowElement = null;  // Для подсветки выбранной строки
let departmentTypes = [];       // Кэш типов подразделений из БД
let positions = [];             // Кэш должностей из БД
let departments = [];           // Кэш подразделений из БД

const loginDiv = document.getElementById('login');
const menuDiv = document.getElementById('menu');
const adminMenuDiv = document.getElementById('adminMenu');
const tableDiv = document.getElementById('table');
const controlsDiv = document.getElementById('controls');
const addBtn = document.getElementById('add-btn');
const editBtn = document.getElementById('edit-btn');
const deleteBtn = document.getElementById('delete-btn');
const formContainer = document.getElementById('form-container');
const formTitle = document.getElementById('form-title');
const dataForm = document.getElementById('data-form');
const formSubmit = document.getElementById('form-submit');

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
    // Загружаем справочники при успешном входе
    Promise.all([
      loadDepartmentTypes(),
      loadPositionsList(),
      loadDepartmentsList()
    ]);
  })
  .catch(() => {
    alert('Неверный логин или пароль');
  });
}

function renderTable(data) {
  if (!data || data.length === 0) {
    tableDiv.innerHTML = '<div class="alert alert-secondary">Нет данных</div>';
    selectedRow = null;
    selectedRowElement = null;
    updateButtons();
    return;
  }

  let html = '<table class="table table-bordered table-sm table-hover" style="cursor: pointer;">';
  html += '<thead class="table-dark"><tr>';

  Object.keys(data[0]).forEach(k => {
    html += `<th>${k}</th>`;
  });

  html += '</tr></thead><tbody>';

  data.forEach((row, index) => {
    html += `<tr onclick="selectRow(${index}, this)" data-row='${JSON.stringify(row).replace(/'/g, "\\'")}'>`;
    Object.values(row).forEach(v => {
      html += `<td>${v ?? ''}</td>`;
    });
    html += '</tr>';
  });

  html += '</tbody></table>';
  tableDiv.innerHTML = html;

  selectedRow = null;
  selectedRowElement = null;
  updateButtons();
}

function selectRow(index, element) {
  // Убрать выделение со всех строк
  document.querySelectorAll('#table tr').forEach(tr => {
    tr.classList.remove('selected');
  });
  
  // 1. Снимаем класс выделения с предыдущей строки, если она была
  if (selectedRowElement) {
    selectedRowElement.classList.remove('table-primary');
  }
  // 2. Добавляем класс primary текущей строке
  element.classList.add('table-primary');
  // 3. Обновляем ссылку на текущую строку
  selectedRowElement = element;

  // Выделить выбранную строку
  element.classList.add('selected');
  selectedRow = JSON.parse(element.getAttribute('data-row'));
  updateButtons();
  
  // Скрыть форму редактирования если она была открыта для добавления
  if (formContainer.style.display === 'block' && formTitle.textContent.startsWith('Добавить')) {
    hideForm();
  }
}

function updateButtons() {
  // Показываем/скрываем панель управления в зависимости от текущей таблицы
  const isCRUDTable = ['employees', 'positions', 'departments'].includes(currentTable);
  
  if (isCRUDTable) {
    controlsDiv.style.display = 'block';
    
    // Активируем/деактивируем кнопки Изменить и Удалить
    if (selectedRow) {
      editBtn.disabled = false;
      deleteBtn.disabled = false;
    } else {
      editBtn.disabled = true;
      deleteBtn.disabled = true;
    }
  } else {
    controlsDiv.style.display = 'none';
  }
}

function showAddForm() {
  formContainer.style.display = 'block';
  formTitle.textContent = `Добавить ${getTableTitle()}`;
  
  // Очищаем форму
  dataForm.innerHTML = '';
  
  // Генерируем поля в зависимости от таблицы
  const fields = getFormFields();
  
  // Для сотрудников предварительно загружаем справочники если еще не загружены
  if (currentTable === 'employees' && (positions.length === 0 || departments.length === 0)) {
    Promise.all([
      positions.length === 0 ? loadPositionsList() : Promise.resolve(),
      departments.length === 0 ? loadDepartmentsList() : Promise.resolve()
    ]).then(() => {
      createFormFields(fields);
    });
  } else if (currentTable === 'departments' && departmentTypes.length === 0) {
    loadDepartmentTypes().then(() => {
      createFormFields(fields);
    });
  } else {
    createFormFields(fields);
  }
  
  // Устанавливаем обработчик для сохранения
  formSubmit.onclick = saveData;
}

function createFormFields(fields) {
  fields.forEach(field => {
    const div = document.createElement('div');
    div.className = 'mb-3';
    
    const label = document.createElement('label');
    label.className = 'form-label';
    label.textContent = field.label;
    label.htmlFor = field.name;
    
    let input;
    if (field.type === 'select') {
      input = document.createElement('select');
      input.className = 'form-select';
      input.id = field.name;
      input.name = field.name;
      
      // Добавляем пустую опцию для выпадающего списка
      const emptyOption = document.createElement('option');
      emptyOption.value = '';
      emptyOption.textContent = '-- Выберите --';
      input.appendChild(emptyOption);
      
      // Заполняем опции в зависимости от поля
      if (field.name === 'qualification') {
        ['Бакалавр', 'Магистр', 'Специалист'].forEach(opt => {
          const option = document.createElement('option');
          option.value = opt;
          option.textContent = opt;
          input.appendChild(option);
        });
      } else if (field.name === 'type_name' && currentTable === 'departments') {
        // Для типа подразделения используем данные из БД
        departmentTypes.forEach(type => {
          const option = document.createElement('option');
          option.value = type;
          option.textContent = type;
          input.appendChild(option);
        });
      } else if (field.name === 'position_name' && currentTable === 'employees') {
        // Для должности используем данные из БД
        positions.forEach(position => {
          const option = document.createElement('option');
          option.value = position;
          option.textContent = position;
          input.appendChild(option);
        });
      } else if (field.name === 'department_name' && currentTable === 'employees') {
        // Для подразделения используем данные из БД
        departments.forEach(department => {
          const option = document.createElement('option');
          option.value = department;
          option.textContent = department;
          input.appendChild(option);
        });
      }
    } else {
      input = document.createElement('input');
      input.type = field.type;
      input.className = 'form-control';
      input.id = field.name;
      input.name = field.name;
      
      if (field.type === 'number') {
        input.min = field.min || 0;
        if (field.max) input.max = field.max;
      }
    }
    
    if (field.required) {
      input.required = true;
    }
    
    if (field.placeholder) {
      input.placeholder = field.placeholder;
    }
    
    div.appendChild(label);
    div.appendChild(input);
    dataForm.appendChild(div);
  });
}

function showEditForm() {
  if (!selectedRow) return;
  
  showAddForm();
  formTitle.textContent = `Редактировать ${getTableTitle()}`;
  
  // Ждем пока форма создастся (особенно важно для select)
  setTimeout(() => {
    const fields = getFormFields();
    fields.forEach(field => {
      const input = document.getElementById(field.name);
      if (input && selectedRow[field.name] !== undefined) {
        if (field.type === 'select') {
          // Для select устанавливаем значение
          input.value = selectedRow[field.name];
        } else {
          input.value = selectedRow[field.name];
        }
      }
    });
  }, 100);
}

function hideForm() {
  formContainer.style.display = 'none';
  dataForm.innerHTML = '';
  selectedRow = null;
  
  // Снять выделение со строк
  document.querySelectorAll('#table tr').forEach(tr => {
    tr.classList.remove('selected');
    tr.classList.remove('table-primary');
  });
  
  selectedRowElement = null;
  updateButtons();
}

async function loadDepartmentTypes() {
  try {
    const response = await fetch('/department-types');
    if (response.ok) {
      const data = await response.json();
      departmentTypes = data.map(item => item.name);
      return departmentTypes;
    }
  } catch (error) {
    console.error('Ошибка загрузки типов подразделений:', error);
  }
  return [];
}

async function loadPositionsList() {
  try {
    const response = await fetch('/positions-list');
    if (response.ok) {
      const data = await response.json();
      positions = data.map(item => item.name);
      return positions;
    }
  } catch (error) {
    console.error('Ошибка загрузки должностей:', error);
  }
  return [];
}

async function loadDepartmentsList() {
  try {
    const response = await fetch('/departments-list');
    if (response.ok) {
      const data = await response.json();
      departments = data.map(item => item.name);
      return departments;
    }
  } catch (error) {
    console.error('Ошибка загрузки подразделений:', error);
  }
  return [];
}

function saveData() {
  const formData = new FormData(dataForm);
  const data = {};
  formData.forEach((value, key) => {
    data[key] = value;
  });
  
  const method = formTitle.textContent.startsWith('Добавить') ? 'POST' : 'PUT';
  let url = '';
  
  if (currentTable === 'employees') {
    if (method === 'PUT') {
      data.id = selectedRow.id;
    }
    url = '/employees';
  } else if (currentTable === 'positions') {
    if (method === 'PUT') {
      data.old_name = selectedRow.name;
      data.new_name = data.name;
    }
    url = '/positions';
  } else if (currentTable === 'departments') {
    if (method === 'PUT') {
      data.old_name = selectedRow.name;
      data.new_name = data.name;
      data.new_type_name = data.type_name;
    }
    url = '/departments';
  }
  
  fetch(url, {
    method: method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  .then(r => {
    if (r.ok) {
      hideForm();
      loadTableData();
    } else {
      alert('Ошибка при сохранении');
    }
  })
  .catch(error => {
    console.error('Error:', error);
    alert('Ошибка при сохранении');
  });
}

function deleteSelected() {
  if (!selectedRow || !confirm('Вы уверены, что хотите удалить запись?')) {
    return;
  }
  
  let url = '';
  let body = {};
  
  if (currentTable === 'employees') {
    url = `/employees/${selectedRow.id}`;
  } else if (currentTable === 'positions') {
    url = '/positions';
    body = { name: selectedRow.name };
  } else if (currentTable === 'departments') {
    url = '/departments';
    body = { name: selectedRow.name };
  }
  
  fetch(url, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  .then(r => {
    if (r.ok) {
      hideForm();
      loadTableData();
    } else {
      alert('Ошибка при удалении');
    }
  })
  .catch(error => {
    console.error('Error:', error);
    alert('Ошибка при удалении');
  });
}

function getTableTitle() {
  switch(currentTable) {
    case 'employees': return 'сотрудника';
    case 'positions': return 'должность';
    case 'departments': return 'подразделение';
    default: return 'запись';
  }
}

function getFormFields() {
  switch(currentTable) {
    case 'employees':
      return [
        { name: 'fio', label: 'ФИО', type: 'text', required: true },
        { name: 'department_name', label: 'Подразделение', type: 'select', required: true },
        { name: 'position_name', label: 'Должность', type: 'select', required: true },
        { name: 'birth_year', label: 'Год рождения', type: 'number', required: true, min: 1900, max: new Date().getFullYear() },
        { name: 'specialty', label: 'Специальность', type: 'text', required: true },
        { name: 'qualification', label: 'Квалификация', type: 'select', required: true },
        { name: 'work_experience', label: 'Стаж работы', type: 'number', required: true, min: 0 },
        { name: 'academic_degree', label: 'Ученая степень', type: 'text' },
        { name: 'academic_title', label: 'Ученое звание', type: 'text' }
      ];
    case 'positions':
      return [
        { name: 'name', label: 'Название должности', type: 'text', required: true }
      ];
    case 'departments':
      return [
        { name: 'name', label: 'Название подразделения', type: 'text', required: true },
        { name: 'type_name', label: 'Тип подразделения', type: 'select', required: true }
      ];
    default:
      return [];
  }
}

function loadTableData() {
  switch(currentTable) {
    case 'employees': loadEmployees(); break;
    case 'positions': loadPositions(); break;
    case 'departments': loadDepartments(); break;
  }
}

// ---------- LOADERS ----------
function loadEmployees() {
  currentTable = 'employees';
  hideForm();
  fetch('/employees')
    .then(r => r.json())
    .then(renderTable);
}

function loadPositions() {
  currentTable = 'positions';
  hideForm();
  fetch('/positions')
    .then(r => r.json())
    .then(renderTable);
}

function loadDepartments() {
  currentTable = 'departments';
  hideForm();
  fetch('/departments')
    .then(r => r.json())
    .then(renderTable);
}

function loadPhoneReport() {
  currentTable = 'phone-directory';
  hideForm();
  fetch('/reports/phone-directory')
    .then(r => r.json())
    .then(renderTable);
}

function loadExperienceReport() {
  currentTable = 'experience';
  hideForm();
  fetch('/reports/experience/15')
    .then(r => r.json())
    .then(renderTable);
}

function loadAcademicReport() {
  currentTable = 'academic';
  hideForm();
  fetch('/reports/academic')
    .then(r => r.json())
    .then(renderTable);
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', function() {
  // Форма изначально скрыта
  hideForm();
});