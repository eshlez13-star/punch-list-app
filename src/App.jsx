import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomeScreen from "./components/HomeScreen";
import ReportCreator from "./components/ReportCreator";

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#f5f7fa]">
        <Routes>
          <Route path="/" element={<HomeScreen />} />
          <Route path="/report/:id" element={<ReportCreator />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
