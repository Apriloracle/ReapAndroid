import React from 'react';
import { Route, Routes } from 'react-router-dom';
import ProductsPage from './pages/ProductsPage';

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/products" element={<ProductsPage />} />
    </Routes>
  );
};

export default App; 