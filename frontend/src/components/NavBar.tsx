import { Link } from "react-router-dom";

function NavBar() {
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
        </div>
      </div>
    </nav>
  );
}

export default NavBar;
