import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Documents from "./pages/Documents";
import DocumentView from "./pages/DocumentView";
import LandingPage from "./pages/LandingPage";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import BatchResultView from "./pages/BatchResultView";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/documents" element={<Documents />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/documents/:id" element={<DocumentView />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/batch-result" element={<BatchResultView />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
