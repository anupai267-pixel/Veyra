import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, AlertCircle } from 'lucide-react';

export const ResetPassword = () => {
  const { resetPassword, verifyResetToken, isPasswordRecovery, isSupabaseConfigured } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const searchParams = new URLSearchParams(location.search);
  const token = searchParams.get('token');

  // Supabase sends tokens in the URL hash, e.g. #access_token=...&type=recovery
  const hash = location.hash;
  const isSupabaseRecoveryHash = hash && hash.includes('type=recovery');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [tokenError, setTokenError] = useState('');

  // Validate token on mount if using token flow
  useEffect(() => {
    if (token) {
      const res = verifyResetToken(token);
      if (!res.valid) {
        setTokenError(res.error || 'This password reset link is invalid or has expired.');
      }
    } else if (!isSupabaseConfigured && !isPasswordRecovery && !isSupabaseRecoveryHash) {
      // If neither token nor Supabase recovery session is present
      setTokenError('No valid password reset token found. Please request a new reset link.');
    }
  }, [token, isPasswordRecovery, isSupabaseRecoveryHash, isSupabaseConfigured]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!password || !confirmPassword) {
      setError('Please fill in both password fields.');
      return;
    }

    if (password.length < 6) {
      setError('Password must contain at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please ensure both passwords are identical.');
      return;
    }

    setIsSubmitting(true);
    const res = await resetPassword(password, token);
    setIsSubmitting(false);

    if (res.success) {
      setSuccess(true);
    } else {
      setError(res.error || 'Failed to reset password. Please try again or request a new link.');
    }
  };

  return (
    <div style={{ paddingTop: '48px', paddingBottom: '96px', backgroundColor: 'var(--bg-primary)' }}>
      <div className="container" style={{ maxWidth: '440px' }}>
        {/* Return to Sign In Link */}
        <div style={{ marginBottom: '24px' }}>
          <Link
            to="/signin"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: 'var(--text-xs)',
              color: 'var(--text-secondary)'
            }}
          >
            <ArrowLeft size={14} />
            <span>Return to Sign In</span>
          </Link>
        </div>

        {/* Card Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <Link
            to="/"
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '2rem',
              letterSpacing: '0.22em',
              fontWeight: 600,
              display: 'block',
              marginBottom: '6px'
            }}
          >
            VEYRA
          </Link>
          <span className="eyebrow" style={{ marginBottom: '6px' }}>
            Account Security
          </span>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '8px' }}>Choose a new password</h1>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
            Please enter and confirm your new secure password below.
          </p>
        </div>

        {/* Token Error State */}
        {tokenError ? (
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--border-color)',
              padding: 'clamp(24px, 6vw, 36px)',
              borderRadius: 'var(--radius-xs)',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.02)',
              textAlign: 'center'
            }}
          >
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                backgroundColor: 'rgba(211, 47, 47, 0.1)',
                color: 'var(--error-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 18px'
              }}
            >
              <AlertCircle size={26} />
            </div>

            <h2 style={{ fontSize: '1.35rem', marginBottom: '10px' }}>Invalid or Expired Link</h2>

            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '24px' }}>
              {tokenError}
            </p>

            <Link
              to="/forgot-password"
              className="btn btn-primary"
              style={{ width: '100%', height: '42px', fontSize: '13px' }}
            >
              Request a New Reset Link
            </Link>
          </div>
        ) : success ? (
          /* Success State */
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--border-color)',
              padding: 'clamp(24px, 6vw, 36px)',
              borderRadius: 'var(--radius-xs)',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.02)',
              textAlign: 'center'
            }}
          >
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                backgroundColor: 'rgba(52, 168, 83, 0.1)',
                color: '#2e7d32',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 18px'
              }}
            >
              <Check size={26} />
            </div>

            <h2 style={{ fontSize: '1.35rem', marginBottom: '10px' }}>Password Successfully Reset</h2>

            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '24px' }}>
              Your account password has been updated. You can now use your new password to sign in.
            </p>

            <button
              onClick={() => navigate('/signin')}
              className="btn btn-primary"
              style={{ width: '100%', height: '44px', fontSize: '13px', letterSpacing: '0.04em' }}
            >
              <span>Sign In with New Password</span>
              <ArrowRight size={15} />
            </button>
          </div>
        ) : (
          /* Password Form */
          <form
            onSubmit={handleSubmit}
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--border-color)',
              padding: 'clamp(20px, 6vw, 32px)',
              borderRadius: 'var(--radius-xs)',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.02)'
            }}
          >
            {/* New Password */}
            <div className="form-group" style={{ marginBottom: '18px' }}>
              <label className="form-label" htmlFor="new-password">
                New Password (minimum 6 characters)
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  style={{ paddingRight: '40px' }}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '12px',
                    color: 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div className="form-group" style={{ marginBottom: '24px' }}>
              <label className="form-label" htmlFor="confirm-password">
                Confirm New Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  className="form-input"
                  style={{ paddingRight: '40px' }}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '12px',
                    color: 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 12px',
                  backgroundColor: 'rgba(211, 47, 47, 0.06)',
                  border: '1px solid rgba(211, 47, 47, 0.2)',
                  borderRadius: 'var(--radius-xs)',
                  color: 'var(--error-color)',
                  fontSize: '12px',
                  marginBottom: '18px'
                }}
              >
                <AlertCircle size={15} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary"
              style={{
                width: '100%',
                height: '46px',
                letterSpacing: '0.06em',
                textTransform: 'uppercase'
              }}
            >
              <span>{isSubmitting ? 'Resetting Password...' : 'Update Password'}</span>
              <ArrowRight size={15} />
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
