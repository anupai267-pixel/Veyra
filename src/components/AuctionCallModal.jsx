import React, { useState, useEffect, useRef } from 'react';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  PhoneCall,
  PhoneIncoming,
  ShieldCheck,
  AlertTriangle,
  X,
  Volume2,
  Clock
} from 'lucide-react';
import { WebRTCSignaling, RTC_CONFIGURATION, stopMediaStream } from '../lib/webrtc';
import { useToast } from '../context/ToastContext';

export const AuctionCallModal = ({ auction, currentUser, onClose }) => {
  const { addToast } = useToast();

  // Role detection and validation
  const winnerName = auction?.winner?.bidder || (auction?.bidHistory?.[0]?.bidder) || 'Winner';
  const winnerId = auction?.winner?.bidderId || (auction?.bidHistory?.[0]?.bidderId);
  const sellerName = auction?.seller || auction?.maker || 'Seller';
  const sellerId = auction?.sellerId;

  // Check if current user is the winning buyer
  const isWinningBuyer =
    currentUser &&
    (currentUser.id === winnerId ||
      currentUser.name.toLowerCase() === winnerName.toLowerCase() ||
      winnerName.includes(currentUser.name.split(' ')[0]) ||
      winnerName.includes('You'));

  // Check if current user is the seller
  const isSeller =
    currentUser &&
    (currentUser.id === sellerId ||
      currentUser.name.toLowerCase() === sellerName.toLowerCase() ||
      currentUser.role === 'artisan' ||
      currentUser.role === 'seller' ||
      currentUser.studio === sellerName);

  // Authorization enforcement
  const isAuthorized = isWinningBuyer || isSeller;
  const userRole = isSeller ? 'seller' : 'buyer';

  // Call state
  // States: 'IDLE', 'RINGING_OUTGOING', 'RINGING_INCOMING', 'CONNECTING', 'CONNECTED', 'ENDED', 'ERROR'
  const [callState, setCallState] = useState(isSeller ? 'IDLE' : 'IDLE');
  const [errorMessage, setErrorMessage] = useState('');
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [callDuration, setCallDuration] = useState(0);

  // WebRTC refs
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const signalingRef = useRef(null);
  const durationTimerRef = useRef(null);

  // Initialize signaling channel
  useEffect(() => {
    if (!auction?.id || !currentUser?.id) return;

    const signaling = new WebRTCSignaling(auction.id, currentUser.id, userRole);
    signalingRef.current = signaling;

    const unsubscribe = signaling.onMessage(async (message) => {
      const { type, data, senderId } = message;

      switch (type) {
        case 'CALL_INITIATED':
          if (isSeller && callState === 'IDLE') {
            setCallState('RINGING_INCOMING');
          }
          break;

        case 'CALL_ACCEPTED':
          if (isWinningBuyer) {
            setCallState('CONNECTING');
            // Initiate WebRTC offer as the caller
            await createAndSendOffer();
          }
          break;

        case 'CALL_DECLINED':
          setCallState('ENDED');
          setErrorMessage('The seller is unable to take the call at this moment.');
          addToast('Call declined by seller.');
          break;

        case 'SDP_OFFER':
          if (isSeller) {
            await handleReceiveOffer(data);
          }
          break;

        case 'SDP_ANSWER':
          if (isWinningBuyer) {
            await handleReceiveAnswer(data);
          }
          break;

        case 'ICE_CANDIDATE':
          if (peerConnectionRef.current && data) {
            try {
              await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data));
            } catch (err) {
              console.warn('Error adding ICE candidate', err);
            }
          }
          break;

        case 'CALL_ENDED':
          handleHangUp(false);
          break;

        default:
          break;
      }
    });

    return () => {
      unsubscribe();
      signaling.destroy();
    };
  }, [auction?.id, currentUser?.id, isSeller, isWinningBuyer, userRole, callState]);

  // Duration timer when connected
  useEffect(() => {
    if (callState === 'CONNECTED') {
      durationTimerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    }

    return () => {
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    };
  }, [callState]);

  // Clean cleanup on component unmount
  useEffect(() => {
    return () => {
      stopMediaStream(localStreamRef.current);
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
      }
    };
  }, []);

  // Format call duration helper (MM:SS)
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Helper to obtain local media stream safely
  const obtainLocalMedia = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Your browser does not support media device capture.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true
      });

      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      return stream;
    } catch (err) {
      console.error('Media capture error:', err);
      let friendlyError = 'Camera & Microphone access is required for live consultation.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        friendlyError = 'Permission denied. Please grant camera and microphone access in browser settings.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        friendlyError = 'No camera or microphone found on this device.';
      } else if (err.name === 'NotReadableError') {
        friendlyError = 'Hardware is currently occupied by another application.';
      }
      setErrorMessage(friendlyError);
      setCallState('ERROR');
      return null;
    }
  };

  // Setup RTCPeerConnection instance
  const setupPeerConnection = (stream) => {
    const pc = new RTCPeerConnection(RTC_CONFIGURATION);
    peerConnectionRef.current = pc;

    // Add local media tracks
    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });

    // Remote track listener
    pc.ontrack = (event) => {
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
        setCallState('CONNECTED');
      }
    };

    // ICE candidate exchange
    pc.onicecandidate = (event) => {
      if (event.candidate && signalingRef.current) {
        signalingRef.current.send('ICE_CANDIDATE', event.candidate);
      }
    };

    // Connection state changes
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        setCallState('CONNECTED');
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        setCallState('ENDED');
      }
    };

    return pc;
  };

  // Buyer: Start calling the seller
  const handleStartCall = async () => {
    setErrorMessage('');
    const stream = await obtainLocalMedia();
    if (!stream) return;

    setCallState('RINGING_OUTGOING');
    if (signalingRef.current) {
      signalingRef.current.send('CALL_INITIATED', {
        callerName: currentUser.name,
        callerId: currentUser.id
      });
    }
  };

  // Buyer: Create and send SDP Offer once seller accepts
  const createAndSendOffer = async () => {
    try {
      const stream = localStreamRef.current || (await obtainLocalMedia());
      if (!stream) return;

      const pc = setupPeerConnection(stream);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      if (signalingRef.current) {
        signalingRef.current.send('SDP_OFFER', offer);
      }
    } catch (err) {
      console.error('Error creating offer:', err);
      setErrorMessage('Failed to establish peer connection.');
      setCallState('ERROR');
    }
  };

  // Seller: Accept incoming call from winning buyer
  const handleAcceptCall = async () => {
    setErrorMessage('');
    const stream = await obtainLocalMedia();
    if (!stream) return;

    setCallState('CONNECTING');
    if (signalingRef.current) {
      signalingRef.current.send('CALL_ACCEPTED', {
        receiverName: currentUser.name
      });
    }
  };

  // Seller: Handle SDP Offer from buyer
  const handleReceiveOffer = async (offer) => {
    try {
      const stream = localStreamRef.current || (await obtainLocalMedia());
      if (!stream) return;

      const pc = setupPeerConnection(stream);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      if (signalingRef.current) {
        signalingRef.current.send('SDP_ANSWER', answer);
      }
    } catch (err) {
      console.error('Error handling offer:', err);
      setErrorMessage('Failed to connect with buyer.');
      setCallState('ERROR');
    }
  };

  // Buyer: Handle SDP Answer from seller
  const handleReceiveAnswer = async (answer) => {
    try {
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        setCallState('CONNECTED');
      }
    } catch (err) {
      console.error('Error setting remote description:', err);
    }
  };

  // Seller: Decline incoming call
  const handleDeclineCall = () => {
    if (signalingRef.current) {
      signalingRef.current.send('CALL_DECLINED', {});
    }
    setCallState('ENDED');
    onClose();
  };

  // Toggle Microphone
  const toggleMic = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setMicEnabled(audioTrack.enabled);
      }
    }
  };

  // Toggle Camera
  const toggleCamera = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setCameraEnabled(videoTrack.enabled);
      }
    }
  };

  // End Call & Clean Hardware
  const handleHangUp = (notifyRemote = true) => {
    if (notifyRemote && signalingRef.current) {
      signalingRef.current.send('CALL_ENDED', {});
    }

    stopMediaStream(localStreamRef.current);
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    setCallState('ENDED');
    addToast('Live consultation ended.');
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  // If not authorized
  if (!isAuthorized) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1100,
          backgroundColor: 'rgba(25, 25, 25, 0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}
      >
        <div
          style={{
            maxWidth: '460px',
            backgroundColor: '#FFFFFF',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-xs)',
            padding: '32px',
            textAlign: 'center'
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: 'var(--accent-lavender-bg)',
              color: 'var(--accent-burgundy)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}
          >
            <ShieldCheck size={24} />
          </div>
          <h3 style={{ fontSize: '1.4rem', marginBottom: '8px' }}>Private Consultation Restricted</h3>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '24px' }}>
            To safeguard provenance and collector confidentiality, live video consultations are exclusively reserved for the authoritative winner (<strong>{winnerName}</strong>) and the artisan workshop (<strong>{sellerName}</strong>).
          </p>
          <button onClick={onClose} className="btn btn-primary" style={{ width: '100%', height: '40px' }}>
            Return to Auction Room
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1100,
        backgroundColor: 'rgba(15, 15, 15, 0.88)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '920px',
          backgroundColor: '#191919',
          color: '#FFFFFF',
          borderRadius: 'var(--radius-xs)',
          overflow: 'hidden',
          border: '1px solid #333333',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.4)',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Top Header Bar */}
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid #2a2a2a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#1e1e1e'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: callState === 'CONNECTED' ? 'var(--success-color)' : 'var(--accent-burgundy)'
              }}
            />
            <div>
              <span
                style={{
                  fontSize: '11px',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: '#999',
                  display: 'block'
                }}
              >
                Post-Auction Private Consultation • {auction.name}
              </span>
              <strong style={{ fontSize: 'var(--text-sm)', color: '#FFF' }}>
                {isWinningBuyer ? `Meeting with Maker: ${sellerName}` : `Consultation with Winning Collector: ${winnerName}`}
              </strong>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {callState === 'CONNECTED' && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: '#262626',
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-xs)',
                  fontSize: '12px',
                  fontVariantNumeric: 'tabular-nums'
                }}
              >
                <Clock size={13} color="var(--success-color)" />
                <span>{formatDuration(callDuration)}</span>
              </div>
            )}

            <button
              onClick={() => handleHangUp(true)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#AAA',
                cursor: 'pointer',
                padding: '4px'
              }}
              title="Close window"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Video Canvas Arena */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: 'clamp(340px, 55vh, 520px)',
            backgroundColor: '#0F0F0F',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden'
          }}
        >
          {/* Remote Video Stream (Main screen) */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: callState === 'CONNECTED' ? 'block' : 'none'
            }}
          />

          {/* Local Video Thumbnail (Picture-in-Picture) */}
          <div
            style={{
              position: 'absolute',
              bottom: '20px',
              right: '20px',
              width: '160px',
              aspectRatio: '16 / 9',
              backgroundColor: '#262626',
              borderRadius: 'var(--radius-xs)',
              overflow: 'hidden',
              border: '1.5px solid #444',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
              zIndex: 10,
              display: (callState === 'CONNECTED' || callState === 'RINGING_OUTGOING' || callState === 'CONNECTING') ? 'block' : 'none'
            }}
          >
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transform: 'scaleX(-1)' // Mirror local camera
              }}
            />
            <span
              style={{
                position: 'absolute',
                bottom: '4px',
                left: '6px',
                fontSize: '9px',
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                padding: '1px 4px',
                borderRadius: '2px',
                color: '#EEE'
              }}
            >
              You ({userRole})
            </span>
          </div>

          {/* Overlay Screens for IDLE, RINGING, CONNECTING, ERROR */}
          {callState !== 'CONNECTED' && (
            <div
              style={{
                textAlign: 'center',
                maxWidth: '440px',
                padding: '24px',
                zIndex: 5
              }}
            >
              {callState === 'IDLE' && isWinningBuyer && (
                <div>
                  <div
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(120, 59, 75, 0.2)',
                      color: 'var(--accent-burgundy)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 18px',
                      border: '1px solid var(--accent-burgundy)'
                    }}
                  >
                    <PhoneCall size={28} />
                  </div>
                  <h3 style={{ fontSize: '1.5rem', marginBottom: '8px', color: '#FFF' }}>
                    Connect with {sellerName}
                  </h3>
                  <p style={{ fontSize: '13px', color: '#AAA', lineHeight: 1.6, marginBottom: '24px' }}>
                    Congratulations on your winning bid of <strong>₹{Number(auction.currentBid).toLocaleString('en-IN')}</strong>. You are invited to a live WebRTC audio/video call to discuss bespoke provenance, packaging, or custom delivery.
                  </p>
                  <button
                    onClick={handleStartCall}
                    className="btn btn-burgundy"
                    style={{ height: '44px', padding: '0 28px', fontSize: '13px', letterSpacing: '0.04em' }}
                  >
                    <Video size={16} />
                    <span>Initiate Live Video Call</span>
                  </button>
                </div>
              )}

              {callState === 'IDLE' && isSeller && (
                <div>
                  <div
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(255, 255, 255, 0.08)',
                      color: '#FFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 18px'
                    }}
                  >
                    <PhoneIncoming size={28} />
                  </div>
                  <h3 style={{ fontSize: '1.5rem', marginBottom: '8px', color: '#FFF' }}>
                    Awaiting Call from Winner
                  </h3>
                  <p style={{ fontSize: '13px', color: '#AAA', lineHeight: 1.6 }}>
                    This lot was won by <strong>{winnerName}</strong> for <strong>₹{Number(auction.currentBid).toLocaleString('en-IN')}</strong>. You will receive an instant notification here when the collector initiates the private consultation.
                  </p>
                </div>
              )}

              {callState === 'RINGING_OUTGOING' && (
                <div>
                  <div
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(120, 59, 75, 0.3)',
                      color: '#FFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 18px',
                      animation: 'pulseLive 1.5s infinite ease-in-out'
                    }}
                  >
                    <PhoneCall size={28} />
                  </div>
                  <h3 style={{ fontSize: '1.4rem', marginBottom: '8px', color: '#FFF' }}>
                    Calling {sellerName}...
                  </h3>
                  <p style={{ fontSize: '13px', color: '#AAA' }}>
                    Signaling atelier channel. Waiting for maker to accept.
                  </p>
                </div>
              )}

              {callState === 'RINGING_INCOMING' && (
                <div>
                  <div
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--accent-burgundy)',
                      color: '#FFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 18px',
                      animation: 'pulseLive 1.2s infinite ease-in-out'
                    }}
                  >
                    <PhoneIncoming size={28} />
                  </div>
                  <h3 style={{ fontSize: '1.5rem', marginBottom: '6px', color: '#FFF' }}>
                    Incoming Call from {winnerName}
                  </h3>
                  <p style={{ fontSize: '13px', color: '#AAA', marginBottom: '24px' }}>
                    Winning collector is requesting a live video call for lot consultation.
                  </p>
                  <div style={{ display: 'flex', gap: '14px', justifyContent: 'center' }}>
                    <button
                      onClick={handleAcceptCall}
                      className="btn"
                      style={{
                        backgroundColor: 'var(--success-color)',
                        color: '#FFF',
                        height: '42px',
                        padding: '0 24px'
                      }}
                    >
                      <Video size={16} />
                      <span>Accept Video Call</span>
                    </button>
                    <button
                      onClick={handleDeclineCall}
                      className="btn"
                      style={{
                        backgroundColor: '#333333',
                        color: '#FFF',
                        height: '42px',
                        padding: '0 20px'
                      }}
                    >
                      <PhoneOff size={16} />
                      <span>Decline</span>
                    </button>
                  </div>
                </div>
              )}

              {callState === 'CONNECTING' && (
                <div>
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      border: '3px solid #444',
                      borderTopColor: 'var(--accent-burgundy)',
                      animation: 'spin 1s infinite linear',
                      margin: '0 auto 18px'
                    }}
                  />
                  <h3 style={{ fontSize: '1.3rem', marginBottom: '6px', color: '#FFF' }}>
                    Connecting Media Streams...
                  </h3>
                  <p style={{ fontSize: '13px', color: '#AAA' }}>
                    Exchanging ICE candidates and establishing encrypted P2P peer connection.
                  </p>
                </div>
              )}

              {callState === 'ENDED' && (
                <div>
                  <h3 style={{ fontSize: '1.4rem', marginBottom: '6px', color: '#FFF' }}>
                    Consultation Concluded
                  </h3>
                  <p style={{ fontSize: '13px', color: '#AAA' }}>
                    Thank you. Details have been documented in your collector acquisitions archive.
                  </p>
                </div>
              )}

              {callState === 'ERROR' && (
                <div>
                  <AlertTriangle size={32} color="var(--error-color)" style={{ marginBottom: '12px' }} />
                  <h3 style={{ fontSize: '1.3rem', marginBottom: '6px', color: '#FFF' }}>
                    Media Device Notice
                  </h3>
                  <p style={{ fontSize: '13px', color: '#AAA', marginBottom: '20px' }}>
                    {errorMessage || 'Unable to access audio or video capture hardware.'}
                  </p>
                  <button
                    onClick={() => {
                      setCallState('IDLE');
                      setErrorMessage('');
                    }}
                    className="btn btn-secondary"
                    style={{ height: '36px', fontSize: '12px' }}
                  >
                    Try Again
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Media Controls Footer Bar */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #2a2a2a',
            backgroundColor: '#1e1e1e',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px'
          }}
        >
          {/* Left: Device indicators */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '12px', color: '#AAA' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Volume2 size={15} />
              <span>P2P Encrypted Audio</span>
            </span>
            <span style={{ opacity: 0.3 }}>|</span>
            <span>WebRTC Active</span>
          </div>

          {/* Center: In-call toggles */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Mic Toggle */}
            <button
              onClick={toggleMic}
              disabled={callState !== 'CONNECTED'}
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                backgroundColor: micEnabled ? '#333333' : 'var(--error-color)',
                color: '#FFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                border: 'none',
                transition: 'background-color 150ms ease'
              }}
              title={micEnabled ? 'Mute microphone' : 'Unmute microphone'}
            >
              {micEnabled ? <Mic size={18} /> : <MicOff size={18} />}
            </button>

            {/* Camera Toggle */}
            <button
              onClick={toggleCamera}
              disabled={callState !== 'CONNECTED'}
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                backgroundColor: cameraEnabled ? '#333333' : 'var(--error-color)',
                color: '#FFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                border: 'none',
                transition: 'background-color 150ms ease'
              }}
              title={cameraEnabled ? 'Turn off camera' : 'Turn on camera'}
            >
              {cameraEnabled ? <Video size={18} /> : <VideoOff size={18} />}
            </button>

            {/* Hang Up Button */}
            <button
              onClick={() => handleHangUp(true)}
              style={{
                height: '42px',
                padding: '0 20px',
                borderRadius: '21px',
                backgroundColor: 'var(--error-color)',
                color: '#FFF',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                border: 'none',
                fontSize: '13px',
                fontWeight: 600
              }}
            >
              <PhoneOff size={16} />
              <span>End Consultation</span>
            </button>
          </div>

          {/* Right: Close / Leave action */}
          <button
            onClick={() => handleHangUp(true)}
            style={{
              color: '#888',
              fontSize: '12px',
              textDecoration: 'underline',
              cursor: 'pointer'
            }}
          >
            Leave consultation room
          </button>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
