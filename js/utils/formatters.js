export function formatCurrencyCLP(amount) {
  return amount.toLocaleString('es-CL');
}
export function formatDate(isoStr) {
  if (!isoStr) return '';
  const [year, month, day] = isoStr.split('-');
  return `${day}/${month}/${year}`;
}
export function getInitials(name) {
  if (!name) return '?';
  return name.substring(0, 2).toUpperCase();
}
export function timeAgo(timestamp) {
  if (!timestamp) return '';
  // Convert map to js object logic
  let d = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Ahora';
  if (diffMins < 60) return `${diffMins} m`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs} h`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays === 1) return 'Ayer';
  return `${diffDays} d`;
}
