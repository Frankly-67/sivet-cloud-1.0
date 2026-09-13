// js/dashboard.js
// Protege el dashboard (y por extensión, cualquier página que lo incluya): si no hay token guardado,
// redirige de vuelta al login. También muestra el nombre del usuario y maneja el cierre de sesión.

const token = localStorage.getItem('token');
const userRaw = localStorage.getItem('user');

// Guardia de ruta: si no hay token, el usuario no pasó por el login, así que lo devolvemos a index.html.
// Esto se ejecuta apenas carga el script, antes de que el usuario vea contenido protegido.
if (!token) {
  window.location.href = 'index.html';
}

// Si hay datos de usuario guardados, mostramos su nombre en el navbar
if (userRaw) {
  const user = JSON.parse(userRaw);
  const userNameEl = document.getElementById('user-name');
  if (userNameEl) {
    userNameEl.textContent = `Hola, ${user.name}`;
  }
}

// Manejo del botón de cerrar sesión: limpia localStorage y regresa al login
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'index.html';
  });
}
