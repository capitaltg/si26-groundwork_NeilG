import { Routes, Route } from "react-router-dom";
import NavBar from "./components/NavBar";
import LandingPageNew from "./newDesign/LandingPageNew";
import FacilityDetailPageNew from "./newDesign/FacilityDetailPageNew";
import SiteSearchPageNew from "./newDesign/SiteSearchPageNew";
import SearchPageNew from "./newDesign/SearchPageNew";
import HazardWatchPageNew from "./newDesign/HazardWatchPageNew";
import EmissionsCenterPageNew from "./newDesign/EmissionsCenterPageNew";
import StateOverviewPageNew from "./newDesign/StateOverviewPageNew";

function App() {
  return (
    <>
      <NavBar />
      <Routes>
        <Route path="/" element={<LandingPageNew />} />
        <Route path="/search" element={<SearchPageNew />} />
        <Route path="/facility/:id" element={<FacilityDetailPageNew />} />
        <Route path="/hazard-watch" element={<HazardWatchPageNew />} />
        <Route path="/site-search" element={<SiteSearchPageNew />} />
        <Route path="/emissions-center" element={<EmissionsCenterPageNew />} />
        <Route path="/state-overview" element={<StateOverviewPageNew />} />
      </Routes>
    </>
  );
}

export default App;
