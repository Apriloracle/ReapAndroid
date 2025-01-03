import React from 'react';
import AmazonProductsComponent from '../components/AmazonProductsComponent';

const ProductsPage: React.FC = () => {
  return (
    <div>
      <h2 style={{ 
        color: '#f05e23', 
        padding: '1rem',
        marginBottom: '1rem'
      }}>
        Amazon Products
      </h2>
      <AmazonProductsComponent />
    </div>
  );
};

export default ProductsPage; 