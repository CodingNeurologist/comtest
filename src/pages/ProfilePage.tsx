import { useState, useRef, useEffect } from "react";
import { db, storage } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const symptomsList = ["현기증", "두통", "피로", "소화 불량", "심계항진", "기타"];

const ProfilePage = () => {
    const { user, userProfile, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Form state
    const [nickname, setNickname] = useState("");
    const [condition, setCondition] = useState(5);
    const [sleepHours, setSleepHours] = useState("");
    const [waterIntake, setWaterIntake] = useState("");
    const [stressLevel, setStressLevel] = useState("low");
    const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
    const [otherSymptom, setOtherSymptom] = useState("");

    // Image upload state
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (userProfile) {
            setNickname(userProfile.nickname || "");
            setPreviewUrl(userProfile.photoURL || null);
            setCondition(userProfile.condition || 5);
            setSleepHours(userProfile.sleepHours?.toString() || "");
            setWaterIntake(userProfile.waterIntake?.toString() || "");
            setStressLevel(userProfile.stressLevel || "low");
            
            const symptoms = userProfile.symptoms || [];
            const knownSymptoms = symptoms.filter((s: string) => symptomsList.includes(s));
            const other = symptoms.find((s: string) => !symptomsList.includes(s));
            if (other) {
                knownSymptoms.push("기타");
                setOtherSymptom(other);
            }
            setSelectedSymptoms(knownSymptoms);
        }
    }, [userProfile]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
        if (!allowedTypes.includes(file.type)) {
            toast.error("지원하지 않는 파일 형식입니다. (jpeg, png, webp, gif)"); return;
        }
        if (file.size > 10 * 1024 * 1024) {
            toast.error("이미지 파일 크기는 10MB를 초과할 수 없습니다."); return;
        }

        setImageFile(file);
        setPreviewUrl(URL.createObjectURL(file));
    };
    
    const handleSymptomChange = (symptom: string) => {
        setSelectedSymptoms(prev =>
            prev.includes(symptom)
                ? prev.filter(s => s !== symptom)
                : [...prev, symptom]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setIsSubmitting(true);

        try {
            let photoURL = userProfile?.photoURL;
            let photoStoragePath = userProfile?.photoStoragePath;

            if (imageFile) {
                if (userProfile?.photoStoragePath) {
                    try {
                        await deleteObject(ref(storage, userProfile.photoStoragePath));
                    } catch (error) { console.warn("Old image deletion failed:", error); }
                }
                const newImageRef = ref(storage, `profile_images/${user.uid}/${Date.now()}_${imageFile.name}`);
                await uploadBytes(newImageRef, imageFile);
                photoURL = await getDownloadURL(newImageRef);
                photoStoragePath = newImageRef.fullPath;
            }

            const symptoms = selectedSymptoms.includes("기타")
                ? [...selectedSymptoms.filter(s => s !== "기타"), otherSymptom].filter(Boolean)
                : selectedSymptoms;

            await updateDoc(doc(db, "users", user.uid), {
                nickname,
                photoURL,
                photoStoragePath,
                condition,
                sleepHours: Number(sleepHours) || 0,
                waterIntake: Number(waterIntake) || 0,
                stressLevel,
                symptoms,
            });

            toast.success("프로필이 성공적으로 업데이트되었습니다.");
            navigate(`/`);
        } catch (error) {
            console.error("Error updating profile:", error);
            toast.error("프로필 업데이트 중 오류가 발생했습니다.");
        } finally {
            setIsSubmitting(false);
            setImageFile(null);
        }
    };
    
    if (authLoading) return <div className="flex justify-center items-center h-screen"><Loader2 className="h-10 w-10 animate-spin" /></div>;

    return (
        <div className="container mx-auto py-8 max-w-2xl">
            <Card>
                <CardHeader>
                    <CardTitle>프로필 수정</CardTitle>
                    <CardDescription>회원님의 프로필과 건강 상태를 업데이트해주세요.</CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-8">
                        <div className="flex flex-col items-center gap-4">
                            <div className="relative">
                                <Avatar className="h-32 w-32">
                                    <AvatarImage src={previewUrl || undefined} alt="Profile" />
                                    <AvatarFallback className="text-4xl">
                                        {nickname?.charAt(0) || user?.email?.charAt(0)}
                                    </AvatarFallback>
                                </Avatar>
                                <Button
                                    type="button"
                                    variant="outline" 
                                    size="icon" 
                                    className="absolute bottom-1 right-1 rounded-full"
                                    onClick={() => fileInputRef.current?.click()}>
                                    <Camera className="h-5 w-5" />
                                </Button>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    accept="image/png, image/jpeg, image/webp, image/gif"
                                    className="hidden"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="nickname">닉네임</Label>
                            <Input id="nickname" value={nickname} onChange={(e) => setNickname(e.target.value)} required />
                        </div>
                        <div className="space-y-2">
                            <Label>오늘의 컨디션은 어떤가요? (1: 나쁨, 10: 좋음) [{condition}]</Label>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="sleepHours">어젯밤 수면 시간 (시간)</Label>
                            <Input id="sleepHours" value={sleepHours} onChange={(e) => setSleepHours(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="waterIntake">오늘 섭취한 물의 양 (ml)</Label>
                            <Input id="waterIntake" value={waterIntake} onChange={(e) => setWaterIntake(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>오늘 느낀 스트레스 수준</Label>
                            <RadioGroup value={stressLevel} onValueChange={setStressLevel} className="flex space-x-4">
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="low" id="stress-low" />
                                    <Label htmlFor="stress-low">낮음</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="medium" id="stress-medium" />
                                    <Label htmlFor="stress-medium">중간</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="high" id="stress-high" />
                                    <Label htmlFor="stress-high">높음</Label>
                                </div>
                            </RadioGroup>
                        </div>
                        <div className="space-y-2">
                            <Label>오늘 겪은 주요 증상을 선택해주세요. (복수 선택 가능)</Label>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                {symptomsList.map((symptom) => (
                                    <div key={symptom} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={`profile-${symptom}`}
                                            checked={selectedSymptoms.includes(symptom)}
                                            onCheckedChange={() => handleSymptomChange(symptom)}
                                        />
                                        <Label htmlFor={`profile-${symptom}`} className="font-normal">{symptom}</Label>
                                    </div>
                                ))}
                            </div>
                            {selectedSymptoms.includes("기타") && (
                                <Input type="text" placeholder="기타 증상을 입력하세요" value={otherSymptom} onChange={(e) => setOtherSymptom(e.target.value)} className="mt-2" />
                            )}
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button type="submit" disabled={isSubmitting} className="w-full">
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            변경사항 저장
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
};

export default ProfilePage; 