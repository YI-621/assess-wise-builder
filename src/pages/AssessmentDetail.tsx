import { useSearchParams, useNavigate } from "react-router-dom";
import { QuestionCard } from "@/components/moderate/QuestionCard";
import { AssessmentSummary } from "@/components/moderate/AssessmentSummary";
import { PendingModerationScreen } from "@/components/assessment/PendingModerationScreen";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, MessageSquare } from "lucide-react";
import { useAssessmentWithQuestions, useModerationComments, useSaveComment } from "@/hooks/useData";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";

const statusStyles: Record<string, string> = {
  Pending: "bg-warning/10 text-warning border-warning/20",
  Reviewed: "bg-info/10 text-info border-info/20",
  Approved: "bg-success/10 text-success border-success/20",
  Rejected: "bg-destructive/10 text-destructive border-destructive/20",
};

interface CommentWithAuthor {
  id: string;
  comment: string;
  user_id: string;
  author_name: string;
  role: string;
  created_at: string;
}

const AssessmentDetail = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const id = searchParams.get("id");
  const { user, isAdmin } = useAuth();

  const { data: assessment, isLoading } = useAssessmentWithQuestions(id);

  const questionIds = assessment?.questions.map((q) => q.id) ?? [];
  const { data: dbComments } = useModerationComments(questionIds);
  const saveComment = useSaveComment();

  // Admin comment state
  const [adminComments, setAdminComments] = useState<Record<string, string>>({});

  // Load existing admin comments
  useEffect(() => {
    if (dbComments && user && isAdmin) {
      const map: Record<string, string> = {};
      dbComments.filter((c) => c.user_id === user.id).forEach((c) => { map[c.question_id] = c.comment; });
      setAdminComments((prev) => ({ ...map, ...prev }));
    }
  }, [dbComments, user, isAdmin]);

  const handleAdminCommentChange = (questionId: string, value: string) => {
    setAdminComments((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleAdminCommentBlur = (questionId: string) => {
    const comment = adminComments[questionId];
    if (comment !== undefined) {
      saveComment.mutate({ questionId, comment });
    }
  };

  // Fetch author names and roles for all commenters
  const commenterIds = [...new Set(dbComments?.map((c) => c.user_id) ?? [])];
  const { data: commenterProfiles } = useQuery({
    queryKey: ["commenter-profiles", commenterIds],
    enabled: commenterIds.length > 0,
    queryFn: async () => {
      const [profilesRes, rolesRes] = await Promise.all([
        supabase.from("profiles").select("user_id, full_name").in("user_id", commenterIds),
        supabase.from("user_roles").select("user_id, role").in("user_id", commenterIds),
      ]);
      const profileMap = new Map((profilesRes.data ?? []).map((p: any) => [p.user_id, p.full_name ?? "Unknown"]));
      const roleMap = new Map((rolesRes.data ?? []).map((r: any) => [r.user_id, r.role]));
      return { profileMap, roleMap };
    },
  });

  // Group comments by question_id with author info
  const commentsPerQuestion: Record<string, CommentWithAuthor[]> = {};
  dbComments?.forEach((c) => {
    if (!commentsPerQuestion[c.question_id]) commentsPerQuestion[c.question_id] = [];
    commentsPerQuestion[c.question_id].push({
      id: c.id,
      comment: c.comment,
      user_id: c.user_id,
      author_name: commenterProfiles?.profileMap.get(c.user_id) ?? "Unknown",
      role: commenterProfiles?.roleMap.get(c.user_id) ?? "unknown",
      created_at: c.created_at,
    });
  });

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
              <div key={q.id} className="space-y-0">
                <QuestionCard
                  question={q}
                  index={i}
                  readOnly
                />
                {/* Display existing comments (excluding admin's own if admin, since they have the input below) */}
                {commentsPerQuestion[q.id] && commentsPerQuestion[q.id].filter((c) => !(isAdmin && c.user_id === user?.id)).length > 0 && (
                  <div className="rounded-b-xl border border-t-0 border-border bg-muted/20 px-5 py-3 space-y-3">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs font-medium text-muted-foreground">
                        Comments ({commentsPerQuestion[q.id].filter((c) => !(isAdmin && c.user_id === user?.id)).length})
                      </span>
                    </div>
                    {commentsPerQuestion[q.id].filter((c) => !(isAdmin && c.user_id === user?.id)).map((c) => (
                      <div key={c.id} className="rounded-lg border border-border bg-card p-3">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-xs font-semibold text-card-foreground">{c.author_name}</span>
                          <Badge variant="outline" className={cn(
                            "text-[9px] font-medium border px-1.5 py-0",
                            c.role === "admin" ? "bg-primary/10 text-primary border-primary/20" :
                            c.role === "moderator" ? "bg-info/10 text-info border-info/20" :
                            "bg-muted text-muted-foreground border-border"
                          )}>
                            {c.role === "admin" ? "Admin" : c.role === "moderator" ? "Moderator" : c.role}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground ml-auto">
                            {new Date(c.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-card-foreground">{c.comment || "No comment provided."}</p>
                      </div>
                    ))}
                  </div>
                )}
                {(!commentsPerQuestion[q.id] || commentsPerQuestion[q.id].filter((c) => !(isAdmin && c.user_id === user?.id)).length === 0) && !isAdmin && (
                  <div className="rounded-b-xl border border-t-0 border-border bg-muted/20 px-5 py-3">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground italic">No comments yet.</span>
                    </div>
                  </div>
                )}

                {/* Admin comment input */}
                {isAdmin && (
                  <div className={cn(
                    "border border-t-0 border-border bg-muted/10 px-5 py-3",
                    (!commentsPerQuestion[q.id] || commentsPerQuestion[q.id].filter((c) => !(isAdmin && c.user_id === user?.id)).length === 0) ? "rounded-b-xl" : ""
                  )}>
                    <div className="flex items-center gap-2 mb-2">
                      <MessageSquare className="h-3.5 w-3.5 text-primary" />
                      <span className="text-xs font-medium text-primary">Admin Comment</span>
                    </div>
                    <textarea
                      value={adminComments[q.id] || ""}
                      onChange={(e) => handleAdminCommentChange(q.id, e.target.value)}
                      onBlur={() => handleAdminCommentBlur(q.id)}
                      placeholder="Add an admin comment for this question..."
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none min-h-[60px]"
                    />
                  </div>
                )}
              </div>
            ))
          ) : (
            <PendingModerationScreen />
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