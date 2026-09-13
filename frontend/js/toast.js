// js/toast.js
// Sistema de notificaciones "toast": mensajes de éxito (verde) o error (rojo) que aparecen en la
// esquina superior derecha, con transición de entrada/salida, y se retiran solos a los 3 segundos.
// Se incluye en cada página ANTES del script específico (ej. veterinarians.js), para que la función
// global showToast() ya esté disponible cuando se necesite. No requiere ningún HTML adicional:
// crea su propio contenedor automáticamente al cargarse.

const toastContainer = document.createElement('div');
toastContainer.id = 'toast-container';
toastContainer.className = 'fixed top-4 right-4 z-50 flex flex-col gap-2 items-end';
document.body.appendChild(toastContainer);

// message: texto a mostrar. type: 'success' (verde) o 'error' (rojo).
function showToast(message, type = 'success') {
  const isSuccess = type === 'success';

  const toast = document.createElement('div');
  // Empieza invisible y desplazado (opacity-0 translate-x-4); quitamos esas clases un frame después
  // para que la transición de entrada se reproduzca (igual que hicimos con el modal).
  toast.className = [
    'flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white max-w-xs',
    'transform transition-all duration-200 opacity-0 translate-x-4',
    isSuccess ? 'bg-green-600' : 'bg-red-600',
  ].join(' ');

  const icon = isSuccess
    ? '<svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>'
    : '<svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>';

  toast.innerHTML = `${icon}<span>${message}</span>`;
  toastContainer.appendChild(toast);

  // Entrada: en el siguiente frame quitamos el estado inicial para que la transición se dispare
  requestAnimationFrame(() => {
    toast.classList.remove('opacity-0', 'translate-x-4');
  });

  // Salida automática a los 3 segundos: reproducimos la transición de salida y luego lo quitamos del DOM
  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-x-4');
    setTimeout(() => toast.remove(), 200); // 200ms = misma duración que "duration-200"
  }, 3000);
}
