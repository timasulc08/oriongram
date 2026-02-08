import Peer, { MediaConnection } from 'peerjs';
import { doc, updateDoc, onSnapshot, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { getCurrentUserId } from './auth';

let peer: Peer | null = null;
let currentCall: MediaConnection | null = null;
let pendingCall: MediaConnection | null = null;
let pendingCallResolve: ((call: MediaConnection) => void) | null = null;
let localStream: MediaStream | null = null;
let remoteStream: MediaStream | null = null;
let onRemoteStreamHandler: ((stream: MediaStream) => void) | null = null;

// ========== INIT ==========

export async function initPeer(): Promise<string> {
  if (peer && !peer.disconnected && peer.id) return peer.id;

  const myId = getCurrentUserId();
  if (!myId) throw new Error('Not logged in');

  return new Promise((resolve, reject) => {
    const peerId = 'og-' + myId.slice(0, 16) + '-' + Date.now().toString(36);
    peer = new Peer(peerId, {
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          { urls: 'stun:stun3.l.google.com:19302' },
        ],
      },
    });

    peer.on('open', (id) => {
      console.log('[Peer] Connected:', id);
      updateDoc(doc(db, 'users', myId), { peerId: id }).catch(() => {});
      resolve(id);
    });

    peer.on('call', (call) => {
      console.log('[Peer] Incoming PeerJS call from:', call.peer);
      pendingCall = call;

      // Если answerCall уже ждёт — разрешаем промис
      if (pendingCallResolve) {
        pendingCallResolve(call);
        pendingCallResolve = null;
      }

      // Если мы инициатор звонка — автоответ
      if (localStream && onRemoteStreamHandler) {
        console.log('[Peer] Auto-answering (we are caller)');
        call.answer(localStream);
        call.on('stream', (stream) => {
          remoteStream = stream;
          onRemoteStreamHandler?.(stream);
        });
        currentCall = call;
        pendingCall = null;
      }
    });

    peer.on('error', (err) => {
      console.error('[Peer] Error:', err);
      // Пересоздаём при фатальной ошибке
      if (err.type === 'unavailable-id' || err.type === 'network') {
        peer = null;
        setTimeout(() => initPeer().catch(() => {}), 3000);
      }
    });

    peer.on('disconnected', () => {
      console.log('[Peer] Disconnected, reconnecting...');
      peer?.reconnect();
    });

    setTimeout(() => reject(new Error('Peer timeout')), 15000);
  });
}

// ========== FIRESTORE SIGNALING ==========

export async function sendCallSignal(
  targetUserId: string,
  callerName: string,
  type: 'audio' | 'video',
  callerPeerId: string
) {
  const myId = getCurrentUserId();
  if (!myId) return;

  console.log('[Call] Sending signal to', targetUserId, 'peerId:', callerPeerId);

  await setDoc(doc(db, 'calls', targetUserId), {
    from: myId,
    callerName,
    callerPeerId,
    type,
    status: 'ringing',
    timestamp: Date.now(),
  });
}

export function listenForCalls(
  callback: (data: {
    from: string;
    callerName: string;
    callerPeerId: string;
    type: 'audio' | 'video';
    status: string;
  }) => void
) {
  const myId = getCurrentUserId();
  if (!myId) return () => {};

  return onSnapshot(doc(db, 'calls', myId), (snap) => {
    if (snap.exists()) {
      const data = snap.data() as any;
      if (data.status === 'ringing' && Date.now() - data.timestamp < 60000) {
        console.log('[Call] Incoming signal from', data.callerName, 'peerId:', data.callerPeerId);
        callback(data);
      }
    }
  });
}

export async function clearCallSignal(userId?: string) {
  const id = userId || getCurrentUserId();
  if (!id) return;
  try { await deleteDoc(doc(db, 'calls', id)); } catch {}
}

// ========== CALL ACTIONS ==========

export async function startOutgoingCall(
  targetPeerId: string,
  type: 'audio' | 'video',
  callerName: string,
  onStream: (stream: MediaStream) => void
) {
  console.log('[Call] Starting outgoing call to peerId:', targetPeerId);

  if (!peer || peer.disconnected) {
    await initPeer();
  }

  // Получаем локальный поток
  localStream = await navigator.mediaDevices.getUserMedia({
    audio: true,
    video: type === 'video' ? { width: 640, height: 480, facingMode: 'user' } : false,
  });

  onRemoteStreamHandler = onStream;

  // Звоним через PeerJS
  const call = peer!.call(targetPeerId, localStream, {
    metadata: { callerName, type },
  });

  if (!call) {
    throw new Error('Failed to create call');
  }

  currentCall = call;

  call.on('stream', (stream) => {
    console.log('[Call] Got remote stream');
    remoteStream = stream;
    onStream(stream);
  });

  call.on('close', () => {
    console.log('[Call] Call closed');
    cleanup();
  });

  call.on('error', (err) => {
    console.error('[Call] Call error:', err);
  });
}

export async function answerIncomingCall(
  callerPeerId: string,
  type: 'audio' | 'video',
  onStream: (stream: MediaStream) => void
): Promise<void> {
  console.log('[Call] Answering call from peerId:', callerPeerId);

  if (!peer || peer.disconnected) {
    await initPeer();
  }

  // Получаем локальный поток
  localStream = await navigator.mediaDevices.getUserMedia({
    audio: true,
    video: type === 'video' ? { width: 640, height: 480, facingMode: 'user' } : false,
  });

  // Ждём PeerJS call если ещё не пришёл
  let call = pendingCall;
  if (!call) {
    console.log('[Call] Waiting for PeerJS call...');
    call = await Promise.race([
      new Promise<MediaConnection>((resolve) => {
        pendingCallResolve = resolve;
      }),
      new Promise<MediaConnection>((_, reject) =>
        setTimeout(() => reject(new Error('PeerJS call timeout - calling back')), 5000)
      ),
    ]).catch(async () => {
      // Таймаут — звоним сами обратно
      console.log('[Call] PeerJS call not received, calling back to:', callerPeerId);
      const c = peer!.call(callerPeerId, localStream!, {
        metadata: { type, isCallback: true },
      });
      return c;
    });
  }

  if (!call) throw new Error('Cannot establish call');

  currentCall = call;
  pendingCall = null;

  // Отвечаем если это входящий вызов
  if (typeof (call as any).answer === 'function' && !(call as any).metadata?.isCallback) {
    call.answer(localStream);
  }

  call.on('stream', (stream) => {
    console.log('[Call] Got remote stream (receiver)');
    remoteStream = stream;
    onStream(stream);
  });

  call.on('close', () => {
    console.log('[Call] Call closed (receiver)');
    cleanup();
  });

  // Очищаем сигнал
  clearCallSignal();
}

export function endCall() {
  console.log('[Call] Ending call');
  clearCallSignal();
  cleanup();
}

function cleanup() {
  currentCall?.close();
  currentCall = null;
  pendingCall = null;
  pendingCallResolve = null;
  onRemoteStreamHandler = null;
  localStream?.getTracks().forEach(t => t.stop());
  localStream = null;
  remoteStream = null;
}

export function toggleMute(): boolean {
  if (!localStream) return false;
  const track = localStream.getAudioTracks()[0];
  if (track) { track.enabled = !track.enabled; return !track.enabled; }
  return false;
}

export function toggleVideo(): boolean {
  if (!localStream) return false;
  const track = localStream.getVideoTracks()[0];
  if (track) { track.enabled = !track.enabled; return !track.enabled; }
  return false;
}

export function getLocalStream() { return localStream; }
export function getRemoteStream() { return remoteStream; }
export function getPeerId() { return peer?.id || null; }
