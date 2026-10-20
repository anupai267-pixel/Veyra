import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  X,
  Lock,
  ShoppingBag,
  Truck
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { formatINR } from '../data/products';

export const Cart = () => {
  const { items, updateQuantity, removeFromCart, clearCart, cartSubtotal, cartCount, createOrder } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [orderId, setOrderId] = useState('');

  // Shipping calculation: Free above ₹20,000, otherwise ₹1,200 for insured white-glove transport
  const shippingThreshold = 20000;
  const shippingCost = cartSubtotal > 0 && cartSubtotal >= shippingThreshold ? 0 : (cartSubtotal > 0 ? 1200 : 0);
  const totalAmount = cartSubtotal + shippingCost;

  const handleCheckoutSubmit = (e) => {
    e.preventDefault();
    const created = createOrder({
      items: items.map((i) => ({
        id: i.product.id,
        name: i.product.name,
        price: i.product.price,
        quantity: i.quantity,
        seller: i.product.seller,
        image: i.product.image
      })),
      subtotal: cartSubtotal,
      shipping: shippingCost,
      total: totalAmount
    });
    setOrderId(created.id);
    setOrderComplete(true);
  };

  return (
    <div style={{ paddingTop: '40px', paddingBottom: '96px', backgroundColor: 'var(--bg-primary)' }}>
      <div className="container">
        {/* Header */}
        <div style={{ marginBottom: '36px' }}>
          <span className="eyebrow">Acquisitions</span>
          <h1 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', marginBottom: '8px' }}>
            Shopping Bag ({cartCount})
          </h1>
          <p style={{ fontSize: 'var(--text-base)', color: 'var(--text-secondary)' }}>
            Each object is directly packaged by its independent maker with museum-grade care.
          </p>
        </div>

        {items.length > 0 ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: 'clamp(32px, 5vw, 64px)',
              alignItems: 'flex-start'
            }}
          >
            {/* Bag Items List */}
            <div style={{ flex: '1 1 540px' }}>
              <div
                style={{
                  borderTop: '1px solid var(--border-color)',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                {items.map(({ product, quantity }) => (
                  <div
                    key={product.id}
                    style={{
                      display: 'flex',
                      gap: '20px',
                      padding: '24px 0',
                      borderBottom: '1px solid var(--border-color)',
                      alignItems: 'center',
                      flexWrap: 'wrap'
                    }}
                  >
                    {/* Thumbnail */}
                    <div
                      style={{
                        width: '100px',
                        height: '110px',
                        backgroundColor: 'var(--surface-secondary)',
                        borderRadius: 'var(--radius-xs)',
                        overflow: 'hidden',
                        flexShrink: 0
                      }}
                    >
                      <img
                        src={product.image}
                        alt={product.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>

                    {/* Details */}
                    <div style={{ flex: 1, minWidth: '200px' }}>
                      <span className="badge-tag" style={{ marginBottom: '4px' }}>
                        {product.category}
                      </span>
                      <h3
                        style={{
                          fontFamily: 'var(--font-serif)',
                          fontSize: '1.25rem',
                          margin: '4px 0',
                          lineHeight: 1.25
                        }}
                      >
                        <Link to={`/product/${product.id}`} className="hover-burgundy">
                          {product.name}
                        </Link>
                      </h3>
                      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', margin: '0 0 10px 0' }}>
                        Maker: {product.seller}
                      </p>

                      <div style={{ fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {formatINR(product.price)}
                      </div>
                    </div>

                    {/* Quantity Controls & Remove */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          border: '1px solid var(--border-color)',
                          borderRadius: 'var(--radius-xs)',
                          backgroundColor: '#FFFFFF',
                          height: '34px'
                        }}
                      >
                        <button
                          onClick={() => updateQuantity(product.id, quantity - 1)}
                          style={{
                            width: '28px',
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--text-secondary)'
                          }}
                          aria-label="Decrease quantity"
                        >
                          <Minus size={13} />
                        </button>
                        <span
                          style={{
                            width: '28px',
                            textAlign: 'center',
                            fontSize: 'var(--text-xs)',
                            fontWeight: 600
                          }}
                        >
                          {quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(product.id, quantity + 1)}
                          style={{
                            width: '28px',
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--text-secondary)'
                          }}
                          aria-label="Increase quantity"
                        >
                          <Plus size={13} />
                        </button>
                      </div>

                      <button
                        onClick={() => removeFromCart(product.id)}
                        style={{
                          color: 'var(--text-secondary)',
                          padding: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer'
                        }}
                        aria-label={`Remove ${product.name} from bag`}
                        title="Remove object"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Link
                  to="/shop"
                  style={{
                    fontSize: 'var(--text-xs)',
                    color: 'var(--text-secondary)',
                    textDecoration: 'underline'
                  }}
                >
                  Continue Browsing Catalog
                </Link>

                <button
                  onClick={clearCart}
                  style={{
                    fontSize: 'var(--text-xs)',
                    color: 'var(--text-secondary)',
                    textDecoration: 'underline',
                    cursor: 'pointer'
                  }}
                >
                  Clear Bag
                </button>
              </div>
            </div>

            {/* Order Summary Card */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-xs)',
                padding: '28px',
                position: 'sticky',
                top: '100px'
              }}
            >
              <h3 style={{ fontSize: '1.35rem', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                Acquisition Summary
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-sm)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Objects Subtotal</span>
                  <span style={{ fontWeight: 600 }}>{formatINR(cartSubtotal)}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-sm)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Insured White-Glove Transport</span>
                  <span>{shippingCost === 0 ? <strong style={{ color: 'var(--success-color)' }}>Complimentary</strong> : formatINR(shippingCost)}</span>
                </div>

                {cartSubtotal < shippingThreshold && (
                  <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0 }}>
                    Complimentary delivery activates on acquisitions exceeding {formatINR(shippingThreshold)}.
                  </p>
                )}

                <div
                  style={{
                    borderTop: '1px solid var(--border-color)',
                    paddingTop: '16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline'
                  }}
                >
                  <span style={{ fontSize: 'var(--text-base)', fontWeight: 600 }}>Total</span>
                  <span style={{ fontSize: '1.45rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {formatINR(totalAmount)}
                  </span>
                </div>
              </div>

              {/* Checkout Trigger */}
              <button
                onClick={() => setCheckoutModalOpen(true)}
                className="btn btn-burgundy"
                style={{
                  width: '100%',
                  height: '46px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  fontWeight: 600,
                  fontSize: 'var(--text-xs)'
                }}
              >
                <span>Proceed to Checkout</span>
                <ArrowRight size={14} />
              </button>

              <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldCheck size={14} color="var(--success-color)" />
                  <span>100% Provenance & Authenticity Guarantee</span>
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <Truck size={14} />
                  <span>Direct insured transport from independent workshops</span>
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* Empty Bag State */
          <div
            style={{
              textAlign: 'center',
              padding: '80px 20px',
              backgroundColor: '#FFFFFF',
              border: '1px dashed var(--border-color)',
              borderRadius: 'var(--radius-xs)',
              maxWidth: '540px',
              margin: '0 auto'
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: 'var(--surface-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
                color: 'var(--text-secondary)'
              }}
            >
              <ShoppingBag size={28} />
            </div>

            <h2 style={{ fontSize: '1.6rem', marginBottom: '8px' }}>Your shopping bag is empty</h2>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: '28px' }}>
              Explore our curated marketplace of studio ceramics, monotypes, and bespoke objects.
            </p>

            <Link to="/shop" className="btn btn-burgundy">
              Browse Marketplace
            </Link>
          </div>
        )}
      </div>

      {/* Checkout Modal */}
      {checkoutModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            backgroundColor: 'rgba(25, 25, 25, 0.65)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
          onClick={() => !orderComplete && setCheckoutModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '520px',
              backgroundColor: '#FFFFFF',
              borderRadius: 'var(--radius-xs)',
              padding: 'clamp(24px, 4vw, 36px)',
              boxShadow: '0 16px 40px rgba(0, 0, 0, 0.15)',
              border: '1px solid var(--border-color)',
              position: 'relative',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
          >
            {!orderComplete ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '1.4rem', margin: 0 }}>Acquisition Checkout</h3>
                  <button
                    onClick={() => setCheckoutModalOpen(false)}
                    style={{ color: 'var(--text-secondary)', cursor: 'pointer' }}
                  >
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleCheckoutSubmit}>
                  <div className="form-group">
                    <label className="form-label">Recipient Name *</label>
                    <input
                      type="text"
                      className="form-input"
                      defaultValue={user?.name || 'Collector'}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Delivery Address *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Street address, apartment or studio"
                      defaultValue="42 Malabar Hill Road"
                      required
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="form-group">
                      <label className="form-label">City *</label>
                      <input type="text" className="form-input" defaultValue="Mumbai" required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">PIN Code *</label>
                      <input type="text" className="form-input" defaultValue="400006" required />
                    </div>
                  </div>

                  <div
                    style={{
                      backgroundColor: 'var(--bg-primary)',
                      padding: '14px',
                      borderRadius: 'var(--radius-xs)',
                      border: '1px solid var(--border-color)',
                      margin: '16px 0 24px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Total Payable</span>
                    <strong style={{ fontSize: '1.25rem', color: 'var(--text-primary)' }}>
                      {formatINR(totalAmount)}
                    </strong>
                  </div>

                  <button
                    type="submit"
                    className="btn btn-burgundy"
                    style={{ width: '100%', height: '46px', textTransform: 'uppercase', letterSpacing: '0.06em' }}
                  >
                    Confirm & Complete Order
                  </button>
                </form>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--surface-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px',
                    color: 'var(--success-color)'
                  }}
                >
                  <CheckCircle2 size={32} />
                </div>
                <span className="eyebrow">Acquisition Confirmed</span>
                <h2 style={{ fontSize: '1.6rem', marginBottom: '8px' }}>Thank you for your patronship</h2>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                  Order Reference: <strong>{orderId}</strong>
                </p>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginBottom: '28px' }}>
                  The atelier has received your acquisition request and will begin preparing white-glove transport.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <Link
                    to="/account?tab=orders"
                    className="btn btn-burgundy"
                    style={{ width: '100%', height: '44px' }}
                    onClick={() => {
                      setCheckoutModalOpen(false);
                      setOrderComplete(false);
                    }}
                  >
                    View in Order History
                  </Link>
                  <button
                    onClick={() => {
                      setCheckoutModalOpen(false);
                      setOrderComplete(false);
                    }}
                    className="btn btn-secondary"
                    style={{ width: '100%', height: '44px' }}
                  >
                    Return to Marketplace
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
