let toastContainer = null;

function ensureToastContainer() {
  if (toastContainer && document.body.contains(toastContainer)) return toastContainer;
  toastContainer = document.createElement("div");
  toastContainer.id = "fm-toast-container";
  toastContainer.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 10000;
    display: flex;
    flex-direction: column;
    gap: 10px;
    max-width: 360px;
    pointer-events: none;
  `;
  document.body.appendChild(toastContainer);
  return toastContainer;
}

export function showToast(message, type = "info", duration = 3200) {
  const container = ensureToastContainer();

  // Limitar a máximo 2 notificaciones visibles a la vez
  while (container.children.length >= 2) {
    container.firstElementChild?.remove();
  }

  const palette = {
    success: { bg: "rgba(6, 78, 59, 0.96)", border: "#10b981", icon: "✅" },
    warning: { bg: "rgba(120, 53, 15, 0.96)", border: "#f59e0b", icon: "⚠️" },
    error:   { bg: "rgba(127, 29, 29, 0.96)", border: "#ef4444", icon: "❌" },
    info:    { bg: "rgba(15, 23, 42, 0.96)", border: "#3b82f6", icon: "ℹ️" }
  };

  const theme = palette[type] || palette.info;
  const toast = document.createElement("div");
  toast.style.cssText = `
    pointer-events: auto;
    background: ${theme.bg};
    border: 1px solid ${theme.border};
    border-left: 4px solid ${theme.border};
    color: #f8fafc;
    padding: 11px 14px;
    border-radius: 10px;
    font-size: 13px;
    font-weight: 600;
    line-height: 1.4;
    box-shadow: 0 12px 28px rgba(0, 0, 0, 0.55);
    display: flex;
    align-items: flex-start;
    gap: 9px;
    opacity: 0;
    transform: translateY(12px);
    transition: opacity 0.2s ease, transform 0.2s ease;
  `;

  toast.innerHTML = `
    <span style="font-size:15px; line-height:1.2;">${theme.icon}</span>
    <div style="flex:1;">${message}</div>
  `;

  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.style.opacity = "1";
    toast.style.transform = "translateY(0)";
  });

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(8px)";
    setTimeout(() => toast.remove(), 220);
  }, duration);
}