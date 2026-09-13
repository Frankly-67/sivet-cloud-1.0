// js/appointments.js
// Lógica del CRUD de Citas: puebla selects de paciente/veterinario, listado paginado, crear, editar
// y eliminar. El formulario vive dentro de un modal. El token ya fue verificado por dashboard.js.

const API_URL = 'http://localhost:5000/api';
const authToken = localStorage.getItem('token');

let currentPage = 1;
const PAGE_LIMIT = 5;
let totalPages = 1;
let currentStatusFilter = '';

// ---------- Referencias al modal ----------
const modal = document.getElementById('appt-modal');
const modalPanel = document.getElementById('appt-modal-panel');
const modalTitle = document.getElementById('appt-modal-title');
const newBtn = document.getElementById('appt-new-btn');
const modalCloseBtn = document.getElementById('appt-modal-close');
const modalCancelBtn = document.getElementById('appt-modal-cancel');
const statusFilterSelect = document.getElementById('status-filter');

// ---------- Referencias al formulario ----------
const form = document.getElementById('appt-form');
const idInput = document.getElementById('appt-id');
const patientSelect = document.getElementById('appt-patient');
const vetSelect = document.getElementById('appt-vet');
const dateInput = document.getElementById('appt-date');
const reasonInput = document.getElementById('appt-reason');
const statusSelect = document.getElementById('appt-status');
const notesInput = document.getElementById('appt-notes');
const submitBtn = document.getElementById('appt-submit-btn');
const tableBody = document.getElementById('appt-table-body');
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
  modalTitle.textContent = 'Nueva cita';
  submitBtn.textContent = 'Crear cita';
  openModal();
});

// ---------- Poblar los selects de Paciente y Veterinario ----------

async function loadSelectOptions() {
  try {
    const [patientsRes, vetsRes] = await Promise.all([
      fetch(`${API_URL}/patients?page=1&limit=100`, { headers: { Authorization: `Bearer ${authToken}` } }),
      fetch(`${API_URL}/veterinarians?page=1&limit=100`, { headers: { Authorization: `Bearer ${authToken}` } }),
    ]);

    const patientsData = await patientsRes.json();
    const vetsData = await vetsRes.json();

    patientsData.data.forEach((patient) => {
      const option = document.createElement('option');
      option.value = patient._id;
      option.textContent = `${patient.name} (${patient.ownerName})`;
      patientSelect.appendChild(option);
    });

    vetsData.data.forEach((vet) => {
      const option = document.createElement('option');
      option.value = vet._id;
      option.textContent = `${vet.name} - ${vet.specialty}`;
      vetSelect.appendChild(option);
    });
  } catch (error) {
    showToast('No se pudieron cargar los pacientes/veterinarios para el formulario', 'error');
  }
}

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

async function fetchAppointments(page = 1) {
  showTableLoading(tableBody, 6);
  try {
    const statusParam = currentStatusFilter ? `&status=${encodeURIComponent(currentStatusFilter)}` : '';
    const response = await fetch(`${API_URL}/appointments?page=${page}&limit=${PAGE_LIMIT}${statusParam}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    const result = await response.json();

    if (!response.ok) {
      showToast(result.message || 'Error al cargar las citas', 'error');
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

function renderTable(appointments) {
  tableBody.innerHTML = '';

  if (appointments.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="6" class="px-4 py-6 text-center text-gray-500">No hay citas registradas.</td></tr>';
    return;
  }

  const statusStyles = {
    pendiente: 'bg-amber-100 text-amber-800',
    confirmada: 'bg-blue-100 text-blue-800',
    completada: 'bg-green-100 text-green-800',
    cancelada: 'bg-gray-200 text-gray-600',
  };

  appointments.forEach((appt) => {
    const row = document.createElement('tr');
    const patientName = appt.patient ? appt.patient.name : 'Paciente eliminado';
    const vetName = appt.veterinarian ? appt.veterinarian.name : 'Veterinario eliminado';
    const formattedDate = new Date(appt.date).toLocaleString('es-CO', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
    const badgeClass = statusStyles[appt.status] || 'bg-gray-100 text-gray-700';

    row.innerHTML = `
      <td class="px-4 py-3 text-gray-700">${patientName}</td>
      <td class="px-4 py-3 text-gray-700">${vetName}</td>
      <td class="px-4 py-3 text-gray-700">${formattedDate}</td>
      <td class="px-4 py-3 text-gray-700">${appt.reason}</td>
      <td class="px-4 py-3"><span class="inline-block px-2.5 py-1 rounded-full text-xs font-medium ${badgeClass}">${appt.status}</span></td>
      <td class="px-4 py-3">
        <button class="btn-edit bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg px-3 py-1.5 mr-2 transition-colors" data-id="${appt._id}">Editar</button>
        <button class="btn-delete bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-lg px-3 py-1.5 transition-colors" data-id="${appt._id}">Eliminar</button>
      </td>
    `;
    tableBody.appendChild(row);
  });

  document.querySelectorAll('.btn-edit').forEach((btn) => {
    btn.addEventListener('click', () => startEdit(btn.dataset.id, appointments));
  });
  document.querySelectorAll('.btn-delete').forEach((btn) => {
    btn.addEventListener('click', () => deleteAppointment(btn.dataset.id, btn));
  });
}

function updatePaginationUI() {
  pageInfo.textContent = `Página ${currentPage} de ${totalPages}`;
  prevBtn.disabled = currentPage <= 1;
  nextBtn.disabled = currentPage >= totalPages;
}

// ---------- Crear / Editar ----------

function startEdit(id, appointments) {
  const appt = appointments.find((a) => a._id === id);
  if (!appt) return;

  idInput.value = appt._id;
  patientSelect.value = appt.patient ? appt.patient._id : '';
  vetSelect.value = appt.veterinarian ? appt.veterinarian._id : '';
  dateInput.value = new Date(appt.date).toISOString().slice(0, 16);
  reasonInput.value = appt.reason;
  statusSelect.value = appt.status;
  notesInput.value = appt.notes || '';

  modalTitle.textContent = 'Editar cita';
  submitBtn.textContent = 'Actualizar cita';
  openModal();
}

function resetForm() {
  form.reset();
  idInput.value = '';
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const payload = {
    patient: patientSelect.value,
    veterinarian: vetSelect.value,
    date: new Date(dateInput.value).toISOString(),
    reason: reasonInput.value,
    status: statusSelect.value,
    notes: notesInput.value,
  };

  const isEditing = idInput.value !== '';
  const url = isEditing ? `${API_URL}/appointments/${idInput.value}` : `${API_URL}/appointments`;
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
      showToast(result.message || 'Error al guardar la cita', 'error');
      return;
    }

    showToast(isEditing ? 'Cita actualizada correctamente' : 'Cita creada correctamente', 'success');
    resetForm();
    closeModal();
    fetchAppointments(currentPage);
  } catch (error) {
    showToast('No se pudo conectar con el servidor', 'error');
  } finally {
    setButtonLoading(submitBtn, false);
  }
});

// ---------- Eliminar ----------

async function deleteAppointment(id, buttonEl) {
  const confirmDelete = await showConfirm('¿Seguro que quieres eliminar esta cita?');
  if (!confirmDelete) return;

  if (buttonEl) setButtonLoading(buttonEl, true, '');

  try {
    const response = await fetch(`${API_URL}/appointments/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authToken}` },
    });

    const result = await response.json();

    if (!response.ok) {
      showToast(result.message || 'Error al eliminar la cita', 'error');
      if (buttonEl) setButtonLoading(buttonEl, false);
      return;
    }

    showToast('Cita eliminada correctamente', 'success');
    fetchAppointments(currentPage);
  } catch (error) {
    showToast('No se pudo conectar con el servidor', 'error');
    if (buttonEl) setButtonLoading(buttonEl, false);
  }
}

// ---------- Paginación ----------

prevBtn.addEventListener('click', () => {
  if (currentPage > 1) fetchAppointments(currentPage - 1);
});

nextBtn.addEventListener('click', () => {
  if (currentPage < totalPages) fetchAppointments(currentPage + 1);
});

// ---------- Filtro por estado ----------

// Un <select> no necesita debounce (no genera una petición por tecla, solo al elegir una opción).
statusFilterSelect.addEventListener('change', () => {
  currentStatusFilter = statusFilterSelect.value;
  fetchAppointments(1);
});

// ---------- Carga inicial ----------

loadSelectOptions();
fetchAppointments(currentPage);
