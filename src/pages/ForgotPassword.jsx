import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, ArrowRight, Check, Mail, AlertCircle } from 'lucide-react';

export const ForgotPassword = () => {
  const { sendPasswordResetEmail, isSupabaseConfigured } = useAuth();

  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [demoResetLink, setDemoResetLink] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError('Please enter your email address.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    setIsSubmitting(true);
    const res = await sendPasswordResetEmail(cleanEmail);
    setIsSubmitting(false);

    if (res.success) {
      setSubmittedEmail(cleanEmail);
      setSuccess(true);
      if (res.resetLink) {
        setDemoResetLink(res.resetLink);
      }
    } else {
      setError(res.error || 'Failed to send password reset instructions. Please try again.');
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
            Account Recovery
          </span>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '8px' }}>Forgot your password?</h1>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
            Enter your registered email address and we will send you secure password reset instructions.
          </p>
        </div>

        {/* Success Confirmation Card */}
        {success ? (
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

            <h2 style={{ fontSize: '1.35rem', marginBottom: '10px' }}>Check Your Email</h2>

            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '20px' }}>
              If an account is associated with <strong>{submittedEmail}</strong>, password reset instructions have been sent. Please check your inbox and spam folder.
            </p>

            <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginBottom: '24px', opacity: 0.85 }}>
              For your privacy and security, we never disclose whether an email address is registered with VEYRA.
            </p>

            {/* In demo / local fallback mode, provide direct access to the reset link */}
            {demoResetLink && !isSupabaseConfigured && (
              <div
                style={{
                  marginBottom: '20px',
                  padding: '12px 14px',
                  backgroundColor: 'var(--bg-primary)',
                  border: '1px dashed var(--border-color)',
                  borderRadius: 'var(--radius-xs)',
                  textAlign: 'left'
                }}
              >
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--accent-burgundy)', display: 'block', marginBottom: '6px' }}>
                  Local Session Link Ready:
                </span>
                <Link
                  to={demoResetLink.replace(window.location.origin, '')}
                  className="btn btn-secondary btn-sm"
                  style={{ width: '100%', justifyContent: 'center', gap: '6px', fontSize: '12px' }}
                >
                  <span>Open Reset Password Page</span>
                  <ArrowRight size={13} />
                </Link>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <Link to="/signin" className="btn btn-primary" style={{ width: '100%', height: '42px', fontSize: '13px' }}>
                Proceed to Sign In
              </Link>
              <button
                type="button"
                onClick={() => {
                  setSuccess(false);
                  setEmail('');
                  setDemoResetLink('');
                }}
                className="btn btn-secondary"
                style={{ width: '100%', height: '40px', fontSize: '12px' }}
              >
                Send to a different email
              </button>
            </div>
          </div>
        ) : (
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
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label className="form-label" htmlFor="reset-email">
                Registered Email Address
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="reset-email"
                  type="email"
                  className="form-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  style={{ paddingLeft: '38px' }}
                  required
                  autoFocus
                />
                <Mail
                  size={16}
                  color="var(--text-secondary)"
                  style={{ position: 'absolute', left: '12px', top: '13px' }}
                />
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
              <span>{isSubmitting ? 'Sending Instructions...' : 'Send Reset Link'}</span>
              <ArrowRight size={15} />
            </button>

            <div style={{ textAlign: 'center', marginTop: '22px' }}>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                Remember your password?{' '}
                <Link to="/signin" style={{ color: 'var(--accent-burgundy)', textDecoration: 'underline' }}>
                  Sign in
                </Link>
              </span>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
