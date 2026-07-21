import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    <div className="navbar">
      <Link to="/" className="navbar-brand" style={{ textDecoration: "none" }}>
        Blood<span>Donor</span>Finder
      </Link>
      <div className="navbar-user">
        <Link to="/admin" className="btn-ghost" style={{ textDecoration: "none" }}>
          Admin
        </Link>
      </div>
    </div>
  );
}
