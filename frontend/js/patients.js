// js/patients.js
// Lógica del CRUD de Pacientes: listado paginado, crear, editar y eliminar, usando Fetch API.
// El formulario vive dentro de un modal. El token ya fue verificado por dashboard.js.

const API_URL = 'http://localhost:5000/api';
const authToken = localStorage.getItem('token');

let currentPage = 1;
const PAGE_LIMIT = 5;
let totalPages = 1;
let currentSearch = '';

// ---------- Referencias al modal ----------
const modal = document.getElementById('patient-modal');
const modalPanel = document.getElementById('patient-modal-panel');
const modalTitle = document.getElementById('patient-modal-title');
const newBtn = document.getElementById('patient-new-btn');
const modalCloseBtn = document.getElementById('patient-modal-close');
const modalCancelBtn = document.getElementById('patient-modal-cancel');
const searchInput = document.getElementById('search-input');

// ---------- Referencias al formulario ----------
const form = document.getElementById('patient-form');
const idInput = document.getElementById('patient-id');
const nameInput = document.getElementById('patient-name');
const speciesInput = document.getElementById('patient-species');
const breedInput = document.getElementById('patient-breed');
const weightInput = document.getElementById('patient-weight');
const ownerNameInput = document.getElementById('patient-owner-name');
const ownerPhoneInput = document.getElementById('patient-owner-phone');
const ownerEmailInput = document.getElementById('patient-owner-email');
const submitBtn = document.getElementById('patient-submit-btn');
const tableBody = document.getElementById('patient-table-body');
const pageInfo = document.getElementById('page-info');
const prevBtn = document.getElementById('prev-page-btn');
const nextBtn = document.getElementById('next-page-btn');

// ---------- Estado de carga (spinner) en botones de acción ----------

function setButtonLoading(button, isLoading, loadingText = 'Cargando...') {
  if (isLoading) {
    button.dataset.originalText = button.innerHTML;
    button.disabled = true;
    button.classList.add('opacity-70', 'cursor-not-allowed');
    button.innerHTML = `
      <span class="inline-flex items-center gap-2">
        <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
        </svg>
        ${loadingText}
      </span>
    `;
  } else {
    button.disabled = false;
    button.classList.remove('opacity-70', 'cursor-not-allowed');
    if (button.dataset.originalText) {
      button.innerHTML = button.dataset.originalText;
    }
  }
}

// ---------- Apertura / cierre del modal (con transición) ----------

function openModal() {
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  requestAnimationFrame(() => {
    modal.classList.remove('opacity-0');
    modalPanel.classList.remove('opacity-0', 'scale-95');
  });
}

function closeModal() {
  modal.classList.add('opacity-0');
  modalPanel.classList.add('opacity-0', 'scale-95');
  setTimeout(() => {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }, 200);
}

modal.addEventListener('click', (event) => {
  if (event.target === modal) closeModal();
});

modalCloseBtn.addEventListener('click', closeModal);
modalCancelBtn.addEventListener('click', closeModal);

newBtn.addEventListener('click', () => {
  resetForm();
  modalTitle.textContent = 'Nuevo paciente';
  submitBtn.textContent = 'Crear paciente';
  openModal();
});

// ---------- Listado ----------

// Se muestra brevemente al pedir una página nueva (incluida la carga inicial), para que la tabla
// no se vea vacía un instante mientras llega la respuesta del servidor.
function showTableLoading(tableBody, colspan) {
  tableBody.innerHTML = `
    <tr>
      <td colspan="${colspan}" class="px-4 py-8 text-center text-gray-400">
        <span class="inline-flex items-center gap-2">
          <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
          </svg>
          Cargando...
        </span>
      </td>
    </tr>
  `;
}

async function fetchPatients(page = 1) {
  showTableLoading(tableBody, 6);
  try {
    const searchParam = currentSearch ? `&search=${encodeURIComponent(currentSearch)}` : '';
    const response = await fetch(`${API_URL}/patients?page=${page}&limit=${PAGE_LIMIT}${searchParam}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    const result = await response.json();

    if (!response.ok) {
      showToast(result.message || 'Error al cargar los pacientes', 'error');
      return;
    }

    currentPage = result.page;
    totalPages = result.totalPages || 1;
    renderTable(result.data);
    updatePaginationUI();
  } catch (error) {
    showToast('No se pudo conectar con el servidor', 'error');
  }
}

function renderTable(patients) {
  tableBody.innerHTML = '';

  if (patients.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="6" class="px-4 py-6 text-center text-gray-500">No hay pacientes registrados.</td></tr>';
    return;
  }

  patients.forEach((patient) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td class="px-4 py-3 text-gray-700">${patient.name}</td>
      <td class="px-4 py-3 text-gray-700">${patient.species}</td>
      <td class="px-4 py-3 text-gray-700">${patient.breed || '-'}</td>
      <td class="px-4 py-3 text-gray-700">${patient.ownerName}</td>
      <td class="px-4 py-3 text-gray-700">${patient.ownerPhone}</td>
      <td class="px-4 py-3">
        <button class="btn-edit bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg px-3 py-1.5 mr-2 transition-colors" data-id="${patient._id}">Editar</button>
        <button class="btn-delete bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-lg px-3 py-1.5 transition-colors" data-id="${patient._id}">Eliminar</button>
      </td>
    `;
    tableBody.appendChild(row);
  });

  document.querySelectorAll('.btn-edit').forEach((btn) => {
    btn.addEventListener('click', () => startEdit(btn.dataset.id, patients));
  });
  document.querySelectorAll('.btn-delete').forEach((btn) => {
    btn.addEventListener('click', () => deletePatient(btn.dataset.id, btn));
  });
}

function updatePaginationUI() {
  pageInfo.textContent = `Página ${currentPage} de ${totalPages}`;
  prevBtn.disabled = currentPage <= 1;
  nextBtn.disabled = currentPage >= totalPages;
}

// ---------- Crear / Editar ----------

function startEdit(id, patients) {
  const patient = patients.find((p) => p._id === id);
  if (!patient) return;

  idInput.value = patient._id;
  nameInput.value = patient.name;
  speciesInput.value = patient.species;
  breedInput.value = patient.breed || '';
  weightInput.value = patient.weight || '';
  ownerNameInput.value = patient.ownerName;
  ownerPhoneInput.value = patient.ownerPhone;
  ownerEmailInput.value = patient.ownerEmail || '';

  modalTitle.textContent = 'Editar paciente';
  submitBtn.textContent = 'Actualizar paciente';
  openModal();
}

function resetForm() {
  form.reset();
  idInput.value = '';
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const payload = {
    name: nameInput.value,
    species: speciesInput.value,
    breed: breedInput.value,
    weight: weightInput.value ? Number(weightInput.value) : undefined,
    ownerName: ownerNameInput.value,
    ownerPhone: ownerPhoneInput.value,
    ownerEmail: ownerEmailInput.value,
  };

  const isEditing = idInput.value !== '';
  const url = isEditing ? `${API_URL}/patients/${idInput.value}` : `${API_URL}/patients`;
  const method = isEditing ? 'PUT' : 'POST';

  setButtonLoading(submitBtn, true, isEditing ? 'Actualizando...' : 'Creando...');

  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      showToast(result.message || 'Error al guardar el paciente', 'error');
      return;
    }

    showToast(isEditing ? 'Paciente actualizado correctamente' : 'Paciente creado correctamente', 'success');
    resetForm();
    closeModal();
    fetchPatients(currentPage);
  } catch (error) {
    showToast('No se pudo conectar con el servidor', 'error');
  } finally {
    setButtonLoading(submitBtn, false);
  }
});

// ---------- Eliminar ----------

async function deletePatient(id, buttonEl) {
  const confirmDelete = await showConfirm('¿Seguro que quieres eliminar este paciente?');
  if (!confirmDelete) return;

  if (buttonEl) setButtonLoading(buttonEl, true, '');

  try {
    const response = await fetch(`${API_URL}/patients/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authToken}` },
    });

    const result = await response.json();

    if (!response.ok) {
      showToast(result.message || 'Error al eliminar el paciente', 'error');
      if (buttonEl) setButtonLoading(buttonEl, false);
      return;
    }

    showToast('Paciente eliminado correctamente', 'success');
    fetchPatients(currentPage);
  } catch (error) {
    showToast('No se pudo conectar con el servidor', 'error');
    if (buttonEl) setButtonLoading(buttonEl, false);
  }
}

// ---------- Paginación ----------

prevBtn.addEventListener('click', () => {
  if (currentPage > 1) fetchPatients(currentPage - 1);
});

nextBtn.addEventListener('click', () => {
  if (currentPage < totalPages) fetchPatients(currentPage + 1);
});

// ---------- Búsqueda ----------

let searchTimeout;
searchInput.addEventListener('input', () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    currentSearch = searchInput.value.trim();
    fetchPatients(1);
  }, 400);
});

// ---------- Carga inicial ----------

fetchPatients(currentPage);
