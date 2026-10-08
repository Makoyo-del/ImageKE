import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabase';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://imageke-api.onrender.com';
const CACHE_KEY = 'dm_store_products_cache_v2';

export const INITIAL_PRODUCTS = {
  'debt-freedom-engine': {
    productId: 'debt-freedom-engine',
    name: 'The Debt Freedom Engine (Snowball & Avalanche OS)',
    tagline: 'Calculate your exact debt-free day in 2 minutes with interactive What-If extra payment math.',
    category: 'Personal Finance & Wealth',
    priceUsd: 1.99,
    priceKes: 250,
    previewImageUrl: '/previews/debt_preview.png',
    isBundle: false
  },
  'freelancer-pricing-os': {
    productId: 'freelancer-pricing-os',
    name: 'The Freelancer Minimum Profitable Rate & Proposal Sizer OS',
    tagline: 'Stop undercharging. Calculate your exact floor rate, target rate, and 30-second fixed project quotes.',
    category: 'Freelance Business & Operations',
    priceUsd: 2.50,
    priceKes: 300,
    previewImageUrl: '/previews/freelance_preview.png',
    isBundle: false
  },
  'complete-financial-os-bundle': {
    productId: 'complete-financial-os-bundle',
    name: 'The Complete Financial Freedom & Freelance OS Bundle',
    tagline: 'Get both Master spreadsheets, quickstart instruction guides, and instant Google Sheets cloud copies in one unified package.',
    category: 'Complete OS Bundles',
    priceUsd: 9.99,
    priceKes: 1299,
    previewImageUrl: 'https://aiyglunfwsolqsujyfsz.supabase.co/storage/v1/object/public/product-previews/bundle_preview.png',
    isBundle: true,
    bundledProductIds: ['debt-freedom-engine', 'freelancer-pricing-os']
  }
};

function getCachedProducts() {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && typeof parsed === 'object') {
        return { ...INITIAL_PRODUCTS, ...parsed };
      }
    }
  } catch (e) {
    console.warn('[useStoreProducts] Cache read failed:', e);
  }
  return INITIAL_PRODUCTS;
}

export function useStoreProducts() {
  const [productsMap, setProductsMap] = useState(getCachedProducts);
  const [isLoading, setIsLoading] = useState(false);

  const syncProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Try querying Supabase directly for zero-latency dynamic prices
      const { data, error } = await supabase
        .from('digital_products')
        .select('*')
        .eq('is_active', true);

      if (!error && data && data.length > 0) {
        const nextMap = { ...INITIAL_PRODUCTS };
        data.forEach((row) => {
          const key = row.product_id || row.id;
          nextMap[key] = {
            productId: row.product_id || key,
            dbId: row.id,
            name: row.name,
            tagline: row.tagline,
            description: row.description,
            category: row.category,
            priceUsd: Number(row.price_usd),
            priceKes: Number(row.price_kes),
            previewImageUrl: row.preview_image_url || INITIAL_PRODUCTS[key]?.previewImageUrl || '/previews/debt_preview.png',
            isBundle: Boolean(row.is_bundle),
            bundledProductIds: row.bundled_product_ids || [],
            totalSales: row.total_sales_count || 0
          };
        });

        setProductsMap(nextMap);
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(nextMap));
        } catch (_) {}
        return nextMap;
      }

      // 2. Fallback to API route if Supabase direct query returned empty
      const res = await axios.get(`${API_URL}/api/store/products`, { timeout: 3500 });
      if (res.data?.products && res.data.products.length > 0) {
        const nextMap = { ...INITIAL_PRODUCTS };
        res.data.products.forEach((p) => {
          nextMap[p.productId] = {
            ...INITIAL_PRODUCTS[p.productId],
            ...p,
            priceUsd: Number(p.priceUsd),
            priceKes: Number(p.priceKes)
          };
        });
        setProductsMap(nextMap);
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(nextMap));
        } catch (_) {}
        return nextMap;
      }
    } catch (err) {
      console.info('[useStoreProducts] Background sync used cached truth:', err.message);
    } finally {
      setIsLoading(false);
    }
    return productsMap;
  }, []);

  useEffect(() => {
    syncProducts();

    // Listen for manual price updates from dashboard in real time
    const handlePriceUpdate = (e) => {
      if (e.detail) {
        setProductsMap((prev) => {
          const targetKey = Object.keys(prev).find(
            k => k === e.detail.productId || prev[k]?.dbId === e.detail.productId || prev[k]?.productId === e.detail.productId
          ) || e.detail.productId;
          const current = prev[targetKey] || INITIAL_PRODUCTS[targetKey] || {};
          const updatedProd = {
            ...current,
            ...e.detail,
            productId: current.productId || targetKey,
            priceUsd: Number(e.detail.priceUsd ?? current.priceUsd),
            priceKes: Number(e.detail.priceKes ?? current.priceKes)
          };
          const updated = { ...prev, [targetKey]: updatedProd };
          try {
            localStorage.setItem(CACHE_KEY, JSON.stringify(updated));
          } catch (_) {}
          return updated;
        });
      } else {
        syncProducts();
      }
    };

    window.addEventListener('dm-products-updated', handlePriceUpdate);
    return () => window.removeEventListener('dm-products-updated', handlePriceUpdate);
  }, [syncProducts]);

  const productsList = Object.values(productsMap);
  const debtProduct = productsMap['debt-freedom-engine'] || INITIAL_PRODUCTS['debt-freedom-engine'];
  const freelancerProduct = productsMap['freelancer-pricing-os'] || INITIAL_PRODUCTS['freelancer-pricing-os'];
  const bundleProduct = productsMap['complete-financial-os-bundle'] || INITIAL_PRODUCTS['complete-financial-os-bundle'];

  const formatPrice = (prod, currency = 'USD') => {
    if (!prod) return currency === 'KES' ? 'KSh 0' : '$0.00';
    if (currency === 'KES') {
      return `KSh ${Number(prod.priceKes || 0).toLocaleString()}`;
    }
    return `$${Number(prod.priceUsd || 0).toFixed(2)}`;
  };

  return {
    productsMap,
    productsList,
    debtProduct,
    freelancerProduct,
    bundleProduct,
    formatPrice,
    syncProducts,
    isLoading
  };
}

export default useStoreProducts;
