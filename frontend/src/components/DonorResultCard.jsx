export default function DonorResultCard({ donor }) {
  return (
    <div className="donor-result">
      <div className="donor-result-bg mono">{donor.blood_group}</div>
      <div className="donor-result-info">
        <div className="donor-result-name">{donor.username}</div>
        <div className="donor-result-meta">
          {donor.city}
          {donor.phone ? ` · ${donor.phone}` : ""}
          {donor.last_donation_date ? ` · last donated ${donor.last_donation_date}` : " · never donated"}
          {!donor.eligible_to_donate ? " · not yet eligible (< 90 days)" : ""}
        </div>
      </div>
      {donor.distance_km != null && <div className="donor-result-distance mono">{donor.distance_km} km</div>}
    </div>
  );
}
