// Test helper intentionally listed in GlobalConfig.CommonJS.
// The engine should still scope this direct document lookup to the component
// that imported/called it.
export function changeLabel() {
  const el = document.getElementById("status-panel");
  el.textContent = "Changed";
}
