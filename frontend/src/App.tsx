import { Routes, Route } from "react-router-dom";
import NavBar from "./components/NavBar";
import SearchPage from "./pages/SearchPage";
import FacilityDetailPage from "./pages/FacilityDetailPage";
import HazardWatchPage from "./pages/HazardWatchPage";
import SiteSearchPage from "./pages/SiteSearchPage";
import EmissionsCenterPage from "./pages/EmissionsCenterPage";

function App() {
  return (
    <>
      <NavBar />
      <div className="container">
        <Routes>
          <Route path="/" element={<SearchPage />} />
          <Route path="/facility/:id" element={<FacilityDetailPage />} />
          <Route path="/hazard-watch" element={<HazardWatchPage />} />
          <Route path="/site-search" element={<SiteSearchPage />} />
          <Route path="/emissions-center" element={<EmissionsCenterPage />} />
        </Routes>
      </div>
    </>
  );
}

export default App;
