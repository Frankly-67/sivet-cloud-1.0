// js/register.js
// Maneja el envío del formulario de registro público (siempre crea una cuenta CLIENT, por diseño
// del backend). Al tener éxito, guarda el token igual que el login y redirige directo al portal.

const API_URL = 'http://localhost:5000/api';

const registerForm = document.getElementById('register-form');
const errorMessage = document.getElementById('error-message');

registerForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  errorMessage.textContent = '';

  const name = document.getElementById('name').value;
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirm-password').value;

  // Validación en el cliente: evita una llamada innecesaria a la API si las contraseñas no coinciden
  if (password !== confirmPassword) {
    errorMessage.textContent = 'Las contraseñas no coinciden';
    return;
  }

  try {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      errorMessage.textContent = data.message || 'Error al crear la cuenta';
      return;
    }

    // Registro exitoso: el backend ya nos devuelve un token, así que iniciamos sesión de una vez
    // (sin obligar al usuario a volver a escribir sus credenciales en el login).
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify({ name: data.name, email: data.email, role: data.role }));

    // Todo registro público es CLIENT (el backend lo garantiza), así que siempre va al portal.
    window.location.href = 'portal.html';
  } catch (error) {
    errorMessage.textContent = 'No se pudo conectar con el servidor. Verifica que el backend esté corriendo.';
  }
});
