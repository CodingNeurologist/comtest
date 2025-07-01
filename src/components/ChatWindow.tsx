import { useState, useEffect, useRef } from "react";
import { UserProfile, ChatMessage } from "@/types";
import { useChat } from "@/contexts/ChatContext";
import { useAuth } from "@/hooks/useAuth";
import { rtdb } from "@/lib/firebase";
import { ref, onValue, off, push, serverTimestamp, query, orderByChild, limitToLast } from "firebase/database";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X, Send } from "lucide-react";

interface ChatWindowProps {
  targetUser: UserProfile;
}

const ChatWindow = ({ targetUser }: ChatWindowProps) => {
  const { user } = useAuth();
  const { closeChatWindow } = useChat();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const getChatRoomId = (uid1: string, uid2: string) => {
    return uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;
  };

  useEffect(() => {
    if (!user) return;

    const chatRoomId = getChatRoomId(user.uid, targetUser.uid);
    const messagesRef = query(
        ref(rtdb, `chats/${chatRoomId}`), 
        orderByChild('timestamp'), 
        limitToLast(50)
    );
    
    const listener = onValue(messagesRef, (snapshot) => {
      const messagesData: ChatMessage[] = [];
      snapshot.forEach((childSnapshot) => {
        messagesData.push({ id: childSnapshot.key!, ...childSnapshot.val() });
      });
      setMessages(messagesData);
    });

    return () => {
      off(ref(rtdb, `chats/${chatRoomId}`), 'value', listener);
    };
  }, [user, targetUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    const chatRoomId = getChatRoomId(user.uid, targetUser.uid);
    const messagesRef = ref(rtdb, `chats/${chatRoomId}`);
    
    const messageData = {
      senderId: user.uid,
      text: newMessage,
      timestamp: serverTimestamp(),
    };

    push(messagesRef, messageData);
    setNewMessage("");
  };

  return (
    <Card className="w-80 h-96 flex flex-col shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between p-3 border-b">
        <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
                <AvatarImage src={targetUser.photoURL} />
                <AvatarFallback>{targetUser.nickname.charAt(0)}</AvatarFallback>
            </Avatar>
            <p className="font-semibold">{targetUser.nickname}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={() => closeChatWindow(targetUser.uid)}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto p-3 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-end gap-2 ${msg.senderId === user?.uid ? "justify-end" : "justify-start"}`}
          >
            {msg.senderId !== user?.uid && (
                <Avatar className="h-6 w-6">
                    <AvatarImage src={targetUser.photoURL} />
                    <AvatarFallback>{targetUser.nickname.charAt(0)}</AvatarFallback>
                </Avatar>
            )}
            <div
              className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                msg.senderId === user?.uid
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </CardContent>
      <CardFooter className="p-3 border-t">
        <form onSubmit={handleSendMessage} className="w-full flex items-center gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="메시지 입력..."
            autoComplete="off"
          />
          <Button type="submit" size="icon" disabled={!newMessage.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
};

export default ChatWindow; 