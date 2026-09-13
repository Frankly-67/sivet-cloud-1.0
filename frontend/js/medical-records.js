// js/medical-records.js
// Lógica del CRUD de Historial Médico: puebla selects, listado paginado, crear, editar y eliminar.
// El formulario vive dentro de un modal. El token ya fue verificado por dashboard.js.

const API_URL = 'http://localhost:5000/api';
const authToken = localStorage.getItem('token');

let currentPage = 1;
const PAGE_LIMIT = 5;
let totalPages = 1;

// ---------- Referencias al modal ----------
const modal = document.getElementById('mr-modal');
const modalPanel = document.getElementById('mr-modal-panel');
const modalTitle = document.getElementById('mr-modal-title');
const newBtn = document.getElementById('mr-new-btn');
const modalCloseBtn = document.getElementById('mr-modal-close');
const modalCancelBtn = document.getElementById('mr-modal-cancel');

// ---------- Referencias al formulario ----------
const form = document.getElementById('mr-form');
const idInput = document.getElementById('mr-id');
const patientSelect = document.getElementById('mr-patient');
const vetSelect = document.getElementById('mr-vet');
const weightInput = document.getElementById('mr-weight');
const diagnosisInput = document.getElementById('mr-diagnosis');
const treatmentInput = document.getElementById('mr-treatment');
const medicationsInput = document.getElementById('mr-medications');
const submitBtn = document.getElementById('mr-submit-btn');
const tableBody = document.getElementById('mr-table-body');
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
  modalTitle.textContent = 'Nuevo registro';
  submitBtn.textContent = 'Crear registro';
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

async function fetchMedicalRecords(page = 1) {
  showTableLoading(tableBody, 7);
  try {
    const response = await fetch(`${API_URL}/medical-records?page=${page}&limit=${PAGE_LIMIT}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    const result = await response.json();

    if (!response.ok) {
      showToast(result.message || 'Error al cargar el historial médico', 'error');
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

function renderTable(records) {
  tableBody.innerHTML = '';

  if (records.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="7" class="px-4 py-6 text-center text-gray-500">No hay historiales registrados.</td></tr>';
    return;
  }

  records.forEach((record) => {
    const row = document.createElement('tr');
    const patientName = record.patient ? record.patient.name : 'Paciente eliminado';
    const vetName = record.veterinarian ? record.veterinarian.name : 'Veterinario eliminado';
    const medicationsText = record.medications && record.medications.length > 0 ? record.medications.join(', ') : '-';
    const formattedDate = new Date(record.createdAt).toLocaleDateString('es-CO', { dateStyle: 'medium' });

    row.innerHTML = `
      <td class="px-4 py-3 text-gray-700">${patientName}</td>
      <td class="px-4 py-3 text-gray-700">${vetName}</td>
      <td class="px-4 py-3 text-gray-700">${record.diagnosis}</td>
      <td class="px-4 py-3 text-gray-700">${record.weight} kg</td>
      <td class="px-4 py-3 text-gray-700">${medicationsText}</td>
      <td class="px-4 py-3 text-gray-700">${formattedDate}</td>
      <td class="px-4 py-3">
        <button class="btn-pdf bg-gray-600 hover:bg-gray-700 text-white text-xs font-medium rounded-lg px-3 py-1.5 mr-2 transition-colors" data-id="${record._id}">PDF</button>
        <button class="btn-edit bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg px-3 py-1.5 mr-2 transition-colors" data-id="${record._id}">Editar</button>
        <button class="btn-delete bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-lg px-3 py-1.5 transition-colors" data-id="${record._id}">Eliminar</button>
      </td>
    `;
    tableBody.appendChild(row);
  });

  document.querySelectorAll('.btn-pdf').forEach((btn) => {
    btn.addEventListener('click', () => downloadPDF(btn.dataset.id, btn));
  });
  document.querySelectorAll('.btn-edit').forEach((btn) => {
    btn.addEventListener('click', () => startEdit(btn.dataset.id, records));
  });
  document.querySelectorAll('.btn-delete').forEach((btn) => {
    btn.addEventListener('click', () => deleteMedicalRecord(btn.dataset.id, btn));
  });
}

function updatePaginationUI() {
  pageInfo.textContent = `Página ${currentPage} de ${totalPages}`;
  prevBtn.disabled = currentPage <= 1;
  nextBtn.disabled = currentPage >= totalPages;
}

// ---------- Crear / Editar ----------

function startEdit(id, records) {
  const record = records.find((r) => r._id === id);
  if (!record) return;

  idInput.value = record._id;
  patientSelect.value = record.patient ? record.patient._id : '';
  vetSelect.value = record.veterinarian ? record.veterinarian._id : '';
  weightInput.value = record.weight;
  diagnosisInput.value = record.diagnosis;
  treatmentInput.value = record.treatment;
  medicationsInput.value = record.medications ? record.medications.join(', ') : '';

  modalTitle.textContent = 'Editar registro';
  submitBtn.textContent = 'Actualizar registro';
  openModal();
}

function resetForm() {
  form.reset();
  idInput.value = '';
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const medicationsArray = medicationsInput.value
    .split(',')
    .map((med) => med.trim())
    .filter((med) => med.length > 0);

  const payload = {
    patient: patientSelect.value,
    veterinarian: vetSelect.value,
    diagnosis: diagnosisInput.value,
    treatment: treatmentInput.value,
    weight: Number(weightInput.value),
    medications: medicationsArray,
  };

  const isEditing = idInput.value !== '';
  const url = isEditing ? `${API_URL}/medical-records/${idInput.value}` : `${API_URL}/medical-records`;
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
      showToast(result.message || 'Error al guardar el historial médico', 'error');
      return;
    }

    showToast(isEditing ? 'Registro actualizado correctamente' : 'Registro creado correctamente', 'success');
    resetForm();
    closeModal();
    fetchMedicalRecords(currentPage);
  } catch (error) {
    showToast('No se pudo conectar con el servidor', 'error');
  } finally {
    setButtonLoading(submitBtn, false);
  }
});

// ---------- Descargar PDF (manejo de Blob) ----------

// Esta ruta exige Authorization (Bearer Token), así que no podemos usar un <a href="..."> normal:
// el navegador no le agregaría el header al navegar directamente. Por eso usamos fetch() manualmente
// y leemos la respuesta binaria como Blob para poder descargarla por código.
async function downloadPDF(id, buttonEl) {
  if (buttonEl) setButtonLoading(buttonEl, true, '');

  try {
    const response = await fetch(`${API_URL}/medical-records/${id}/pdf`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    if (!response.ok) {
      // El backend solo responde JSON cuando falla (antes de empezar el stream), así que aquí sí
      // podemos leer el mensaje de error normalmente.
      const result = await response.json();
      showToast(result.message || 'Error al generar el PDF', 'error');
      return;
    }

    // La respuesta exitosa es el PDF crudo (application/pdf), no JSON. Blob representa datos
    // binarios "en bruto" que el navegador sabe interpretar como archivo.
    const blob = await response.blob();

    // Creamos una URL temporal en memoria que apunta a ese Blob (algo como "blob:http://localhost/...").
    const blobUrl = URL.createObjectURL(blob);

    // Truco estándar para forzar la descarga: un <a> invisible con el atributo "download",
    // lo insertamos en el DOM, le hacemos clic por código, y lo quitamos de inmediato.
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = `historia-clinica-${id}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();

    // Liberamos la URL temporal de memoria: ya cumplió su función una vez que la descarga inició.
    URL.revokeObjectURL(blobUrl);

    showToast('PDF descargado correctamente', 'success');
  } catch (error) {
    showToast('No se pudo conectar con el servidor', 'error');
  } finally {
    // A diferencia de "eliminar", aquí la fila NO desaparece de la tabla, así que sí debemos
    // reactivar el botón manualmente en todos los casos (éxito o error).
    if (buttonEl) setButtonLoading(buttonEl, false);
  }
}

// ---------- Eliminar ----------

async function deleteMedicalRecord(id, buttonEl) {
  const confirmDelete = await showConfirm('¿Seguro que quieres eliminar este historial médico?');
  if (!confirmDelete) return;

  if (buttonEl) setButtonLoading(buttonEl, true, '');

  try {
    const response = await fetch(`${API_URL}/medical-records/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authToken}` },
    });

    const result = await response.json();

    if (!response.ok) {
      showToast(result.message || 'Error al eliminar el historial médico', 'error');
      if (buttonEl) setButtonLoading(buttonEl, false);
      return;
    }

    showToast('Registro eliminado correctamente', 'success');
    fetchMedicalRecords(currentPage);
  } catch (error) {
    showToast('No se pudo conectar con el servidor', 'error');
    if (buttonEl) setButtonLoading(buttonEl, false);
  }
}

// ---------- Paginación ----------

prevBtn.addEventListener('click', () => {
  if (currentPage > 1) fetchMedicalRecords(currentPage - 1);
});

nextBtn.addEventListener('click', () => {
  if (currentPage < totalPages) fetchMedicalRecords(currentPage + 1);
});

// ---------- Carga inicial ----------

loadSelectOptions();
fetchMedicalRecords(currentPage);
