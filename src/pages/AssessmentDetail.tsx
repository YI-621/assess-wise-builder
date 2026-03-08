import { useSearchParams, useNavigate } from "react-router-dom";
import { QuestionCard } from "@/components/moderate/QuestionCard";
import { AssessmentSummary } from "@/components/moderate/AssessmentSummary";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useAssessmentWithQuestions, useModerationComments } from "@/hooks/useData";
import { sampleAssessments } from "@/lib/mockData";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusStyles: Record<string, string> = {
  Pending: "bg-warning/10 text-warning border-warning/20",
  Reviewed: "bg-info/10 text-info border-info/20",
  Approved: "bg-success/10 text-success border-success/20",
  Rejected: "bg-destructive/10 text-destructive border-destructive/20",
};

const AssessmentDetail = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const id = searchParams.get("id");

  const { data: dbAssessment, isLoading } = useAssessmentWithQuestions(id);
  const mockAssessment = sampleAssessments.find((a) => a.id === id) || sampleAssessments[0];
  const assessment = dbAssessment ?? mockAssessment;

  const questionIds = assessment?.questions.map((q) => q.id) ?? [];
  const { data: dbComments } = useModerationComments(questionIds);

  const commentsMap: Record<string, string> = {};
  dbComments?.forEach((c) => { commentsMap[c.question_id] = c.comment; });

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!assessment) {
    return <div className="text-center py-20 text-muted-foreground">Assessment not found.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-foreground">{assessment.title}</h2>
              <Badge variant="outline" className={cn("text-[10px] font-medium border", statusStyles[assessment.status])}>
                {assessment.status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {assessment.course} · {assessment.date}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          {assessment.questions.length > 0 ? (
            assessment.questions.map((q, i) => (
              <QuestionCard
                key={q.id}
                question={q}
                index={i}
                comment={commentsMap[q.id] || ""}
                onCommentChange={() => {}}
                readOnly
              />
            ))
          ) : (
            <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
              <p className="text-sm">No moderation results available yet.</p>
              <p className="text-xs mt-1">Results will appear here once the assessment has been moderated.</p>
            </div>
          )}
        </div>
        <div className="space-y-4">
          <AssessmentSummary assessment={assessment} />
          {assessment.flagged && assessment.flagReason && (
            <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4">
              <p className="text-xs font-semibold text-destructive mb-1">⚠ Flagged</p>
              <p className="text-sm text-destructive/80">{assessment.flagReason}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AssessmentDetail;
