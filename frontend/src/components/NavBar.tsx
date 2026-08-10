import { NavLink } from "react-router-dom";
import { useDesignTheme } from "../newDesign/DesignThemeContext";
import { colors, fonts } from "../newDesign/theme";

const NAV_LINKS = [
  { to: "/", label: "Search" },
  { to: "/hazard-watch", label: "Hazard Watch" },
  { to: "/site-search", label: "Site Search" },
  { to: "/emissions-center", label: "Emissions Center" },
  { to: "/state-overview", label: "State Overview" },
];

function NavBar() {
  const { theme, setTheme } = useDesignTheme();

  return (
    <nav
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "20px",
        padding: "16px 28px",
        background: colors.darkGreen,
        fontFamily: fonts.body,
        flexWrap: "wrap",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "26px", flexWrap: "wrap" }}>
        <span style={{ fontFamily: fonts.heading, fontWeight: 800, fontSize: "18px", color: "#FFFFFF" }}>
          TRI Facility Explorer
        </span>
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
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <span style={{ fontSize: "12.5px", fontWeight: 600, color: theme === "classic" ? "#FFFFFF" : "#8FB49B" }}>
          Classic
        </span>
        <label style={{ position: "relative", display: "inline-block", width: "40px", height: "22px", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={theme === "new"}
            onChange={(e) => setTheme(e.target.checked ? "new" : "classic")}
            style={{ position: "absolute", opacity: 0, width: "100%", height: "100%", margin: 0, cursor: "pointer" }}
          />
          <span
            style={{
              position: "absolute",
              inset: 0,
              background: theme === "new" ? colors.accentLime : "rgba(255,255,255,0.25)",
              borderRadius: "999px",
              transition: "background 0.15s",
              pointerEvents: "none",
            }}
          />
          <span
            style={{
              position: "absolute",
              top: "3px",
              left: theme === "new" ? "21px" : "3px",
              width: "16px",
              height: "16px",
              borderRadius: "99px",
              background: "#FFFFFF",
              transition: "left 0.15s",
              pointerEvents: "none",
            }}
          />
        </label>
        <span style={{ fontSize: "12.5px", fontWeight: 600, color: theme === "new" ? "#FFFFFF" : "#8FB49B" }}>
          New Design
        </span>
      </div>
    </nav>
  );
}

export default NavBar;
