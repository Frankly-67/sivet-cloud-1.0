// js/stats.js
// Consulta GET /api/stats y llena las tarjetas de resumen del dashboard (dashboard.html).
// dashboard.js ya se encarga de la guardia de ruta y el logout; este script solo pide los números.

const API_URL = 'http://localhost:5000/api';
// Se usa "authToken" (no "token") para no chocar con la variable ya declarada en dashboard.js.
const authToken = localStorage.getItem('token');

async function loadStats() {
  try {
    const response = await fetch(`${API_URL}/stats`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    const result = await response.json();

    if (!response.ok) {
      // Si la API responde con error, dejamos los marcadores "—" en vez de mostrar un dato incorrecto
      return;
    }

    document.getElementById('stat-patients').textContent = result.totalPatients;
    document.getElementById('stat-appointments').textContent = result.pendingAppointmentsToday;
    document.getElementById('stat-vets').textContent = result.activeVeterinarians;
  } catch (error) {
    // Error de red (backend apagado, etc.): dejamos los marcadores "—" tal como están, sin romper la página
  }
}

loadStats();
