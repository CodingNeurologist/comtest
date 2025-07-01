import { useState } from "react";
import { db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

const symptomsList = ["현기증", "두통", "피로", "소화 불량", "심계항진", "기타"];

const SurveyPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [nickname, setNickname] = useState("");
  const [condition, setCondition] = useState(5);
  const [sleepHours, setSleepHours] = useState("");
  const [waterIntake, setWaterIntake] = useState("");
  const [stressLevel, setStressLevel] = useState(5);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [otherSymptom, setOtherSymptom] = useState("");

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSymptomChange = (symptom: string) => {
    setSelectedSymptoms((prev) =>
      prev.includes(symptom)
        ? prev.filter((item) => item !== symptom)
        : [...prev, symptom]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!nickname || !sleepHours || !waterIntake || selectedSymptoms.length === 0) {
      setError("모든 필드를 채워주세요.");
      return;
    }
    if (user) {
      setIsSubmitting(true);
      try {
        const surveyData = {
          nickname,
          condition,
          sleepHours: Number(sleepHours),
          waterIntake: Number(waterIntake),
          stressLevel,
          symptoms: selectedSymptoms.includes("기타") 
            ? [...selectedSymptoms.filter(s => s !== "기타"), otherSymptom] 
            : selectedSymptoms,
        };
        const userDocRef = doc(db, "users", user.uid);
        await updateDoc(userDocRef, surveyData);
        
        toast.success("회원가입이 성공적으로 완료되었습니다!");
        
        navigate("/");
      } catch (err) {
        console.error(err);
        setError("프로필 업데이트에 실패했습니다. 다시 시도해주세요.");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  if (!user) {
    // This case should ideally not be hit if ProtectedRoute works correctly,
    // but it's good practice to have it.
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>You must be logged in to complete the survey.</p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-12" style={{ minHeight: 'calc(100vh - 5rem)'}}>
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>프로필 작성</CardTitle>
          <CardDescription>
            정확한 상태 파악을 위해 몇 가지 질문에 답변해주세요.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="grid gap-6">
            <div className="grid gap-2">
                <Label htmlFor="nickname">닉네임</Label>
                <Input id="nickname" type="text" value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="사용하실 닉네임을 입력하세요" required disabled={isSubmitting} />
            </div>
            <div className="grid gap-2">
              <Label>오늘의 컨디션은 어떤가요? (1: 나쁨, 10: 좋음)</Label>
              <Slider defaultValue={[5]} max={10} min={1} step={1} onValueChange={(value) => setCondition(value[0])} disabled={isSubmitting} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                    <Label htmlFor="sleepHours">어젯밤 수면 시간 (시간)</Label>
                    <Input id="sleepHours" type="number" value={sleepHours} onChange={(e) => setSleepHours(e.target.value)} placeholder="예: 8" required disabled={isSubmitting} />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="waterIntake">오늘 섭취한 물의 양 (ml)</Label>
                    <Input id="waterIntake" type="number" value={waterIntake} onChange={(e) => setWaterIntake(e.target.value)} placeholder="예: 1500" required disabled={isSubmitting} />
                </div>
            </div>
            <div className="grid gap-2">
              <Label>오늘 느낀 스트레스 수준 (1: 낮음, 10: 높음)</Label>
              <Slider defaultValue={[5]} max={10} min={1} step={1} onValueChange={(value) => setStressLevel(value[0])} disabled={isSubmitting} />
            </div>
            <div className="grid gap-2">
              <Label>오늘 겪은 주요 증상을 선택해주세요. (복수 선택 가능)</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {symptomsList.map((symptom) => (
                  <div key={symptom} className="flex items-center space-x-2">
                    <Checkbox
                      id={symptom}
                      onCheckedChange={() => handleSymptomChange(symptom)}
                      disabled={isSubmitting}
                    />
                    <Label htmlFor={symptom} className="font-normal">{symptom}</Label>
                  </div>
                ))}
              </div>
              {selectedSymptoms.includes("기타") && (
                <Input type="text" placeholder="기타 증상을 입력하세요" value={otherSymptom} onChange={(e) => setOtherSymptom(e.target.value)} className="mt-2" disabled={isSubmitting} />
              )}
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSubmitting ? "제출 중..." : "제출하기"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default SurveyPage; 