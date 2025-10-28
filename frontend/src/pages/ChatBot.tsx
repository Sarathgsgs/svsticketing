import React, { useRef, useState } from "react"

const ISSUE_CATEGORIES = [
  "Login & Access Problems",
  "Network Communication Failures",
  "Server / System Performance Issues",
  "Application Errors",
  "Hardware Failures",
  "Cybersecurity / Security Blocking",
  "Email / Communication Problems",
  "Software Update & Compatibility Issues",
  "Data Quality and Manual Entry",
  "Ticket Prioritization",
  "Self-Service and Knowledge",
  "Tracking and Visibility",
  "Routine Maintenance Automation",
  "User Training and Adoption",
  "Robust Reporting",
  "Data Privacy and Compliance",
  "Contemporary Grid AI Queries"
]

const ISSUE_EXAMPLES: Record<string, string[]> = {
  "Login & Access Problems": [
    "SAP/PGMS login failure",
    "User account locked",
    "Authorization/role missing",
    "VPN connection failure"
  ],
  "Network Communication Failures": [
    "RTU not communicating with SCADA",
    "MPLS link down",
    "PLCC modem signal loss",
    "LAN switch failure in control room"
  ],
  "Server / System Performance Issues": [
    "SCADA server hanging",
    "High CPU usage on PGMS server",
    "Database connection lost",
    "Storage full in server"
  ],
  "Application Errors": [
    "Ticket portal not loading",
    "Shutdown request form not submitting",
    "Report generation failure",
    "EMS/SCADA screen freeze"
  ],
  "Hardware Failures": [
    "Network cable/port fault",
    "Router/Switch failure",
    "Communication rack power failure",
    "Substation PC not booting"
  ],
  "Cybersecurity / Security Blocking": [
    "USB blocked alert",
    "Unauthorized access attempt",
    "Firewall blocking communication",
    "Malware detected in substation PC"
  ],
  "Email / Communication Problems": [
    "Official email not working",
    "Outlook server not connecting",
    "Email sending/receiving delay",
    "Mail storage limit exceeded"
  ],
  "Software Update & Compatibility Issues": [
    "SCADA HMI not working after Windows update",
    "Firmware mismatch in RTU/IED",
    "Antivirus update failure",
    "Patch installation issues"
  ],
  "Data Quality and Manual Entry": [
    "Manual entry errors in meter readings",
    "Incomplete ticket records",
    "Spreadsheet data not matching system"
  ],
  "Ticket Prioritization": [
    "Urgent outage ticket not prioritized",
    "Routine requests mixed with critical issues"
  ],
  "Self-Service and Knowledge": [
    "No quick access to password reset",
    "No guide for device troubleshooting"
  ],
  "Tracking and Visibility": [
    "Ticket status not updated",
    "Outage ticket lost in queue"
  ],
  "Routine Maintenance Automation": [
    "Manual meter malfunction handling",
    "No auto-scheduling for grid checks"
  ],
  "User Training and Adoption": [
    "Technicians not using new system",
    "Confusion with automation workflows"
  ],
  "Robust Reporting": [
    "Manual compliance reports",
    "Inaccurate ticket logs"
  ],
  "Data Privacy and Compliance": [
    "Sensitive data in tickets",
    "No audit trail for ticket actions"
  ],
  "Contemporary Grid AI Queries": [
    "AI predictive outage detection for power grid",
    "Smart load management ticketing for grid peaks",
    "Ticketing system for grid asset health monitoring",
    "AI-powered energy storage integration requests",
    "Renewable integration ticketing for grid upgrades",
    "Real-time customer outage reporting automation",
    "Automated grid permit and licensing ticketing",
    "Distributed grid digital twin ticket management",
    "Ticket prioritization for critical power demands",
    "Cross-system ticket visibility and coordination"
  ]
}

const ISSUE_SOLUTIONS: Record<string, string> = {
  // ... (all previous solutions, plus the new ones below)
  "SAP/PGMS login failure": "Check if your account is locked. If yes, request unlock or reset your password. If you see an authorization error, contact your SAP admin.",
  "User account locked": "Try self-service unlock or request unlock from IT. If you forgot your password, use the reset link.",
  "Authorization/role missing": "Contact your admin to assign the required role. If you recently changed departments, your access may need updating.",
  "VPN connection failure": "Check your internet connection. If you see error 619, try restarting your VPN client and resetting your network adapter. If the problem persists, escalate to IT.",
  "RTU not communicating with SCADA": "Check if the MPLS link is up and the PLCC modem is powered. If the issue persists, escalate to the network team.",
  "MPLS link down": "Check physical connections and LEDs. If the link is still down, escalate to the network team.",
  "PLCC modem signal loss": "Ensure the modem is powered and cables are secure. If signal is still lost, escalate to comms team.",
  "LAN switch failure in control room": "Try restarting the switch if safe. If the switch does not recover, escalate to network support.",
  "SCADA server hanging": "Check CPU and memory usage. Try clearing temp files or restarting the SCADA service. If the issue persists, escalate to server admin.",
  "High CPU usage on PGMS server": "Identify high-CPU processes. Restart the affected service if safe. If CPU remains high, escalate.",
  "Database connection lost": "Check if the database server is running. If not, escalate to the DB admin.",
  "Storage full in server": "Clear unnecessary files or logs. If storage is still full, request storage expansion.",
  "Ticket portal not loading": "Check your network connection and try clearing your browser cache. If the portal still doesn't load, escalate to the app team.",
  "Shutdown request form not submitting": "Check for form errors. Try again. If the issue persists, escalate to the application team.",
  "Report generation failure": "Check input data and try again. If the report still fails, escalate to the reporting team.",
  "EMS/SCADA screen freeze": "Restart the application. If the screen remains frozen, escalate to the SCADA team.",
  "Network cable/port fault": "Try another cable or port. If the issue persists, escalate to field support.",
  "Router/Switch failure": "Restart the device if safe. If it does not recover, escalate to the network team.",
  "Communication rack power failure": "Check the power supply and fuses. If power is not restored, escalate to electrical team.",
  "Substation PC not booting": "Check power and cables. If the PC still does not boot, escalate to field support.",
  "USB blocked alert": "USBs are blocked for security. If you need an exception, request approval from IT security.",
  "Unauthorized access attempt": "This will be reported to security. If you believe this is an error, contact IT security.",
  "Firewall blocking communication": "Request a firewall rule review from the network/security team.",
  "Malware detected in substation PC": "Disconnect the PC from the network and escalate to IT security immediately.",
  "Official email not working": "Check Outlook/server status. If the issue persists, escalate to the email admin.",
  "Outlook server not connecting": "Check your network connection. If the server is unreachable, escalate.",
  "Email sending/receiving delay": "Check your mailbox size and network. If delays continue, escalate to email admin.",
  "Mail storage limit exceeded": "Clear your mailbox or request a storage increase from IT.",
  "SCADA HMI not working after Windows update": "Try rolling back the update or reinstalling the HMI software. If the issue persists, escalate to the SCADA team.",
  "Firmware mismatch in RTU/IED": "Check the firmware version. If mismatched, escalate for update.",
  "Antivirus update failure": "Retry the update. If it fails again, escalate to IT security.",
  "Patch installation issues": "Check patch logs for errors. If unresolved, escalate to server admin.",
  "Manual entry errors in meter readings": "Use AI-powered data extraction to auto-validate meter readings and flag inconsistencies.",
  "Incomplete ticket records": "Ensure all required fields are filled. Use AI to prompt for missing info.",
  "Spreadsheet data not matching system": "Use AI to parse and validate spreadsheet data before import.",
  "Urgent outage ticket not prioritized": "AI-based priority prediction can auto-flag urgent tickets for immediate attention.",
  "Routine requests mixed with critical issues": "AI can categorize and separate routine from critical tickets.",
  "No quick access to password reset": "Enable self-service password reset in the portal.",
  "No guide for device troubleshooting": "Integrate a smart knowledge base with step-by-step guides.",
  "Ticket status not updated": "Automate status updates and provide real-time dashboards.",
  "Outage ticket lost in queue": "AI can flag unresolved outages and escalate automatically.",
  "Manual meter malfunction handling": "Use AI anomaly detection to auto-create maintenance tickets.",
  "No auto-scheduling for grid checks": "Predictive maintenance can schedule checks based on data.",
  "Technicians not using new system": "Provide in-app AI-driven onboarding and personalized training.",
  "Confusion with automation workflows": "Use AI to guide users step-by-step and monitor adoption.",
  "Manual compliance reports": "Automate compliance documentation and reporting.",
  "Inaccurate ticket logs": "AI can validate and auto-correct ticket logs.",
  "Sensitive data in tickets": "Use AI to detect and redact sensitive data before saving.",
  "No audit trail for ticket actions": "Enable automated audit trails for all ticket actions.",
  "AI predictive outage detection for power grid": "Use AI analytics to forecast outages from sensor and historical grid data; trigger tickets for pre-emptive inspection and maintenance automatically.",
  "Smart load management ticketing for grid peaks": "AI monitors and optimizes load distribution; generates tickets for demand spikes and routes to response teams for fast mitigation.",
  "Ticketing system for grid asset health monitoring": "Leverage real-time diagnostic AI tools to analyze asset data and generate fault/maintenance tickets when equipment health deviates from norms.",
  "AI-powered energy storage integration requests": "Automate ticket handling for battery deployments and maintenance using predictive models for charge/discharge cycles and performance.",
  "Renewable integration ticketing for grid upgrades": "Use AI to assess and schedule renewable asset connections, auto-generating upgrade or inspection tickets for grid stability issues.",
  "Real-time customer outage reporting automation": "Deploy user-facing AI chatbots and rule-based systems for instant outage ticket creation, location clustering, and issue tracking.",
  "Automated grid permit and licensing ticketing": "Use generative AI to prepare licensing paperwork, track permit status, and raise tickets for regulatory bottlenecks.",
  "Distributed grid digital twin ticket management": "Create tickets based on abnormalities in digital twin models; AI assesses probable causes and automates asset assignment for fixes.",
  "Ticket prioritization for critical power demands": "AI signals tickets for high-capacity requests (data centers, industrial loads) and prioritizes them using risk and value scoring algorithms.",
  "Cross-system ticket visibility and coordination": "AI connects multiple ticketing domains (utility, customer, regulatory), ensuring unified tracking, status synchronization, and task workflow automation."
}

type ChatMsg = { from: "user" | "bot", text: string }

export default function ChatBot() {
  const [chat, setChat] = useState<ChatMsg[]>([
    { from: "bot", text: "Hi! What can I help you with today? (Type your issue or pick a problem below)" }
  ])
  const [input, setInput] = useState("")
  const chatEndRef = useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [chat])

  // NLP: Find best match using Jaro-Winkler
  const findBestMatch = (msg: string) => {
    let best = { issue: "", score: 0 }
    for (const cat of ISSUE_CATEGORIES) {
      for (const issue of ISSUE_EXAMPLES[cat]) {
        const score = stringSimilarity(msg.toLowerCase(), issue.toLowerCase())
        if (score > best.score) best = { issue, score }
      }
    }
    return best.score > 0.6 ? best.issue : null
  }

  // Simple similarity: fraction of matching words
  function stringSimilarity(a: string, b: string): number {
    const aWords = a.split(/\s+/)
    const bWords = b.split(/\s+/)
    const matches = aWords.filter(w => bWords.includes(w)).length
    return matches / Math.max(aWords.length, bWords.length)
  }

  // Handle user input
  const send = (msg: string) => {
    setChat(c => [...c, { from: "user", text: msg }])
    setInput("")
    // Exact match
    if (ISSUE_SOLUTIONS[msg]) {
      setChat(c => [...c, { from: "bot", text: ISSUE_SOLUTIONS[msg] }])
      return
    }
    // NLP fuzzy match
    const best = findBestMatch(msg)
    if (best && ISSUE_SOLUTIONS[best]) {
      setChat(c => [...c, { from: "bot", text: ISSUE_SOLUTIONS[best] }])
      return
    }
    // Fallback
    setChat(c => [...c, { from: "bot", text: "Sorry, I couldn't auto-resolve this. Please create a ticket or contact support." }])
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && input.trim()) send(input.trim())
  }

  const selectIssue = (cat: string, issue: string) => {
    send(issue)
  }

  return (
    <div style={{
      width: "100%", maxWidth: 600, minHeight: 380, display: "flex", flexDirection: "column"
    }}>
      <div style={{marginBottom:8, fontWeight:600, fontSize:18, color:"var(--accent)", textAlign:"center"}}>PowerGrid ChatBot</div>
      <div style={{
        display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10, maxHeight: 120, overflowY: "auto", justifyContent:"center"
      }}>
        {ISSUE_CATEGORIES.map(cat =>
          <div key={cat} style={{minWidth:140}}>
            <div style={{fontSize:12, color:"var(--muted)"}}>{cat}</div>
            {ISSUE_EXAMPLES[cat].map(issue =>
              <button
                key={issue}
                className="btn-secondary"
                style={{marginBottom:2, fontSize:12, padding:"3px 8px"}}
                onClick={()=>selectIssue(cat, issue)}
              >{issue}</button>
            )}
          </div>
        )}
      </div>
      <div style={{
        background:"rgba(255,255,255,.02)", border:"1px solid var(--border)", borderRadius:10,
        minHeight:180, maxHeight:320, overflowY: "auto", padding:10, marginBottom:10, flex:1
      }}>
        {chat.map((m,i)=>(
          <div key={i} style={{marginBottom:6, textAlign: m.from==="user"?"right":"left"}}>
            <span style={{fontWeight: m.from==="user"?"bold":"normal", color: m.from==="user"?"var(--accent)":"var(--text)"}}>
              {m.from==="user"?"You":"Bot"}:
            </span> {m.text}
          </div>
        ))}
        <div ref={chatEndRef}></div>
      </div>
      <div style={{display:"flex", gap:8}}>
        <input
          value={input}
          onChange={e=>setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Type your issue or question here..."
          style={{flex:1, fontSize:15}}
        />
        <button className="btn" onClick={()=>input.trim() && send(input.trim())} disabled={!input.trim()}>
          Send
        </button>
      </div>
    </div>
  )
}