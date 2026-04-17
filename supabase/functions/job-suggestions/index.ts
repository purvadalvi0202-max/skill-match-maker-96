import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { candidateName, skills, experience, education } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const prompt = `You are a career advisor. Suggest 5 realistic job roles that match this candidate's SKILLSET.

IMPORTANT RULES:
- Prioritize SKILLS over formal education. Many talented students/self-taught candidates lack degrees but have strong skills — recommend roles they can actually get.
- Include a healthy mix: entry-level / junior / intern roles (no degree required) AND mid-level roles where relevant.
- Be realistic about the level based on experience keywords. If experience is empty/low, lean toward intern, trainee, junior, freelance, or apprentice roles.
- For each role, list 2-4 key matching skills from the candidate.

Candidate: ${candidateName}
Skills: ${skills || "none detected"}
Experience keywords: ${experience || "none — likely entry-level / student"}
Education: ${education || "no formal degree listed"}

Return ONLY valid JSON in this exact shape (no markdown, no prose):
{
  "suggestions": [
    {
      "title": "Job title",
      "level": "Intern" | "Junior" | "Mid" | "Senior" | "Freelance",
      "match_percent": 0-100,
      "matching_skills": ["skill1", "skill2"],
      "why": "One short sentence on why this fits."
    }
  ]
}`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a practical career advisor focused on skill-based hiring." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (resp.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (resp.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted. Add funds in Settings → Workspace → Usage." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!resp.ok) {
      const t = await resp.text();
      console.error("AI gateway error:", resp.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content ?? "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(content); } catch { parsed = { suggestions: [] }; }

    return new Response(JSON.stringify({ suggestions: parsed.suggestions || [] }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("job-suggestions error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
