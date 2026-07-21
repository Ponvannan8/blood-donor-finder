const LABELS = {
  pending: "Pending",
  matched: "Matched",
  fulfilled: "Fulfilled",
  cancelled: "Cancelled",
};

export default function StatusBadge({ status }) {
  return <span className={`status-badge status-${status}`}>{LABELS[status] || status}</span>;
}
