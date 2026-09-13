// js/portal.js
// Lógica del portal del cliente: consulta SUS propias mascotas, citas e historial médico
// (ya filtrados por el backend gracias al tenant isolation), y permite descargar el PDF de una
// fórmula médica. Es de solo lectura — no hay crear/editar/eliminar en este portal.

const API_URL = 'http://localhost:5000/api';
// Se usa "authToken" (no "token") para no chocar con la variable ya declarada en dashboard.js.
const authToken = localStorage.getItem('token');

// ---------- Pestañas ----------

const tabs = {
  pets: { btn: document.getElementById('tab-pets'), panel: document.getElementById('panel-pets') },
  appointments: { btn: document.getElementById('tab-appointments'), panel: document.getElementById('panel-appointments') },
  records: { btn: document.getElementById('tab-records'), panel: document.getElementById('panel-records') },
};

function activateTab(name) {
  Object.entries(tabs).forEach(([key, { btn, panel }]) => {
    const isActive = key === name;
    panel.classList.toggle('hidden', !isActive);
    btn.classList.toggle('border-blue-600', isActive);
    btn.classList.toggle('text-blue-600', isActive);
    btn.classList.toggle('border-transparent', !isActive);
    btn.classList.toggle('text-gray-500', !isActive);
  });
}

tabs.pets.btn.addEventListener('click', () => activateTab('pets'));
tabs.appointments.btn.addEventListener('click', () => activateTab('appointments'));
tabs.records.btn.addEventListener('click', () => activateTab('records'));

// ---------- Estado de carga (spinner) para el botón de descarga ----------

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

// ---------- Estado de carga de las tablas (skeleton simple) ----------

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

// ---------- Mis mascotas ----------

async function loadPets() {
  const tableBody = document.getElementById('pets-table-body');
  showTableLoading(tableBody, 4);
  try {
    // No pedimos paginación real (solo un límite alto): un dueño de mascotas normalmente
    // tiene pocas, así que no vale la pena construir controles de paginación aquí.
    const response = await fetch(`${API_URL}/patients?page=1&limit=50`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const result = await response.json();

    if (!response.ok) {
      showToast(result.message || 'Error al cargar tus mascotas', 'error');
      return;
    }

    if (result.data.length === 0) {
      tableBody.innerHTML =
        '<tr><td colspan="4" class="px-4 py-6 text-center text-gray-500">Todavía no tienes mascotas registradas.</td></tr>';
      return;
    }

    tableBody.innerHTML = result.data
      .map(
        (pet) => `
      <tr>
        <td class="px-4 py-3 text-gray-700">${pet.name}</td>
        <td class="px-4 py-3 text-gray-700">${pet.species}</td>
        <td class="px-4 py-3 text-gray-700">${pet.breed || '-'}</td>
        <td class="px-4 py-3 text-gray-700">${pet.weight ? pet.weight + ' kg' : '-'}</td>
      </tr>
    `
      )
      .join('');
  } catch (error) {
    showToast('No se pudo conectar con el servidor', 'error');
  }
}

// ---------- Mis citas ----------

async function loadAppointments() {
  const tableBody = document.getElementById('appointments-table-body');
  showTableLoading(tableBody, 5);
  try {
    const response = await fetch(`${API_URL}/appointments?page=1&limit=50`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const result = await response.json();

    if (!response.ok) {
      showToast(result.message || 'Error al cargar tus citas', 'error');
      return;
    }

    if (result.data.length === 0) {
      tableBody.innerHTML =
        '<tr><td colspan="5" class="px-4 py-6 text-center text-gray-500">No tienes citas agendadas.</td></tr>';
      return;
    }

    const statusStyles = {
      pendiente: 'bg-amber-100 text-amber-800',
      confirmada: 'bg-blue-100 text-blue-800',
      completada: 'bg-green-100 text-green-800',
      cancelada: 'bg-gray-200 text-gray-600',
    };

    tableBody.innerHTML = result.data
      .map((appt) => {
        const patientName = appt.patient ? appt.patient.name : 'Mascota eliminada';
        const vetName = appt.veterinarian ? appt.veterinarian.name : 'Veterinario eliminado';
        const formattedDate = new Date(appt.date).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
        const badgeClass = statusStyles[appt.status] || 'bg-gray-100 text-gray-700';

        return `
        <tr>
          <td class="px-4 py-3 text-gray-700">${patientName}</td>
          <td class="px-4 py-3 text-gray-700">${vetName}</td>
          <td class="px-4 py-3 text-gray-700">${formattedDate}</td>
          <td class="px-4 py-3 text-gray-700">${appt.reason}</td>
          <td class="px-4 py-3"><span class="inline-block px-2.5 py-1 rounded-full text-xs font-medium ${badgeClass}">${appt.status}</span></td>
        </tr>
      `;
      })
      .join('');
  } catch (error) {
    showToast('No se pudo conectar con el servidor', 'error');
  }
}

// ---------- Historial médico ----------

async function loadMedicalRecords() {
  const tableBody = document.getElementById('records-table-body');
  showTableLoading(tableBody, 5);
  try {
    const response = await fetch(`${API_URL}/medical-records?page=1&limit=50`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const result = await response.json();

    if (!response.ok) {
      showToast(result.message || 'Error al cargar tu historial médico', 'error');
      return;
    }

    if (result.data.length === 0) {
      tableBody.innerHTML =
        '<tr><td colspan="5" class="px-4 py-6 text-center text-gray-500">No hay historiales médicos registrados todavía.</td></tr>';
      return;
    }

    tableBody.innerHTML = '';
    result.data.forEach((record) => {
      const patientName = record.patient ? record.patient.name : 'Mascota eliminada';
      const vetName = record.veterinarian ? record.veterinarian.name : 'Veterinario eliminado';
      const formattedDate = new Date(record.createdAt).toLocaleDateString('es-CO', { dateStyle: 'medium' });

      const row = document.createElement('tr');
      row.innerHTML = `
        <td class="px-4 py-3 text-gray-700">${patientName}</td>
        <td class="px-4 py-3 text-gray-700">${vetName}</td>
        <td class="px-4 py-3 text-gray-700">${record.diagnosis}</td>
        <td class="px-4 py-3 text-gray-700">${formattedDate}</td>
        <td class="px-4 py-3">
          <button class="btn-pdf bg-gray-600 hover:bg-gray-700 text-white text-xs font-medium rounded-lg px-3 py-1.5 transition-colors" data-id="${record._id}">Descargar PDF</button>
        </td>
      `;
      tableBody.appendChild(row);
    });

    document.querySelectorAll('.btn-pdf').forEach((btn) => {
      btn.addEventListener('click', () => downloadPDF(btn.dataset.id, btn));
    });
  } catch (error) {
    showToast('No se pudo conectar con el servidor', 'error');
  }
}

// ---------- Descargar PDF (mismo manejo de Blob que en el panel admin) ----------

async function downloadPDF(id, buttonEl) {
  setButtonLoading(buttonEl, true, '');

  try {
    const response = await fetch(`${API_URL}/medical-records/${id}/pdf`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    if (!response.ok) {
      const result = await response.json();
      showToast(result.message || 'Error al generar el PDF', 'error');
      return;
    }

    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = `formula-medica-${id}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(blobUrl);
    showToast('PDF descargado correctamente', 'success');
  } catch (error) {
    showToast('No se pudo conectar con el servidor', 'error');
  } finally {
    setButtonLoading(buttonEl, false);
  }
}

// ---------- Carga inicial: las 3 pestañas se cargan de una vez, para que cambiar entre ellas
// sea instantáneo (sin volver a pedir datos a la API cada vez) ----------

loadPets();
loadAppointments();
loadMedicalRecords();
