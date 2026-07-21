import PulseDivider from "./PulseDivider";

export default function AuthBrandPanel() {
  return (
    <div className="auth-brand">
      <div>
        <div className="auth-brand-mark">Blood Donor Finder</div>
        <h1 className="auth-brand-headline">
          Every donor is a <em>live signal</em> on the map, not a name in a spreadsheet.
        </h1>
      </div>

      <div>
        <PulseDivider color="var(--crimson)" height={36} />
        <div className="auth-brand-stats">
          <div>
            <div className="auth-brand-stat-value">8</div>
            <div className="auth-brand-stat-label">blood groups tracked</div>
          </div>
          <div>
            <div className="auth-brand-stat-value">&lt;90s</div>
            <div className="auth-brand-stat-label">avg. donor match time</div>
          </div>
          <div>
            <div className="auth-brand-stat-value">24/7</div>
            <div className="auth-brand-stat-label">emergency requests</div>
          </div>
        </div>
        <p className="auth-brand-foot">
          Register once as a donor or recipient. Your city and last donation date decide who
          shows up first when a hospital needs your blood group nearby.
        </p>
      </div>
    </div>
  );
}
