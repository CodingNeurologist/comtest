import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db, storage } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import SunEditor from 'suneditor-react';
import {ko} from 'suneditor/src/lang';
import 'suneditor/dist/css/suneditor.min.css';
import { CATEGORIES } from "@/lib/constants";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

const postCategories = CATEGORIES.filter(c => c !== "전체");
const imageTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const EditPostPage = () => {
    const { id } = useParams<{ id: string }>();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    useEffect(() => {
        if (!id || !user) return;
        const fetchPost = async () => {
            setLoading(true);
            const postRef = doc(db, "posts", id);
            const postSnap = await getDoc(postRef);

            if (postSnap.exists()) {
                const postData = postSnap.data();
                if (postData.authorId !== user.uid) {
                    toast.error("수정 권한이 없습니다.");
                    navigate(`/post/${id}`);
                    return;
                }
                setTitle(postData.title);
                setContent(postData.content);
                setSelectedTags(postData.tags || []);
            } else {
                toast.error("게시물을 찾을 수 없습니다.");
                navigate("/");
            }
            setLoading(false);
        };
        fetchPost();
    }, [id, user, navigate]);

    const handleImageUploadBefore = (files: File[], _info: object, uploadHandler: (response: {
        result: { url: string; name: string; size: number }[]
    }) => void) => {
        const uploadPromises = files.map(file => {
            return new Promise<{ url: string; name: string; size: number }>((resolve, reject) => {
                if (!user) return reject(new Error("로그인이 필요합니다."));
                if (!imageTypes.includes(file.type)) return reject(new Error("지원되지 않는 파일 형식입니다."));
                if (file.size > MAX_IMAGE_SIZE) return reject(new Error(`이미지 파일 크기는 5MB를 초과할 수 없습니다.`));

                toast.info(`'${file.name}' 이미지를 업로드하는 중입니다...`);
                const storageRef = ref(storage, `images/${user.uid}/${Date.now()}_${file.name}`);

                uploadBytes(storageRef, file)
                    .then(snapshot => getDownloadURL(snapshot.ref))
                    .then(url => {
                        toast.success(`'${file.name}' 이미지 업로드가 완료되었습니다.`);
                        resolve({ url, name: file.name, size: file.size });
                    })
                    .catch(error => {
                        toast.error(`'${file.name}' 이미지 업로드에 실패했습니다.`);
                        reject(error);
                    });
            });
        });

        Promise.all(uploadPromises)
            .then(results => uploadHandler({ result: results }))
            .catch(error => {
                toast.error(error.message || "이미지 업로드 중 오류가 발생했습니다.");
                uploadHandler({ result: [] });
            });

        return undefined;
    };

    const handleTagClick = (tag: string) => {
        setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || selectedTags.length === 0 || !content || content.replace(/<(.|\n)*?>/g, '').trim().length === 0) {
            toast.error("제목, 태그, 내용은 필수 항목입니다.");
            return;
        }

        setIsSubmitting(true);
        const postRef = doc(db, "posts", id!);
        try {
            await updateDoc(postRef, {
                title,
                content,
                tags: selectedTags,
                updatedAt: serverTimestamp(),
            });
            toast.success("게시물이 성공적으로 수정되었습니다.");
            navigate(`/post/${id}`);
        } catch (error) {
            toast.error("게시물 수정 중 오류가 발생했습니다.");
        } finally {
            setIsSubmitting(false);
        }
    };
    
    if (loading) {
        return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    return (
        <div className="container mx-auto py-8 max-w-4xl">
            <form onSubmit={handleSubmit}>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-2xl font-bold">게시글 수정</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <label htmlFor="title" className="text-sm font-medium">제목</label>
                            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="글의 제목을 입력하세요" className="text-xl" disabled={isSubmitting}/>
                        </div>
                        <div className="space-y-2">
                             <label className="text-sm font-medium">태그 선택</label>
                             <div className="flex flex-wrap gap-2">
                                {postCategories.map(category => (
                                    <Button type="button" key={category} variant={selectedTags.includes(category) ? "default" : "outline"} onClick={() => handleTagClick(category)} disabled={isSubmitting}>
                                        {category}
                                    </Button>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-2" id="suneditor-wrapper">
                            <label className="text-sm font-medium">내용</label>
                            <SunEditor
                                lang={ko}
                                setOptions={{
                                    height: '300',
                                    buttonList: [
                                        ['font', 'fontSize', 'formatBlock'],
                                        ['bold', 'underline', 'italic', 'strike'],
                                        ['align', 'list'],
                                        ['image', 'video'],
                                        ['undo', 'redo'],
                                    ],
                                    videoFileInput: false,
                                }}
                                setContents={content}
                                onChange={setContent}
                                onImageUploadBefore={handleImageUploadBefore}
                            />
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => navigate(`/post/${id}`)} disabled={isSubmitting}>취소</Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} 수정하기
                        </Button>
                    </CardFooter>
                </Card>
            </form>
        </div>
    );
};

export default EditPostPage; 