import React, { createContext, useContext, useEffect, useState } from 'react';
import { createStore } from 'tinybase';
import { createLocalPersister } from 'tinybase/persisters/persister-browser';

interface ProductContextType {
  amazonProductStore: any;
  merchantProducts: Record<string, any>;
  fetchMerchantProducts: (merchantName: string) => Promise<void>;
  isLoading: boolean;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

export const ProductProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [amazonProductStore] = useState(() => createStore());
  const [merchantProducts, setMerchantProducts] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const initializeStore = async () => {
      // Initialize persister for the store
      const persister = createLocalPersister(amazonProductStore, 'amazon-products-global');
      await persister.load();
    };

    initializeStore();
  }, [amazonProductStore]);

  const fetchMerchantProducts = async (merchantName: string) => {
    try {
      setIsLoading(true);
      
      // Check if we already have the data in the store
      const existingProducts = amazonProductStore.getTable(`products-${merchantName}`);
      if (existingProducts) {
        setMerchantProducts(prev => ({
          ...prev,
          [merchantName]: Object.values(existingProducts)
        }));
        return;
      }

      const response = await fetch(
        `https://asia-southeast1-fourth-buffer-421320.cloudfunctions.net/getProductsByMerchant?merchantName=${merchantName}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch merchant products');
      }

      const data = await response.json();

      // Store merchant metadata
      amazonProductStore.setTable(`merchant-meta-${merchantName}`, {
        info: {
          product_count: data.product_count,
          search_type: data.search_type
        }
      });

      // Store products
      const productsTable: Record<string, Record<string, any>> = {};
      data.products.forEach((product: any) => {
        productsTable[product.asin] = {
          title: product.title,
          image_url: product.image_url,
          product_url: product.product_url,
          stars: product.stars,
          reviews: product.reviews,
          price: product.price,
          list_price: product.list_price,
          category_id: product.category_id,
          is_bestseller: product.is_bestseller,
          bought_in_last_month: product.bought_in_last_month
        };
      });

      amazonProductStore.setTable(`products-${merchantName}`, productsTable);

      setMerchantProducts(prev => ({
        ...prev,
        [merchantName]: data.products
      }));

    } catch (error) {
      console.error(`Error fetching products for ${merchantName}:`, error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ProductContext.Provider 
      value={{ 
        amazonProductStore, 
        merchantProducts, 
        fetchMerchantProducts,
        isLoading 
      }}
    >
      {children}
    </ProductContext.Provider>
  );
};

export const useProducts = () => {
  const context = useContext(ProductContext);
  if (context === undefined) {
    throw new Error('useProducts must be used within a ProductProvider');
  }
  return context;
}; 