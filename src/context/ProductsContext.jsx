import React, { createContext, useContext, useState, useEffect } from 'react';
import { PRODUCTS, CATEGORIES } from '../data/products';
import { useToast } from './ToastContext';

const ProductsContext = createContext(null);
const CUSTOM_PRODUCTS_KEY = 'veyra_custom_products';

export const ProductsProvider = ({ children }) => {
  const { addToast } = useToast();
  const [customProducts, setCustomProducts] = useState(() => {
    try {
      const saved = localStorage.getItem(CUSTOM_PRODUCTS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(CUSTOM_PRODUCTS_KEY, JSON.stringify(customProducts));
    } catch (e) {
      console.warn('Failed to save custom products to localStorage', e);
    }
  }, [customProducts]);

  const allProducts = [...customProducts, ...PRODUCTS];

  const addProduct = (productData) => {
    const newProduct = {
      ...productData,
      id: 'custom-' + Date.now(),
      rating: 5.0,
      featured: false,
      inStock: true,
      condition: productData.condition || 'Studio Mint Original',
      availability: 'In Stock — Studio Direct',
      listingStatus: 'pending',
      listedAt: new Date().toISOString(),
      images: productData.images && productData.images.length > 0
        ? productData.images
        : [productData.image]
    };
    setCustomProducts((prev) => [newProduct, ...prev]);
    addToast(`"${newProduct.name}" listed successfully in the catalog.`);
    return newProduct;
  };

  const getProductById = (id) => {
    return allProducts.find((p) => p.id === id || p.auctionId === id || p.upcomingId === id);
  };

  // Get all products listed by a specific user (by user.id as sellerId)
  const getMyProducts = (userId) => {
    if (!userId) return [];
    return customProducts.filter(p => p.sellerId === userId);
  };

  // Update the listing status of a custom product
  const updateProductStatus = (productId, status) => {
    setCustomProducts(prev =>
      prev.map(p => p.id === productId ? { ...p, listingStatus: status } : p)
    );
  };

  return (
    <ProductsContext.Provider
      value={{
        products: allProducts,
        categories: CATEGORIES,
        customProducts,
        addProduct,
        getProductById,
        getMyProducts,
        updateProductStatus
      }}
    >
      {children}
    </ProductsContext.Provider>
  );
};

export const useProducts = () => {
  const context = useContext(ProductsContext);
  if (!context) {
    throw new Error('useProducts must be used within a ProductsProvider');
  }
  return context;
};
