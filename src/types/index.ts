import { Timestamp } from "firebase/firestore";

// From Firestore
export interface Post {
    id: string;
    authorId: string;
    authorName: string;
    authorPhotoURL?: string;
    title: string;
    content: string;
    category: string;
    createdAt: Timestamp;
    imageUrls?: string[];
    likes?: string[];
    likeCount?: number;
    commentCount?: number;
}

export interface UserProfile {
    uid: string;
    nickname: string;
    email: string;
    photoURL: string;
    photoStoragePath?: string;
    // other survey fields
}

// For Realtime Database Chat
export interface ChatMessage {
    id: string;
    senderId: string;
    text: string;
    timestamp: number; // RTDB uses number for timestamp
}

export interface ChatRoom {
    id: string; // Combined UIDs
    participants: { [uid: string]: UserProfile | { nickname: string; photoURL: string; } };
    lastMessage?: {
        text: string;
        timestamp: number;
    };
    unreadCount?: { [uid: string]: number };
} 