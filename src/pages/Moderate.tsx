import { useSearchParams } from "react-router-dom";
import { QuestionCard } from "@/components/moderate/QuestionCard";
import { AssessmentSummary } from "@/components/moderate/AssessmentSummary";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useAssessmentWithQuestions, useModerationComments, useSaveComment, useUpdateAssessmentStatus, useLogActivity } from "@/hooks/useData";
import { sampleAssessments } from "@/lib/mockData";
import { useToast } from "@/hooks/use-toast";

const Moderate = () => {
  const [searchParams] = useSearchParams();
  const id = searchParams.get("id");
  const { toast } = useToast();

  // Try DB first, fall back to mock
  const { data: dbAssessment, isLoading } = useAssessmentWithQuestions(id);
  const mockAssessment = sampleAssessments.find((a) => a.id === id) || sampleAssessments[0];
  const assessment = dbAssessment ?? mockAssessment;

  const questionIds = assessment?.questions.map((q) => q.id) ?? [];
  const { data: dbComments } = useModerationComments(questionIds);
  const saveComment = useSaveComment();
  const updateStatus = useUpdateAssessmentStatus();
  const logActivity = useLogActivity();

  const [comments, setComments] = useState<Record<string, string>>({});

  // Populate comments from DB
  useEffect(() => {
    if (dbComments) {
      const map: Record<string, string> = {};
      dbComments.forEach((c) => { map[c.question_id] = c.comment; });
      setComments((prev) => ({ ...map, ...prev }));
    }
  }, [dbComments]);

  const handleCommentChange = (questionId: string, value: string) => {
    setComments((prev) => ({ ...prev, [questionId]: value }));
    // Debounced save - save on blur instead
  };

  const handleCommentBlur = (questionId: string) => {
    const comment = comments[questionId];
    if (comment !== undefined) {
      saveComment.mutate({ questionId, comment });
    }
  };

  const handleDone = () => {
    if (id && dbAssessment) {
      updateStatus.mutate({ id, status: "Reviewed" });
      logActivity.mutate({ type: "moderation_complete", description: `${assessment.title} moderation completed`, assessmentId: id });
      toast({ title: "Assessment marked as reviewed" });
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!assessment) {
    return <div className="text-center py-20 text-muted-foreground">Assessment not found.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">{assessment.title}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {assessment.course} · {assessment.lecturer} · {assessment.date}
          </p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={handleDone}>
          <CheckCircle className="h-3.5 w-3.5" /> Done
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          {assessment.questions.map((q, i) => (
            <QuestionCard
              key={q.id}
              question={q}
              index={i}
              comment={comments[q.id] || ""}
              onCommentChange={(val) => handleCommentChange(q.id, val)}
              onCommentBlur={() => handleCommentBlur(q.id)}
            />
          ))}
        </div>
        <div className="space-y-4">
          <AssessmentSummary assessment={assessment} />
        </div>
      </div>
    </div>
  );
};

export default Moderate;
