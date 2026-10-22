import React, { useState, useMemo } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import {
  Store,
  MapPin,
  Star,
  Calendar,
  ShieldCheck,
  ChevronRight,
  Package,
  MessageSquare,
  FileText
} from 'lucide-react';
import { useProducts } from '../context/ProductsContext';
import { useReviews } from '../context/ReviewsContext';
import { getSellerById } from '../data/sellers';
import { ProductCard } from '../components/ProductCard';
import { SellerReviews } from '../components/SellerReviews';

export const SellerShop = () => {
  const { sellerId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'items';

  const { products } = useProducts();
  const { getSellerRating } = useReviews();

  const seller = getSellerById(sellerId);

  // Get products belonging to this seller (only approved/public ones — exclude upcoming-only items)
  const sellerProducts = useMemo(() => {
    if (!seller) return [];
    return products.filter(p =>
      p.sellerId === sellerId &&
      p.inStock !== false
    );
  }, [products, sellerId, seller]);

  const ratingData = getSellerRating(sellerId);

  const handleTabChange = (tab) => {
    setSearchParams({ tab });
  };

  if (!seller) {
    return (
      <div className="container" style={{ paddingTop: '80px', paddingBottom: '80px', textAlign: 'center' }}>
        <h2>Shop not found</h2>
        <p style={{ marginTop: '12px', marginBottom: '24px' }}>
          The requested seller shop could not be located.
        </p>
        <Link to="/shop" className="btn btn-primary">
          Browse Marketplace
        </Link>
      </div>
    );
  }

  return (
    <div style={{ paddingTop: '28px', paddingBottom: '96px', backgroundColor: 'var(--bg-primary)' }}>
      <div className="container">
        {/* Breadcrumb */}
        <nav
          aria-label="Breadcrumb"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: 'var(--text-xs)',
            color: 'var(--text-secondary)',
            marginBottom: '28px',
            flexWrap: 'wrap'
          }}
        >
          <Link to="/" className="hover-burgundy">Home</Link>
          <ChevronRight size={12} />
          <Link to="/shop" className="hover-burgundy">Shop</Link>
          <ChevronRight size={12} />
          <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
            {seller.name}
          </span>
        </nav>

        {/* Seller Profile Header */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-xs)',
            padding: 'clamp(20px, 3vw, 32px)',
            marginBottom: '32px',
            display: 'flex',
            gap: 'clamp(16px, 3vw, 32px)',
            alignItems: 'flex-start',
            flexWrap: 'wrap'
          }}
        >
          {/* Seller Avatar */}
          <div
            style={{
              width: '88px',
              height: '88px',
              borderRadius: '50%',
              overflow: 'hidden',
              flexShrink: 0,
              backgroundColor: 'var(--surface-secondary)',
              border: '2px solid var(--border-color)'
            }}
          >
            <img
              src={seller.avatar}
              alt={seller.name}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
            />
          </div>

          {/* Seller Info */}
          <div style={{ flex: 1, minWidth: '240px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
              <h1
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: 'clamp(1.5rem, 2.5vw, 2rem)',
                  lineHeight: 1.2,
                  margin: 0
                }}
              >
                {seller.name}
              </h1>
              {seller.verified && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '2px 8px',
                    backgroundColor: 'var(--badge-shipping-bg)',
                    color: 'var(--badge-shipping-text)',
                    fontSize: '11px',
                    fontWeight: 600,
                    borderRadius: 'var(--radius-xs)',
                    letterSpacing: '0.03em'
                  }}
                >
                  <ShieldCheck size={12} />
                  Verified Seller
                </span>
              )}
            </div>

            <p style={{
              fontSize: 'var(--text-sm)',
              color: 'var(--text-secondary)',
              lineHeight: 1.6,
              marginBottom: '12px',
              maxWidth: '600px'
            }}>
              {seller.description}
            </p>

            {/* Seller Meta Info */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              flexWrap: 'wrap',
              fontSize: '12px',
              color: 'var(--text-secondary)'
            }}>
              {seller.location && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <MapPin size={13} />
                  {seller.location}
                </span>
              )}

              {seller.memberSince && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Calendar size={13} />
                  Member since {seller.memberSince}
                </span>
              )}

              {ratingData.count > 0 && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Star size={13} fill="var(--accent-burgundy)" color="var(--accent-burgundy)" />
                  <strong style={{ color: 'var(--text-primary)' }}>{ratingData.average}</strong>
                  <span>({ratingData.count} review{ratingData.count !== 1 ? 's' : ''})</span>
                </span>
              )}

              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Package size={13} />
                {sellerProducts.length} item{sellerProducts.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>

        {/* Shop Navigation Tabs */}
        <div
          style={{
            display: 'flex',
            gap: '0',
            borderBottom: '2px solid var(--border-color)',
            marginBottom: '32px'
          }}
        >
          {[
            { key: 'items', label: 'Items', icon: Package, count: sellerProducts.length },
            { key: 'reviews', label: 'Reviews', icon: MessageSquare, count: ratingData.count },
            { key: 'policies', label: 'Shop Policies', icon: FileText }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '12px 20px',
                fontSize: '13px',
                fontWeight: activeTab === tab.key ? 600 : 500,
                color: activeTab === tab.key ? 'var(--accent-burgundy)' : 'var(--text-secondary)',
                backgroundColor: 'transparent',
                border: 'none',
                borderBottom: activeTab === tab.key ? '2px solid var(--accent-burgundy)' : '2px solid transparent',
                marginBottom: '-2px',
                cursor: 'pointer',
                transition: 'color 150ms ease, border-color 150ms ease',
                letterSpacing: '0.02em'
              }}
            >
              <tab.icon size={15} />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  style={{
                    fontSize: '11px',
                    backgroundColor: activeTab === tab.key ? 'rgba(120, 59, 75, 0.1)' : 'var(--surface-secondary)',
                    color: activeTab === tab.key ? 'var(--accent-burgundy)' : 'var(--text-secondary)',
                    padding: '1px 6px',
                    borderRadius: 'var(--radius-xs)',
                    fontWeight: 600
                  }}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'items' && (
          <div>
            {sellerProducts.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '64px 24px',
                color: 'var(--text-secondary)'
              }}>
                <Store size={48} strokeWidth={1} style={{ marginBottom: '16px', opacity: 0.4 }} />
                <h3 style={{ marginBottom: '8px', color: 'var(--text-primary)' }}>No items listed</h3>
                <p style={{ fontSize: 'var(--text-sm)' }}>
                  This seller hasn't listed any items yet. Check back later.
                </p>
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))',
                  gap: '24px'
                }}
              >
                {sellerProducts.map(product => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'reviews' && (
          <SellerReviews sellerId={sellerId} seller={seller} />
        )}

        {activeTab === 'policies' && (
          <div>
            {seller.policies ? (
              <div style={{
                display: 'grid',
                gap: '20px',
                maxWidth: '720px'
              }}>
                {seller.policies.shipping && (
                  <div
                    style={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-xs)',
                      padding: '20px'
                    }}
                  >
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Package size={18} color="var(--accent-burgundy)" />
                      Shipping Policy
                    </h3>
                    <p style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7, color: 'var(--text-secondary)', margin: 0 }}>
                      {seller.policies.shipping}
                    </p>
                  </div>
                )}

                {seller.policies.returns && (
                  <div
                    style={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-xs)',
                      padding: '20px'
                    }}
                  >
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FileText size={18} color="var(--accent-burgundy)" />
                      Returns & Exchanges
                    </h3>
                    <p style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7, color: 'var(--text-secondary)', margin: 0 }}>
                      {seller.policies.returns}
                    </p>
                  </div>
                )}

                {seller.policies.payment && (
                  <div
                    style={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-xs)',
                      padding: '20px'
                    }}
                  >
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <ShieldCheck size={18} color="var(--accent-burgundy)" />
                      Payment Methods
                    </h3>
                    <p style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7, color: 'var(--text-secondary)', margin: 0 }}>
                      {seller.policies.payment}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div style={{
                textAlign: 'center',
                padding: '64px 24px',
                color: 'var(--text-secondary)'
              }}>
                <FileText size={48} strokeWidth={1} style={{ marginBottom: '16px', opacity: 0.4 }} />
                <h3 style={{ marginBottom: '8px', color: 'var(--text-primary)' }}>No policies available</h3>
                <p style={{ fontSize: 'var(--text-sm)' }}>
                  This seller hasn't published shop policies yet.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
