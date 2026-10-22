import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Star,
  MessageSquare,
  ChevronDown,
  ShieldCheck,
  Image as ImageIcon
} from 'lucide-react';
import { useReviews } from '../context/ReviewsContext';
import { useAuth } from '../context/AuthContext';
import { useProducts } from '../context/ProductsContext';

const REVIEWS_PER_PAGE = 5;

// Reusable star rating display
const StarRating = ({ rating, size = 14, showValue = false }) => (
  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
    {[1, 2, 3, 4, 5].map(star => (
      <Star
        key={star}
        size={size}
        fill={star <= rating ? 'var(--accent-burgundy)' : 'none'}
        color={star <= rating ? 'var(--accent-burgundy)' : 'var(--border-color)'}
        strokeWidth={1.5}
      />
    ))}
    {showValue && (
      <span style={{ marginLeft: '4px', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
        {rating.toFixed(1)}
      </span>
    )}
  </div>
);

// Interactive star rating for review form
const StarInput = ({ value, onChange }) => {
  const [hoverValue, setHoverValue] = useState(0);

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHoverValue(star)}
          onMouseLeave={() => setHoverValue(0)}
          style={{
            background: 'none',
            border: 'none',
            padding: '2px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center'
          }}
          aria-label={`Rate ${star} star${star !== 1 ? 's' : ''}`}
        >
          <Star
            size={24}
            fill={star <= (hoverValue || value) ? 'var(--accent-burgundy)' : 'none'}
            color={star <= (hoverValue || value) ? 'var(--accent-burgundy)' : 'var(--border-color)'}
            strokeWidth={1.5}
          />
        </button>
      ))}
      {value > 0 && (
        <span style={{ marginLeft: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
          {value} star{value !== 1 ? 's' : ''}
        </span>
      )}
    </div>
  );
};

// Rating breakdown bar
const RatingBar = ({ starLevel, count, total }) => {
  const percentage = total > 0 ? (count / total) * 100 : 0;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
      <span style={{ width: '42px', textAlign: 'right', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
        {starLevel} star{starLevel !== 1 ? 's' : ''}
      </span>
      <div
        style={{
          flex: 1,
          height: '8px',
          backgroundColor: 'var(--surface-secondary)',
          borderRadius: '4px',
          overflow: 'hidden',
          minWidth: '80px'
        }}
      >
        <div
          style={{
            width: `${percentage}%`,
            height: '100%',
            backgroundColor: 'var(--accent-burgundy)',
            borderRadius: '4px',
            transition: 'width 300ms ease'
          }}
        />
      </div>
      <span style={{ width: '28px', textAlign: 'right', color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
        {count}
      </span>
    </div>
  );
};

// Format review date
const formatReviewDate = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) !== 1 ? 's' : ''} ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) !== 1 ? 's' : ''} ago`;

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

export const SellerReviews = ({ sellerId, seller }) => {
  const { getReviewsBySeller, getSellerRating, submitReview } = useReviews();
  const { user, isAuthenticated } = useAuth();
  const { products } = useProducts();

  const [sortBy, setSortBy] = useState('recent');
  const [visibleCount, setVisibleCount] = useState(REVIEWS_PER_PAGE);
  const [showReviewForm, setShowReviewForm] = useState(false);

  // Review form state
  const [formRating, setFormRating] = useState(0);
  const [formText, setFormText] = useState('');
  const [formProductId, setFormProductId] = useState('');
  const [formError, setFormError] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);

  const ratingData = getSellerRating(sellerId);
  const allReviews = getReviewsBySeller(sellerId);

  // Seller's products for the review form product selector
  const sellerProducts = useMemo(() => {
    return products.filter(p => p.sellerId === sellerId && p.inStock !== false);
  }, [products, sellerId]);

  // Sort reviews
  const sortedReviews = useMemo(() => {
    const sorted = [...allReviews];
    switch (sortBy) {
      case 'recent':
        return sorted.sort((a, b) => new Date(b.date) - new Date(a.date));
      case 'highest':
        return sorted.sort((a, b) => b.rating - a.rating || new Date(b.date) - new Date(a.date));
      case 'lowest':
        return sorted.sort((a, b) => a.rating - b.rating || new Date(b.date) - new Date(a.date));
      default:
        return sorted;
    }
  }, [allReviews, sortBy]);

  const visibleReviews = sortedReviews.slice(0, visibleCount);
  const hasMore = visibleCount < sortedReviews.length;

  const handleLoadMore = () => {
    setVisibleCount(prev => prev + REVIEWS_PER_PAGE);
  };

  const handleSubmitReview = (e) => {
    e.preventDefault();
    setFormError('');
    setFormSubmitting(true);

    const selectedProduct = products.find(p => p.id === formProductId);

    const result = submitReview({
      sellerId,
      productId: formProductId || `general-${sellerId}`,
      productName: selectedProduct?.name || 'General Review',
      productImage: selectedProduct?.image || null,
      rating: formRating,
      text: formText
    });

    setFormSubmitting(false);

    if (result.success) {
      setFormRating(0);
      setFormText('');
      setFormProductId('');
      setShowReviewForm(false);
    } else {
      setFormError(result.error);
    }
  };

  return (
    <div>
      {/* Reviews Header with Summary */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'auto 1fr',
        gap: 'clamp(24px, 4vw, 48px)',
        marginBottom: '32px',
        alignItems: 'start'
      }}>
        {/* Overall Rating */}
        <div style={{
          textAlign: 'center',
          padding: '24px',
          backgroundColor: '#FFFFFF',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-xs)',
          minWidth: '160px'
        }}>
          <div style={{
            fontSize: '3rem',
            fontWeight: 700,
            color: 'var(--text-primary)',
            lineHeight: 1,
            marginBottom: '8px',
            fontFamily: 'var(--font-sans)'
          }}>
            {ratingData.count > 0 ? ratingData.average : '—'}
          </div>
          <StarRating rating={Math.round(ratingData.average)} size={16} />
          <div style={{
            fontSize: '12px',
            color: 'var(--text-secondary)',
            marginTop: '6px'
          }}>
            {ratingData.count > 0
              ? `${ratingData.count} review${ratingData.count !== 1 ? 's' : ''}`
              : 'No reviews yet'
            }
          </div>
        </div>

        {/* Rating Breakdown + Sort */}
        <div>
          {/* Rating Bars */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            maxWidth: '360px',
            marginBottom: '20px'
          }}>
            {[5, 4, 3, 2, 1].map(star => (
              <RatingBar
                key={star}
                starLevel={star}
                count={ratingData.breakdown[star]}
                total={ratingData.count}
              />
            ))}
          </div>

          {/* Sort + Write Review Controls */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap'
          }}>
            <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
              <label
                htmlFor="review-sort"
                style={{ fontSize: '12px', color: 'var(--text-secondary)', marginRight: '8px' }}
              >
                Sort by:
              </label>
              <select
                id="review-sort"
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  setVisibleCount(REVIEWS_PER_PAGE);
                }}
                className="form-select"
                style={{
                  height: '34px',
                  width: 'auto',
                  minWidth: '140px',
                  fontSize: '12px',
                  paddingRight: '28px'
                }}
              >
                <option value="recent">Most Recent</option>
                <option value="highest">Highest Rated</option>
                <option value="lowest">Lowest Rated</option>
              </select>
            </div>

            {isAuthenticated && (
              <button
                onClick={() => setShowReviewForm(!showReviewForm)}
                className="btn btn-secondary btn-sm"
                style={{ gap: '6px' }}
              >
                <MessageSquare size={14} />
                <span>{showReviewForm ? 'Cancel' : 'Write a Review'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Review Submission Form */}
      {showReviewForm && isAuthenticated && (
        <div style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-xs)',
          padding: '24px',
          marginBottom: '28px',
          maxWidth: '640px'
        }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '16px' }}>Write a Review for {seller.name}</h3>

          <form onSubmit={handleSubmitReview}>
            {/* Product Selector */}
            {sellerProducts.length > 0 && (
              <div className="form-group">
                <label className="form-label">Product (optional)</label>
                <select
                  value={formProductId}
                  onChange={(e) => setFormProductId(e.target.value)}
                  className="form-select"
                >
                  <option value="">General shop review</option>
                  {sellerProducts.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Star Rating */}
            <div className="form-group">
              <label className="form-label">Your Rating</label>
              <StarInput value={formRating} onChange={setFormRating} />
            </div>

            {/* Review Text */}
            <div className="form-group">
              <label className="form-label">Your Review</label>
              <textarea
                value={formText}
                onChange={(e) => setFormText(e.target.value)}
                placeholder="Share your experience with this seller..."
                className="form-textarea"
                style={{ minHeight: '100px' }}
                maxLength={2000}
              />
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                {formText.length}/2000 characters
              </span>
            </div>

            {formError && (
              <div className="form-error" style={{ marginBottom: '12px' }}>
                {formError}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              disabled={formSubmitting || formRating === 0}
              style={{ height: '40px' }}
            >
              {formSubmitting ? 'Submitting…' : 'Submit Review'}
            </button>
          </form>
        </div>
      )}

      {/* Not authenticated prompt */}
      {!isAuthenticated && (
        <div style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-xs)',
          padding: '16px 20px',
          marginBottom: '28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'wrap',
          fontSize: '13px',
          color: 'var(--text-secondary)'
        }}>
          <span>Sign in to write a review for this seller.</span>
          <Link to="/signin" className="btn btn-secondary btn-sm">
            Sign In
          </Link>
        </div>
      )}

      {/* Review List */}
      {sortedReviews.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '64px 24px',
          color: 'var(--text-secondary)'
        }}>
          <MessageSquare size={48} strokeWidth={1} style={{ marginBottom: '16px', opacity: 0.4 }} />
          <h3 style={{ marginBottom: '8px', color: 'var(--text-primary)' }}>No reviews yet</h3>
          <p style={{ fontSize: 'var(--text-sm)' }}>
            Be the first to share your experience with {seller.name}.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
          {visibleReviews.map((review, index) => (
            <div
              key={review.id}
              style={{
                padding: '24px 0',
                borderBottom: index < visibleReviews.length - 1 ? '1px solid var(--border-color)' : 'none'
              }}
            >
              {/* Reviewer Header */}
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: '12px',
                marginBottom: '10px',
                flexWrap: 'wrap'
              }}>
                <div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '4px'
                  }}>
                    {/* Reviewer avatar placeholder */}
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--surface-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: 'var(--text-secondary)',
                      flexShrink: 0
                    }}>
                      {review.reviewerName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <span style={{
                        fontSize: '13px',
                        fontWeight: 600,
                        color: 'var(--text-primary)'
                      }}>
                        {review.reviewerName}
                      </span>
                      {review.verifiedPurchase && (
                        <span style={{
                          marginLeft: '8px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          fontSize: '11px',
                          color: 'var(--badge-shipping-text)',
                          fontWeight: 500
                        }}>
                          <ShieldCheck size={11} />
                          Verified Purchase
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                  {formatReviewDate(review.date)}
                </span>
              </div>

              {/* Star Rating */}
              <div style={{ marginBottom: '10px' }}>
                <StarRating rating={review.rating} size={14} />
              </div>

              {/* Review Text */}
              <p style={{
                fontSize: 'var(--text-sm)',
                lineHeight: 1.7,
                color: 'var(--text-primary)',
                margin: '0 0 12px 0'
              }}>
                {review.text}
              </p>

              {/* Associated Product */}
              {review.productName && review.productName !== 'General Review' && (
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 12px',
                  backgroundColor: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-xs)',
                  fontSize: '12px'
                }}>
                  {review.productImage && (
                    <img
                      src={review.productImage}
                      alt={review.productName}
                      style={{
                        width: '36px',
                        height: '36px',
                        objectFit: 'cover',
                        borderRadius: 'var(--radius-xs)',
                        flexShrink: 0
                      }}
                    />
                  )}
                  <div>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>Purchased:</span>
                    {' '}
                    <Link
                      to={`/product/${review.productId}`}
                      className="hover-burgundy"
                      style={{
                        color: 'var(--text-primary)',
                        fontWeight: 500,
                        fontSize: '12px'
                      }}
                    >
                      {review.productName}
                    </Link>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Load More Button */}
          {hasMore && (
            <div style={{ textAlign: 'center', paddingTop: '24px' }}>
              <button
                onClick={handleLoadMore}
                className="btn btn-secondary"
                style={{ gap: '6px' }}
              >
                <ChevronDown size={16} />
                <span>Load More Reviews ({sortedReviews.length - visibleCount} remaining)</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
