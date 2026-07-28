import { Routes, Route } from "react-router-dom";
import NavBar from "./components/NavBar";
import SearchPage from "./pages/SearchPage";
import FacilityDetailPage from "./pages/FacilityDetailPage";
import HazardWatchPage from "./pages/HazardWatchPage";
import SiteSearchPage from "./pages/SiteSearchPage";
import FacilityDetailPageNew from "./newDesign/FacilityDetailPageNew";
import SiteSearchPageNew from "./newDesign/SiteSearchPageNew";
import SearchPageNew from "./newDesign/SearchPageNew";
import { useDesignTheme } from "./newDesign/DesignThemeContext";

function FacilityDetailRoute() {
  const { theme } = useDesignTheme();
  return theme === "new" ? <FacilityDetailPageNew /> : <FacilityDetailPage />;
}

function SiteSearchRoute() {
  const { theme } = useDesignTheme();
  return theme === "new" ? <SiteSearchPageNew /> : <SiteSearchPage />;
}

function SearchRoute() {
  const { theme } = useDesignTheme();
  return theme === "new" ? <SearchPageNew /> : <SearchPage />;
}

function App() {
  return (
    <>
      <NavBar />
      <div className="container">
        <Routes>
          <Route path="/" element={<SearchRoute />} />
          <Route path="/facility/:id" element={<FacilityDetailRoute />} />
          <Route path="/hazard-watch" element={<HazardWatchPage />} />
          <Route path="/site-search" element={<SiteSearchRoute />} />
        </Routes>
      </div>
    </>
  );
}

export default App;
