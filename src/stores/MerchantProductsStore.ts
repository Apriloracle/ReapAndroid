import { createStore } from 'tinybase';
import { createLocalPersister } from 'tinybase/persisters/persister-browser';

const CACHE_EXPIRATION_TIME = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

class MerchantProductsStore {
  private store = createStore();
  private persister = createLocalPersister(this.store, 'merchant-products');

  async initialize() {
    await this.persister.load();
  }

  private isCacheValid(merchantName: string): boolean {
    const metadata = this.store.getTable(`merchant-meta-${merchantName}`);
    if (!metadata?.info?.lastFetched) return false;
    
    const lastFetched = parseInt(metadata.info.lastFetched as string);
    return Date.now() - lastFetched < CACHE_EXPIRATION_TIME;
  }

  async getProducts(merchantName: string, forceRefresh = false): Promise<any[]> {
    // Check cache first
    if (!forceRefresh && this.isCacheValid(merchantName)) {
      const cachedProducts = this.store.getTable(`products-${merchantName}`);
      if (cachedProducts) {
        return Object.values(cachedProducts);
      }
    }

    // Fetch from API if cache is invalid or forced refresh
    try {
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

      // Store metadata with timestamp
      this.store.setTable(`merchant-meta-${merchantName}`, {
        info: {
          lastFetched: Date.now().toString(),
          product_count: data.product_count,
          search_type: data.search_type
        }
      });

      // Store products
      const productsTable: Record<string, any> = {};
      data.products.forEach((product: any) => {
        productsTable[product.asin] = product;
      });

      this.store.setTable(`products-${merchantName}`, productsTable);
      await this.persister.save();

      return data.products;
    } catch (error) {
      console.error(`Error fetching products for ${merchantName}:`, error);
      // Return cached data as fallback if available
      const cachedProducts = this.store.getTable(`products-${merchantName}`);
      return cachedProducts ? Object.values(cachedProducts) : [];
    }
  }
}

export const merchantProductsStore = new MerchantProductsStore(); 