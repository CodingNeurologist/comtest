import { Outlet } from "react-router-dom";
import { Header } from "./Header";
import { ThemeProvider } from "../theme-provider";
import { AuthProvider } from "@/contexts/AuthContext";
import { ChatProvider } from "@/contexts/ChatContext";
import ChatWindowManager from "../ChatWindowManager";

const AppWithChat = () => {
    return (
        <ChatProvider>
            <Header />
            <main className="flex-1">
                <Outlet />
            </main>
            <ChatWindowManager />
        </ChatProvider>
    )
}

const RootLayout = () => {
    return (
        <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
            <AuthProvider>
                <div className="relative flex min-h-screen w-full flex-col">
                    <AppWithChat />
                </div>
            </AuthProvider>
        </ThemeProvider>
    );
};

export default RootLayout; 