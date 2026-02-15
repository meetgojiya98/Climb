const appUrlInput = document.getElementById("appUrl")
const sourceInput = document.getElementById("source")
const titleInput = document.getElementById("title")
const companyInput = document.getElementById("company")
const locationInput = document.getElementById("location")
const salaryRangeInput = document.getElementById("salaryRange")
const jobUrlInput = document.getElementById("jobUrl")
const descriptionInput = document.getElementById("description")
const captureBtn = document.getElementById("captureBtn")
const refreshBtn = document.getElementById("refreshBtn")
const statusEl = document.getElementById("status")

const STORAGE_KEYS = {
  appUrl: "climbCaptureAppUrl",
}

function setStatus(message, mode) {
  statusEl.textContent = message
  statusEl.classList.remove("ok", "error")
  if (mode) statusEl.classList.add(mode)
}

function normalizeAppUrl(value) {
  const raw = String(value || "").trim().replace(/\/+$/, "")
  if (!raw) return "https://climb-wheat.vercel.app"
  return raw
}

async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
  return tabs && tabs.length > 0 ? tabs[0] : null
}

async function loadSettings() {
  const store = await chrome.storage.sync.get([STORAGE_KEYS.appUrl])
  appUrlInput.value = normalizeAppUrl(store[STORAGE_KEYS.appUrl])
}

async function saveSettings() {
  const appUrl = normalizeAppUrl(appUrlInput.value)
  await chrome.storage.sync.set({ [STORAGE_KEYS.appUrl]: appUrl })
  return appUrl
}

function applyPayload(payload) {
  if (payload.source) sourceInput.value = payload.source
  if (payload.title) titleInput.value = payload.title
  if (payload.company) companyInput.value = payload.company
  if (payload.location) locationInput.value = payload.location
  if (payload.salaryRange) salaryRangeInput.value = payload.salaryRange
  if (payload.url) jobUrlInput.value = payload.url
  if (payload.description) descriptionInput.value = payload.description
}

async function hydrateFromPage() {
  const tab = await getActiveTab()
  if (!tab || !tab.id) {
    setStatus("No active tab found.", "error")
    return
  }

  if (tab.url) {
    jobUrlInput.value = tab.url
    sourceInput.value = tab.url.includes("linkedin")
      ? "LinkedIn"
      : tab.url.includes("indeed")
        ? "Indeed"
        : tab.url.includes("greenhouse")
          ? "Greenhouse"
          : tab.url.includes("lever")
            ? "Lever"
            : "Web"
  }

  try {
    const response = await chrome.tabs.sendMessage(tab.id, { type: "extractJob" })
    if (response && response.ok && response.payload) {
      applyPayload(response.payload)
      setStatus("Page details loaded.")
    } else {
      setStatus("Loaded tab metadata. Fill missing fields manually.")
    }
  } catch (_error) {
    setStatus("Could not auto-read page details. Fill fields manually.")
  }
}

async function captureJob() {
  const appUrl = await saveSettings()
  const payload = {
    source: sourceInput.value.trim() || "Web",
    title: titleInput.value.trim(),
    company: companyInput.value.trim(),
    location: locationInput.value.trim() || undefined,
    salaryRange: salaryRangeInput.value.trim() || undefined,
    url: jobUrlInput.value.trim() || undefined,
    description: descriptionInput.value.trim() || undefined,
  }

  if (!payload.title || !payload.company) {
    setStatus("Title and company are required.", "error")
    return
  }

  captureBtn.disabled = true
  setStatus("Capturing job...")

  try {
    const response = await fetch(`${appUrl}/api/jobs/capture`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    const result = await response.json().catch(() => null)
    if (!response.ok || !result || !result.success) {
      throw new Error(result && result.error ? result.error : "Capture failed")
    }

    if (result.duplicate) {
      setStatus("Job already exists in Saved Jobs.", "ok")
    } else {
      setStatus("Job captured successfully.", "ok")
    }
  } catch (error) {
    setStatus(`Capture failed: ${String(error && error.message ? error.message : error)}`, "error")
  } finally {
    captureBtn.disabled = false
  }
}

refreshBtn.addEventListener("click", () => {
  hydrateFromPage()
})

captureBtn.addEventListener("click", () => {
  captureJob()
})

appUrlInput.addEventListener("blur", () => {
  saveSettings().catch(() => {})
})

loadSettings()
  .then(() => hydrateFromPage())
  .catch(() => setStatus("Ready."))
