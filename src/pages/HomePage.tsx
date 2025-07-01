import { useEffect, useState } from "react";
import { collection, query, orderBy, getDocs, Timestamp, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ThumbsUp, MessageCircle, PenSquare, User, MessageSquare } from "lucide-react";
import WeeklyBestPosts from "@/components/WeeklyBestPosts";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useChat } from "@/contexts/ChatContext";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

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

const HomePage = () => {
    const [posts, setPosts] = useState<Post[]>([]);
    const [weeklyBestPosts, setWeeklyBestPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const { openChatWithUser } = useChat();
    const { user: currentUser } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        const fetchPosts = async () => {
            setLoading(true);
            try {
                // Fetch all posts (main feed)
                const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
                const querySnapshot = await getDocs(q);
                const postsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));
                setPosts(postsData);
                
                // Fetch weekly best posts
                const oneWeekAgo = Timestamp.now().toMillis() - 7 * 24 * 60 * 60 * 1000;
                
                // 1. Fetch top liked posts (e.g., top 100)
                const weeklyQuery = query(
                    collection(db, "posts"),
                    orderBy("likeCount", "desc"),
                    limit(100) // Fetch more to filter by date in client
                );
                
                const weeklySnapshot = await getDocs(weeklyQuery);
                
                // 2. Filter by date in the client and slice top 5
                const weeklyData = weeklySnapshot.docs
                    .map(doc => ({ id: doc.id, ...doc.data() } as Post))
                    .filter(post => post.createdAt.toMillis() >= oneWeekAgo)
                    .slice(0, 5);

                setWeeklyBestPosts(weeklyData);

            } catch (error) {
                console.error("Error fetching posts: ", error);
            }
            setLoading(false);
        };
        fetchPosts();
    }, []);

    const formatDate = (timestamp: Timestamp) => {
        const date = timestamp.toDate();
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        if (days < 1) return "오늘";
        if (days < 7) return `${days}일 전`;
        return date.toLocaleDateString('ko-KR');
    };

    const getPreview = (htmlContent: string) => {
        const doc = new DOMParser().parseFromString(htmlContent, "text/html");
        const firstImage = doc.querySelector('img');
        if (firstImage) {
            return { type: 'image' as const, content: firstImage.src };
        }
        const text = doc.body.textContent || "";
        return { type: 'text' as const, content: text.substring(0, 150) + (text.length > 150 ? "..." : "") };
    };

    const handleStartChat = (postAuthor: { uid: string, nickname: string, photoURL: string, email: string }) => {
        if (!currentUser) {
            toast.error("채팅을 시작하려면 로그인이 필요합니다.");
            return;
        }
        if (currentUser.uid === postAuthor.uid) {
            toast.info("자기 자신과는 대화할 수 없습니다.");
            return;
        }
        openChatWithUser({
            uid: postAuthor.uid,
            nickname: postAuthor.nickname,
            photoURL: postAuthor.photoURL,
            email: postAuthor.email
        });
    };

    if (loading) return <div className="text-center py-10">게시글을 불러오는 중...</div>;

    return (
        <div className="container mx-auto py-8 grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
                {posts.map(post => {
                    const preview = getPreview(post.content);
                    return (
                        <Card key={post.id} className="transition-colors hover:border-primary">
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <Avatar>
                                        <AvatarImage src={post.authorPhotoURL} alt={post.authorName} />
                                        <AvatarFallback>{post.authorName.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <button className="font-semibold text-left hover:underline">
                                                    {post.authorName}
                                                </button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent>
                                                <DropdownMenuItem onSelect={() => navigate(`/profile/${post.authorId}`)}>
                                                    <User className="mr-2 h-4 w-4" />
                                                    <span>프로필 보기</span>
                                                </DropdownMenuItem>
                                                {currentUser && currentUser.uid !== post.authorId && (
                                                    <DropdownMenuItem onSelect={() => handleStartChat({ uid: post.authorId, nickname: post.authorName, photoURL: post.authorPhotoURL || '', email: '' })}>
                                                        <MessageSquare className="mr-2 h-4 w-4" />
                                                        <span>대화하기</span>
                                                    </DropdownMenuItem>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                        <p className="text-xs text-muted-foreground">{formatDate(post.createdAt)}</p>
                                    </div>
                                </div>
                            </CardHeader>
                            <Link to={`/post/${post.id}`} className="block group">
                                <CardContent>
                                    <h2 className="text-xl font-bold mb-2 group-hover:underline">{post.title}</h2>
                                    {preview.type === 'image' && (
                                        <div className="mt-2 rounded-lg overflow-hidden max-h-96">
                                            <img src={preview.content} alt="Post preview" className="w-full h-full object-cover"/>
                                        </div>
                                    )}
                                    {preview.type === 'text' && (
                                        <p className="text-muted-foreground">{preview.content}</p>
                                    )}
                                </CardContent>
                            </Link>
                            <CardFooter>
                                <div className="flex gap-4 text-muted-foreground">
                                    <div className="flex items-center gap-1">
                                        <ThumbsUp size={16} />
                                        <span>{post.likeCount || 0}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <MessageCircle size={16} />
                                        <span>{post.commentCount || 0}</span>
                                    </div>
                                </div>
                            </CardFooter>
                        </Card>
                    );
                })}
            </div>

            {/* Sidebar */}
            <aside className="lg:col-span-1 sticky top-8 space-y-6">
                <Button asChild className="w-full">
                    <Link to="/create-post" className="flex items-center gap-2">
                        <PenSquare className="h-4 w-4" />
                        새 글 작성하기
                    </Link>
                </Button>
                <WeeklyBestPosts posts={weeklyBestPosts} />
            </aside>
        </div>
    );
};

export default HomePage; 