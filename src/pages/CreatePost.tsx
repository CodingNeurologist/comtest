import { useState } from "react";
import { db, storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import SunEditor from 'suneditor-react';
import {ko} from 'suneditor/src/lang';
import 'suneditor/dist/css/suneditor.min.css'; // Import SunEditor CSS
import { CATEGORIES } from "@/lib/constants";

const postCategories = CATEGORIES.filter(c => c !== "전체");
const imageTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const CreatePost = () => {
    const { user, userProfile } = useAuth();
    const navigate = useNavigate();
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

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
        if (!user || !userProfile?.nickname) {
            toast.error("사용자 정보가 올바르지 않습니다. 다시 로그인해주세요.");
            return;
        }

        setIsSubmitting(true);
        try {
            await addDoc(collection(db, "posts"), {
                title,
                content,
                authorId: user.uid,
                authorName: userProfile.nickname,
                authorPhotoURL: user.photoURL || "",
                tags: selectedTags,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                likeCount: 0,
                commentCount: 0,
            });
            toast.success("게시글이 성공적으로 작성되었습니다.");
            navigate("/");
        } catch (err) {
            toast.error("게시글 작성에 실패했습니다.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="container mx-auto py-8 max-w-4xl">
            <form onSubmit={handleSubmit}>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-2xl font-bold">새 글 작성하기</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <label htmlFor="title" className="text-sm font-medium">제목</label>
                            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="글의 제목을 입력하세요" required disabled={isSubmitting} className="text-xl" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">태그 선택</label>
                            <div className="flex flex-wrap gap-2">
                                {postCategories.map(category => (
                                    <Button type="button" key={category} variant={selectedTags.includes(category) ? "default" : "outline"} onClick={() => handleTagClick(category)}>
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
                    <CardFooter className="flex justify-end">
                        <Button type="submit" size="lg" disabled={isSubmitting}>
                            {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> 발행 중...</> : "글 발행하기"}
                        </Button>
                    </CardFooter>
                </Card>
            </form>
        </div>
    );
};

export default CreatePost; 