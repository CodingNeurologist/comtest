import { useEffect, useState, memo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    doc, updateDoc, arrayUnion, arrayRemove, deleteDoc,
    collection, addDoc, serverTimestamp, query, orderBy, onSnapshot,
    Timestamp, increment
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, ThumbsUp, ArrowLeft, Trash2, Edit, MoreHorizontal, User, MessageSquare } from "lucide-react";
import { Post } from "./HomePage";
import { toast } from "sonner";
import 'suneditor/dist/css/suneditor.min.css';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useChat } from "@/contexts/ChatContext";
import { User as FirebaseUser } from "firebase/auth";

interface Comment {
    id: string;
    authorId: string;
    authorName: string;
    authorPhotoURL: string;
    content: string;
    createdAt: Timestamp;
}

// Memoized Post Card Component
interface PostCardProps {
    post: Post;
    user: FirebaseUser | null;
    isLiked: boolean;
    onLike: () => void;
    onDelete: () => void;
    formatDate: (timestamp: Timestamp | null) => string;
    onStartChat: (targetUser: { uid: string, nickname: string, photoURL: string }) => void;
}

const PostCard = memo(({ post, user, isLiked, onLike, onDelete, formatDate, onStartChat }: PostCardProps) => {
    const navigate = useNavigate();

    return (
        <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div className="flex flex-grow items-start gap-4">
                    <Button variant="ghost" size="icon" onClick={() => window.history.back()} className="flex-shrink-0">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div className="flex-grow">
                        <CardTitle>{post.title}</CardTitle>
                        <CardDescription className="flex items-center gap-1">
                            <span>작성자:</span>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button className="font-semibold hover:underline">{post.authorName}</button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                    <DropdownMenuItem onSelect={() => navigate(`/profile/${post.authorId}`)}>
                                        <User className="mr-2 h-4 w-4" />
                                        <span>프로필 보기</span>
                                    </DropdownMenuItem>
                                    {user && user.uid !== post.authorId && (
                                        <DropdownMenuItem onSelect={() => onStartChat({ uid: post.authorId, nickname: post.authorName, photoURL: post.authorPhotoURL || '' })}>
                                            <MessageSquare className="mr-2 h-4 w-4" />
                                            <span>대화하기</span>
                                        </DropdownMenuItem>
                                    )}
                                    {user && user.uid === post.authorId && (
                                        <>
                                            <DropdownMenuItem onSelect={() => navigate(`/edit-post/${post.id}`)}>
                                                <Edit className="h-4 w-4 mr-1" /> 수정
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onSelect={onDelete}>
                                                <Trash2 className="h-4 w-4 mr-1" /> 삭제
                                            </DropdownMenuItem>
                                        </>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                            <span>• {formatDate(post.createdAt)}</span>
                        </CardDescription>
                    </div>
                </div>
                
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                         <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuItem onSelect={() => navigate(`/profile/${post.authorId}`)}>
                            <User className="mr-2 h-4 w-4" />
                            <span>프로필 보기</span>
                        </DropdownMenuItem>
                        {user && user.uid !== post.authorId && (
                             <DropdownMenuItem onSelect={() => onStartChat({ uid: post.authorId, nickname: post.authorName, photoURL: post.authorPhotoURL || '' })}>
                                <MessageSquare className="mr-2 h-4 w-4" />
                                <span>대화하기</span>
                            </DropdownMenuItem>
                        )}
                         {user && user.uid === post.authorId && (
                            <>
                                <DropdownMenuItem onSelect={() => navigate(`/edit-post/${post.id}`)}>
                                    <Edit className="h-4 w-4 mr-1" /> 수정
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={onDelete}>
                                    <Trash2 className="h-4 w-4 mr-1" /> 삭제
                                </DropdownMenuItem>
                            </>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </CardHeader>
            <CardContent>
                {post.category && <Badge className="mb-4">{post.category}</Badge>}
                <div className="prose dark:prose-invert max-w-none">
                    <div className="sun-editor-editable" dangerouslySetInnerHTML={{ __html: post.content }} />
                </div>
            </CardContent>
            <CardFooter>
                <Button onClick={onLike} variant={isLiked ? "default" : "outline"} className="flex items-center gap-2">
                    <ThumbsUp className="h-5 w-5" />
                    <span>좋아요 ({post.likeCount || 0})</span>
                </Button>
            </CardFooter>
        </Card>
    )
});
PostCard.displayName = 'PostCard';

const PostPage = () => {
    const { id } = useParams<{ id: string }>();
    const { user, userProfile } = useAuth();
    const { openChatWithUser } = useChat();
    const navigate = useNavigate();
    const [post, setPost] = useState<Post | null>(null);
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState("");
    const [isSubmittingComment, setIsSubmittingComment] = useState(false);
    const [loading, setLoading] = useState(true);
    const [isLiked, setIsLiked] = useState(false);

    useEffect(() => {
        if (!id) return;

        const postRef = doc(db, "posts", id);
        const unsubscribePost = onSnapshot(postRef, (doc) => {
            if (doc.exists()) {
                const postData = { id: doc.id, ...doc.data() } as Post;
                setPost(postData);
                setIsLiked(!!user && !!postData.likes?.includes(user.uid));
            } else {
                toast.error("게시물을 찾을 수 없습니다.");
                navigate("/");
            }
            setLoading(false);
        });

        const commentsQuery = query(collection(db, "posts", id, "comments"), orderBy("createdAt", "asc"));
        const unsubscribeComments = onSnapshot(commentsQuery, (snapshot) => {
            const commentsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Comment));
            setComments(commentsData);
        });

        return () => {
            unsubscribePost();
            unsubscribeComments();
        };
    }, [id, user, navigate]);

    const handleCommentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !userProfile || !id || !newComment.trim()) {
            toast.error("댓글을 작성하려면 로그인 후 내용을 입력해야 합니다.");
            return;
        }
        setIsSubmittingComment(true);
        try {
            const postRef = doc(db, "posts", id);
            const commentsCollectionRef = collection(db, "posts", id, "comments");

            await addDoc(commentsCollectionRef, {
                authorId: user.uid,
                authorName: userProfile.nickname,
                authorPhotoURL: userProfile.photoURL || "",
                content: newComment,
                createdAt: serverTimestamp(),
            });

            await updateDoc(postRef, {
                commentCount: increment(1)
            });

            setNewComment("");
            toast.success("댓글이 등록되었습니다.");
        } catch (error) {
            console.error(error)
            toast.error("댓글 등록 중 오류가 발생했습니다.");
        } finally {
            setIsSubmittingComment(false);
        }
    };

    const handleLike = useCallback(async () => {
        if (!user || !id) {
            toast.error("좋아요를 누르려면 로그인이 필요합니다.");
            return;
        }
        const postRef = doc(db, "posts", id);
        try {
            if (isLiked) {
                await updateDoc(postRef, {
                    likes: arrayRemove(user.uid),
                    likeCount: increment(-1)
                });
            } else {
                await updateDoc(postRef, {
                    likes: arrayUnion(user.uid),
                    likeCount: increment(1)
                });
            }
        } catch (error) {
            toast.error("좋아요 처리 중 오류가 발생했습니다.");
            console.error(error);
        }
    }, [id, user, isLiked]);

    const handleDelete = useCallback(async () => {
        if (!id || !window.confirm("정말로 이 게시물을 삭제하시겠습니까?")) return;
        try {
            await deleteDoc(doc(db, "posts", id));
            toast.success("게시물이 삭제되었습니다.");
            navigate("/");
        } catch (error) {
            toast.error("게시물 삭제 중 오류가 발생했습니다.");
        }
    }, [id, navigate]);
    
    const formatDate = useCallback((timestamp: Timestamp | null) => {
        if (!timestamp) return '방금 전';
        const date = timestamp.toDate();
        const now = new Date();
        const diff = now.getTime() - date.getTime();

        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 7) return date.toLocaleDateString('ko-KR');
        if (days > 0) return `${days}일 전`;
        if (hours > 0) return `${hours}시간 전`;
        if (minutes > 0) return `${minutes}분 전`;
        return '방금 전';
    }, []);

    const handleStartChat = useCallback((targetUser: { uid: string, nickname: string, photoURL: string }) => {
        if (!user) {
            toast.error("채팅을 시작하려면 로그인이 필요합니다.");
            return;
        }
        if (user.uid === targetUser.uid) {
            toast.info("자기 자신과는 대화할 수 없습니다.");
            return;
        }
        openChatWithUser({
            uid: targetUser.uid,
            nickname: targetUser.nickname,
            photoURL: targetUser.photoURL,
            email: '' // Not needed for chat window
        });
    }, [user, openChatWithUser]);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <Loader2 className="h-10 w-10 animate-spin" />
            </div>
        );
    }
    
    if (!post) {
        return <div className="text-center py-10">게시물을 불러올 수 없습니다.</div>;
    }

    return (
        <div className="container mx-auto py-8 max-w-4xl">
            <PostCard 
                post={post}
                user={user}
                isLiked={isLiked}
                onLike={handleLike}
                onDelete={handleDelete}
                formatDate={formatDate}
                onStartChat={handleStartChat}
            />

            {/* Comments Section */}
            <div className="mt-8">
                <h2 className="text-xl font-bold mb-4">댓글 ({comments.length})</h2>
                <form onSubmit={handleCommentSubmit} className="flex flex-col gap-4 mb-6">
                    <Textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="따뜻한 응원의 댓글을 남겨주세요."
                        disabled={!user || isSubmittingComment}
                        rows={3}
                    />
                    <Button type="submit" className="self-end" disabled={!user || isSubmittingComment}>
                        {isSubmittingComment ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        댓글 등록
                    </Button>
                </form>
                <div className="space-y-4">
                    {comments.map(comment => (
                        <Card key={comment.id} className="bg-muted/50">
                            <CardHeader className="flex flex-row items-center gap-4 p-4">
                                <Avatar>
                                    <AvatarImage src={comment.authorPhotoURL} alt={comment.authorName} />
                                    <AvatarFallback>{comment.authorName.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="flex-grow">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <button className="font-semibold text-left hover:underline">
                                                {comment.authorName}
                                            </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                            {user && user.uid !== comment.authorId && (
                                                <DropdownMenuItem onSelect={() => handleStartChat({ uid: comment.authorId, nickname: comment.authorName, photoURL: comment.authorPhotoURL })}>
                                                    <MessageSquare className="mr-2 h-4 w-4" />
                                                    <span>대화하기</span>
                                                </DropdownMenuItem>
                                            )}
                                            <DropdownMenuItem onSelect={() => navigate(`/profile/${comment.authorId}`)}>
                                                <User className="mr-2 h-4 w-4" />
                                                <span>프로필 보기</span>
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                    <p className="text-xs text-muted-foreground">{formatDate(comment.createdAt)}</p>
                                </div>
                            </CardHeader>
                            <CardContent className="p-4 pt-0">
                                <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default PostPage; 