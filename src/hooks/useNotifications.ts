import { useEffect, useRef } from 'react';
import { collection, onSnapshot, orderBy, limit, query } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useStore } from '../stores/chatStore';
import { initNativeNotificationClickHandler, playNotificationSound, requestNotificationPermission, showMessageNotification } from '../utils/notifications';

export function useNotifications() {
  const myProfile = useStore(s => s.myProfile);
  const chats = useStore(s => s.chats);
  const currentChatId = useStore(s => s.currentChatId);
  const setCurrentChat = useStore(s => s.setCurrentChat);

  const notificationsEnabled = useStore(s => s.notificationsEnabled);
  const notificationsSound = useStore(s => s.notificationsSound);

  // per-chat last notified message id
  const lastMsgIdRef = useRef(new Map<string, string>());
  const unsubsRef = useRef(new Map<string, () => void>());
  const initializedRef = useRef(false);

  useEffect(() => {
    initNativeNotificationClickHandler((chatId) => setCurrentChat(chatId));
  }, []);

  useEffect(() => {
    if (!notificationsEnabled) return;
    requestNotificationPermission();
  }, [notificationsEnabled]);

  useEffect(() => {
    // очистка старых подписок
    for (const [chatId, unsub] of unsubsRef.current.entries()) {
      if (!chats.find(c => c.id === chatId)) {
        unsub();
        unsubsRef.current.delete(chatId);
        lastMsgIdRef.current.delete(chatId);
      }
    }

    if (!notificationsEnabled) {
      // если выключили — отписываемся от всего
      for (const [, unsub] of unsubsRef.current.entries()) unsub();
      unsubsRef.current.clear();
      lastMsgIdRef.current.clear();
      initializedRef.current = false;
      return;
    }

    if (!myProfile?.id) return;

    // подписка на последний msg каждого чата
    for (const chat of chats) {
      if (chat.isSavedMessages) continue; // не уведомляем по избранному

      if (unsubsRef.current.has(chat.id)) continue;

      const q = query(
        collection(db, 'chats', chat.id, 'messages'),
        orderBy('date', 'desc'),
        limit(1)
      );

      const unsub = onSnapshot(q, (snap) => {
        if (snap.empty) return;

        const doc0 = snap.docs[0];
        const msgId = doc0.id;
        const data: any = doc0.data();

        // первая инициализация: запоминаем, но не уведомляем
        if (!initializedRef.current) {
          lastMsgIdRef.current.set(chat.id, msgId);
          return;
        }

        const lastId = lastMsgIdRef.current.get(chat.id);
        if (lastId === msgId) return; // ничего нового
        lastMsgIdRef.current.set(chat.id, msgId);

        // не уведомлять о своих
        if (data.senderId === myProfile.id) return;

        // если чат открыт и приложение в фокусе — не уведомляем
        if (chat.id === currentChatId && document.hasFocus()) return;

        // текст
        let body = (data.text || '').toString().trim();
        if (!body) {
          if (data.mediaType === 'photo') body = '🖼 Фото';
          else if (data.mediaType === 'video') body = '🎥 Видео';
          else if (data.mediaType === 'document') body = '📎 ' + (data.fileName || 'Файл');
          else body = '[медиа]';
        }

        // группа — добавим имя
        if (chat.isGroup && data.senderName) {
          body = data.senderName + ': ' + body;
        }

        showMessageNotification({
          title: chat.title,
          body,
          avatar: chat.avatarUrl,
          chatId: chat.id,
        });

        if (notificationsSound) playNotificationSound();
      });

      unsubsRef.current.set(chat.id, unsub);
    }

    // после того как подписки созданы — включаем режим уведомлений
    // (но только когда уже есть хоть один чат)
    if (chats.length > 0) {
      // небольшая задержка — чтобы не поймать "старые" события
      setTimeout(() => { initializedRef.current = true; }, 700);
    }

    return () => {
      // не отписываемся тут — чтобы при ререндере не мигало
      // отписка идёт когда notificationsEnabled=false или чаты удалились
    };
  }, [notificationsEnabled, notificationsSound, chats, currentChatId, myProfile?.id]);
}
  