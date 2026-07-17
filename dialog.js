import { icon } from './icons.js';

/**
 * Show a custom dialog modal.
 * @param {Object} options
 * @param {'danger'|'info'|'warning'} options.type - Icon style
 * @param {string} options.icon - Lucide icon name
 * @param {string} options.title - Dialog title
 * @param {string} options.message - Dialog body text
 * @param {string} options.confirmText - Confirm button label
 * @param {string} [options.cancelText] - Cancel button label (omit for alert-only)
 * @param {'danger'|'confirm'} [options.confirmStyle='confirm'] - Confirm button style
 * @returns {Promise<boolean>} Resolves true if confirmed, false if cancelled
 */
export function showDialog({ type = 'info', icon: iconName = 'info', title, message, confirmText = 'OK', cancelText, confirmStyle = 'confirm' }) {
  return new Promise((resolve) => {
    // Remove any existing dialog
    document.querySelector('.dialog-overlay')?.remove();

    const overlay = document.createElement('div');
    overlay.className = 'dialog-overlay';
    overlay.innerHTML = `
      <div class="dialog-box">
        <div class="dialog-icon ${type}">${icon(iconName, 26)}</div>
        <div class="dialog-title">${title}</div>
        <div class="dialog-message">${message}</div>
        <div class="dialog-actions">
          ${cancelText ? `<button class="btn btn-cancel" id="dlg-cancel">${cancelText}</button>` : ''}
          <button class="btn btn-${confirmStyle}" id="dlg-confirm">${confirmText}</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Trigger entrance animation on next frame
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        overlay.classList.add('visible');
      });
    });

    const close = (result) => {
      overlay.classList.remove('visible');
      setTimeout(() => {
        overlay.remove();
        resolve(result);
      }, 250);
    };

    overlay.querySelector('#dlg-confirm').onclick = () => close(true);
    if (cancelText) {
      overlay.querySelector('#dlg-cancel').onclick = () => close(false);
    }

    // Close on overlay tap (outside the box)
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close(false);
    });
  });
}

/**
 * Show a toast notification.
 * @param {string} message - Toast text
 * @param {number} [duration=2500] - Duration in ms
 */
export function showToast(message, duration = 2500) {
  // Remove any existing toast
  document.querySelector('.toast')?.remove();

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      toast.classList.add('visible');
    });
  });

  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}
