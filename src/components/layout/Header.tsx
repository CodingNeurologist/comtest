import { useAuth } from "@/hooks/useAuth";
import { auth } from "@/lib/firebase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, User, Mail } from "lucide-react";
import { ModeToggle } from "../mode-toggle";
import { useNavigate } from "react-router-dom";
import { useChat } from "@/contexts/ChatContext";
import { Link } from "react-router-dom";

export const Header = () => {
  const { user, userProfile } = useAuth();
  const { totalUnreadCount, chatRooms, openChatWithUser } = useChat();
  const navigate = useNavigate();

  const handleLogout = () => {
    auth.signOut();
  };

  const handleProfileClick = () => {
    navigate("/profile");
  };

  const handleChatRoomClick = (room: any) => {
    // Defensive check to prevent crash
    if (!room || !room.participants) {
      console.error("Chat room data is missing participants:", room);
      return;
    }

    const targetId = Object.keys(room.participants).find(uid => uid !== user?.uid);
    if(targetId) {
      const targetUser = room.participants[targetId];
      openChatWithUser({
        uid: targetId,
        nickname: targetUser.nickname,
        photoURL: targetUser.photoURL,
        email: '' // Not needed
      });
    }
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <Link to="/" className="mr-6 flex items-center space-x-2">
          <span className="font-bold">자율신경계 커뮤니티</span>
        </Link>
        <div className="flex flex-1 items-center justify-end space-x-4">
          <nav className="flex items-center space-x-2">
            {/* Chat Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Mail className="h-5 w-5" />
                  {totalUnreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                      {totalUnreadCount}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>최근 메시지</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {chatRooms.length > 0 ? (
                  chatRooms.slice(0, 5).map(room => {
                    const participantArray = Object.values(room.participants || {});
                    // Find the other user in the chat
                    const otherUser: any = participantArray.find((p: any) => p.uid !== user?.uid);
                    const otherUserNickname = otherUser?.nickname || 'Unknown';
                    const otherUserPhotoURL = otherUser?.photoURL || '';

                    return (
                      <DropdownMenuItem key={room.id} onSelect={() => handleChatRoomClick(room)}>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={otherUserPhotoURL} />
                            <AvatarFallback>
                              {otherUserNickname.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 truncate">
                            <p className="font-semibold">{otherUserNickname}</p>
                            <p className="text-xs text-muted-foreground truncate">{room.lastMessage?.text}</p>
                          </div>
                        </div>
                      </DropdownMenuItem>
                    );
                  })
                ) : (
                  <p className="p-2 text-sm text-muted-foreground">메시지가 없습니다.</p>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Theme Toggle */}
            <ModeToggle />
            
            {/* Profile Dropdown */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-x-2">
                    <span>{userProfile?.nickname || user.email}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {userProfile?.nickname || "User"}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleProfileClick}>
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button onClick={() => navigate("/login")}>로그인</Button>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}; 