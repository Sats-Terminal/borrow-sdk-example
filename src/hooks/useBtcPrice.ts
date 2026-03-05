import { useState, useEffect } from 'react';

const COINGECKO_URL = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd';
const REFETCH_INTERVAL = 30000; // 30 seconds

export function useBtcPrice(): number | null {
  const [btcPrice, setBtcPrice] = useState<number | null>(null);

  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const res = await fetch(COINGECKO_URL);
        const data = await res.json();
        const price = data?.bitcoin?.usd;
        if (typeof price === 'number') {
          setBtcPrice(price);
        }
      } catch (err) {
        // Keep last known price on error
        console.error('[useBtcPrice] Failed to fetch BTC price:', err);
      }
    };

    fetchPrice();
    const interval = setInterval(fetchPrice, REFETCH_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  return btcPrice;
}
