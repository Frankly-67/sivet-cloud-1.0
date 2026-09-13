// js/veterinarians.js
// Lógica del CRUD de Veterinarios: listado paginado, crear, editar y eliminar, usando Fetch API.
// El formulario ahora vive dentro de un modal (antes era un formulario siempre visible en la página).
// El token ya fue verificado por dashboard.js (que se carga antes que este script).

const API_URL = 'http://localhost:5000/api';
// Se usa "authToken" (no "token") para no chocar con la variable ya declarada en dashboard.js.
const authToken = localStorage.getItem('token');

let currentPage = 1;
const PAGE_LIMIT = 5;
let totalPages = 1;
let currentSearch = ''; // Término de búsqueda activo, para que la paginación lo mantenga

// ---------- Referencias al modal ----------
const modal = document.getElementById('vet-modal');
const modalPanel = document.getElementById('vet-modal-panel');
const modalTitle = document.getElementById('vet-modal-title');
const newBtn = document.getElementById('vet-new-btn');
const modalCloseBtn = document.getElementById('vet-modal-close');
const modalCancelBtn = document.getElementById('vet-modal-cancel');
const searchInput = document.getElementById('search-input');

// ---------- Referencias al formulario (ahora dentro del modal) ----------
const form = document.getElementById('vet-form');
const idInput = document.getElementById('vet-id');
const nameInput = document.getElementById('vet-name');
const emailInput = document.getElementById('vet-email');
const phoneInput = document.getElementById('vet-phone');
const specialtyInput = document.getElementById('vet-specialty');
const licenseInput = document.getElementById('vet-license');
const errorEl = document.getElementById('vet-error');
const submitBtn = document.getElementById('vet-submit-btn');
const tableBody = document.getElementById('vet-table-body');
const pageInfo = document.getElementById('page-info');
const prevBtn = document.getElementById('prev-page-btn');
const nextBtn = document.getElementById('next-page-btn');

// ---------- Estado de carga (spinner) en botones de acción ----------

// Guarda el contenido original de un botón, lo deshabilita y muestra un spinner mientras una
// petición fetch está en tránsito. Al terminar, restaura su contenido y lo vuelve a habilitar.
// Se usa tanto en el botón "Crear/Actualizar" del modal como en cada "Eliminar" de la tabla,
// para evitar que un doble clic dispare dos peticiones a la vez.
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

// ---------- Estado de carga de la tabla (skeleton simple) ----------

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

// ---------- Apertura / cierre del modal (con transición) ----------

// Abre el modal: primero lo hacemos visible (quitando "hidden"), y en el siguiente frame
// quitamos las clases de "estado inicial" (opacity-0/scale-95) para que la transición CSS se dispare.
// Si hiciéramos ambos cambios en el mismo instante, el navegador no tendría "antes" que animar.
function openModal() {
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  requestAnimationFrame(() => {
    modal.classList.remove('opacity-0');
    modalPanel.classList.remove('opacity-0', 'scale-95');
  });
}

// Cierra el modal: revertimos las clases para que la transición de salida se reproduzca,
// y solo después de que termine (200ms, igual a "duration-200" en el HTML) lo ocultamos del todo.
function closeModal() {
  modal.classList.add('opacity-0');
  modalPanel.classList.add('opacity-0', 'scale-95');
  setTimeout(() => {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }, 200);
}

// Clic en el fondo oscuro (fuera del panel blanco) también cierra el modal
modal.addEventListener('click', (event) => {
  if (event.target === modal) closeModal();
});

modalCloseBtn.addEventListener('click', closeModal);
modalCancelBtn.addEventListener('click', closeModal);

// Botón "+ Nuevo veterinario": deja el formulario en blanco, en modo creación, y abre el modal
newBtn.addEventListener('click', () => {
  resetForm();
  modalTitle.textContent = 'Nuevo veterinario';
  submitBtn.textContent = 'Crear veterinario';
  openModal();
});

// ---------- Listado ----------

async function fetchVeterinarians(page = 1) {
  showTableLoading(tableBody, 6);
  try {
    const searchParam = currentSearch ? `&search=${encodeURIComponent(currentSearch)}` : '';
    const response = await fetch(`${API_URL}/veterinarians?page=${page}&limit=${PAGE_LIMIT}${searchParam}`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    const result = await response.json();

    if (!response.ok) {
      showToast(result.message || 'Error al cargar los veterinarios', 'error');
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

function renderTable(veterinarians) {
  tableBody.innerHTML = '';

  if (veterinarians.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="6" class="px-4 py-6 text-center text-gray-500">No hay veterinarios registrados.</td></tr>';
    return;
  }

  veterinarians.forEach((vet) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td class="px-4 py-3 text-gray-700">${vet.name}</td>
      <td class="px-4 py-3 text-gray-700">${vet.email}</td>
      <td class="px-4 py-3 text-gray-700">${vet.phone}</td>
      <td class="px-4 py-3 text-gray-700">${vet.specialty}</td>
      <td class="px-4 py-3 text-gray-700">${vet.licenseNumber}</td>
      <td class="px-4 py-3">
        <button class="btn-edit bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg px-3 py-1.5 mr-2 transition-colors" data-id="${vet._id}">Editar</button>
        <button class="btn-delete bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-lg px-3 py-1.5 transition-colors" data-id="${vet._id}">Eliminar</button>
      </td>
    `;
    tableBody.appendChild(row);
  });

  document.querySelectorAll('.btn-edit').forEach((btn) => {
    btn.addEventListener('click', () => startEdit(btn.dataset.id, veterinarians));
  });
  document.querySelectorAll('.btn-delete').forEach((btn) => {
    btn.addEventListener('click', () => deleteVeterinarian(btn.dataset.id, btn));
  });
}

function updatePaginationUI() {
  pageInfo.textContent = `Página ${currentPage} de ${totalPages}`;
  prevBtn.disabled = currentPage <= 1;
  nextBtn.disabled = currentPage >= totalPages;
}

// ---------- Crear / Editar ----------

// Rellena el formulario con los datos de un veterinario existente ("inyección de datos" en el modal)
// y lo abre en modo edición.
function startEdit(id, veterinarians) {
  const vet = veterinarians.find((v) => v._id === id);
  if (!vet) return;

  idInput.value = vet._id;
  nameInput.value = vet.name;
  emailInput.value = vet.email;
  phoneInput.value = vet.phone;
  specialtyInput.value = vet.specialty;
  licenseInput.value = vet.licenseNumber;

  modalTitle.textContent = 'Editar veterinario';
  submitBtn.textContent = 'Actualizar veterinario';
  errorEl.textContent = '';
  openModal();
}

// Vuelve el formulario a su estado inicial ("modo creación"). Ya no controla visibilidad
// del formulario (eso ahora lo hacen openModal/closeModal), solo limpia sus valores.
function resetForm() {
  form.reset();
  idInput.value = '';
  errorEl.textContent = '';
}

// Envío del formulario: decide si es POST (crear) o PUT (editar) según si idInput tiene valor
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  errorEl.textContent = '';

  const payload = {
    name: nameInput.value,
    email: emailInput.value,
    phone: phoneInput.value,
    specialty: specialtyInput.value,
    licenseNumber: licenseInput.value,
  };

  const isEditing = idInput.value !== '';
  const url = isEditing ? `${API_URL}/veterinarians/${idInput.value}` : `${API_URL}/veterinarians`;
  const method = isEditing ? 'PUT' : 'POST';

  // Bloqueamos el botón mientras la petición está en tránsito, para evitar doble envío por doble clic
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
      showToast(result.message || 'Error al guardar el veterinario', 'error');
      return;
    }

    showToast(isEditing ? 'Veterinario actualizado correctamente' : 'Veterinario creado correctamente', 'success');
    resetForm();
    closeModal();
    fetchVeterinarians(currentPage); // Refrescamos la tabla con los datos actualizados
  } catch (error) {
    showToast('No se pudo conectar con el servidor', 'error');
  } finally {
    // Se ejecuta siempre (éxito, error de la API, o error de red) para que el botón nunca quede bloqueado
    setButtonLoading(submitBtn, false);
  }
});

// ---------- Eliminar ----------

async function deleteVeterinarian(id, buttonEl) {
  const confirmDelete = await showConfirm('¿Seguro que quieres eliminar este veterinario?');
  if (!confirmDelete) return;

  // Spinner sin texto (el botón es pequeño): solo el ícono girando
  if (buttonEl) setButtonLoading(buttonEl, true, '');

  try {
    const response = await fetch(`${API_URL}/veterinarians/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    const result = await response.json();

    if (!response.ok) {
      showToast(result.message || 'Error al eliminar el veterinario', 'error');
      if (buttonEl) setButtonLoading(buttonEl, false);
      return;
    }

    // Éxito: fetchVeterinarians repinta toda la tabla, así que este botón se reemplaza por uno
    // nuevo — no hace falta reactivarlo manualmente aquí.
    showToast('Veterinario eliminado correctamente', 'success');
    fetchVeterinarians(currentPage);
  } catch (error) {
    showToast('No se pudo conectar con el servidor', 'error');
    if (buttonEl) setButtonLoading(buttonEl, false);
  }
}

// ---------- Paginación ----------

prevBtn.addEventListener('click', () => {
  if (currentPage > 1) fetchVeterinarians(currentPage - 1);
});

nextBtn.addEventListener('click', () => {
  if (currentPage < totalPages) fetchVeterinarians(currentPage + 1);
});

// ---------- Búsqueda ----------

// Debounce: espera 400ms después de que el usuario deja de escribir antes de disparar la
// petición, para no hacer una llamada a la API por cada tecla presionada.
let searchTimeout;
searchInput.addEventListener('input', () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    currentSearch = searchInput.value.trim();
    fetchVeterinarians(1); // Toda búsqueda nueva vuelve a la página 1
  }, 400);
});

// ---------- Carga inicial ----------

fetchVeterinarians(currentPage);
