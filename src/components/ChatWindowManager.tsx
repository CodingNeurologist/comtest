import { useChat } from "@/contexts/ChatContext";
import ChatWindow from "./ChatWindow";

const ChatWindowManager = () => {
  const { openChatWindows } = useChat();

  if (openChatWindows.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-0 right-0 p-4 flex flex-col items-end gap-4 z-50">
      {openChatWindows.map((user, index) => (
        <div 
          key={user.uid} 
          style={{ 
            transform: `translateX(-${index * 15}px)`, // Staggered effect
            zIndex: openChatWindows.length - index 
          }}
          className="transition-transform duration-300 ease-in-out"
        >
          <ChatWindow targetUser={user} />
        </div>
      ))}
    </div>
  );
};

export default ChatWindowManager; 