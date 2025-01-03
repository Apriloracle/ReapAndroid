import React, { useState } from 'react';

interface Product {
  asin: string;
  title: string;
  brand: string;
  image: string;
  price: string;
  url: string;
}

const AmazonProductsComponent: React.FC = () => {
  const [keywords, setKeywords] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryTimeLeft, setRetryTimeLeft] = useState<number>(0);

  const startRetryCountdown = (retryAfter: number) => {
    setRetryTimeLeft(Math.ceil(retryAfter / 1000));
    
    const timer = setInterval(() => {
      setRetryTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return new Promise(resolve => setTimeout(resolve, retryAfter));
  };

  const searchProducts = async () => {
    if (!keywords.trim()) {
      setError('Please enter search keywords');
      return;
    }

    if (retryTimeLeft > 0) {
      setError(`Please wait ${retryTimeLeft} seconds before retrying`);
      return;
    }

    setIsLoading(true);
    setError(null);

    const makeRequest = async (retryCount = 0) => {
      try {
        const response = await fetch(
          `https://us-central1-fourth-buffer-421320.cloudfunctions.net/amazonSearchapi?keywords=${encodeURIComponent(keywords)}`
        );

        const data = await response.json();

        if (data.success && data.data.items) {
          setProducts(data.data.items);
          return true;
        }

        if (response.status === 429 && retryCount < 3) {
          const retryAfter = data.error.retryAfter || 5000;
          setError(`Rate limited. Retrying in ${Math.ceil(retryAfter/10000)} seconds...`);
          await startRetryCountdown(retryAfter);
          return makeRequest(retryCount + 1);
        }

        setError(data.error?.message || 'No results found');
        return false;
      } catch (err) {
        setError('Failed to fetch products. Please try again.');
        console.error('Error fetching products:', err);
        return false;
      }
    };

    try {
      await makeRequest();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ padding: '1rem' }}>
      <div style={{ marginBottom: '1rem' }}>
        <input
          type="text"
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && retryTimeLeft === 0 && searchProducts()}
          placeholder="Search Amazon products..."
          disabled={isLoading || retryTimeLeft > 0}
          style={{
            padding: '0.5rem',
            marginRight: '0.5rem',
            borderRadius: '4px',
            border: '1px solid #ccc',
            width: '200px',
            opacity: (isLoading || retryTimeLeft > 0) ? 0.7 : 1
          }}
        />
        <button
          onClick={searchProducts}
          disabled={isLoading || retryTimeLeft > 0}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#f05e23',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: (isLoading || retryTimeLeft > 0) ? 'not-allowed' : 'pointer',
            opacity: (isLoading || retryTimeLeft > 0) ? 0.7 : 1
          }}
        >
          {isLoading ? 'Searching...' : 
           retryTimeLeft > 0 ? `Wait ${retryTimeLeft}s` : 
           'Search'}
        </button>
      </div>

      {error && (
        <p style={{ color: 'red', marginBottom: '1rem' }}>{error}</p>
      )}

      <div>
        {products.map((product) => (
          <div
            key={product.asin}
            style={{
              marginBottom: '1rem',
              backgroundColor: '#1A202C',
              borderRadius: '8px',
              padding: '1rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ marginRight: '1rem' }}>
                <img
                  src={product.image}
                  alt={product.title}
                  style={{
                    maxWidth: '100px',
                    height: 'auto'
                  }}
                />
              </div>
              <div>
                <h3 style={{ color: '#f05e23', marginBottom: '0.5rem' }}>
                  {product.title}
                </h3>
                <p style={{ color: '#A0AEC0', marginBottom: '0.25rem' }}>
                  Brand: {product.brand || 'N/A'}
                </p>
                <p style={{ color: '#A0AEC0', marginBottom: '0.5rem' }}>
                  Price: {product.price || 'N/A'}
                </p>
                <a
                  href={product.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: '#f05e23',
                    textDecoration: 'none'
                  }}
                >
                  View on Amazon
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AmazonProductsComponent;