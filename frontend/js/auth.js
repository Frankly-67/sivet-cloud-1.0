// js/auth.js
// Maneja el envío del formulario de login: hace la petición a la API, guarda el token y redirige al dashboard.

// URL base de la API. Cambia este valor si despliegas el backend en otra dirección o puerto.
const API_URL = 'http://localhost:5000/api';

const loginForm = document.getElementById('login-form');
const errorMessage = document.getElementById('error-message');

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault(); // Evita que el formulario recargue la página (comportamiento por defecto del HTML)

  // Limpiamos cualquier mensaje de error de un intento anterior
  errorMessage.textContent = '';

  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      // La API respondió con un error (401, 400, etc.) — mostramos el mensaje que envió el backend
      errorMessage.textContent = data.message || 'Error al iniciar sesión';
      return;
    }

    // Login exitoso: guardamos el token y los datos del usuario en localStorage,
    // para poder usarlos en las demás páginas del dashboard sin pedir login de nuevo en cada una.
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify({ name: data.name, email: data.email, role: data.role }));

    // Redirigimos según el rol: un CLIENT no tiene permisos para casi nada del panel administrativo
    // (le daría 403 en todo), así que va a su propio portal. ADMIN y VET sí van al dashboard interno.
    window.location.href = data.role === 'CLIENT' ? 'portal.html' : 'dashboard.html';
  } catch (error) {
    // Error de red: el backend no respondió (servidor apagado, CORS mal configurado, URL incorrecta, etc.)
    errorMessage.textContent = 'No se pudo conectar con el servidor. Verifica que el backend esté corriendo.';
  }
});
