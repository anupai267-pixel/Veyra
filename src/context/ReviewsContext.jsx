import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

const ReviewsContext = createContext(null);
const REVIEWS_STORAGE_KEY = 'veyra_reviews';

export const ReviewsProvider = ({ children }) => {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [reviews, setReviews] = useState(() => {
    try {
      const saved = localStorage.getItem(REVIEWS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // Persist reviews to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(REVIEWS_STORAGE_KEY, JSON.stringify(reviews));
    } catch (e) {
      console.warn('Failed to save reviews to localStorage', e);
    }
  }, [reviews]);

  // Get all reviews for a specific seller
  const getReviewsBySeller = (sellerId) => {
    return reviews.filter(r => r.sellerId === sellerId);
  };

  // Get all reviews for a specific product
  const getReviewsByProduct = (productId) => {
    return reviews.filter(r => r.productId === productId);
  };

  // Calculate average rating for a seller
  const getSellerRating = (sellerId) => {
    const sellerReviews = getReviewsBySeller(sellerId);
    if (sellerReviews.length === 0) return { average: 0, count: 0, breakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } };

    const total = sellerReviews.reduce((sum, r) => sum + r.rating, 0);
    const average = total / sellerReviews.length;

    const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    sellerReviews.forEach(r => {
      breakdown[r.rating] = (breakdown[r.rating] || 0) + 1;
    });

    return {
      average: Math.round(average * 10) / 10,
      count: sellerReviews.length,
      breakdown
    };
  };

  // Check if a user has already reviewed a specific product/transaction
  const hasUserReviewedProduct = (userId, productId) => {
    return reviews.some(r => r.reviewerId === userId && r.productId === productId);
  };

  // Check purchase eligibility (simplified — in a real app this would check order/transaction records)
  // For this implementation we check if user has a completed purchase record in localStorage
  const isEligibleToReview = (userId, productId, sellerId) => {
    if (!userId || !productId || !sellerId) return false;

    // Check if already reviewed
    if (hasUserReviewedProduct(userId, productId)) return false;

    // Check completed purchases (from cart checkout records stored in localStorage)
    try {
      const purchases = JSON.parse(localStorage.getItem('veyra_completed_purchases') || '[]');
      return purchases.some(p =>
        p.userId === userId &&
        p.productId === productId &&
        p.status === 'completed'
      );
    } catch (e) {
      return false;
    }
  };

  // Submit a new review (server-validated in a real app; here we validate on the client)
  const submitReview = ({ sellerId, productId, productName, productImage, rating, text }) => {
    if (!user) {
      addToast('You must be signed in to leave a review.');
      return { success: false, error: 'Authentication required.' };
    }

    if (!sellerId || !productId) {
      return { success: false, error: 'Missing seller or product information.' };
    }

    if (!rating || rating < 1 || rating > 5) {
      return { success: false, error: 'Please select a rating between 1 and 5 stars.' };
    }

    if (!text || text.trim().length < 10) {
      return { success: false, error: 'Review must be at least 10 characters long.' };
    }

    if (text.trim().length > 2000) {
      return { success: false, error: 'Review must not exceed 2000 characters.' };
    }

    // Check for duplicate review
    if (hasUserReviewedProduct(user.id, productId)) {
      return { success: false, error: 'You have already reviewed this product.' };
    }

    const newReview = {
      id: 'rev-' + Date.now(),
      sellerId,
      productId,
      productName: productName || 'Product',
      productImage: productImage || null,
      reviewerId: user.id,
      reviewerName: user.name || 'Anonymous',
      rating: Math.round(rating),
      text: text.trim(),
      date: new Date().toISOString(),
      verifiedPurchase: isEligibleToReview(user.id, productId, sellerId)
    };

    setReviews(prev => [newReview, ...prev]);
    addToast('Your review has been submitted successfully.');
    return { success: true, review: newReview };
  };

  return (
    <ReviewsContext.Provider
      value={{
        reviews,
        getReviewsBySeller,
        getReviewsByProduct,
        getSellerRating,
        hasUserReviewedProduct,
        isEligibleToReview,
        submitReview
      }}
    >
      {children}
    </ReviewsContext.Provider>
  );
};

export const useReviews = () => {
  const context = useContext(ReviewsContext);
  if (!context) {
    throw new Error('useReviews must be used within a ReviewsProvider');
  }
  return context;
};
