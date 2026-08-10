import type { ReactNode } from "react";
import { Routes, Route } from "react-router-dom";
import NavBar from "./components/NavBar";
import SearchPage from "./pages/SearchPage";
import FacilityDetailPage from "./pages/FacilityDetailPage";
import HazardWatchPage from "./pages/HazardWatchPage";
import SiteSearchPage from "./pages/SiteSearchPage";
import EmissionsCenterPage from "./pages/EmissionsCenterPage";
import FacilityDetailPageNew from "./newDesign/FacilityDetailPageNew";
import SiteSearchPageNew from "./newDesign/SiteSearchPageNew";
import SearchPageNew from "./newDesign/SearchPageNew";
import HazardWatchPageNew from "./newDesign/HazardWatchPageNew";
import EmissionsCenterPageNew from "./newDesign/EmissionsCenterPageNew";
import StateOverviewPageNew from "./newDesign/StateOverviewPageNew";
import { useDesignTheme } from "./newDesign/DesignThemeContext";

// New Design pages set their own full-viewport background/padding, so they
// render full-bleed; Classic pages rely on Bootstrap's container for margins
// and max-width, so only they get wrapped.
function ClassicContainer({ children }: { children: ReactNode }) {
  return <div className="container">{children}</div>;
}

function FacilityDetailRoute() {
  const { theme } = useDesignTheme();
  return theme === "new" ? (
    <FacilityDetailPageNew />
  ) : (
    <ClassicContainer>
      <FacilityDetailPage />
    </ClassicContainer>
  );
}

function SiteSearchRoute() {
  const { theme } = useDesignTheme();
  return theme === "new" ? (
    <SiteSearchPageNew />
  ) : (
    <ClassicContainer>
      <SiteSearchPage />
    </ClassicContainer>
  );
}

function SearchRoute() {
  const { theme } = useDesignTheme();
  return theme === "new" ? (
    <SearchPageNew />
  ) : (
    <ClassicContainer>
      <SearchPage />
    </ClassicContainer>
  );
}

function HazardWatchRoute() {
  const { theme } = useDesignTheme();
  return theme === "new" ? (
    <HazardWatchPageNew />
  ) : (
    <ClassicContainer>
      <HazardWatchPage />
    </ClassicContainer>
  );
}

function EmissionsCenterRoute() {
  const { theme } = useDesignTheme();
  return theme === "new" ? (
    <EmissionsCenterPageNew />
  ) : (
    <ClassicContainer>
      <EmissionsCenterPage />
    </ClassicContainer>
  );
}

function App() {
  return (
    <>
      <NavBar />
      <Routes>
        <Route path="/" element={<SearchRoute />} />
        <Route path="/facility/:id" element={<FacilityDetailRoute />} />
        <Route path="/hazard-watch" element={<HazardWatchRoute />} />
        <Route path="/site-search" element={<SiteSearchRoute />} />
        <Route path="/emissions-center" element={<EmissionsCenterRoute />} />
        <Route path="/state-overview" element={<StateOverviewPageNew />} />
      </Routes>
    </>
  );
}

export default App;
