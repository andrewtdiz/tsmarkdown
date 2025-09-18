import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { LandingPage } from './components/LandingPage';
import { DocumentationLayout } from './components/DocumentationLayout';
import "./index.css";

export function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/*" element={<DocumentationLayout />} />
      </Routes>
    </Router>
  );
}

export default App;
