import { useEffect, useMemo, useState } from "react"
import { supabase } from "./supabase"

const money = (value) => Number(value || 0).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const dateText = (value) => {
  if (!value) return "—"
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })
}
const emptyTask = { id: null, title: "", description: "", reward: "", is_active: true, task_type: "", verification_method: "", max_completions: "", starts_at: "", ends_at: "" }

function Admin() {
  const [user, setUser] = useState(null)
  const [section, setSection] = useState("overview")
  const [profiles, setProfiles] = useState([])
  const [withdrawals, setWithdrawals] = useState([])
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [withdrawalBusy, setWithdrawalBusy] = useState(null)
  const [message, setMessage] = useState("")
  const [taskMessage, setTaskMessage] = useState("")
  const [settingsMessage, setSettingsMessage] = useState("")
  const [taskForm, setTaskForm] = useState(emptyTask)
  const [settingsForm, setSettingsForm] = useState({ id: null, minimum_deposit: "", minimum_withdrawal: "", referral_percentage: "" })

  const loadAll = async () => {
    const [p, w, t, s] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("withdrawals").select("*").order("created_at", { ascending: false }),
      supabase.from("tasks").select("*").order("created_at", { ascending: false }),
      supabase.from("platform_settings").select("*").order("id", { ascending: true }).limit(1).maybeSingle(),
    ])
    if (p.error) throw p.error
    if (w.error) throw w.error
    if (t.error) throw t.error
    if (s.error) throw s.error
    setProfiles(p.data || [])
    setWithdrawals(w.data || [])
    setTasks(t.data || [])
    if (s.data) setSettingsForm({ id: s.data.id, minimum_deposit: s.data.minimum_deposit ?? "", minimum_withdrawal: s.data.minimum_withdrawal ?? "", referral_percentage: s.data.referral_percentage ?? "" })
  }

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) throw error
        if (!session?.user) throw new Error("You must be logged in to access the admin dashboard.")
        const { data: admin, error: adminError } = await supabase.rpc("is_admin")
        if (adminError) throw adminError
        if (admin !== true) throw new Error("Access denied. This account is not an administrator.")
        if (!mounted) return
        setUser(session.user)
        await loadAll()
      } catch (e) {
        if (mounted) setMessage(e.message || "Unable to load admin dashboard.")
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  const pending = useMemo(() => withdrawals.filter(w => String(w.status || "").toLowerCase() === "pending"), [withdrawals])
  const approved = useMemo(() => withdrawals.filter(w => ["approved", "processing"].includes(String(w.status || "").toLowerCase())), [withdrawals])
  const taskBalance = profiles.reduce((n, p) => n + Number(p.task_balance || 0), 0)
  const affiliateBalance = profiles.reduce((n, p) => n + Number(p.affiliate_balance || 0), 0)
  const withdrawalTotal = withdrawals.reduce((n, w) => n + Number(w.amount || 0), 0)

  const refresh = async () => {
    try { setBusy(true); await loadAll(); setMessage("Dashboard refreshed.") }
    catch (e) { setMessage(e.message || "Refresh failed.") }
    finally { setBusy(false) }
  }

  const logout = async () => { await supabase.auth.signOut(); window.location.href = "/" }

  const startPaystackTransfer = async (id) => {
    const { data, error } = await supabase.functions.invoke("process-approved-withdrawal", { body: { withdrawal_id: id } })
    if (error) throw error
    if (data && data.status === false) throw new Error(data.message || "Paystack transfer could not be started.")
    return data
  }

  const approveWithdrawal = async (w) => {
    if (!w?.id || withdrawalBusy === w.id) return
    if (String(w.status || "").toLowerCase() !== "pending") return setMessage("This withdrawal is no longer pending.")
    if (!window.confirm(`Approve ₦${money(w.amount)} for ${w.account_name || "this user"}?`)) return
    try {
      setWithdrawalBusy(w.id); setMessage("")
      const { error } = await supabase.rpc("approve_withdrawal", { p_withdrawal_id: w.id })
      if (error) throw error
      await loadAll()
      const data = await startPaystackTransfer(w.id)
      setMessage(data?.message || "Withdrawal approved and Paystack transfer started.")
      await loadAll()
    } catch (e) {
      console.error("APPROVE/TRANSFER ERROR:", e)
      setMessage(e.message || "Unable to approve/process withdrawal.")
      await loadAll().catch(() => {})
    } finally { setWithdrawalBusy(null) }
  }

  const processApproved = async (w) => {
    if (!w?.id || withdrawalBusy === w.id) return
    if (!["approved", "processing"].includes(String(w.status || "").toLowerCase())) return setMessage("Only approved/processing withdrawals can be sent to Paystack.")
    if (!window.confirm(`Send ₦${money(w.amount)} to ${w.account_name || "this account"} through Paystack?`)) return
    try {
      setWithdrawalBusy(w.id); setMessage("")
      const data = await startPaystackTransfer(w.id)
      setMessage(data?.message || "Paystack transfer started.")
      await loadAll()
    } catch (e) {
      setMessage(e.message || "Unable to process Paystack transfer.")
      await loadAll().catch(() => {})
    } finally { setWithdrawalBusy(null) }
  }

  const refundWithdrawal = async (w) => {
    if (!w?.id || withdrawalBusy === w.id) return
    const status = String(w.status || "").toLowerCase()
    if (!["pending", "approved", "processing"].includes(status)) return setMessage("This withdrawal cannot be refunded from its current status.")
    const reason = window.prompt("Reason for rejecting/refunding this withdrawal:")
    if (reason === null || !reason.trim()) return setMessage("A reason is required.")
    if (!window.confirm(`Reject/refund ₦${money(w.amount)}?`)) return
    try {
      setWithdrawalBusy(w.id); setMessage("")
      let result = await supabase.rpc("refund_withdrawal", { p_withdrawal_id: w.id, p_reason: reason.trim() })
      if (result.error && /could not find the function|schema cache|does not exist/i.test(result.error.message || "")) {
        result = await supabase.rpc("refund_withdrawal", { withdrawal_id: w.id, reason: reason.trim() })
      }
      if (result.error) throw result.error
      setMessage("Withdrawal rejected/refunded and balance restored.")
      await loadAll()
    } catch (e) { setMessage(e.message || "Unable to refund withdrawal.") }
    finally { setWithdrawalBusy(null) }
  }

  const saveTask = async (e) => {
    e.preventDefault(); setTaskMessage("")
    const reward = Number(taskForm.reward)
    if (!taskForm.title.trim()) return setTaskMessage("Task title is required.")
    if (!Number.isFinite(reward) || reward < 0) return setTaskMessage("Enter a valid reward.")
    let max = null
    if (taskForm.max_completions !== "" && taskForm.max_completions !== null) {
      max = Number(taskForm.max_completions)
      if (!Number.isInteger(max) || max < 1) return setTaskMessage("Maximum completions must be a whole number greater than 0.")
    }
    if (taskForm.starts_at && taskForm.ends_at && new Date(taskForm.ends_at) <= new Date(taskForm.starts_at)) return setTaskMessage("End date/time must be after the start date/time.")
    const values = { title: taskForm.title.trim(), description: taskForm.description.trim() || null, reward, is_active: taskForm.is_active, task_type: taskForm.task_type.trim() || null, verification_method: taskForm.verification_method.trim() || null, max_completions: max, starts_at: taskForm.starts_at ? new Date(taskForm.starts_at).toISOString() : null, ends_at: taskForm.ends_at ? new Date(taskForm.ends_at).toISOString() : null }
    try {
      setBusy(true)
      const result = taskForm.id ? await supabase.from("tasks").update(values).eq("id", taskForm.id) : await supabase.from("tasks").insert(values)
      if (result.error) throw result.error
      setTaskForm(emptyTask); setTaskMessage(taskForm.id ? "Task updated successfully." : "Task created successfully."); await loadAll()
    } catch (e) { setTaskMessage(e.message || "Unable to save task.") }
    finally { setBusy(false) }
  }

  const editTask = (t) => {
    const local = v => v ? new Date(v).toISOString().slice(0, 16) : ""
    setTaskForm({ id: t.id, title: t.title || "", description: t.description || "", reward: t.reward ?? "", is_active: t.is_active !== false, task_type: t.task_type || "", verification_method: t.verification_method || "", max_completions: t.max_completions ?? "", starts_at: local(t.starts_at), ends_at: local(t.ends_at) })
    setSection("tasks"); window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const toggleTask = async (t) => {
    try { setBusy(true); const { error } = await supabase.from("tasks").update({ is_active: !t.is_active }).eq("id", t.id); if (error) throw error; await loadAll() }
    catch (e) { setTaskMessage(e.message || "Unable to change task status.") }
    finally { setBusy(false) }
  }

  const deleteTask = async (t) => {
    if (!window.confirm(`Delete "${t.title}" permanently?`)) return
    try { setBusy(true); const { error } = await supabase.from("tasks").delete().eq("id", t.id); if (error) throw error; if (taskForm.id === t.id) setTaskForm(emptyTask); await loadAll() }
    catch (e) { setTaskMessage(e.message || "Unable to delete task.") }
    finally { setBusy(false) }
  }

  const saveSettings = async (e) => {
    e.preventDefault(); setSettingsMessage("")
    const minimum_deposit = Number(settingsForm.minimum_deposit)
    const minimum_withdrawal = Number(settingsForm.minimum_withdrawal)
    const referral_percentage = Number(settingsForm.referral_percentage)
    if (![minimum_deposit, minimum_withdrawal, referral_percentage].every(Number.isFinite)) return setSettingsMessage("Enter valid settings.")
    if (minimum_deposit < 0 || minimum_withdrawal < 0 || referral_percentage < 0 || referral_percentage > 100) return setSettingsMessage("Check the minimums and referral percentage.")
    try {
      setBusy(true)
      const values = { minimum_deposit, minimum_withdrawal, referral_percentage, updated_at: new Date().toISOString() }
      const result = settingsForm.id ? await supabase.from("platform_settings").update(values).eq("id", settingsForm.id) : await supabase.from("platform_settings").insert(values)
      if (result.error) throw result.error
      setSettingsMessage("Platform settings saved."); await loadAll()
    } catch (e) { setSettingsMessage(e.message || "Unable to save settings.") }
    finally { setBusy(false) }
  }

  if (loading) return <div style={styles.center}>Loading admin dashboard...</div>
  if (!user) return <div style={styles.center}><div><h2>TaskFlow NG</h2><p>{message || "Please log in as an administrator."}</p><button onClick={() => window.location.href = "/"}>Return to login</button></div></div>

  const nav = [["overview", "Overview"], ["users", "Users"], ["tasks", "Tasks"], ["settings", "App Settings"], ["withdrawals", "Withdrawals"]]

  return <div style={styles.page}><div style={styles.wrap}>
    <header style={styles.header}><div><h1 style={{ margin: 0 }}>TaskFlow NG</h1><div style={styles.muted}>Admin Dashboard</div></div><div style={styles.actions}><button onClick={refresh} disabled={busy}>{busy ? "Working..." : "Refresh"}</button><button onClick={logout}>Logout</button></div></header>
    {message && <div style={styles.notice}>{message}</div>}
    <nav style={styles.nav}>{nav.map(([key, label]) => <button key={key} onClick={() => setSection(key)} style={section === key ? styles.navActive : {}}>{label}{key === "withdrawals" && pending.length ? ` (${pending.length})` : ""}</button>)}</nav>

    {section === "overview" && <><div style={styles.grid}>{[["Total Users", profiles.length],["Task Balance", `₦${money(taskBalance)}`],["Affiliate Balance", `₦${money(affiliateBalance)}`],["Pending Withdrawals", pending.length],["Pending Amount", `₦${money(pending.reduce((n,w) => n + Number(w.amount || 0), 0))}`],["Total Withdrawals", `₦${money(withdrawalTotal)}`],["Total Tasks", tasks.length],["Active Tasks", tasks.filter(t => t.is_active).length]].map(([label, value]) => <div style={styles.card} key={label}><div style={styles.muted}>{label}</div><h2>{value}</h2></div>)}</div><div style={styles.card}><h2>Withdrawal workflow</h2><p style={styles.muted}>Pending → Admin approval → Paystack transfer → Completed. Failed transfers can be refunded through the withdrawal controls.</p><button onClick={() => setSection("withdrawals")}>Manage Withdrawals</button></div></>}

    {section === "users" && <div style={styles.card}><h2>Users</h2><div style={styles.tableWrap}><table style={styles.table}><thead><tr>{["Name","User ID","Task Balance","Affiliate Balance","Role","Status","Referral"].map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>{profiles.map(p => <tr key={p.id}><td>{p.full_name || "—"}</td><td style={styles.id}>{p.id}</td><td>₦{money(p.task_balance)}</td><td>₦{money(p.affiliate_balance)}</td><td>{p.role || "user"}</td><td>{p.is_active ? "Active" : "Inactive"}</td><td>{p.referral_code || "—"}</td></tr>)}</tbody></table></div></div>}

    {section === "tasks" && <><div style={styles.card}><div style={styles.rowBetween}><h2>{taskForm.id ? "Edit Task" : "Add New Task"}</h2>{taskForm.id && <button onClick={() => setTaskForm(emptyTask)}>Cancel</button>}</div>{taskMessage && <div style={styles.notice}>{taskMessage}</div>}<form onSubmit={saveTask}><div style={styles.formGrid}>{[["title","Task Title","text"],["reward","Reward","number"],["task_type","Task Type","text"],["verification_method","Verification Method","text"],["max_completions","Maximum Completions","number"],["starts_at","Starts At","datetime-local"],["ends_at","Ends At","datetime-local"]].map(([name,label,type]) => <label key={name}>{label}<input name={name} type={type} value={taskForm[name]} onChange={e => setTaskForm(x => ({ ...x, [name]: e.target.value }))} min={type === "number" ? "0" : undefined} step={name === "reward" ? "0.01" : name === "max_completions" ? "1" : undefined} /></label>)}</div><label>Description<textarea rows="4" value={taskForm.description} onChange={e => setTaskForm(x => ({ ...x, description: e.target.value }))} /></label><label style={{ display: "flex", gap: 8, alignItems: "center" }}><input type="checkbox" checked={taskForm.is_active} onChange={e => setTaskForm(x => ({ ...x, is_active: e.target.checked }))} /> Task is active</label><button type="submit" disabled={busy}>{taskForm.id ? "Update Task" : "Create Task"}</button></form></div><div style={styles.card}><h2>Existing Tasks</h2><div style={styles.tableWrap}><table style={styles.table}><thead><tr>{["Title","Reward","Type","Verification","Max","Starts","Ends","Status","Actions"].map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>{tasks.map(t => <tr key={t.id}><td><strong>{t.title}</strong><div style={styles.muted}>{t.description || ""}</div></td><td>₦{money(t.reward)}</td><td>{t.task_type || "—"}</td><td>{t.verification_method || "—"}</td><td>{t.max_completions ?? "Unlimited"}</td><td>{dateText(t.starts_at)}</td><td>{dateText(t.ends_at)}</td><td>{t.is_active ? "Active" : "Inactive"}</td><td><div style={styles.actions}><button onClick={() => editTask(t)}>Edit</button><button onClick={() => toggleTask(t)}>{t.is_active ? "Deactivate" : "Activate"}</button><button onClick={() => deleteTask(t)}>Delete</button></div></td></tr>)}</tbody></table></div></div></>}

    {section === "settings" && <div style={styles.card}><h2>App Settings</h2>{settingsMessage && <div style={styles.notice}>{settingsMessage}</div>}<form onSubmit={saveSettings}><div style={styles.formGrid}>{[["minimum_deposit","Minimum Deposit"],["minimum_withdrawal","Minimum Withdrawal"],["referral_percentage","Referral Percentage"]].map(([name,label]) => <label key={name}>{label}<input name={name} type="number" min="0" step="0.01" max={name === "referral_percentage" ? "100" : undefined} value={settingsForm[name]} onChange={e => setSettingsForm(x => ({ ...x, [name]: e.target.value }))} /></label>)}</div><button type="submit" disabled={busy}>Save Settings</button></form></div>}

    {section === "withdrawals" && <div style={styles.card}><div style={styles.rowBetween}><div><h2>Withdrawals</h2><div style={styles.muted}>{pending.length} pending · {approved.length} approved/processing</div></div><button onClick={loadAll}>Refresh</button></div>{!withdrawals.length ? <p>No withdrawals found.</p> : <div style={styles.tableWrap}><table style={styles.table}><thead><tr>{["User","Amount","Balance","Bank","Account","Name","Reference","Date","Status","Actions"].map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>{withdrawals.map(w => { const status = String(w.status || "").toLowerCase(); const isPending = status === "pending"; const isApproved = ["approved","processing"].includes(status); const processing = withdrawalBusy === w.id; return <tr key={w.id}><td>{w.full_name || w.user_id || "—"}<div style={styles.id}>{w.user_id}</div></td><td><strong>₦{money(w.amount)}</strong></td><td>{w.balance_type || "—"}</td><td>{w.bank_name || "—"}</td><td>{w.account_number || "—"}</td><td>{w.account_name || "—"}</td><td>{w.payment_reference || "—"}</td><td>{dateText(w.created_at)}</td><td><span style={styles.status}>{w.status || "Unknown"}</span></td><td><div style={styles.actions}>{isPending && <><button disabled={processing} onClick={() => approveWithdrawal(w)}>{processing ? "Processing..." : "Approve & Pay"}</button><button disabled={processing} onClick={() => refundWithdrawal(w)}>Reject / Refund</button></>}{isApproved && <><button disabled={processing} onClick={() => processApproved(w)}>{processing ? "Sending..." : "Send to Paystack"}</button><button disabled={processing} onClick={() => refundWithdrawal(w)}>Refund</button></>}{!isPending && !isApproved && <span style={styles.muted}>No action</span>}</div></td></tr> })}</tbody></table></div>}</div>}
  </div></div>
}

const styles = { page: { minHeight: "100vh", background: "#f7f7f8", padding: 20, fontFamily: "Arial, sans-serif", boxSizing: "border-box" }, wrap: { maxWidth: 1450, margin: "0 auto" }, center: { minHeight: "100vh", display: "grid", placeItems: "center", padding: 20, fontFamily: "Arial, sans-serif" }, header: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 18 }, nav: { display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 18 }, navActive: { background: "#111", color: "#fff" }, card: { background: "#fff", border: "1px solid #ddd", borderRadius: 14, padding: 20, marginBottom: 18 }, grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 14, marginBottom: 18 }, formGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 14, marginBottom: 14 }, tableWrap: { overflowX: "auto" }, table: { width: "100%", borderCollapse: "collapse", minWidth: 1200 }, muted: { color: "#666", fontSize: 13 }, id: { fontSize: 11, wordBreak: "break-all", color: "#777" }, rowBetween: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }, actions: { display: "flex", flexWrap: "wrap", gap: 6 }, notice: { background: "#eef3ff", border: "1px solid #ccd8ff", padding: 12, borderRadius: 10, marginBottom: 14 }, status: { display: "inline-block", padding: "5px 9px", borderRadius: 999, background: "#eee", fontWeight: 700, whiteSpace: "nowrap" } }

export default Admin
