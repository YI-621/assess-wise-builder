import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface QuestionInput {
  id: string;
  text: string;
  marks: number;
  question_order: number;
}

interface AnalysisResult {
  question_id: string;
  bloom_level: string;
  difficulty: string;
  complexity: number;
  similarity_score: number;
  similar_to: string | null;
  keywords: string[];
  moderation_details: {
    grammar_errors: string;
    grammar_structure: string;
    relevancy_to_scope: string;
    suggestion: string;
    validated_bloom_keywords: string;
    raw_complexity: string;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { assessment_id } = await req.json();
    if (!assessment_id) throw new Error("assessment_id is required");

    // 1. Fetch assessment
    const { data: assessment, error: aErr } = await supabase
      .from("assessments")
      .select("*")
      .eq("id", assessment_id)
      .single();
    if (aErr) throw aErr;

    // 2. Fetch questions for this assessment
    const { data: questions, error: qErr } = await supabase
      .from("questions")
      .select("id, text, marks, question_order")
      .eq("assessment_id", assessment_id)
      .order("question_order");
    if (qErr) throw qErr;

    if (!questions || questions.length === 0) {
      return new Response(
        JSON.stringify({ error: "No questions found for this assessment" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Fetch existing exam questions for similarity comparison
    const { data: examQuestions } = await supabase
      .from("exam_questions")
      .select("question_id, question_text")
      .limit(500);

    const existingQuestionsContext = examQuestions && examQuestions.length > 0
      ? `\n\nEXISTING QUESTION BANK (for similarity comparison):\n${examQuestions.map((eq: any) => `- [${eq.question_id}]: ${eq.question_text}`).join("\n")}`
      : "\n\nNo existing question bank available for similarity comparison.";

    // 4. Build the AI prompt
    const questionsText = questions.map((q: QuestionInput, i: number) =>
      `Question ${i + 1} (ID: ${q.id}, ${q.marks} marks):\n${q.text}`
    ).join("\n\n");

    const systemPrompt = `You are an expert academic assessment moderator and quality assurance analyst. Your job is to analyze exam/assessment questions for quality, originality, and educational alignment.

For each question, you must evaluate:

1. **Bloom's Taxonomy Level**: Classify as exactly one of: Knowledge, Comprehension, Application, Analysis, Synthesis, Evaluation
2. **Difficulty**: Classify as exactly one of: Very Easy, Easy, Medium, Hard, Very Hard
3. **Complexity Score**: 0-100 integer representing cognitive demand
4. **Similarity**: Compare against the existing question bank. Score 0-100 (0=unique, 100=identical). If similar, identify which existing question.
5. **Keywords**: Extract 2-5 key academic terms
6. **Grammar & Spelling**: Identify any errors or awkward phrasing
7. **Suggestions**: Provide actionable improvement recommendations
8. **Module Relevancy**: Assess if the question is relevant to the module "${assessment.course}"

IMPORTANT: Use the tool calling format to return structured results.`;

    const userPrompt = `Analyze the following ${questions.length} assessment questions from "${assessment.title}" (Module: ${assessment.course}):

${questionsText}
${existingQuestionsContext}

Analyze each question thoroughly and return structured results.`;

    // 5. Call Lovable AI with tool calling for structured output
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "submit_analysis",
              description: "Submit the analysis results for all assessment questions",
              parameters: {
                type: "object",
                properties: {
                  results: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        question_id: { type: "string", description: "The question ID" },
                        bloom_level: { type: "string", enum: ["Knowledge", "Comprehension", "Application", "Analysis", "Synthesis", "Evaluation"] },
                        difficulty: { type: "string", enum: ["Very Easy", "Easy", "Medium", "Hard", "Very Hard"] },
                        complexity: { type: "integer", description: "Complexity score 0-100" },
                        similarity_score: { type: "integer", description: "Similarity score 0-100" },
                        similar_to: { type: "string", description: "ID or name of similar question, or null" },
                        keywords: { type: "array", items: { type: "string" }, description: "2-5 key terms" },
                        grammar_errors: { type: "string", description: "Grammar/spelling issues found, or 'None'" },
                        grammar_structure: { type: "string", description: "Assessment of sentence structure quality" },
                        relevancy_to_scope: { type: "string", description: "How relevant the question is to the module" },
                        suggestion: { type: "string", description: "Improvement suggestion, or 'N/A'" },
                        validated_bloom_keywords: { type: "string", description: "Keywords that justify the Bloom level" },
                        raw_complexity: { type: "string", description: "Explanation of complexity rating" },
                      },
                      required: ["question_id", "bloom_level", "difficulty", "complexity", "similarity_score", "keywords", "grammar_errors", "suggestion"],
                      additionalProperties: false,
                    },
                  },
                  overall_score: { type: "integer", description: "Overall assessment quality score 0-100" },
                  flagged: { type: "boolean", description: "Whether the assessment should be flagged for issues" },
                  flag_reason: { type: "string", description: "Reason for flagging, if applicable" },
                },
                required: ["results", "overall_score", "flagged"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "submit_analysis" } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ error: "AI usage limit reached. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errText = await aiResponse.text();
      console.error("AI gateway error:", status, errText);
      throw new Error(`AI analysis failed (${status})`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("AI did not return structured results");

    const analysis = JSON.parse(toolCall.function.arguments);
    const results: AnalysisResult[] = analysis.results;

    // 6. Update each question in the database
    for (const result of results) {
      const { error: updateErr } = await supabase
        .from("questions")
        .update({
          bloom_level: result.bloom_level,
          difficulty: result.difficulty,
          complexity: result.complexity,
          similarity_score: result.similarity_score,
          similar_to: result.similar_to || null,
          keywords: result.keywords,
          moderation_details: {
            question_id: result.question_id,
            grammar_errors: result.grammar_errors || "None",
            grammar_structure: result.grammar_structure || "N/A",
            relevancy_to_scope: result.relevancy_to_scope || "N/A",
            suggestion: result.suggestion || "N/A",
            validated_bloom_keywords: result.validated_bloom_keywords || "N/A",
            raw_complexity: result.raw_complexity || "N/A",
          },
        })
        .eq("id", result.question_id);

      if (updateErr) {
        console.error(`Failed to update question ${result.question_id}:`, updateErr);
      }
    }

    // 7. Update overall assessment score and flag status
    const { error: assessmentErr } = await supabase
      .from("assessments")
      .update({
        overall_score: analysis.overall_score,
        flagged: analysis.flagged,
        flag_reason: analysis.flag_reason || null,
      })
      .eq("id", assessment_id);

    if (assessmentErr) {
      console.error("Failed to update assessment:", assessmentErr);
    }

    return new Response(
      JSON.stringify({
        success: true,
        overall_score: analysis.overall_score,
        flagged: analysis.flagged,
        flag_reason: analysis.flag_reason,
        questions_analyzed: results.length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("moderate-assessment error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
