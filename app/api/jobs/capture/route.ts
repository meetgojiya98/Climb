import { NextRequest } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { fail, ok, parseJsonBody } from "@/lib/api-contract"
import { checkRateLimit } from "@/lib/request-guard"

const CaptureSchema = z.object({
  source: z.string().min(2).max(60),
  title: z.string().min(2).max(200),
  company: z.string().min(1).max(140),
  location: z.string().max(120).optional(),
  url: z.string().url().max(1000).optional(),
  salaryRange: z.string().max(120).optional(),
  description: z.string().max(4000).optional(),
})

function getClientIp(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "0.0.0.0"
}

export async function POST(request: NextRequest) {
  const rate = checkRateLimit(`jobs-capture:${getClientIp(request)}`, 80, 60_000)
  if (!rate.allowed) return fail("Rate limit exceeded", 429, { resetAt: rate.resetAt })

  try {
    const body = await parseJsonBody(request, CaptureSchema)
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return fail("Unauthorized", 401)

    if (body.url) {
      const existing = await supabase
        .from("saved_jobs")
        .select("id, company, position, job_url")
        .eq("user_id", user.id)
        .eq("job_url", body.url)
        .limit(1)
        .maybeSingle()

      if (!existing.error && existing.data) {
        return ok({
          success: true,
          duplicate: true,
          savedJob: existing.data,
          message: "This job is already captured in Saved Jobs.",
        })
      }
    }

    const inserted = await supabase
      .from("saved_jobs")
      .insert({
        user_id: user.id,
        company: body.company.trim(),
        position: body.title.trim(),
        location: body.location?.trim() || null,
        salary_range: body.salaryRange?.trim() || null,
        job_url: body.url?.trim() || null,
        description: body.description?.trim() || null,
        notes: `[captured:${body.source.trim()}] Added via browser extension`,
      })
      .select("id, company, position, location, salary_range, job_url, created_at")
      .single()

    if (inserted.error) {
      const message = String(inserted.error.message || "").toLowerCase()
      if (message.includes("notes")) {
        const fallback = await supabase
          .from("saved_jobs")
          .insert({
            user_id: user.id,
            company: body.company.trim(),
            position: body.title.trim(),
            location: body.location?.trim() || null,
            salary_range: body.salaryRange?.trim() || null,
            job_url: body.url?.trim() || null,
            description: body.description?.trim() || null,
          })
          .select("id, company, position, location, salary_range, job_url, created_at")
          .single()
        if (fallback.error) return fail(String(fallback.error.message || "Failed to capture job"), 500)
        return ok({ success: true, duplicate: false, savedJob: fallback.data })
      }
      return fail(String(inserted.error.message || "Failed to capture job"), 500)
    }

    return ok({
      success: true,
      duplicate: false,
      savedJob: inserted.data,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to capture job"
    return fail(message, 500)
  }
}
