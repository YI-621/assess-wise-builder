import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { Search, Upload, Loader2 } from "lucide-react";
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useAssessmentsWithQuestions, useLogActivity } from "@/hooks/useData";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { sampleAssessments } from "@/lib/mockData";

const statusStyles: Record<string, string> = {
  Pending: "bg-warning/10 text-warning border-warning/20",
  Reviewed: "bg-info/10 text-info border-info/20",
  Approved: "bg-success/10 text-success border-success/20",
  Rejected: "bg-destructive/10 text-destructive border-destructive/20",
};

const Assessments = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const { user } = useAuth();
  const { toast } = useToast();
  const logActivity = useLogActivity();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const { data: dbAssessments, isLoading } = useAssessmentsWithQuestions();

  // Use DB data if available, else fall back to mock
  const assessments = dbAssessments && dbAssessments.length > 0 ? dbAssessments : sampleAssessments;

  const filtered = assessments.filter(
    (a) =>
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.lecturer.toLowerCase().includes(search.toLowerCase()) ||
      a.course.toLowerCase().includes(search.toLowerCase())
  );

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    try {
      // Insert a new assessment record
      const { data: newAssessment, error } = await supabase
        .from("assessments")
        .insert({
          title: file.name.replace(/\.[^/.]+$/, ""),
          course: "Uploaded Assessment",
          lecturer_id: user.id,
          status: "Pending",
        })
        .select()
        .single();

      if (error) throw error;

      logActivity.mutate({
        type: "upload",
        description: `${newAssessment.title} uploaded`,
        assessmentId: newAssessment.id,
      });

      queryClient.invalidateQueries({ queryKey: ["assessments"] });
      queryClient.invalidateQueries({ queryKey: ["assessments-full"] });
      toast({ title: "Assessment uploaded", description: "Your assessment has been submitted for moderation." });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Assessments</h2>
          <p className="text-sm text-muted-foreground mt-1">All submitted assessments for moderation</p>
        </div>
        <div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
            accept=".pdf,.doc,.docx,.xlsx,.csv"
          />
          <Button className="gap-2" onClick={handleUploadClick} disabled={uploading}>
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Upload Assessment
          </Button>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search assessments..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-input bg-card pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {["Title", "Course", "Lecturer", "Date", "Questions", "Score", "Status"].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((a) => (
                <tr
                  key={a.id}
                  className="hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => navigate(`/moderate?id=${a.id}`)}
                >
                  <td className="px-5 py-3.5 text-sm font-medium text-card-foreground">{a.title}</td>
                  <td className="px-5 py-3.5 text-sm text-muted-foreground">{a.course}</td>
                  <td className="px-5 py-3.5 text-sm text-muted-foreground">{a.lecturer}</td>
                  <td className="px-5 py-3.5 text-sm text-muted-foreground font-mono">{a.date}</td>
                  <td className="px-5 py-3.5 text-sm text-muted-foreground font-mono">{a.questions.length}</td>
                  <td className="px-5 py-3.5">
                    <span className={cn("text-sm font-bold font-mono", a.overallScore >= 70 ? "text-success" : a.overallScore >= 50 ? "text-warning" : "text-destructive")}>
                      {a.overallScore}%
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <Badge variant="outline" className={cn("text-[10px] font-medium border", statusStyles[a.status])}>
                      {a.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-12 text-center text-sm text-muted-foreground">No assessments found.</div>
          )}
        </div>
      )}
    </div>
  );
};

export default Assessments;
