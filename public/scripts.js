let accessLevel = null;
let currentTable = null;
let selectedRow = null;
let selectedRowElement = null;  // Для подсветки выбранной строки
let departmentTypes = [];       // Кэш типов подразделений из БД
let positions = [];             // Кэш должностей из БД
let departments = [];           // Кэш подразделений из БД
let employees = [];             // Кэш сотрудников для выпадающего списка
let phoneTypes = [];            // Кэш типов телефонов из БД
let selectedEmployeeId = null;  // ID выбранного сотрудника для работы с телефонами

const loginDiv = document.getElementById('login');
const menuDiv = document.getElementById('menu');
const adminMenuDiv = document.getElementById('adminMenu');
const tableDiv = document.getElementById('table');
const controlsDiv = document.getElementById('controls');
const phoneControlsDiv = document.getElementById('phone-controls');
const phoneSelectorDiv = document.getElementById('phone-selector');
const employeeSelect = document.getElementById('employee-select');
const addBtn = document.getElementById('add-btn');
const editBtn = document.getElementById('edit-btn');
const deleteBtn = document.getElementById('delete-btn');
const addPhoneBtn = document.getElementById('add-phone-btn');
const editPhoneBtn = document.getElementById('edit-phone-btn');
const deletePhoneBtn = document.getElementById('delete-phone-btn');
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
      loadDepartmentsList(),
      loadEmployeesList(),
      loadPhoneTypesList()
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
  const isPhonesTable = currentTable === 'phones';
  
  if (isCRUDTable) {
    controlsDiv.style.display = 'block';
    phoneControlsDiv.style.display = 'none';
    phoneSelectorDiv.style.display = 'none';
    
    // Активируем/деактивируем кнопки Изменить и Удалить
    if (selectedRow) {
      editBtn.disabled = false;
      deleteBtn.disabled = false;
    } else {
      editBtn.disabled = true;
      deleteBtn.disabled = true;
    }
  } else if (isPhonesTable) {
    controlsDiv.style.display = 'none';
    phoneControlsDiv.style.display = 'block';
    phoneSelectorDiv.style.display = 'block';
    
    // Активируем/деактивируем кнопки Изменить и Удалить для телефонов
    if (selectedRow && selectedEmployeeId) {
      editPhoneBtn.disabled = false;
      deletePhoneBtn.disabled = false;
    } else {
      editPhoneBtn.disabled = true;
      deletePhoneBtn.disabled = true;
    }
  } else {
    controlsDiv.style.display = 'none';
    phoneControlsDiv.style.display = 'none';
    phoneSelectorDiv.style.display = 'none';
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

function showAddPhoneForm() {
  if (!selectedEmployeeId) {
    alert('Сначала выберите сотрудника');
    return;
  }
  
  formContainer.style.display = 'block';
  formTitle.textContent = 'Добавить телефон';
  
  // Очищаем форму
  dataForm.innerHTML = '';
  
  // Создаем поля для телефона
  createPhoneFormFields();
  
  // Устанавливаем обработчик для сохранения телефона
  formSubmit.onclick = savePhoneData;
}

function showEditPhoneForm() {
  if (!selectedRow || !selectedEmployeeId) return;
  
  showAddPhoneForm();
  formTitle.textContent = 'Изменить телефон';
  
  // Заполняем поля данными из выбранного телефона
  setTimeout(() => {
    document.getElementById('phone_type_name').value = selectedRow.phone_type_name;
    document.getElementById('phone_number').value = selectedRow.phone_number;
  }, 100);
}

function createPhoneFormFields() {
  // Поле для типа телефона (выпадающий список)
  const typeDiv = document.createElement('div');
  typeDiv.className = 'mb-3';
  
  const typeLabel = document.createElement('label');
  typeLabel.className = 'form-label';
  typeLabel.textContent = 'Тип телефона';
  typeLabel.htmlFor = 'phone_type_name';
  
  const typeSelect = document.createElement('select');
  typeSelect.className = 'form-select';
  typeSelect.id = 'phone_type_name';
  typeSelect.name = 'phone_type_name';
  typeSelect.required = true;
  
  // Добавляем пустую опцию
  const emptyOption = document.createElement('option');
  emptyOption.value = '';
  emptyOption.textContent = '-- Выберите тип --';
  typeSelect.appendChild(emptyOption);
  
  // Заполняем опции из кэша типов телефонов
  phoneTypes.forEach(type => {
    const option = document.createElement('option');
    option.value = type;
    option.textContent = type;
    typeSelect.appendChild(option);
  });
  
  typeDiv.appendChild(typeLabel);
  typeDiv.appendChild(typeSelect);
  dataForm.appendChild(typeDiv);
  
  // Поле для номера телефона
  const numberDiv = document.createElement('div');
  numberDiv.className = 'mb-3';
  
  const numberLabel = document.createElement('label');
  numberLabel.className = 'form-label';
  numberLabel.textContent = 'Номер телефона';
  numberLabel.htmlFor = 'phone_number';
  
  const numberInput = document.createElement('input');
  numberInput.type = 'text';
  numberInput.className = 'form-control';
  numberInput.id = 'phone_number';
  numberInput.name = 'phone_number';
  numberInput.required = true;
  numberInput.placeholder = 'Введите номер телефона';
  
  numberDiv.appendChild(numberLabel);
  numberDiv.appendChild(numberInput);
  dataForm.appendChild(numberDiv);
}

function savePhoneData() {
  const phoneType = document.getElementById('phone_type_name').value;
  const phoneNumber = document.getElementById('phone_number').value;
  
  if (!phoneType || !phoneNumber) {
    alert('Заполните все поля');
    return;
  }
  
  const method = formTitle.textContent.startsWith('Добавить') ? 'POST' : 'PUT';
  let url = '/phones';
  let body = {
    employee_id: selectedEmployeeId,
    phone_type_name: phoneType,
    phone_number: phoneNumber
  };
  
  // Для изменения нужно передать старый номер телефона
  if (method === 'PUT') {
    body.old_phone_number = selectedRow.phone_number;
    body.new_phone_number = phoneNumber;
    body.new_phone_type_name = phoneType;
  }
  
  fetch(url, {
    method: method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  .then(r => {
    if (r.ok) {
      hideForm();
      loadPhonesForEmployee(selectedEmployeeId);
    } else {
      alert('Ошибка при сохранении телефона');
    }
  })
  .catch(error => {
    console.error('Error:', error);
    alert('Ошибка при сохранении телефона');
  });
}

function deleteSelectedPhone() {
  if (!selectedRow || !selectedEmployeeId || !confirm('Вы уверены, что хотите удалить телефон?')) {
    return;
  }
  
  fetch('/phones', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      employee_id: selectedEmployeeId,
      phone_number: selectedRow.phone_number
    })
  })
  .then(r => {
    if (r.ok) {
      hideForm();
      loadPhonesForEmployee(selectedEmployeeId);
    } else {
      alert('Ошибка при удалении телефона');
    }
  })
  .catch(error => {
    console.error('Error:', error);
    alert('Ошибка при удалении телефона');
  });
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

async function loadEmployeesList() {
  try {
    const response = await fetch('/employees-list');
    if (response.ok) {
      const data = await response.json();
      employees = data;
      
      // Заполняем выпадающий список сотрудников
      employeeSelect.innerHTML = '<option value="">-- Выберите сотрудника --</option>';
      employees.forEach(employee => {
        const option = document.createElement('option');
        option.value = employee.id;
        option.textContent = employee.fio + " | " + employee.department_name + " | " + employee.position_name + " | " + employee.birth_year;
        employeeSelect.appendChild(option);
      });
      
      return employees;
    }
  } catch (error) {
    console.error('Ошибка загрузки списка сотрудников:', error);
  }
  return [];
}

async function loadPhoneTypesList() {
  try {
    const response = await fetch('/phone-types');
    if (response.ok) {
      const data = await response.json();
      phoneTypes = data.map(item => item.name);
      return phoneTypes;
    }
  } catch (error) {
    console.error('Ошибка загрузки типов телефонов:', error);
  }
  return [];
}

function onEmployeeSelected() {
  selectedEmployeeId = employeeSelect.value;
  if (selectedEmployeeId) {
    loadPhonesForEmployee(selectedEmployeeId);
  } else {
    tableDiv.innerHTML = '<div class="alert alert-info">Выберите сотрудника для просмотра телефонов</div>';
    selectedRow = null;
    selectedRowElement = null;
    updateButtons();
  }
}

function loadPhonesForEmployee(employeeId) {
  fetch(`/phones/${employeeId}`)
    .then(r => r.json())
    .then(data => {
      if (data.length === 0) {
        tableDiv.innerHTML = '<div class="alert alert-info">У сотрудника нет телефонов</div>';
      } else {
        // Преобразуем данные для отображения
        const formattedData = data.map(phone => ({
          'Тип телефона': phone.phone_type_name,
          'Номер телефона': phone.phone_number
        }));
        renderTable(formattedData);
      }
      selectedRow = null;
      selectedRowElement = null;
      updateButtons();
    })
    .catch(error => {
      console.error('Error loading phones:', error);
      tableDiv.innerHTML = '<div class="alert alert-danger">Ошибка загрузки телефонов</div>';
    });
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
    case 'phones': break; // Для телефонов загрузка через onEmployeeSelected
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

function loadPhones() {
  currentTable = 'phones';
  hideForm();
  
  // Если список сотрудников еще не загружен, загружаем его
    loadEmployeesList().then(() => {
      tableDiv.innerHTML = '<div class="alert alert-info">Выберите сотрудника для работы с телефонами</div>';
      selectedRow = null;
      selectedRowElement = null;
      updateButtons();
    });
  
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