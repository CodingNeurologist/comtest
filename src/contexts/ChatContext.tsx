import { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { UserProfile, ChatRoom } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { rtdb } from '@/lib/firebase';
import { ref, onValue, off, serverTimestamp, runTransaction, query, orderByChild, push } from 'firebase/database';

interface ChatContextType {
  openChatWindows: UserProfile[];
  openChatWithUser: (user: UserProfile) => void;
  closeChatWindow: (userId: string) => void;
  chatRooms: ChatRoom[];
  totalUnreadCount: number;
  sendMessage: (targetUser: UserProfile, text: string) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

interface ChatProviderProps {
  children: ReactNode;
}

export const ChatProvider = ({ children }: ChatProviderProps) => {
  const { user, userProfile } = useAuth();
  const [openChatWindows, setOpenChatWindows] = useState<UserProfile[]>([]);
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);
  
  // Listen to user's chat list
  useEffect(() => {
    if (!user) {
      setChatRooms([]);
      return;
    }
    const userChatsRef = query(ref(rtdb, `userChats/${user.uid}`), orderByChild('lastMessage/timestamp'));
    
    const listener = onValue(userChatsRef, (snapshot) => {
      const roomsData: ChatRoom[] = [];
      let totalUnread = 0;
      snapshot.forEach((childSnapshot) => {
        const room = childSnapshot.val() as ChatRoom;
        roomsData.push({ ...room, id: childSnapshot.key! });
        if(room.unreadCount && room.unreadCount[user.uid]) {
            totalUnread += room.unreadCount[user.uid];
        }
      });
      setChatRooms(roomsData.reverse()); // Show most recent first
      setTotalUnreadCount(totalUnread);
    });

    return () => off(ref(rtdb, `userChats/${user.uid}`), 'value', listener);
  }, [user]);

  const getChatRoomId = (uid1: string, uid2: string) => {
    return uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;
  };

  const openChatWithUser = useCallback((targetUser: UserProfile) => {
    setOpenChatWindows(prev => {
      if (prev.find(u => u.uid === targetUser.uid)) {
        return prev;
      }
      return [...prev, targetUser];
    });

    // Mark messages as read when chat window is opened
    if (user) {
      const chatRoomId = getChatRoomId(user.uid, targetUser.uid);
      const userChatRef = ref(rtdb, `userChats/${user.uid}/${chatRoomId}/unreadCount/${user.uid}`);
      runTransaction(userChatRef, () => 0);
    }
  }, [user]);

  const closeChatWindow = useCallback((userId: string) => {
    setOpenChatWindows(prev => prev.filter(u => u.uid !== userId));
  }, []);

  const sendMessage = useCallback(async (targetUser: UserProfile, text: string) => {
    if (!user || !userProfile || !text.trim()) return;

    const chatRoomId = getChatRoomId(user.uid, targetUser.uid);
    const message = {
      senderId: user.uid,
      text,
      timestamp: serverTimestamp(),
    };
    
    await push(ref(rtdb, `chats/${chatRoomId}`), message);

    const updateLastMessage = (uid: string, isReceiver: boolean) => {
      const userChatRef = ref(rtdb, `userChats/${uid}/${chatRoomId}`);
      runTransaction(userChatRef, (currentData) => {
        const participantsData = {
          [user.uid]: { uid: user.uid, nickname: userProfile.nickname, photoURL: userProfile.photoURL || '' },
          [targetUser.uid]: { uid: targetUser.uid, nickname: targetUser.nickname, photoURL: targetUser.photoURL || '' }
        };

        if (!currentData) { // If chat room is new for this user, create it
          return {
            id: chatRoomId,
            lastMessage: { text, timestamp: serverTimestamp() },
            participants: participantsData,
            unreadCount: isReceiver ? { [targetUser.uid]: 1 } : {}
          };
        }
        
        // Ensure participants data is always present
        currentData.participants = participantsData; 
        currentData.lastMessage = { text, timestamp: serverTimestamp() };
        if (isReceiver) {
          currentData.unreadCount = currentData.unreadCount || {};
          currentData.unreadCount[targetUser.uid] = (currentData.unreadCount[targetUser.uid] || 0) + 1;
        }
        return currentData;
      })
    }
    
    updateLastMessage(user.uid, false);
    updateLastMessage(targetUser.uid, true);

  }, [user, userProfile]);

  const value = {
    openChatWindows,
    openChatWithUser,
    closeChatWindow,
    chatRooms,
    totalUnreadCount,
    sendMessage,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}; 