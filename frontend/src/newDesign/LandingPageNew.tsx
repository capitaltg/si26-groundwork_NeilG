import { Link } from "react-router-dom";
import { colors, fonts } from "./theme";

const SECTIONS = [
  {
    to: "/search",
    icon: "/landing-icons/Search.png",
    title: "Search",
    description: "Browse EPA TRI-registered facilities by state and drill into any one's full release and compliance history.",
  },
  {
    to: "/hazard-watch",
    icon: "/landing-icons/hazardWatch.png",
    title: "Hazard Watch",
    description: "The worst PBT and hazardous chemical releases in a state, ranked worst-first.",
  },
  {
    to: "/site-search",
    icon: "/landing-icons/siteSearch.png",
    title: "Site Search",
    description: "Every EPA-regulated facility near an address or across a state — TRI, RCRA, Clean Air & Water, Superfund, Brownfields — plus nearby impaired water bodies and critical habitat.",
  },
  {
    to: "/emissions-center",
    icon: "/landing-icons/EmissionsCenter.png",
    title: "Emissions Center",
    description: "Greenhouse gas emissions leaderboard by state, with per-facility multi-year trends and automatic flagging of substantial increases.",
  },
  {
    to: "/state-overview",
    icon: "/landing-icons/StateOverview.png",
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
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "32px",
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: "1 1 380px" }}>
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
        <div style={{ width: "160px", height: "160px", borderRadius: "99px", overflow: "hidden", flexShrink: 0 }}>
          <img
            src="/LOGO.png"
            alt=""
            style={{ display: "block", width: "100%", height: "100%", objectFit: "cover" }}
            onError={(e) => {
              (e.currentTarget.parentElement as HTMLElement).style.display = "none";
            }}
          />
        </div>
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
            <img
              src={section.icon}
              alt=""
              width={96}
              height={96}
              style={{ display: "block", marginBottom: "18px" }}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
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
