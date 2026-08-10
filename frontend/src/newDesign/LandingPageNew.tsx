import { Link } from "react-router-dom";
import { colors, fonts } from "./theme";

const SECTIONS = [
  {
    to: "/search",
    title: "Search",
    description: "Browse EPA TRI-registered facilities by state and drill into any one's full release and compliance history.",
  },
  {
    to: "/hazard-watch",
    title: "Hazard Watch",
    description: "The worst PBT and hazardous chemical releases in a state, ranked worst-first.",
  },
  {
    to: "/site-search",
    title: "Site Search",
    description: "Every EPA-regulated facility near an address or across a state — TRI, RCRA, Clean Air & Water, Superfund, Brownfields — plus nearby impaired water bodies and critical habitat.",
  },
  {
    to: "/emissions-center",
    title: "Emissions Center",
    description: "Greenhouse gas emissions leaderboard by state, with per-facility multi-year trends and automatic flagging of substantial increases.",
  },
  {
    to: "/state-overview",
    title: "State Overview",
    description: "Every town in a state ranked by a composite environmental risk score, with a full report card for each.",
  },
];

function LandingPageNew() {
  return (
    <div style={{ fontFamily: fonts.body, background: colors.background, minHeight: "100vh", padding: "28px" }}>
      <div
        style={{
          background: `linear-gradient(150deg, ${colors.midGreen}, ${colors.darkGreen})`,
          borderRadius: "28px",
          padding: "48px 40px",
          color: "#EAF1E6",
        }}
      >
        <div style={{ fontSize: "13px", letterSpacing: "0.1em", textTransform: "uppercase", color: "#9FC7AE", fontWeight: 600 }}>
          EPA environmental data explorer
        </div>
        <h1 style={{ fontFamily: fonts.heading, fontSize: "42px", fontWeight: 800, marginTop: "10px", color: "#FFFFFF", maxWidth: "26ch" }}>
          One place to see a facility's, a town's, or a state's environmental footprint.
        </h1>
        <p style={{ fontSize: "16px", color: "#B8CFBE", marginTop: "14px", maxWidth: "64ch" }}>
          Pulls live from EPA's TRI, RCRA, GHGRP, ECHO, ATTAINS, and USFWS data, plus Superfund and
          Brownfields site records — combined into the five tools below.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "18px", marginTop: "24px" }}>
        {SECTIONS.map((section) => (
          <Link
            key={section.to}
            to={section.to}
            style={{
              display: "block",
              background: colors.cardBackground,
              border: `1px solid ${colors.cardBorder}`,
              borderRadius: "20px",
              padding: "24px 22px",
              textDecoration: "none",
              color: colors.bodyText,
            }}
          >
            <div style={{ fontFamily: fonts.heading, fontWeight: 700, fontSize: "19px", color: colors.darkGreen }}>
              {section.title}
            </div>
            <p style={{ fontSize: "14px", color: colors.mutedText, marginTop: "8px", lineHeight: "1.5" }}>
              {section.description}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default LandingPageNew;
