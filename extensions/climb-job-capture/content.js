function textContentOf(selectors) {
  for (const selector of selectors) {
    const element = document.querySelector(selector)
    if (element && element.textContent) {
      const value = element.textContent.replace(/\s+/g, " ").trim()
      if (value) return value
    }
  }
  return ""
}

function inferSource(hostname) {
  const host = String(hostname || "").toLowerCase()
  if (host.includes("linkedin")) return "LinkedIn"
  if (host.includes("indeed")) return "Indeed"
  if (host.includes("greenhouse")) return "Greenhouse"
  if (host.includes("lever")) return "Lever"
  return "Web"
}

function extractDescription(maxLen = 700) {
  const candidates = [
    "section.jobs-description__container",
    "#jobDescriptionText",
    "[data-testid='job-details']",
    "main",
    "article"
  ]

  const source = textContentOf(candidates)
  if (!source) return ""
  return source.slice(0, maxLen)
}

function extractJobPayload() {
  const source = inferSource(window.location.hostname)
  const title =
    textContentOf([
      "h1",
      "h1.t-24",
      "[data-testid='jobsearch-JobInfoHeader-title']",
      "[data-qa='posting-name']"
    ]) || document.title.replace(/\s*\|.*$/, "").trim()

  const company = textContentOf([
    ".job-details-jobs-unified-top-card__company-name a",
    ".jobsearch-CompanyInfoWithoutHeaderImage div",
    "[data-qa='company-name']",
    "a.topcard__org-name-link"
  ])

  const location = textContentOf([
    ".job-details-jobs-unified-top-card__primary-description-container",
    ".jobsearch-JobInfoHeader-subtitle",
    "[data-qa='location']",
    ".topcard__flavor--bullet"
  ])

  const salaryRange = textContentOf([
    ".salary.compensation__salary",
    "#salaryInfoAndJobType",
    "[data-testid='jobsearch-JobMetadataHeader-item']"
  ])

  return {
    source,
    title,
    company,
    location,
    salaryRange,
    url: window.location.href,
    description: extractDescription(),
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || message.type !== "extractJob") return

  try {
    const payload = extractJobPayload()
    sendResponse({ ok: true, payload })
  } catch (error) {
    sendResponse({ ok: false, error: String(error && error.message ? error.message : error) })
  }

  return true
})
