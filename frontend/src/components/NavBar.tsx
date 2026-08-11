import { Link, NavLink } from "react-router-dom";
import { colors, fonts } from "../newDesign/theme";

const NAV_LINKS = [
  { to: "/search", label: "TRI Search" },
  { to: "/hazard-watch", label: "Hazard Watch" },
  { to: "/site-search", label: "Site Search" },
  { to: "/emissions-center", label: "Emissions Center" },
  { to: "/state-overview", label: "State Overview" },
];

function NavBar() {
  return (
    <nav
      style={{
        display: "flex",
        alignItems: "center",
        gap: "26px",
        padding: "16px 28px",
        background: colors.darkGreen,
        fontFamily: fonts.body,
        flexWrap: "wrap",
      }}
    >
      <Link
        to="/"
        style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }}
      >
        <div style={{ width: "36px", height: "36px", borderRadius: "99px", overflow: "hidden", flexShrink: 0 }}>
          <img
            src="/LOGO.png"
            alt=""
            style={{ display: "block", width: "100%", height: "100%", objectFit: "cover" }}
            onError={(e) => {
              (e.currentTarget.parentElement as HTMLElement).style.display = "none";
            }}
          />
        </div>
        <span style={{ fontFamily: fonts.heading, fontWeight: 800, fontSize: "18px", color: "#FFFFFF" }}>
          Groundwork
        </span>
      </Link>
      <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
        {NAV_LINKS.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            style={({ isActive }) => ({
              padding: "8px 16px",
              borderRadius: "999px",
              fontSize: "14px",
              fontWeight: 600,
              textDecoration: "none",
              color: isActive ? colors.darkGreen : "#CFE0D6",
              background: isActive ? colors.background : "transparent",
            })}
          >
            {link.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

export default NavBar;
