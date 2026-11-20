import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import RequireAuth from './components/RequireAuth';
import Closet from './pages/Closet';
import ItemDetails from './pages/ItemDetails';
import Login from './pages/Login';
import Onboarding from './pages/Onboarding';
import Recommendations from './pages/Recommendations';
import Shopping from './pages/Shopping';
import { AuthProvider } from './lib/AuthContext';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            element={
              <RequireAuth>
                <Layout />
              </RequireAuth>
            }
          >
            <Route path="/" element={<Navigate to="/onboarding" replace />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/closet" element={<Closet />} />
            <Route path="/closet/:id" element={<ItemDetails />} />
            <Route path="/recommendations" element={<Recommendations />} />
            <Route path="/shopping" element={<Shopping />} />
            <Route path="*" element={<Navigate to="/onboarding" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>,
);
