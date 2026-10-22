import React, { useState, useMemo } from 'react';
import { useParams, Link, useSearchParams, useNavigate } from 'react-router-dom';
import {
  Store,
  MapPin,
  Star,
  Calendar,
  ShieldCheck,
  ChevronRight,
  Package,
  MessageSquare,
  FileText,
  UserPlus,
  UserCheck,
  Edit2
} from 'lucide-react';
import { useProducts } from '../context/ProductsContext';
import { useReviews } from '../context/ReviewsContext';
import { useFollow } from '../context/FollowContext';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useSellerProfile } from '../context/SellerProfileContext';
import { getSellerById } from '../data/sellers';
import { ProductCard } from '../components/ProductCard';
import { SellerReviews } from '../components/SellerReviews';

export const SellerShop = () => {
  const { sellerId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'items';
  const navigate = useNavigate();

  const { products } = useProducts();
  const { getSellerRating } = useReviews();
  const { isFollowing, toggleFollow } = useFollow();
  const { user } = useAuth();
  const { orders } = useCart();
  const { getSellerProfile } = useSellerProfile();

  const staticSeller = getSellerById(sellerId);
  const sellerProfile = getSellerProfile(sellerId);

  // All products belonging to this seller
  const sellerProducts = useMemo(() => {
    return products.filter(p =>
      p.sellerId === sellerId &&
      p.inStock !== false
    );
  }, [products, sellerId]);

  // Build merged seller: static data first, then profile context, then product data
  const seller = useMemo(() => {
    if (staticSeller) {
      return {
        ...staticSeller,
        aboutMe: (sellerProfile && sellerProfile.aboutMe) || staticSeller.aboutMe || null,
        shopDescription: (sellerProfile && sellerProfile.shopDescription) || staticSeller.description || null,
        avatarUrl: (sellerProfile && sellerProfile.avatarUrl) || staticSeller.avatar || null,
        displayName: (sellerProfile && sellerProfile.displayName) || staticSeller.name
      };
    }
    if (sellerProfile) {
      return {
        id: sellerId,
        name: sellerProfile.displayName || 'Seller',
        avatar: sellerProfile.avatarUrl || null,
        description: sellerProfile.shopDescription || '',
        aboutMe: sellerProfile.aboutMe || null,
        shopDescription: sellerProfile.shopDescription || null,
        avatarUrl: sellerProfile.avatarUrl || null,
        displayName: sellerProfile.displayName || 'Seller',
        verified: false,
        memberSince: null,
        location: null,
        policies: null
      };
    }
    // Dynamic seller with products but no profile yet
    if (sellerProducts.length > 0) {
      const fp = sellerProducts[0];
      return {
        id: sellerId,
        name: fp.sellerName || fp.seller || 'Seller',
        avatar: null,
        description: '',
        aboutMe: null,
        shopDescription: null,
        avatarUrl: null,
        displayName: fp.sellerName || fp.seller || 'Seller',
        verified: false,
        memberSince: null,
        location: null,
        policies: null
      };
    }
    return null;
  }, [staticSeller, sellerProfile, sellerProducts, sellerId]);

  // Completed sales count for this seller
  const completedSalesCount = useMemo(() => {
    if (!orders || sellerProducts.length === 0) return 0;
    const productIds = new Set(sellerProducts.map(p => p.id));
    let count = 0;
    orders.forEach(order => {
      if (order.items) {
        order.items.forEach(item => {
          if (productIds.has(item.id)) count++;
        });
      }
    });
    return count;
  }, [orders, sellerProducts]);

  const ratingData = getSellerRating(sellerId);
  const isOwn = user && user.id === sellerId;

  const handleTabChange = (tab) => {
    setSearchParams({ tab });
  };

  if (!seller) {
    return (
      <div className="container" style={{ paddingTop: '80px', paddingBottom: '80px', textAlign: 'center' }}>
        <Store size={48} strokeWidth={1} style={{ marginBottom: '16px', opacity: 0.3, color: 'var(--text-secondary)' }} />
        <h2 style={{ marginBottom: '12px' }}>Shop not found</h2>
        <p style={{ marginTop: '8px', marginBottom: '24px', color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
          The requested seller shop could not be located.
        </p>
        <Link to="/shop" className="btn btn-primary">
          Browse Marketplace
        </Link>
      </div>
    );
  }

  const avatarSrc = seller.avatarUrl || seller.avatar;
  const displayName = seller.displayName || seller.name;

  const tabs = [
    { key: 'items', label: 'Items', count: sellerProducts.length },
    { key: 'reviews', label: 'Reviews', count: ratingData.count },
    { key: 'policies', label: 'Shop Policies', count: null }
  ];

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
            {displayName}
          </span>
        </nav>

        {/* Seller Profile Header */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-xs)',
            padding: 'clamp(20px, 3vw, 32px)',
            marginBottom: '24px',
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
              backgroundColor: avatarSrc ? 'var(--surface-secondary)' : 'var(--accent-burgundy)',
              border: '2px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {avatarSrc ? (
              <img
                src={avatarSrc}
                alt={displayName}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={e => { e.target.style.display = 'none'; }}
              />
            ) : (
              <span style={{ color: '#fff', fontFamily: 'var(--font-serif)', fontSize: '2.2rem', fontWeight: 700, lineHeight: 1, userSelect: 'none' }}>
                {displayName.charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          {/* Seller Info */}
          <div style={{ flex: 1, minWidth: '240px' }}>
            {/* Row 1: Name + Verified + Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
              <h1
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: 'clamp(1.4rem, 2.5vw, 2rem)',
                  lineHeight: 1.2,
                  margin: 0
                }}
              >
                {displayName}
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
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {isOwn ? (
                  <button
                    onClick={() => navigate('/my-products?edit=profile')}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '7px 14px',
                      borderRadius: 'var(--radius-xs)',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: '1.5px solid var(--border-color)',
                      backgroundColor: 'transparent',
                      color: 'var(--text-secondary)'
                    }}
                  >
                    <Edit2 size={13} />
                    Edit Profile
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      if (!user) { navigate('/signin'); return; }
                      toggleFollow(sellerId, displayName);
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '7px',
                      padding: '7px 18px',
                      borderRadius: 'var(--radius-xs)',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 150ms ease',
                      border: isFollowing(sellerId) ? '1.5px solid var(--border-color)' : '1.5px solid var(--accent-burgundy)',
                      backgroundColor: isFollowing(sellerId) ? 'transparent' : 'var(--accent-burgundy)',
                      color: isFollowing(sellerId) ? 'var(--text-primary)' : '#FFFFFF',
                    }}
                  >
                    {isFollowing(sellerId)
                      ? <><UserCheck size={14} /><span>Following</span></>
                      : <><UserPlus size={14} /><span>Follow</span></>
                    }
                  </button>
                )}
              </div>
            </div>

            {/* Row 2: Star Rating */}
            {ratingData.count > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                {[1, 2, 3, 4, 5].map(star => (
                  <Star
                    key={star}
                    size={14}
                    fill={star <= Math.round(ratingData.average) ? 'var(--accent-burgundy)' : 'none'}
                    color={star <= Math.round(ratingData.average) ? 'var(--accent-burgundy)' : 'var(--border-color)'}
                    strokeWidth={1.5}
                  />
                ))}
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{ratingData.average}</span>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  {'· '}{ratingData.count} review{ratingData.count !== 1 ? 's' : ''}
                </span>
              </div>
            )}

            {/* Row 3: Shop Description */}
            {(seller.shopDescription || seller.description) && (
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '12px', maxWidth: '600px' }}>
                {seller.shopDescription || seller.description}
              </p>
            )}

            {/* Row 4: Meta Info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', fontSize: '12px', color: 'var(--text-secondary)' }}>
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
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Package size={13} />
                {sellerProducts.length} item{sellerProducts.length !== 1 ? 's' : ''}
              </span>
              {completedSalesCount > 0 && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Store size={13} />
                  {completedSalesCount} sale{completedSalesCount !== 1 ? 's' : ''} completed
                </span>
              )}
            </div>
          </div>
        </div>

        {/* About Me Section */}
        {seller.aboutMe && (
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-xs)',
              padding: '20px 24px',
              marginBottom: '24px'
            }}
          >
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MessageSquare size={16} color="var(--accent-burgundy)" />
              About Me
            </h3>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>
              {seller.aboutMe}
            </p>
          </div>
        )}

        {/* Tab Nav */}
        <div style={{
          display: 'flex',
          gap: '0',
          borderBottom: '2px solid var(--border-color)',
          marginBottom: '28px',
          overflowX: 'auto',
          scrollbarWidth: 'none'
        }}>
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 16px',
                fontSize: '13px',
                whiteSpace: 'nowrap',
                fontWeight: activeTab === tab.key ? 600 : 400,
                color: activeTab === tab.key ? 'var(--accent-burgundy)' : 'var(--text-secondary)',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                borderBottom: activeTab === tab.key ? '2px solid var(--accent-burgundy)' : '2px solid transparent',
                marginBottom: '-2px',
                transition: 'all 150ms ease'
              }}
            >
              {tab.label}
              {tab.count !== null && tab.count > 0 && (
                <span style={{
                  fontSize: '10px',
                  padding: '1px 6px',
                  borderRadius: 'var(--radius-xs)',
                  fontWeight: 600,
                  backgroundColor: activeTab === tab.key ? 'rgba(120,59,75,0.1)' : 'var(--surface-secondary)',
                  color: activeTab === tab.key ? 'var(--accent-burgundy)' : 'var(--text-secondary)'
                }}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content: Items */}
        {activeTab === 'items' && (
          <div>
            {sellerProducts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '64px 24px', color: 'var(--text-secondary)' }}>
                <Store size={48} strokeWidth={1} style={{ marginBottom: '16px', opacity: 0.4 }} />
                <h3 style={{ marginBottom: '8px', color: 'var(--text-primary)' }}>No items listed</h3>
                <p style={{ fontSize: 'var(--text-sm)' }}>
                  This seller has not listed any items yet. Check back later.
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: '24px' }}>
                {sellerProducts.map(product => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab Content: Reviews */}
        {activeTab === 'reviews' && (
          <SellerReviews sellerId={sellerId} seller={seller} />
        )}

        {/* Tab Content: Policies */}
        {activeTab === 'policies' && (
          <div>
            {seller.policies ? (
              <div style={{ display: 'grid', gap: '20px', maxWidth: '720px' }}>
                {seller.policies.shipping && (
                  <div style={{ backgroundColor: '#FFFFFF', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xs)', padding: '20px' }}>
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
                  <div style={{ backgroundColor: '#FFFFFF', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xs)', padding: '20px' }}>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FileText size={18} color="var(--accent-burgundy)" />
                      Returns and Exchanges
                    </h3>
                    <p style={{ fontSize: 'var(--text-sm)', lineHeight: 1.7, color: 'var(--text-secondary)', margin: 0 }}>
                      {seller.policies.returns}
                    </p>
                  </div>
                )}
                {seller.policies.payment && (
                  <div style={{ backgroundColor: '#FFFFFF', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xs)', padding: '20px' }}>
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
              <div style={{ textAlign: 'center', padding: '64px 24px', color: 'var(--text-secondary)' }}>
                <FileText size={48} strokeWidth={1} style={{ marginBottom: '16px', opacity: 0.4 }} />
                <h3 style={{ marginBottom: '8px', color: 'var(--text-primary)' }}>No policies available</h3>
                <p style={{ fontSize: 'var(--text-sm)' }}>
                  This seller has not published shop policies yet.
                </p>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
