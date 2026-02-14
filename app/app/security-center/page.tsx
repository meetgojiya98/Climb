"use client"

import { useEffect, useState } from "react"
import { AlertTriangle, Download, ShieldCheck, Trash2, UserCheck } from "lucide-react"
import { toast } from "sonner"

type Session = {
  id: string
  session_key: string
  ip_address: string | null
  user_agent: string | null
  last_seen_at: string
  revoked_at: string | null
  isCurrent?: boolean
}

type Anomaly = {
  id: string
  anomaly_type: string
  source: string
  severity: "low" | "medium" | "high"
  context: Record<string, any>
  resolved: boolean
  created_at: string
}

export default function SecurityCenterPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [anomalies, setAnomalies] = useState<Anomaly[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    void loadSecurityState()
  }, [])

  const loadSecurityState = async () => {
    try {
      setLoading(true)
      const [sessionsRes, anomaliesRes] = await Promise.all([
        fetch("/api/security/sessions", { cache: "no-store" }),
        fetch("/api/security/anomalies", { cache: "no-store" }),
      ])
      const sessionsData = await sessionsRes.json().catch(() => null)
      const anomaliesData = await anomaliesRes.json().catch(() => null)

      if (!sessionsRes.ok) throw new Error(sessionsData?.error || "Failed to load sessions")
      if (!anomaliesRes.ok) throw new Error(anomaliesData?.error || "Failed to load anomalies")

      setSessions(Array.isArray(sessionsData?.sessions) ? sessionsData.sessions : [])
      setAnomalies(Array.isArray(anomaliesData?.anomalies) ? anomaliesData.anomalies : [])
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load security center"
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const revokeSession = async (sessionId: string) => {
    try {
      const response = await fetch("/api/security/sessions/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.error || "Failed to revoke session")
      toast.success("Session revoked")
      await loadSecurityState()
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to revoke session"
      toast.error(message)
    }
  }

  const exportData = async () => {
    try {
      setExporting(true)
      const response = await fetch("/api/security/export", { method: "GET" })
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.error || "Failed to export data")

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = `climb-data-export-${Date.now()}.json`
      anchor.click()
      URL.revokeObjectURL(url)
      toast.success("Data export downloaded")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to export data"
      toast.error(message)
    } finally {
      setExporting(false)
    }
  }

  const deleteData = async () => {
    const confirmDelete = window.confirm("Delete all user data in this account? This action is irreversible.")
    if (!confirmDelete) return
    try {
      setDeleting(true)
      const response = await fetch("/api/security/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirmation: "DELETE_MY_DATA",
          reason: "User-triggered delete from security center",
        }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.error || "Failed to delete data")
      toast.success("Data deletion completed")
      await loadSecurityState()
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete data"
      toast.error(message)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="section-shell section-stack">
      <div className="surface-header">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">Security Center</h1>
          <p className="text-muted-foreground">Manage active sessions, anomaly alerts, exports, and deletion workflows.</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-xl border border-border bg-background/85 px-3 py-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-green-500" />
          Governance and audit controls online
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="card-elevated p-4 sm:p-5 lg:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold inline-flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-saffron-500" />
              Sessions
            </h2>
            <button type="button" onClick={() => void loadSecurityState()} className="btn-outline text-xs">
              Refresh
            </button>
          </div>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading sessions...</p>
          ) : (
            <div className="space-y-2">
              {sessions.map((session) => (
                <div key={session.id} className="rounded-xl border border-border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">{session.user_agent || "Unknown device"}</p>
                      <p className="text-[11px] text-muted-foreground mt-1">IP: {session.ip_address || "unknown"}</p>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Last seen: {new Date(session.last_seen_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {session.isCurrent && <span className="text-[10px] rounded bg-green-500/15 px-1.5 py-0.5 text-green-700">Current</span>}
                      {session.revoked_at ? (
                        <span className="text-[10px] rounded bg-muted px-1.5 py-0.5 text-muted-foreground">Revoked</span>
                      ) : (
                        <button type="button" onClick={() => void revokeSession(session.id)} className="text-[11px] text-saffron-600 hover:underline">
                          Revoke
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {sessions.length === 0 && <p className="text-sm text-muted-foreground">No active sessions found.</p>}
            </div>
          )}
        </section>

        <section className="card-elevated p-4 sm:p-5 lg:p-6">
          <h2 className="font-semibold mb-4 inline-flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            Security Anomalies
          </h2>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading anomaly feed...</p>
          ) : (
            <div className="space-y-2">
              {anomalies.slice(0, 20).map((anomaly) => (
                <div key={anomaly.id} className="rounded-xl border border-border p-3">
                  <p className="text-xs font-medium">{anomaly.anomaly_type}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">source: {anomaly.source}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">severity: {anomaly.severity}</p>
                </div>
              ))}
              {anomalies.length === 0 && <p className="text-sm text-muted-foreground">No anomalies detected.</p>}
            </div>
          )}
        </section>
      </div>

      <section className="card-elevated p-4 sm:p-5 lg:p-6">
        <h2 className="font-semibold mb-4">Data Governance Actions</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <button type="button" onClick={exportData} disabled={exporting} className="btn-outline">
            <Download className="h-4 w-4" />
            {exporting ? "Exporting..." : "Export My Data"}
          </button>
          <button type="button" onClick={deleteData} disabled={deleting} className="btn-outline text-red-600 border-red-500/25 hover:bg-red-500/10">
            <Trash2 className="h-4 w-4" />
            {deleting ? "Deleting..." : "Delete My Data"}
          </button>
        </div>
      </section>
    </div>
  )
}
