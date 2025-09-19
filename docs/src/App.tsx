import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { LandingPage } from './components/LandingPage';
import { DocumentationLayout } from './components/DocumentationLayout';
import { ThemeProvider } from './components/ThemeProvider';
import "./index.css";

export function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="ts-markdown-theme">
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/*" element={<DocumentationLayout />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
