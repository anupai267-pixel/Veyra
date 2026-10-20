import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useProducts } from '../context/ProductsContext';
import { useAuctions } from '../context/AuctionContext';
import { useAuth } from '../context/AuthContext';
import { formatINR } from '../data/products';
import {
  Upload,
  CheckCircle2,
  ArrowRight,
  Eye,
  Image as ImageIcon,
  Lock,
  Plus,
  Trash2,
  Gavel,
  ShoppingBag,
  Store,
  ShieldCheck
} from 'lucide-react';

export const Sell = () => {
  const navigate = useNavigate();
  const { addProduct, customProducts } = useProducts();
  const { liveAuctions } = useAuctions();
  const { user } = useAuth();

  const sellerDisplayName = user
    ? (user.name || user.studio || 'Studio Atelier')
    : 'Studio Atelier';

  const [listingType, setListingType] = useState('direct'); // 'direct' or 'auction'

  const [formData, setFormData] = useState({
    name: 'Hand-Carved Stone Reflection Dish',
    seller: sellerDisplayName,
    category: 'Handmade',
    price: 16500,
    startingBid: 12000,
    minIncrement: 1000,
    durationHours: 4,
    location: 'Jaipur, India',
    image: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=1000&q=80',
    images: [
      'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=1000&q=80'
    ],
    description: 'Sculpted from local soapstone with a satin-buffed finish and natural geological striations.',
    materials: 'High-density grey soapstone, botanical wax buff',
    dimensions: '22cm Ø × 4.5cm H',
    provenance: 'Master carver studio piece, Jaipur Guild hallmark',
    condition: 'Pristine Studio Original'
  });

  const [newImageUrl, setNewImageUrl] = useState('');
  const [submittedItem, setSubmittedItem] = useState(null);
  const [error, setError] = useState('');

  // Sample curated image presets
  const imagePresets = [
    {
      label: 'Ceramic Stoneware',
      url: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=1000&q=80'
    },
    {
      label: 'Sculptural Wood',
      url: 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=1000&q=80'
    },
    {
      label: 'Handwoven Textile',
      url: 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&w=1000&q=80'
    },
    {
      label: 'Cast Bronze',
      url: 'https://images.unsplash.com/photo-1603006905003-be475563bc59?auto=format&fit=crop&w=1000&q=80'
    }
  ];

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAddImage = () => {
    if (!newImageUrl.trim()) return;
    if (formData.images.length >= 6) {
      setError('You can attach up to 6 images per object listing.');
      return;
    }
    setFormData((prev) => ({
      ...prev,
      images: [...prev.images, newImageUrl.trim()]
    }));
    setNewImageUrl('');
  };

  const handleRemoveImage = (idx) => {
    setFormData((prev) => {
      const updated = prev.images.filter((_, i) => i !== idx);
      return {
        ...prev,
        images: updated,
        image: updated[0] || ''
      };
    });
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file (PNG, JPG, or WEBP).');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result;
        setFormData((prev) => ({
          ...prev,
          image: dataUrl,
          images: prev.images.length < 6 ? [...prev.images, dataUrl] : prev.images
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!user) {
      setError('You must be signed in with an artisan account to publish items on Veyra.');
      navigate('/signin?redirect=/sell');
      return;
    }

    if (!formData.name || !formData.seller || !formData.price || !formData.description) {
      setError('Please fill in the required fields (Title, Maker, Price, and Description).');
      return;
    }

    const priceNum = Number(formData.price);
    if (isNaN(priceNum) || priceNum <= 0) {
      setError('Please enter a valid price in INR.');
      return;
    }

    const created = addProduct({
      ...formData,
      sellerId: user.id, // Enforce seller ownership
      price: priceNum,
      isAuction: listingType === 'auction',
      startingBid: listingType === 'auction' ? Number(formData.startingBid) || priceNum : undefined
    });

    setSubmittedItem(created);
  };

  return (
    <div style={{ paddingTop: '40px', paddingBottom: '96px', backgroundColor: 'var(--bg-primary)' }}>
      <div className="container" style={{ maxWidth: '1060px' }}>
        {/* Seller Introduction Header */}
        <div style={{ marginBottom: '36px', textAlign: 'center', maxWidth: '640px', margin: '0 auto 36px' }}>
          <span className="eyebrow">Atelier Workshop Portal</span>
          <h1 style={{ fontSize: 'clamp(2.2rem, 4vw, 3rem)', marginBottom: '10px' }}>
            Sell on VEYRA
          </h1>
          <p style={{ fontSize: 'var(--text-base)', color: 'var(--text-secondary)' }}>
            List studio ceramics, cast bronzes, archival monotypes, and living art for our global collector community.
          </p>
        </div>

        {/* Authentication Notice if Guest */}
        {!user && (
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1.5px solid var(--accent-burgundy)',
              borderRadius: 'var(--radius-xs)',
              padding: '20px 24px',
              marginBottom: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              flexWrap: 'wrap'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--surface-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--accent-burgundy)',
                  flexShrink: 0
                }}
              >
                <Lock size={20} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: 'var(--text-base)', fontWeight: 600 }}>Artisan Account Required</h4>
                <p style={{ margin: '3px 0 0 0', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                  You are currently browsing as a guest. Please sign in or create an account before listing objects on VEYRA.
                </p>
              </div>
            </div>
            <Link to="/signin?redirect=/sell" className="btn btn-burgundy btn-sm">
              <span>Sign In to Sell</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        )}

        {/* Success Confirmation Card */}
        {submittedItem && (
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1.5px solid var(--accent-burgundy)',
              borderRadius: 'var(--radius-xs)',
              padding: '24px',
              marginBottom: '36px',
              display: 'flex',
              gap: '16px',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap'
            }}
          >
            <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
              <CheckCircle2 size={24} color="var(--success-color)" />
              <div>
                <h4 style={{ fontSize: '1.15rem', margin: 0 }}>Object Listed Successfully!</h4>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                  "{submittedItem.name}" has been registered in the Veyra catalog under your maker profile.
                </p>
              </div>
            </div>

            <Link to={`/product/${submittedItem.id}`} className="btn btn-burgundy btn-sm">
              <span>View in Catalog</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        )}

        {/* Two-Column Layout: Form on Left, Live Card Preview on Right */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '40px',
            alignItems: 'flex-start'
          }}
        >
          {/* Left: Listing Form */}
          <form
            onSubmit={handleSubmit}
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--border-color)',
              padding: 'clamp(24px, 4vw, 36px)',
              borderRadius: 'var(--radius-xs)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.35rem', margin: 0 }}>Object Specifications</h3>

              {/* Listing Format Selector */}
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => setListingType('direct')}
                  className={`btn btn-sm ${listingType === 'direct' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: '11px', height: '32px' }}
                >
                  <ShoppingBag size={12} />
                  <span>Marketplace Sale</span>
                </button>
                <button
                  type="button"
                  onClick={() => setListingType('auction')}
                  className={`btn btn-sm ${listingType === 'auction' ? 'btn-burgundy' : 'btn-secondary'}`}
                  style={{ fontSize: '11px', height: '32px' }}
                >
                  <Gavel size={12} />
                  <span>Live Auction Lot</span>
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="name">
                Product Title *
              </label>
              <input
                id="name"
                name="name"
                type="text"
                className="form-input"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Ochre Stoneware Pitcher with Ash Glaze"
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="seller">
                  Seller / Studio Name *
                </label>
                <input
                  id="seller"
                  name="seller"
                  type="text"
                  className="form-input"
                  value={formData.seller}
                  onChange={handleChange}
                  placeholder="e.g. Studio Vayu"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="location">
                  Studio Location
                </label>
                <input
                  id="location"
                  name="location"
                  type="text"
                  className="form-input"
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="e.g. Pondicherry, India"
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="category">
                  Category *
                </label>
                <select
                  id="category"
                  name="category"
                  className="form-select"
                  value={formData.category}
                  onChange={handleChange}
                >
                  <option value="Handmade">Handmade</option>
                  <option value="Home & Living">Home & Living</option>
                  <option value="Art & Prints">Art & Prints</option>
                  <option value="Fashion & Accessories">Fashion & Accessories</option>
                  <option value="Collectibles">Collectibles</option>
                  <option value="Vintage Finds">Vintage Finds</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="price">
                  {listingType === 'auction' ? 'Estimated Lot Value (₹) *' : 'Price in INR (₹) *'}
                </label>
                <input
                  id="price"
                  name="price"
                  type="number"
                  min="500"
                  step="100"
                  className="form-input"
                  value={formData.price}
                  onChange={handleChange}
                  placeholder="e.g. 18500"
                  required
                />
              </div>
            </div>

            {/* Auction specific inputs if auction type selected */}
            {listingType === 'auction' && (
              <div
                style={{
                  backgroundColor: 'var(--bg-primary)',
                  padding: '14px',
                  borderRadius: 'var(--radius-xs)',
                  border: '1px solid var(--border-color)',
                  marginBottom: '16px'
                }}
              >
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--accent-burgundy)', textTransform: 'uppercase', display: 'block', marginBottom: '10px' }}>
                  Auction Configuration
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                      Starting Bid (₹)
                    </label>
                    <input
                      name="startingBid"
                      type="number"
                      className="form-input"
                      value={formData.startingBid}
                      onChange={handleChange}
                      placeholder="e.g. 12000"
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                      Duration (Hours)
                    </label>
                    <input
                      name="durationHours"
                      type="number"
                      className="form-input"
                      value={formData.durationHours}
                      onChange={handleChange}
                      placeholder="e.g. 4"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Multi-Image Gallery Upload Support (5–6 images) */}
            <div className="form-group" style={{ margin: '14px 0 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label className="form-label" style={{ margin: 0 }}>
                  Product Photography ({formData.images.length}/6 Images) *
                </label>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  Supports up to 6 distinct photos
                </span>
              </div>

              {/* Thumbnails of currently attached images */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                {formData.images.map((img, idx) => (
                  <div
                    key={idx}
                    style={{
                      position: 'relative',
                      width: '64px',
                      height: '64px',
                      borderRadius: 'var(--radius-xs)',
                      overflow: 'hidden',
                      border: formData.image === img ? '2px solid var(--accent-burgundy)' : '1px solid var(--border-color)'
                    }}
                  >
                    <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      style={{
                        position: 'absolute',
                        top: '2px',
                        right: '2px',
                        backgroundColor: 'rgba(0, 0, 0, 0.7)',
                        color: '#FFF',
                        borderRadius: '50%',
                        width: '18px',
                        height: '18px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer'
                      }}
                      title="Remove image"
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Preset Quick Selectors */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '12px' }}>
                {imagePresets.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setFormData((prev) => ({
                        ...prev,
                        image: preset.url,
                        images: prev.images.includes(preset.url) ? prev.images : [...prev.images, preset.url].slice(0, 6)
                      }));
                    }}
                    style={{
                      border: '1px solid var(--border-color)',
                      padding: '4px',
                      borderRadius: 'var(--radius-xs)',
                      backgroundColor: '#FFF',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <img src={preset.url} alt={preset.label} style={{ width: '100%', height: '38px', objectFit: 'cover' }} />
                    <span style={{ fontSize: '9px', color: 'var(--text-secondary)', textAlign: 'center' }}>{preset.label}</span>
                  </button>
                ))}
              </div>

              {/* Add custom URL or File */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="url"
                  placeholder="Paste additional image URL"
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  style={{
                    flex: 1,
                    height: '38px',
                    padding: '0 10px',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-xs)',
                    fontSize: '12px',
                    outline: 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={handleAddImage}
                  className="btn btn-secondary btn-sm"
                  style={{ height: '38px' }}
                >
                  <Plus size={13} />
                  <span>Add URL</span>
                </button>
                <label
                  className="btn btn-secondary btn-sm"
                  style={{ cursor: 'pointer', height: '38px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <Upload size={13} />
                  <span>Upload</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="description">
                Description & Craftsmanship Story *
              </label>
              <textarea
                id="description"
                name="description"
                className="form-textarea"
                value={formData.description}
                onChange={handleChange}
                placeholder="Describe the firing technique, wood species, hand-looming process, or conceptual intention..."
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="materials">
                  Materials
                </label>
                <input
                  id="materials"
                  name="materials"
                  type="text"
                  className="form-input"
                  value={formData.materials}
                  onChange={handleChange}
                  placeholder="e.g. Stoneware, wood ash"
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="dimensions">
                  Dimensions
                </label>
                <input
                  id="dimensions"
                  name="dimensions"
                  type="text"
                  className="form-input"
                  value={formData.dimensions}
                  onChange={handleChange}
                  placeholder="e.g. 24cm H × 18cm Ø"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="provenance">
                Provenance & Certification Note
              </label>
              <input
                id="provenance"
                name="provenance"
                type="text"
                className="form-input"
                value={formData.provenance}
                onChange={handleChange}
                placeholder="e.g. Master studio signature seal on bottom plinth"
              />
            </div>

            {error && <p className="form-error" style={{ marginBottom: '16px' }}>{error}</p>}

            <button
              type="submit"
              className="btn btn-burgundy"
              style={{ width: '100%', height: '48px', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '12px' }}
            >
              <span>{listingType === 'auction' ? 'Publish Live Auction Lot' : 'Publish Object Listing'}</span>
              <ArrowRight size={15} />
            </button>
          </form>

          {/* Right: Live Interactive Card Preview */}
          <div style={{ position: 'sticky', top: '100px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
              <Eye size={15} color="var(--accent-burgundy)" />
              <span
                style={{
                  fontSize: 'var(--text-xs)',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: 'var(--text-secondary)'
                }}
              >
                Live Product Preview
              </span>
            </div>

            {/* Preview Card */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-xs)',
                overflow: 'hidden',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.04)'
              }}
            >
              <div
                style={{
                  width: '100%',
                  aspectRatio: '4 / 3',
                  backgroundColor: 'var(--surface-secondary)',
                  overflow: 'hidden',
                  position: 'relative'
                }}
              >
                <img
                  src={formData.image || imagePresets[0].url}
                  alt={formData.name || 'Preview'}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <span
                  style={{
                    position: 'absolute',
                    top: '12px',
                    left: '12px',
                    padding: '3px 8px',
                    backgroundColor: 'rgba(248, 247, 244, 0.92)',
                    backdropFilter: 'blur(4px)',
                    fontSize: '10.5px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: 'var(--accent-burgundy)'
                  }}
                >
                  {formData.category}
                </span>

                {listingType === 'auction' && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                      padding: '3px 8px',
                      backgroundColor: 'rgba(25, 25, 25, 0.85)',
                      color: '#FFF',
                      fontSize: '10.5px',
                      fontWeight: 600,
                      borderRadius: 'var(--radius-xs)'
                    }}
                  >
                    AUCTION LOT
                  </span>
                )}
              </div>

              <div style={{ padding: '20px' }}>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '4px' }}>
                  {formData.name || 'Untitled Object'}
                </h3>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                  {formData.seller || 'Independent Maker'} • {formData.location || 'Studio'}
                </p>
                <div style={{ fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {listingType === 'auction' ? `Starting: ${formatINR(Number(formData.startingBid) || 0)}` : formatINR(Number(formData.price) || 0)}
                </div>
                {formData.description && (
                  <p
                    style={{
                      fontSize: 'var(--text-xs)',
                      color: 'var(--text-secondary)',
                      marginTop: '10px',
                      lineHeight: 1.5,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}
                  >
                    {formData.description}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Local Listings Review */}
        {customProducts.length > 0 && (
          <div style={{ marginTop: '64px', borderTop: '1px solid var(--border-color)', paddingTop: '36px' }}>
            <h3 style={{ fontSize: '1.4rem', marginBottom: '20px' }}>
              Your Atelier Listings ({customProducts.length})
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              {customProducts.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '12px 16px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: '#FFFFFF',
                    borderRadius: 'var(--radius-xs)',
                    gap: '16px'
                  }}
                >
                  <img src={item.image} alt={item.name} style={{ width: '54px', height: '54px', objectFit: 'cover', borderRadius: 'var(--radius-xs)' }} />
                  <div style={{ flex: 1 }}>
                    <h4 style={{ fontSize: 'var(--text-sm)', margin: '0 0 2px 0' }}>{item.name}</h4>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', display: 'block' }}>
                      {item.category} • {formatINR(item.price)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
