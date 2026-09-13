// js/confirm.js
// Modal de confirmación personalizado, reemplazando el confirm() nativo del navegador para que
// combine visualmente con el resto de la app (mismos modales, transición y estilo de botones).
// Expone showConfirm(message) -> Promise<boolean>, para usarse con await justo donde antes había
// un confirm(): `const ok = await showConfirm('¿Seguro?'); if (!ok) return;`
// No requiere ningún HTML adicional: crea su propio modal automáticamente al cargarse.

const confirmModal = document.createElement('div');
confirmModal.id = 'confirm-modal';
confirmModal.className =
  'fixed inset-0 z-50 hidden items-center justify-center bg-black/50 p-4 opacity-0 transition-opacity duration-200';
confirmModal.innerHTML = `
  <div id="confirm-modal-panel" class="bg-white rounded-xl shadow-lg w-full max-w-sm p-6 transform opacity-0 scale-95 transition-all duration-200">
    <h2 class="text-lg font-semibold text-gray-900 mb-2">Confirmar acción</h2>
    <p id="confirm-modal-message" class="text-sm text-gray-600 mb-6"></p>
    <div class="flex justify-end gap-3">
      <button id="confirm-modal-cancel" class="text-sm font-medium text-gray-600 border border-gray-300 rounded-lg px-4 py-2 hover:bg-gray-50 transition-colors">Cancelar</button>
      <button id="confirm-modal-accept" class="bg-red-600 hover:bg-red-700 text-white font-medium text-sm rounded-lg px-4 py-2 transition-colors">Eliminar</button>
    </div>
  </div>
`;
document.body.appendChild(confirmModal);

const confirmModalPanel = document.getElementById('confirm-modal-panel');
const confirmModalMessage = document.getElementById('confirm-modal-message');
const confirmModalCancelBtn = document.getElementById('confirm-modal-cancel');
const confirmModalAcceptBtn = document.getElementById('confirm-modal-accept');

function openConfirmModal() {
  confirmModal.classList.remove('hidden');
  confirmModal.classList.add('flex');
  requestAnimationFrame(() => {
    confirmModal.classList.remove('opacity-0');
    confirmModalPanel.classList.remove('opacity-0', 'scale-95');
  });
}

function closeConfirmModal() {
  confirmModal.classList.add('opacity-0');
  confirmModalPanel.classList.add('opacity-0', 'scale-95');
  setTimeout(() => {
    confirmModal.classList.add('hidden');
    confirmModal.classList.remove('flex');
  }, 200);
}

// showConfirm: abre el modal con el mensaje dado y devuelve una Promise que resuelve a true
// (botón "Eliminar") o false (botón "Cancelar" o clic fuera del panel).
function showConfirm(message) {
  confirmModalMessage.textContent = message;
  openConfirmModal();

  return new Promise((resolve) => {
    function handleAccept() {
      cleanup();
      closeConfirmModal();
      resolve(true);
    }
    function handleCancel() {
      cleanup();
      closeConfirmModal();
      resolve(false);
    }
    function handleBackdrop(event) {
      if (event.target === confirmModal) handleCancel();
    }
    // Quitamos los listeners después de resolver, para no acumular uno nuevo cada vez que se
    // vuelve a llamar showConfirm() en la misma página (el modal se reutiliza, no se recrea).
    function cleanup() {
      confirmModalAcceptBtn.removeEventListener('click', handleAccept);
      confirmModalCancelBtn.removeEventListener('click', handleCancel);
      confirmModal.removeEventListener('click', handleBackdrop);
    }

    confirmModalAcceptBtn.addEventListener('click', handleAccept);
    confirmModalCancelBtn.addEventListener('click', handleCancel);
    confirmModal.addEventListener('click', handleBackdrop);
  });
}
