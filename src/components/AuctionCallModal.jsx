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
  Clock,
  Send,
  MessageSquare,
  Loader2
} from 'lucide-react';
import { WebRTCSignaling, RTC_CONFIGURATION, stopMediaStream } from '../lib/webrtc';
import { useToast } from '../context/ToastContext';

// ─── Constants ────────────────────────────────────────────────────────────────
const MAX_MESSAGE_LENGTH = 500;

const meetMessagesKey = (auctionId) => `veyra_meet_messages_${auctionId}`;

// ─── Persistence helpers ──────────────────────────────────────────────────────
const loadMessages = (auctionId) => {
  try {
    const raw = localStorage.getItem(meetMessagesKey(auctionId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const persistMessages = (auctionId, msgs) => {
  try {
    localStorage.setItem(meetMessagesKey(auctionId), JSON.stringify(msgs));
  } catch {
    // storage quota — ignore
  }
};

// ─── Timestamp formatter ──────────────────────────────────────────────────────
const formatTime = (ts) =>
  new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const formatDuration = (s) =>
  `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

// ─────────────────────────────────────────────────────────────────────────────
export const AuctionCallModal = ({ auction, currentUser, onClose }) => {
  const { addToast } = useToast();

  // ── Role detection ──────────────────────────────────────────────────────────
  const winnerName =
    auction?.winner?.bidder || auction?.bidHistory?.[0]?.bidder || 'Winner';
  const winnerId =
    auction?.winner?.bidderId || auction?.bidHistory?.[0]?.bidderId;
  const sellerName = auction?.seller || auction?.maker || 'Seller';
  const sellerId = auction?.sellerId;

  const isWinningBuyer =
    currentUser &&
    (currentUser.id === winnerId ||
      currentUser.name?.toLowerCase() === winnerName.toLowerCase() ||
      winnerName.includes(currentUser.name?.split(' ')[0]) ||
      winnerName.includes('You'));

  const isSeller =
    currentUser &&
    (currentUser.id === sellerId ||
      currentUser.name?.toLowerCase() === sellerName.toLowerCase() ||
      currentUser.role === 'artisan' ||
      currentUser.role === 'seller' ||
      currentUser.studio === sellerName);

  const isAuthorized = isWinningBuyer || isSeller;
  const userRole = isSeller ? 'seller' : 'buyer';

  // ── React state (drives re-renders) ────────────────────────────────────────
  const [callState, setCallState] = useState('IDLE');
  const [errorMessage, setErrorMessage] = useState('');
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [meetMessages, setMeetMessages] = useState(() => loadMessages(auction?.id));
  const [meetInput, setMeetInput] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [chatError, setChatError] = useState('');

  // ── DOM refs ────────────────────────────────────────────────────────────────
  const remoteVideoRef = useRef(null);
  const chatEndRef = useRef(null);

  // ── Stable refs — updated every render so async callbacks always see fresh values ──
  // These are accessed inside the signaling message handler (which is created once
  // and never recreated), so they must be refs, not closure captures.
  const callStateRef = useRef('IDLE');
  const isSellerRef = useRef(isSeller);
  const isWinningBuyerRef = useRef(isWinningBuyer);
  const auctionIdRef = useRef(auction?.id);
  const currentUserRef = useRef(currentUser);
  const onCloseRef = useRef(onClose);
  const addToastRef = useRef(addToast);
  const userRoleRef = useRef(userRole);

  // Hardware / WebRTC refs
  const localVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const signalingRef = useRef(null);
  const durationTimerRef = useRef(null);
  const iceCandidateQueueRef = useRef([]);
  const remoteDescSetRef = useRef(false);

  // setMeetMessages as a ref so the signaling handler can call it without stale closure
  const setMeetMessagesRef = useRef(setMeetMessages);

  // Keep all refs current every render
  callStateRef.current = callState;
  isSellerRef.current = isSeller;
  isWinningBuyerRef.current = isWinningBuyer;
  auctionIdRef.current = auction?.id;
  currentUserRef.current = currentUser;
  onCloseRef.current = onClose;
  addToastRef.current = addToast;
  userRoleRef.current = userRole;
  setMeetMessagesRef.current = setMeetMessages;

  // ── Callback ref for local <video> — assigns srcObject the moment it mounts ─
  const localVideoCallbackRef = (el) => {
    localVideoRef.current = el;
    if (el && localStreamRef.current) {
      el.srcObject = localStreamRef.current;
    }
  };

  // ── Add a chat message (usable from both sync UI and async signaling handler) ─
  // Defined as a plain function using refs so it never goes stale.
  const addMessageToState = (msg) => {
    setMeetMessagesRef.current((prev) => {
      const next = [...prev, msg];
      persistMessages(auctionIdRef.current, next);
      return next;
    });
  };

  // ── Drain the ICE candidate queue after setRemoteDescription ────────────────
  const drainIceCandidateQueue = async () => {
    const pc = peerConnectionRef.current;
    if (!pc) return;
    const queued = iceCandidateQueueRef.current.splice(0);
    for (const candidate of queued) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.warn('Failed to add queued ICE candidate', err);
      }
    }
  };

  // ── Obtain local media stream ───────────────────────────────────────────────
  const obtainLocalMedia = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Your browser does not support media device capture.');
      }

      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: true
        });
      } catch (videoErr) {
        // Graceful audio-only fallback when camera is missing or busy
        if (
          videoErr.name === 'NotFoundError' ||
          videoErr.name === 'DevicesNotFoundError' ||
          videoErr.name === 'NotReadableError'
        ) {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
          addToastRef.current('Camera unavailable — joining with audio only.');
        } else {
          throw videoErr;
        }
      }

      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      return stream;
    } catch (err) {
      console.error('Media capture error:', err);
      let msg = 'Camera & Microphone access is required for live consultation.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Permission denied. Please grant camera and microphone access in your browser settings.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = 'No camera or microphone found on this device.';
      } else if (err.name === 'NotReadableError') {
        msg = 'Hardware is currently occupied by another application.';
      }
      setErrorMessage(msg);
      setCallState('IDLE');
      // Show error state after a tick so state transition is clean
      setTimeout(() => setCallState('ERROR'), 0);
      return null;
    }
  };

  // ── Create and configure RTCPeerConnection ──────────────────────────────────
  const setupPeerConnection = (stream) => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
    iceCandidateQueueRef.current = [];
    remoteDescSetRef.current = false;

    const pc = new RTCPeerConnection(RTC_CONFIGURATION);
    peerConnectionRef.current = pc;

    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    pc.ontrack = (event) => {
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
      setCallState('CONNECTED');
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && signalingRef.current) {
        signalingRef.current.send('ICE_CANDIDATE', event.candidate.toJSON());
      }
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (state === 'connected') {
        setCallState('CONNECTED');
      } else if (state === 'disconnected' || state === 'failed' || state === 'closed') {
        setCallState((prev) =>
          prev === 'CONNECTED' || prev === 'CONNECTING' ? 'ENDED' : prev
        );
      }
    };

    return pc;
  };

  // ── Signaling channel — created ONCE, never recreated ──────────────────────
  useEffect(() => {
    if (!auction?.id || !currentUser?.id || !isAuthorized) return;

    const signaling = new WebRTCSignaling(auction.id, currentUser.id, userRole);
    signalingRef.current = signaling;

    const unsubscribe = signaling.onMessage(async (message) => {
      const { type, data } = message;
      // All mutable state is read via refs — no stale closure risk
      const _isSeller = isSellerRef.current;
      const _isWinningBuyer = isWinningBuyerRef.current;
      const _callState = callStateRef.current;
      const _currentUser = currentUserRef.current;

      switch (type) {
        case 'CALL_INITIATED':
          if (_isSeller && _callState === 'IDLE') {
            setCallState('RINGING_INCOMING');
          }
          break;

        case 'CALL_ACCEPTED':
          if (_isWinningBuyer && _callState === 'RINGING_OUTGOING') {
            setCallState('CONNECTING');
            const stream = localStreamRef.current || (await obtainLocalMedia());
            if (!stream) return;
            try {
              const pc = setupPeerConnection(stream);
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              signaling.send('SDP_OFFER', offer);
            } catch (err) {
              console.error('Error creating offer:', err);
              setErrorMessage('Failed to establish peer connection.');
              setCallState('ERROR');
            }
          }
          break;

        case 'CALL_DECLINED':
          setCallState('ENDED');
          setErrorMessage('The seller is unable to take the call at this moment.');
          addToastRef.current('Call declined by seller.');
          break;

        case 'SDP_OFFER':
          if (_isSeller) {
            try {
              const stream = localStreamRef.current || (await obtainLocalMedia());
              if (!stream) return;
              const pc = setupPeerConnection(stream);
              await pc.setRemoteDescription(new RTCSessionDescription(data));
              remoteDescSetRef.current = true;
              await drainIceCandidateQueue();
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              signaling.send('SDP_ANSWER', answer);
            } catch (err) {
              console.error('Error handling offer:', err);
              setErrorMessage('Failed to connect with buyer.');
              setCallState('ERROR');
            }
          }
          break;

        case 'SDP_ANSWER':
          if (_isWinningBuyer && peerConnectionRef.current) {
            try {
              await peerConnectionRef.current.setRemoteDescription(
                new RTCSessionDescription(data)
              );
              remoteDescSetRef.current = true;
              await drainIceCandidateQueue();
            } catch (err) {
              console.error('Error setting remote description:', err);
            }
          }
          break;

        case 'ICE_CANDIDATE':
          if (data) {
            if (peerConnectionRef.current && remoteDescSetRef.current) {
              try {
                await peerConnectionRef.current.addIceCandidate(
                  new RTCIceCandidate(data)
                );
              } catch (err) {
                console.warn('Error adding ICE candidate', err);
              }
            } else {
              iceCandidateQueueRef.current.push(data);
            }
          }
          break;

        case 'CALL_ENDED':
          stopMediaStream(localStreamRef.current);
          localStreamRef.current = null;
          if (peerConnectionRef.current) {
            peerConnectionRef.current.close();
            peerConnectionRef.current = null;
          }
          setCallState('ENDED');
          addToastRef.current('Live consultation ended by the other participant.');
          setTimeout(() => onCloseRef.current(), 1500);
          break;

        case 'CHAT_MESSAGE':
          if (data && data.senderId !== _currentUser?.id) {
            addMessageToState(data);
          }
          break;

        default:
          break;
      }
    });

    // Dedicated BroadcastChannel for same-browser cross-tab chat sync.
    // We use a stable handler that delegates to addMessageToState (ref-based).
    let chatBc;
    if (typeof BroadcastChannel !== 'undefined') {
      chatBc = new BroadcastChannel(`veyra_meet_chat_${auction.id}`);
      chatBc.onmessage = (event) => {
        const msg = event.data;
        if (msg && msg.senderId !== currentUserRef.current?.id) {
          addMessageToState(msg);
        }
      };
    }

    return () => {
      unsubscribe();
      signaling.destroy();
      signalingRef.current = null;
      if (chatBc) chatBc.close();
    };
    // Effect runs once per auction/user — callState is intentionally excluded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auction?.id, currentUser?.id, isAuthorized, userRole]);

  // ── Duration timer ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (callState === 'CONNECTED') {
      durationTimerRef.current = setInterval(
        () => setCallDuration((p) => p + 1),
        1000
      );
    } else {
      clearInterval(durationTimerRef.current);
    }
    return () => clearInterval(durationTimerRef.current);
  }, [callState]);

  // ── Auto-scroll chat ────────────────────────────────────────────────────────
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [meetMessages]);

  // ── Full cleanup on unmount ─────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      stopMediaStream(localStreamRef.current);
      peerConnectionRef.current?.close();
      clearInterval(durationTimerRef.current);
    };
  }, []);

  // ── Call actions ────────────────────────────────────────────────────────────

  const handleStartCall = async () => {
    setErrorMessage('');
    const stream = await obtainLocalMedia();
    if (!stream) return;
    setCallState('RINGING_OUTGOING');
    signalingRef.current?.send('CALL_INITIATED', {
      callerName: currentUser.name,
      callerId: currentUser.id
    });
  };

  const handleAcceptCall = async () => {
    setErrorMessage('');
    const stream = await obtainLocalMedia();
    if (!stream) return;
    setCallState('CONNECTING');
    signalingRef.current?.send('CALL_ACCEPTED', {
      receiverName: currentUser.name
    });
  };

  const handleDeclineCall = () => {
    signalingRef.current?.send('CALL_DECLINED', {});
    setCallState('ENDED');
    onClose();
  };

  const handleHangUp = (notifyRemote = true) => {
    if (notifyRemote) signalingRef.current?.send('CALL_ENDED', {});
    stopMediaStream(localStreamRef.current);
    localStreamRef.current = null;
    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;
    setCallState('ENDED');
    addToast('Live consultation ended.');
    setTimeout(onClose, 1200);
  };

  const toggleMic = () => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setMicEnabled(track.enabled);
    }
  };

  const toggleCamera = () => {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setCameraEnabled(track.enabled);
    }
  };

  // ── Chat send ───────────────────────────────────────────────────────────────
  const handleSendMessage = async (e) => {
    e.preventDefault();
    const text = meetInput.trim();
    if (!text) return;

    if (text.length > MAX_MESSAGE_LENGTH) {
      setChatError(`Message must be ${MAX_MESSAGE_LENGTH} characters or fewer.`);
      return;
    }
    setChatError('');
    setIsSendingMessage(true);

    const msg = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderRole: userRole,
      text,
      timestamp: Date.now()
    };

    try {
      addMessageToState(msg);
      setMeetInput('');
      signalingRef.current?.send('CHAT_MESSAGE', msg);

      // Dedicated chat BroadcastChannel for same-browser cross-tab delivery
      if (typeof BroadcastChannel !== 'undefined') {
        try {
          const bc = new BroadcastChannel(`veyra_meet_chat_${auction.id}`);
          bc.postMessage(msg);
          bc.close();
        } catch {
          // ignore
        }
      }
    } catch {
      setChatError('Failed to send message. Please try again.');
      addToast('Message send failed.');
    } finally {
      setIsSendingMessage(false);
    }
  };

  // ── Unauthorized guard ──────────────────────────────────────────────────────
  if (!isAuthorized) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        style={{
          position: 'fixed', inset: 0, zIndex: 1100,
          backgroundColor: 'rgba(25, 25, 25, 0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '16px'
        }}
      >
        <div
          style={{
            maxWidth: '460px', backgroundColor: '#FFFFFF',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-xs)', padding: '32px', textAlign: 'center'
          }}
        >
          <div
            style={{
              width: '48px', height: '48px', borderRadius: '50%',
              backgroundColor: 'var(--accent-lavender-bg)', color: 'var(--accent-burgundy)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px'
            }}
          >
            <ShieldCheck size={24} />
          </div>
          <h3 style={{ fontSize: '1.4rem', marginBottom: '8px' }}>
            Private Consultation Restricted
          </h3>
          <p
            style={{
              fontSize: 'var(--text-xs)', color: 'var(--text-secondary)',
              lineHeight: 1.6, marginBottom: '24px'
            }}
          >
            Live video consultations are exclusively reserved for the authoritative
            winner (<strong>{winnerName}</strong>) and the artisan workshop (
            <strong>{sellerName}</strong>).
          </p>
          <button onClick={onClose} className="btn btn-primary" style={{ width: '100%', height: '40px' }}>
            Return to Auction Room
          </button>
        </div>
      </div>
    );
  }

  // ── Main modal ──────────────────────────────────────────────────────────────
  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed', inset: 0, zIndex: 1100,
        backgroundColor: 'rgba(15, 15, 15, 0.9)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px'
      }}
    >
      <div
        style={{
          width: '100%', maxWidth: '1100px',
          backgroundColor: '#191919', color: '#FFFFFF',
          borderRadius: 'var(--radius-xs)', overflow: 'hidden',
          border: '1px solid #333333',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.5)',
          display: 'flex', flexDirection: 'column',
          maxHeight: '92vh'
        }}
      >
        {/* ── Header ── */}
        <div
          style={{
            padding: '14px 20px', borderBottom: '1px solid #2a2a2a',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            backgroundColor: '#1e1e1e', flexShrink: 0
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span
              style={{
                width: '8px', height: '8px', borderRadius: '50%',
                backgroundColor: callState === 'CONNECTED' ? '#22c55e' : 'var(--accent-burgundy)'
              }}
            />
            <div>
              <span
                style={{
                  fontSize: '11px', letterSpacing: '0.08em',
                  textTransform: 'uppercase', color: '#999', display: 'block'
                }}
              >
                Post-Auction Private Consultation — {auction.name}
              </span>
              <strong style={{ fontSize: 'var(--text-sm)', color: '#FFF' }}>
                {isWinningBuyer
                  ? `Meeting with Maker: ${sellerName}`
                  : `Consultation with Winning Collector: ${winnerName}`}
              </strong>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {callState === 'CONNECTED' && (
              <div
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  backgroundColor: '#262626', padding: '4px 10px',
                  borderRadius: 'var(--radius-xs)', fontSize: '12px',
                  fontVariantNumeric: 'tabular-nums'
                }}
              >
                <Clock size={13} color="#22c55e" />
                <span>{formatDuration(callDuration)}</span>
              </div>
            )}
            <button
              onClick={() => handleHangUp(true)}
              style={{ background: 'transparent', border: 'none', color: '#AAA', cursor: 'pointer', padding: '4px' }}
              title="Close window"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* ── Body: Video + Chat ── */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>

          {/* ── Video area ── */}
          <div
            style={{
              flex: 1, position: 'relative',
              backgroundColor: '#0F0F0F', minWidth: 0, minHeight: '340px'
            }}
          >
            {/* Remote video (full size) */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              style={{
                width: '100%', height: '100%', objectFit: 'cover',
                display: callState === 'CONNECTED' ? 'block' : 'none'
              }}
            />

            {/* Local video — picture-in-picture thumbnail */}
            <div
              style={{
                position: 'absolute', bottom: '16px', right: '16px',
                width: '160px', aspectRatio: '16 / 9',
                backgroundColor: '#262626', borderRadius: 'var(--radius-xs)',
                overflow: 'hidden', border: '1.5px solid #444',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)', zIndex: 10,
                display:
                  callState === 'CONNECTED' ||
                  callState === 'RINGING_OUTGOING' ||
                  callState === 'CONNECTING'
                    ? 'block'
                    : 'none'
              }}
            >
              <video
                ref={localVideoCallbackRef}
                autoPlay
                muted
                playsInline
                style={{
                  width: '100%', height: '100%', objectFit: 'cover',
                  transform: 'scaleX(-1)'
                }}
              />
              <span
                style={{
                  position: 'absolute', bottom: '4px', left: '6px',
                  fontSize: '9px', backgroundColor: 'rgba(0,0,0,0.7)',
                  padding: '1px 4px', borderRadius: '2px', color: '#EEE'
                }}
              >
                You ({userRole})
              </span>
            </div>

            {/* ── Overlay for pre-connected states ── */}
            {callState !== 'CONNECTED' && (
              <div
                style={{
                  position: 'absolute', inset: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '24px'
                }}
              >
                <div style={{ textAlign: 'center', maxWidth: '420px' }}>

                  {callState === 'IDLE' && isWinningBuyer && (
                    <div>
                      <div
                        style={{
                          width: '64px', height: '64px', borderRadius: '50%',
                          backgroundColor: 'rgba(120, 59, 75, 0.2)', color: 'var(--accent-burgundy)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          margin: '0 auto 18px', border: '1px solid var(--accent-burgundy)'
                        }}
                      >
                        <PhoneCall size={28} />
                      </div>
                      <h3 style={{ fontSize: '1.5rem', marginBottom: '8px', color: '#FFF' }}>
                        Connect with {sellerName}
                      </h3>
                      <p style={{ fontSize: '13px', color: '#AAA', lineHeight: 1.6, marginBottom: '24px' }}>
                        Congratulations on your winning bid. You are invited to a live
                        WebRTC audio/video call to discuss provenance, packaging, or
                        custom delivery.
                      </p>
                      <button
                        onClick={handleStartCall}
                        className="btn btn-burgundy"
                        style={{
                          height: '44px', padding: '0 28px', fontSize: '13px',
                          letterSpacing: '0.04em', display: 'inline-flex',
                          alignItems: 'center', gap: '8px'
                        }}
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
                          width: '64px', height: '64px', borderRadius: '50%',
                          backgroundColor: 'rgba(255, 255, 255, 0.08)', color: '#FFF',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          margin: '0 auto 18px'
                        }}
                      >
                        <PhoneIncoming size={28} />
                      </div>
                      <h3 style={{ fontSize: '1.5rem', marginBottom: '8px', color: '#FFF' }}>
                        Awaiting Call from Winner
                      </h3>
                      <p style={{ fontSize: '13px', color: '#AAA', lineHeight: 1.6 }}>
                        This lot was won by <strong>{winnerName}</strong>. You will
                        receive an instant notification when the collector initiates
                        the private consultation. You can also use the chat panel while
                        waiting.
                      </p>
                    </div>
                  )}

                  {callState === 'RINGING_OUTGOING' && (
                    <div>
                      <div
                        style={{
                          width: '64px', height: '64px', borderRadius: '50%',
                          backgroundColor: 'rgba(120, 59, 75, 0.3)', color: '#FFF',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          margin: '0 auto 18px',
                          animation: 'pulseLive 1.5s infinite ease-in-out'
                        }}
                      >
                        <PhoneCall size={28} />
                      </div>
                      <h3 style={{ fontSize: '1.4rem', marginBottom: '8px', color: '#FFF' }}>
                        Calling {sellerName}…
                      </h3>
                      <p style={{ fontSize: '13px', color: '#AAA' }}>
                        Signaling atelier channel. Waiting for the maker to accept.
                      </p>
                    </div>
                  )}

                  {callState === 'RINGING_INCOMING' && (
                    <div>
                      <div
                        style={{
                          width: '64px', height: '64px', borderRadius: '50%',
                          backgroundColor: 'var(--accent-burgundy)', color: '#FFF',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
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
                        The winning collector is requesting a live video consultation.
                      </p>
                      <div style={{ display: 'flex', gap: '14px', justifyContent: 'center' }}>
                        <button
                          onClick={handleAcceptCall}
                          className="btn"
                          style={{
                            backgroundColor: '#22c55e', color: '#FFF',
                            height: '42px', padding: '0 24px',
                            display: 'inline-flex', alignItems: 'center', gap: '8px'
                          }}
                        >
                          <Video size={16} /><span>Accept Video Call</span>
                        </button>
                        <button
                          onClick={handleDeclineCall}
                          className="btn"
                          style={{
                            backgroundColor: '#333333', color: '#FFF',
                            height: '42px', padding: '0 20px',
                            display: 'inline-flex', alignItems: 'center', gap: '8px'
                          }}
                        >
                          <PhoneOff size={16} /><span>Decline</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {callState === 'CONNECTING' && (
                    <div>
                      <div
                        style={{
                          width: '48px', height: '48px', borderRadius: '50%',
                          border: '3px solid #444', borderTopColor: 'var(--accent-burgundy)',
                          animation: 'spin 1s infinite linear', margin: '0 auto 18px'
                        }}
                      />
                      <h3 style={{ fontSize: '1.3rem', marginBottom: '6px', color: '#FFF' }}>
                        Connecting Media Streams…
                      </h3>
                      <p style={{ fontSize: '13px', color: '#AAA' }}>
                        Exchanging ICE candidates and establishing encrypted P2P connection.
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
                      <AlertTriangle size={32} color="#ef4444" style={{ marginBottom: '12px' }} />
                      <h3 style={{ fontSize: '1.3rem', marginBottom: '6px', color: '#FFF' }}>
                        Media Device Notice
                      </h3>
                      <p style={{ fontSize: '13px', color: '#AAA', marginBottom: '20px' }}>
                        {errorMessage || 'Unable to access audio or video capture hardware.'}
                      </p>
                      <button
                        onClick={() => { setCallState('IDLE'); setErrorMessage(''); }}
                        className="btn btn-secondary"
                        style={{ height: '36px', fontSize: '12px' }}
                      >
                        Try Again
                      </button>
                    </div>
                  )}

                </div>
              </div>
            )}
          </div>

          {/* ── Chat panel ── */}
          <div
            style={{
              width: '300px', flexShrink: 0,
              borderLeft: '1px solid #2a2a2a',
              display: 'flex', flexDirection: 'column',
              backgroundColor: '#141414'
            }}
          >
            {/* Chat header */}
            <div
              style={{
                padding: '12px 16px', borderBottom: '1px solid #2a2a2a',
                display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0
              }}
            >
              <MessageSquare size={15} color="var(--accent-burgundy)" />
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#FFF' }}>
                Private Messages
              </span>
              <span
                style={{
                  marginLeft: 'auto', fontSize: '10px', color: '#666',
                  backgroundColor: '#262626', padding: '2px 7px',
                  borderRadius: '4px', textTransform: 'capitalize'
                }}
              >
                {userRole}
              </span>
            </div>

            {/* Messages list */}
            <div
              style={{
                flex: 1, overflowY: 'auto', padding: '12px',
                display: 'flex', flexDirection: 'column', gap: '10px'
              }}
            >
              {meetMessages.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 16px', color: '#555' }}>
                  <MessageSquare size={24} style={{ marginBottom: '8px', opacity: 0.35 }} />
                  <p style={{ fontSize: '12px', lineHeight: 1.5 }}>
                    No messages yet.<br />Start the conversation.
                  </p>
                </div>
              ) : (
                meetMessages.map((msg) => {
                  const isOwn = msg.senderId === currentUser.id;
                  return (
                    <div
                      key={msg.id}
                      style={{
                        display: 'flex', flexDirection: 'column',
                        alignItems: isOwn ? 'flex-end' : 'flex-start'
                      }}
                    >
                      <div
                        style={{
                          display: 'flex', alignItems: 'center', gap: '5px',
                          marginBottom: '3px',
                          flexDirection: isOwn ? 'row-reverse' : 'row'
                        }}
                      >
                        <span
                          style={{
                            fontSize: '11px', fontWeight: 600,
                            color: isOwn ? 'var(--accent-burgundy)' : '#AAA'
                          }}
                        >
                          {isOwn ? 'You' : msg.senderName}
                        </span>
                        <span
                          style={{
                            fontSize: '9px', padding: '1px 5px', borderRadius: '3px',
                            backgroundColor:
                              msg.senderRole === 'seller'
                                ? 'rgba(120, 59, 75, 0.25)'
                                : 'rgba(59, 130, 246, 0.2)',
                            color:
                              msg.senderRole === 'seller'
                                ? 'var(--accent-burgundy)'
                                : '#60a5fa',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em', fontWeight: 600
                          }}
                        >
                          {msg.senderRole}
                        </span>
                      </div>

                      <div
                        style={{
                          maxWidth: '220px', padding: '8px 10px',
                          borderRadius: isOwn ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                          backgroundColor: isOwn ? 'var(--accent-burgundy)' : '#262626',
                          fontSize: '12.5px', lineHeight: 1.5, color: '#FFF',
                          wordBreak: 'break-word'
                        }}
                      >
                        {msg.text}
                      </div>

                      <span style={{ fontSize: '10px', color: '#555', marginTop: '3px' }}>
                        {formatTime(msg.timestamp)}
                      </span>
                    </div>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Inline error */}
            {chatError && (
              <div
                style={{
                  padding: '6px 16px',
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  borderTop: '1px solid rgba(239, 68, 68, 0.3)'
                }}
              >
                <p style={{ fontSize: '11px', color: '#ef4444' }}>{chatError}</p>
              </div>
            )}

            {/* Chat input */}
            <form
              onSubmit={handleSendMessage}
              style={{
                padding: '10px 12px', borderTop: '1px solid #2a2a2a',
                display: 'flex', gap: '8px', alignItems: 'flex-end', flexShrink: 0
              }}
            >
              <div style={{ flex: 1, position: 'relative' }}>
                <textarea
                  value={meetInput}
                  onChange={(e) => {
                    setMeetInput(e.target.value);
                    if (chatError) setChatError('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage(e);
                    }
                  }}
                  placeholder="Message… (Enter to send)"
                  maxLength={MAX_MESSAGE_LENGTH}
                  rows={2}
                  disabled={isSendingMessage}
                  style={{
                    width: '100%', backgroundColor: '#262626', color: '#FFF',
                    border: '1px solid #333', borderRadius: '6px',
                    padding: '7px 10px', fontSize: '12px', resize: 'none',
                    outline: 'none', fontFamily: 'inherit', lineHeight: 1.4,
                    boxSizing: 'border-box'
                  }}
                />
                {meetInput.length > MAX_MESSAGE_LENGTH * 0.8 && (
                  <span
                    style={{
                      position: 'absolute', bottom: '4px', right: '6px',
                      fontSize: '9px',
                      color: meetInput.length >= MAX_MESSAGE_LENGTH ? '#ef4444' : '#666'
                    }}
                  >
                    {meetInput.length}/{MAX_MESSAGE_LENGTH}
                  </span>
                )}
              </div>
              <button
                type="submit"
                disabled={!meetInput.trim() || isSendingMessage}
                style={{
                  width: '36px', height: '36px', borderRadius: '6px',
                  backgroundColor: meetInput.trim() ? 'var(--accent-burgundy)' : '#333',
                  color: '#FFF', border: 'none',
                  cursor: meetInput.trim() ? 'pointer' : 'default',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, transition: 'background-color 150ms ease'
                }}
                title="Send message"
              >
                {isSendingMessage
                  ? <Loader2 size={15} style={{ animation: 'spin 1s infinite linear' }} />
                  : <Send size={15} />}
              </button>
            </form>
          </div>
        </div>

        {/* ── Controls footer ── */}
        <div
          style={{
            padding: '14px 20px', borderTop: '1px solid #2a2a2a',
            backgroundColor: '#1e1e1e', display: 'flex',
            alignItems: 'center', justifyContent: 'space-between',
            flexWrap: 'wrap', gap: '12px', flexShrink: 0
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', color: '#AAA' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Volume2 size={14} />
              <span>P2P Encrypted Audio</span>
            </span>
            <span style={{ opacity: 0.3 }}>|</span>
            <span>WebRTC Active</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={toggleMic}
              disabled={callState !== 'CONNECTED'}
              style={{
                width: '40px', height: '40px', borderRadius: '50%',
                backgroundColor: micEnabled ? '#333333' : '#ef4444',
                color: '#FFF', border: 'none',
                cursor: callState === 'CONNECTED' ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background-color 150ms ease',
                opacity: callState !== 'CONNECTED' ? 0.45 : 1
              }}
              title={micEnabled ? 'Mute microphone' : 'Unmute microphone'}
            >
              {micEnabled ? <Mic size={17} /> : <MicOff size={17} />}
            </button>

            <button
              onClick={toggleCamera}
              disabled={callState !== 'CONNECTED'}
              style={{
                width: '40px', height: '40px', borderRadius: '50%',
                backgroundColor: cameraEnabled ? '#333333' : '#ef4444',
                color: '#FFF', border: 'none',
                cursor: callState === 'CONNECTED' ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background-color 150ms ease',
                opacity: callState !== 'CONNECTED' ? 0.45 : 1
              }}
              title={cameraEnabled ? 'Turn off camera' : 'Turn on camera'}
            >
              {cameraEnabled ? <Video size={17} /> : <VideoOff size={17} />}
            </button>

            <button
              onClick={() => handleHangUp(true)}
              style={{
                height: '40px', padding: '0 18px', borderRadius: '20px',
                backgroundColor: '#ef4444', color: '#FFF',
                display: 'inline-flex', alignItems: 'center', gap: '7px',
                cursor: 'pointer', border: 'none', fontSize: '13px', fontWeight: 600
              }}
            >
              <PhoneOff size={15} />
              <span>End Consultation</span>
            </button>
          </div>

          <button
            onClick={() => handleHangUp(true)}
            style={{
              color: '#666', fontSize: '11px', textDecoration: 'underline',
              cursor: 'pointer', background: 'none', border: 'none'
            }}
          >
            Leave consultation room
          </button>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          0%   { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes pulseLive {
          0%, 100% { transform: scale(1);    opacity: 1;    }
          50%       { transform: scale(1.12); opacity: 0.82; }
        }
      `}</style>
    </div>
  );
};
