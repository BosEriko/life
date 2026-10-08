export function focusDatabaseAdd(attempts = 20) {
  const input = document.getElementById("database-add-name");
  if (!input) {
    if (attempts > 0) window.setTimeout(() => focusDatabaseAdd(attempts - 1), 150);
    return;
  }
  input.scrollIntoView({ behavior: "smooth", block: "center" });
  input.focus({ preventScroll: true });
}
