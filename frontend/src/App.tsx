import { Routes, Route } from "react-router-dom";
import NavBar from "./components/NavBar";
import SearchPage from "./pages/SearchPage";
import FacilityDetailPage from "./pages/FacilityDetailPage";
import HazardWatchPage from "./pages/HazardWatchPage";
import SiteSearchPage from "./pages/SiteSearchPage";
import FacilityDetailPageNew from "./newDesign/FacilityDetailPageNew";
import { useDesignTheme } from "./newDesign/DesignThemeContext";

function FacilityDetailRoute() {
  const { theme } = useDesignTheme();
  return theme === "new" ? <FacilityDetailPageNew /> : <FacilityDetailPage />;
}

function App() {
  return (
    <>
      <NavBar />
      <div className="container">
        <Routes>
          <Route path="/" element={<SearchPage />} />
          <Route path="/facility/:id" element={<FacilityDetailRoute />} />
          <Route path="/hazard-watch" element={<HazardWatchPage />} />
          <Route path="/site-search" element={<SiteSearchPage />} />
        </Routes>
      </div>
    </>
  );
}

export default App;
