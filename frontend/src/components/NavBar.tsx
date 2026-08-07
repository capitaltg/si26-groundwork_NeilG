import { Link } from "react-router-dom";
import { useDesignTheme } from "../newDesign/DesignThemeContext";

function NavBar() {
  const { theme, setTheme } = useDesignTheme();

  return (
    <nav className="navbar navbar-expand navbar-light bg-light mb-3">
      <div className="container-fluid">
        <span className="navbar-brand">TRI Facility Explorer</span>
        <div className="navbar-nav">
          <Link className="nav-link" to="/">
            Search
          </Link>
          <Link className="nav-link" to="/hazard-watch">
            Hazard Watch
          </Link>
          <Link className="nav-link" to="/site-search">
            Site Search
          </Link>
          <Link className="nav-link" to="/emissions-center">
            Emissions Center
          </Link>
          <Link className="nav-link" to="/state-overview">
            State Overview
          </Link>
          <Link className="nav-link" to="/property-overview">
            Property Overview
          </Link>
        </div>
        <div className="ms-auto d-flex align-items-center gap-2">
          <span className="small text-muted">Classic</span>
          <div className="form-check form-switch mb-0">
            <input
              className="form-check-input"
              type="checkbox"
              role="switch"
              checked={theme === "new"}
              onChange={(e) => setTheme(e.target.checked ? "new" : "classic")}
            />
          </div>
          <span className="small text-muted">New Design</span>
        </div>
      </div>
    </nav>
  );
}

export default NavBar;
