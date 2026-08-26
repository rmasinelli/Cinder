import { useState, useEffect, useCallback } from "react";
import { supabase } from "./lib/supabase.js";
import { listKnowledgeArticles, saveKnowledgeArticle, deleteKnowledgeArticle } from "./lib/knowledgeBase.js";
import { appendUniqueNote, clearClassroomDraft, hasClassroomDraft, loadClassroomDraft, saveClassroomDraft } from "./lib/classroomDrafts.mjs";
import { COURSES, courseById } from "./data/courses.js";
import { CLIENTS } from "./data/clients.js";
import { PERSON_BY_ID, ORG_COLOR } from "./data/people.js";
import { SCENARIOS } from "./data/scenarios.js";
import {
  PRIORITIES, STATUSES, STATUS_TRANSITIONS,
  PRIORITY_COLOR, STATUS_COLOR, ROLE_COLOR,
  SLA, IR_PHASES, IR_SEVERITIES, IR_SEVERITY_COLOR, IR_PHASE_COLOR,
  KB_CATEGORIES,
} from "./data/constants.js";

// ── SLA helpers ───────────────────────────────────────────────
function slaDeadline(created, priority) {
  return new Date(new Date(created).getTime() + SLA[priority].resolution * 3600000);
}
function slaInfo(created, priority, status) {
  if (status==="Resolved"||status==="Closed") return null;
  const deadline = slaDeadline(created, priority);
  const msLeft = deadline - Date.now();
  const pct = Math.max(0, msLeft / (SLA[priority].resolution * 3600000));
  if (msLeft<0) return { label:"Breached", color:"#ef4444", msLeft, pct:0, breached:true };
  if (pct<0.25) return { label:"Critical", color:"#ef4444", msLeft, pct, breached:false };
  if (pct<0.5)  return { label:"Warning",  color:"#f59e0b", msLeft, pct, breached:false };
  return { label:"On Track", color:"#22c55e", msLeft, pct, breached:false };
}
function fmtDur(ms) {
  const abs = Math.abs(ms);
  const h=Math.floor(abs/3600000), m=Math.floor((abs%3600000)/60000), s=Math.floor((abs%60000)/1000);
  const pre = ms<0?"-":"";
  if(h>0) return `${pre}${h}h ${m}m`;
  if(m>0) return `${pre}${m}m ${s}s`;
  return `${pre}${s}s`;
}

// Alias so LabManager still works
const SEED_SCENARIOS = SCENARIOS;

const inputStyle = {
  width:"100%", background:"#0D0D0D", border:"1px solid #242424",
  borderRadius:6, padding:"9px 12px", color:"#EDE9E3",
  fontSize:13, fontFamily:"'Inter',sans-serif",
};
const btnPrimary = {
  background:"#E8922E", color:"#0D0D0D", border:"none", borderRadius:6,
  padding:"10px 20px", fontSize:13, fontWeight:700, cursor:"pointer",
  width:"100%", fontFamily:"'Inter',sans-serif", letterSpacing:"0.02em",
};
// Shared ghost/secondary button — for Back, Cancel, and other low-emphasis actions
const btnGhost = {
  display:"flex", alignItems:"center", gap:6,
  background:"none", border:"1px solid #242424", color:"#8A7868",
  borderRadius:6, padding:"6px 12px", fontSize:12, cursor:"pointer",
  fontFamily:"'Inter',sans-serif",
};

// ── Global styles shared by Login (pre-auth) and Shell (post-auth) ──
// Consolidated here so both surfaces get identical resets, focus rings,
// hover feedback, and responsive rules instead of two drifting copies.
function GlobalStyles(){
  return (
    <style>{`
      *{box-sizing:border-box}
      ::selection{background:#E8922E44;color:#F0EDE8;}
      ::-webkit-scrollbar{width:6px} ::-webkit-scrollbar-track{background:#0D0D0D} ::-webkit-scrollbar-thumb{background:#242424;border-radius:3px}
      input:focus,textarea:focus,select:focus{outline:2px solid #E8922E !important;outline-offset:2px;}
      input,textarea,select,button{-webkit-tap-highlight-color:transparent;font-family:inherit;}
      input[type="file"]::file-selector-button{background:#242424;border:1px solid #2E2E2E;color:#B8A898;border-radius:6px;padding:6px 12px;font-family:inherit;font-size:12px;cursor:pointer;margin-right:10px;transition:filter .15s ease;}
      input[type="file"]::file-selector-button:hover{filter:brightness(1.2);}
      select option{background:#1A1A1A;color:#EDE9E3;}

      /* ── Interactive feedback ── */
      button{transition:filter .15s ease, transform .08s ease, border-color .15s ease, background-color .15s ease;}
      button:not(:disabled){cursor:pointer;}
      button:not(:disabled):hover{filter:brightness(1.15);}
      button:not(:disabled):active{transform:translateY(1px);}
      button:focus-visible,a:focus-visible,[tabindex]:focus-visible{outline:2px solid #E8922E;outline-offset:2px;border-radius:4px;}

      @keyframes toast-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
      @keyframes ember-pulse{0%,100%{opacity:1}50%{opacity:0.5}}

      /* ── Responsive layout classes ── */
      .mob-topbar{display:none;}
      .mob-overlay{display:none;position:fixed;inset:0;background:#000b;z-index:190;}
      .shell-sidebar{width:224px;background:#0D0D0D;border-right:1px solid #242424;display:flex;flex-direction:column;position:sticky;top:0;height:100vh;flex-shrink:0;}
      .shell-content{flex:1;overflow-y:auto;padding:32px;}

      .stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:28px;}
      .course-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;}
      .detail-grid{display:grid;grid-template-columns:1fr 300px;gap:24px;align-items:start;}
      .lab-grid{display:grid;grid-template-columns:300px 1fr;gap:20px;align-items:start;}
      .scenario-editor-grid{display:grid;grid-template-columns:1fr 380px;gap:20px;align-items:start;}
      .scenario-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px;}
      .kb-layout-grid{display:grid;grid-template-columns:320px 1fr;gap:16px;align-items:start;}
      .ir-grid{display:grid;grid-template-columns:1fr 280px;gap:20px;align-items:start;}
      .new-ticket-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;}
      .student-ticket-row{display:flex;align-items:center;}
      .student-action-card{position:sticky;top:20px;}

      @media(max-width:767px){
        .mob-topbar{display:flex;position:fixed;top:0;left:0;right:0;height:54px;background:#0D0D0D;border-bottom:1px solid #242424;align-items:center;justify-content:space-between;padding:0 16px;z-index:200;}
        .mob-overlay.open{display:block;}
        .shell-sidebar{position:fixed;top:0;left:0;z-index:210;height:100vh;width:272px;transform:translateX(-100%);transition:transform .25s ease;box-shadow:4px 0 32px #000;}
        .shell-sidebar.open{transform:translateX(0);}
        .shell-content{padding:16px;padding-top:70px;}
        .stats-grid{grid-template-columns:repeat(2,1fr)!important;}
        .course-grid{grid-template-columns:1fr!important;}
        .detail-grid{grid-template-columns:1fr!important;}
        .lab-grid{grid-template-columns:1fr!important;}
        .scenario-editor-grid{grid-template-columns:1fr!important;}
        .scenario-form-grid{grid-template-columns:1fr!important;}
        .kb-layout-grid{grid-template-columns:1fr!important;}
        .ir-grid{grid-template-columns:1fr!important;}
        .new-ticket-grid{grid-template-columns:1fr!important;}
        .student-ticket-row{align-items:flex-start!important;}
        .student-ticket-meta{display:none!important;}
        .student-action-card{position:static!important;}
        .tkt-row-hide{display:none!important;}
      }
    `}</style>
  );
}


// ── Shared helpers (defined early so all components can use them) ──
function badge(label, color) {
  return <span style={{background:color+"22",color,border:`1px solid ${color}55`,borderRadius:4,padding:"2px 8px",fontSize:11,fontWeight:700,letterSpacing:"0.04em",textTransform:"uppercase"}}>{label}</span>;
}
function fmt(iso) {
  return new Date(iso).toLocaleString("en-US",{month:"short",day:"numeric",year:"numeric",hour:"2-digit",minute:"2-digit"});
}
function nextId(tickets) {
  const nums = tickets.map(t=>parseInt(t.id.split("-")[1])||0);
  return "TKT-" + String(Math.max(0,...nums)+1).padStart(3,"0");
}
function makeNotif(toId,subject,body,ticketId) {
  return {id:"n"+Date.now()+Math.random().toString(36).slice(2),toId,subject,body,ticketId,read:false,ts:new Date().toISOString()};
}
function PageTitle({title,sub}){return(<div style={{marginBottom:28}}><h1 style={{margin:0,fontFamily:"'Raleway',sans-serif",fontSize:28,fontWeight:800,color:"#F0EDE8",letterSpacing:"-0.02em"}}>{title}</h1>{sub&&<p style={{margin:"4px 0 0",color:"#6A5848",fontSize:13}}>{sub}</p>}</div>);}
function SectionLabel({children}){return <div style={{fontSize:11,textTransform:"uppercase",letterSpacing:"0.12em",color:"#6A5848",marginBottom:12,fontWeight:700}}>{children}</div>;}
function Card({children,style={}}){return <div style={{background:"#1A1A1A",border:"1px solid #242424",borderRadius:12,padding:24,...style}}>{children}</div>;}
function Field({label,children}){return(<div style={{marginBottom:16}}><label style={{display:"block",fontSize:11,color:"#6A5848",marginBottom:6,textTransform:"uppercase",letterSpacing:"0.08em"}}>{label}</label>{children}</div>);}
function DetailRow({label,val}){return(<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}><span style={{fontSize:12,color:"#6A5848"}}>{label}</span><span style={{fontSize:13,color:"#B8A898"}}>{val}</span></div>);}
function EmptyState({msg}){return <div style={{background:"#1A1A1A",border:"1px solid #242424",borderRadius:12,padding:40,textAlign:"center",color:"#6A5848",fontSize:14}}>{msg}</div>;}
function Toast({msg,type}){return(<div style={{position:"fixed",bottom:24,right:24,background:type==="success"?"#166534":"#7f1d1d",border:"1px solid "+(type==="success"?"#22c55e44":"#ef444444"),color:"#F0EDE8",borderRadius:8,padding:"12px 20px",fontSize:13,zIndex:9999,fontFamily:"'Inter',sans-serif",boxShadow:"0 8px 24px #000a",animation:"toast-in .2s ease"}}>{msg}</div>);}

const CLIENT_INQUIRY_PURPOSES = [
  ["scope","Scope"],["timing_change","Timing or change"],["symptom_error","Symptom or error"],
  ["environment_equipment","Environment or equipment"],["prior_troubleshooting","Prior troubleshooting"],["impact_urgency","Impact or urgency"],
];
const CLIENT_RESPONSE_QUALITIES = [
  ["exact","Exact"],["ambiguous","Ambiguous"],["mistaken","Mistaken"],["no_useful_information","No useful information"],
];
const emptyClientResponses = () => Object.fromEntries(CLIENT_INQUIRY_PURPOSES.map(([key])=>[key,{response:"",quality:"exact"}]));


// ═══════════════════════════════════════════════════════════════
// APP ROOT
// ═══════════════════════════════════════════════════════════════
export default function App() {
  const [ready,setReady]           = useState(false);
  const [kb,setKb]                 = useState([]);
  const [session,setSession]       = useState(null);
  const [view,setView]             = useState("dashboard");
  const [selected,setSelected]     = useState(null);
  const [toast,setToast]           = useState(null);
  const [classStudents,setClassStudents]   = useState([]);
  const [assignedTickets,setAssignedTickets] = useState([]);
  const [readinessChecks,setReadinessChecks] = useState([]);
  const [safetyAcknowledgments,setSafetyAcknowledgments] = useState([]);
  const [customScenarios,setCustomScenarios] = useState([]);
  const [showOnboarding,setShowOnboarding]   = useState(false);
  const [deepAssigned,setDeepAssigned]       = useState(null); // assigned ticket id to auto-open in MyTickets

  const refreshAssignedTickets = useCallback(async currentSession => {
    if (!currentSession) return;
    let query = supabase.from("assigned_tickets")
      .select("*, lab_assignments(week_label, assigned_at, class_id), field_journal_links(*), ticket_status_history(changed_at), ticket_verification_reviews(action, feedback, manual_checked, created_at, reviewer_alias), ticket_client_inquiries(*), team_incidents(*), team_contributions(*)")
      .order("created_at",{ascending:false});
    if (currentSession.role !== "admin") query = query.eq("student_id",currentSession.id);
    const {data,error} = await query;
    if (error) {
      console.error("assigned ticket load error:",error);
      return;
    }
    setAssignedTickets(data||[]);
  },[]);

  const refreshReadinessChecks = useCallback(async currentSession => {
    if (!currentSession || currentSession.role === "admin") return;
    const [checkRes,safetyRes] = await Promise.all([
      supabase.rpc("get_my_readiness_checks"),
      supabase.from("safety_acknowledgments").select("class_id,acknowledged_at"),
    ]);
    if(checkRes.error) console.error("readiness check load error:",checkRes.error);
    else setReadinessChecks(checkRes.data||[]);
    if(safetyRes.error) console.error("safety acknowledgment load error:",safetyRes.error);
    else setSafetyAcknowledgments(safetyRes.data||[]);
  },[]);

  // ── Load profile from Supabase after auth ──────────────────────
  const loadProfile = useCallback(async (userId) => {
    const [profileRes, membershipRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).single(),
      supabase.rpc("get_my_classes"),
    ]);
    const { data: profile, error } = profileRes;
    const enrolledClasses = membershipRes.data || [];
    if (membershipRes.error) console.warn("class membership load error:", membershipRes.error);
    if (error) { console.error("loadProfile error:", error); return null; }
    if (profile) {
      const primaryClass = enrolledClasses.find(c=>c.id===profile.class_id) || enrolledClasses[0];
      setSession({
        id: profile.id,
        name: profile.alias,
        role: profile.role,
        // Which courses this student actually has access to — derived from the
        // real classes they're enrolled in, not a static cohort label.
        courseIds: [...new Set(enrolledClasses.map(c=>c.course_id).filter(Boolean))],
        class_id: profile.class_id,
        className: primaryClass?.name || "",
        classes: enrolledClasses,
      });
      setView("dashboard");
      if (!localStorage.getItem(`cinder:onboarded:${userId}`)) {
        setShowOnboarding(true);
      }
      return profile;
    }
    return null;
  }, []);

  useEffect(()=>{
    (async()=>{
      // Restore Supabase session if one exists
      const { data: { session: authSession }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        // A refresh token can become invalid after a deploy, reset, or another
        // tab consumes it. Clear only this browser session so public login RPCs
        // do not keep receiving an expired Authorization header.
        await supabase.auth.signOut({scope:"local"});
      } else if (authSession) {
        await loadProfile(authSession.user.id);
      }

      setReady(true);
    })();

    // Keep session in sync
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, authSession) => {
      if (authSession) {
        await loadProfile(authSession.user.id);
      } else {
        setSession(null);
      }
    });
    return () => subscription.unsubscribe();
  },[loadProfile]);

  function showToast(msg,type="success") { setToast({msg,type}); setTimeout(()=>setToast(null),3500); }

  async function logout() {
    await supabase.auth.signOut();
    setSession(null); setView("dashboard"); setSelected(null);
    setClassStudents([]); setAssignedTickets([]); setReadinessChecks([]); setSafetyAcknowledgments([]);
  }

  // ── Load class students (admin) or assigned tickets (student) after login ──
  useEffect(()=>{
    if (!session) return;

    listKnowledgeArticles()
      .then(setKb)
      .catch(error=>{
        console.error("knowledge base load error:",error);
        showToast("Shared knowledge base is not ready. Apply the database migration, then reload.","error");
      });

    if (session.role === "admin") {
      // Admins see ALL classes and ALL students
      Promise.all([
        supabase.from("classes").select("id,name,code,course_id,quarter,year,enrollment_open,code_expires_at"),
        supabase.from("profile_classes").select("profile_id, class_id, profiles(id,alias,role,cohort,class_id)"),
        supabase.from("profiles").select("id,alias,role,cohort,class_id").not("class_id","is",null),
      ]).then(([classesRes, junctionRes, legacyRes]) => {
        // Store all classes on session so LabManager tabs work too
        if (classesRes.data) {
          setSession(s => s ? ({...s, classes: classesRes.data}) : s);
        }
        const seen = new Set();
        const all = [];
        for (const r of (junctionRes.data||[])) {
          if (!r.profiles) continue;
          const key = r.profiles.id + r.class_id;
          if (seen.has(key)) continue;
          seen.add(key);
          all.push({...r.profiles, enrolled_class_id: r.class_id});
        }
        for (const p of (legacyRes.data||[])) {
          if (!p || p.role === "admin") continue;
          const key = p.id + p.class_id;
          if (seen.has(key)) continue;
          seen.add(key);
          all.push({...p, enrolled_class_id: p.class_id});
        }
        setClassStudents(all);
      });
      supabase.from("ticket_templates").select("*").order("course_id").order("week")
        .then(({data})=>{ if(data) setCustomScenarios(data.map(fromTicketTemplateRow)); });
    }

    refreshAssignedTickets(session);
    refreshReadinessChecks(session);
    // Readiness must refetch with the tickets: a check published mid-session
    // hides the ticket, and only this refresh reveals the preparation station.
    const refresh = () => { refreshAssignedTickets(session); refreshReadinessChecks(session); };
    const channel = supabase.channel(`classroom-assignments:${session.id}`)
      .on("postgres_changes",{event:"*",schema:"public",table:"assigned_tickets"},refresh)
      .on("postgres_changes",{event:"*",schema:"public",table:"lab_notes"},refresh)
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"ticket_verification_reviews"},refresh)
      .subscribe();
    window.addEventListener("focus",refresh);
    return ()=>{
      window.removeEventListener("focus",refresh);
      supabase.removeChannel(channel);
    };
  },[session,refreshAssignedTickets,refreshReadinessChecks]);

  async function submitReadinessCheck(checkId,answers){
    const {data,error}=await supabase.rpc("submit_my_readiness_check",{p_check_id:checkId,p_answers:answers});
    if(error) throw error;
    await refreshReadinessChecks(session);
    if(data?.passed) await refreshAssignedTickets(session);
    return data;
  }

  async function submitClientInquiry(ticketId,requestId,question,purpose){
    const {data,error}=await supabase.rpc("submit_my_client_inquiry",{
      p_assigned_ticket_id:ticketId,p_request_id:requestId,p_question:question,p_purpose:purpose,
    });
    if(error) throw error;
    await refreshAssignedTickets(session);
    return data;
  }

  async function acknowledgeSafety(classId){
    const {error}=await supabase.rpc("acknowledge_my_class_safety",{p_class_id:classId});
    if(error) throw error;
    await refreshReadinessChecks(session);
  }

  async function saveCustomScenario(scenario) {
    if (scenario.id) {
      const {error} = await supabase.from("ticket_templates").update(toTicketTemplateRow(scenario)).eq("id",scenario.id);
      if (error) { showToast("Save failed: "+error.message,"error"); return false; }
      setCustomScenarios(prev=>prev.map(s=>s.id===scenario.id?scenario:s));
    } else {
      const id = "cst-"+Date.now();
      const {data,error} = await supabase.from("ticket_templates").insert({...toTicketTemplateRow(scenario),id}).select().single();
      if (error) { showToast("Save failed: "+error.message,"error"); return false; }
      setCustomScenarios(prev=>[...prev,fromTicketTemplateRow(data)]);
    }
    showToast("Scenario saved.");
    return true;
  }

  async function deleteCustomScenario(id) {
    const {error} = await supabase.from("ticket_templates").delete().eq("id",id);
    if (error) { showToast("Delete failed: "+error.message,"error"); return; }
    setCustomScenarios(prev=>prev.filter(s=>s.id!==id));
    showToast("Scenario deleted.");
  }

  async function rotateClassCode(classId, newCode) {
    const {error} = await supabase.rpc("rotate_class_enrollment_code", {
      p_class_id: classId,
      p_new_code: newCode,
      p_expires_at: null,
      p_enrollment_open: true,
    });
    if (error) { showToast("Code rotation failed: "+error.message,"error"); return false; }
    setSession(current=>current ? ({
      ...current,
      classes:(current.classes||[]).map(cls=>cls.id===classId
        ? {...cls,code:newCode.toUpperCase(),enrollment_open:true,code_expires_at:null}
        : cls),
    }) : current);
    showToast("Enrollment code rotated. Existing student accounts still work.");
    return true;
  }

  async function importScenarios(rows) {
    const timestamped = rows.map((r,i)=>({...toTicketTemplateRow(r), id:"cst-"+Date.now()+"-"+i}));
    const {data,error} = await supabase.from("ticket_templates").insert(timestamped).select();
    if (error) { showToast("Import failed: "+error.message,"error"); return; }
    setCustomScenarios(prev=>[...prev,...data.map(fromTicketTemplateRow)]);
    showToast(`Imported ${data.length} scenario(s).`);
  }

  async function pushLabAssignment(courseId, week, scenarioId, mode, studentIds, classId, requestedTeamSize=3) {
    const scenario = SCENARIOS.find(s=>s.id===scenarioId)||customScenarios.find(s=>s.id===scenarioId);
    if (!scenario) return;

    const teamSize=mode==="pairs"?2:mode==="teams"?Math.max(3,Math.min(5,requestedTeamSize)):0;
    const palette=[
      ["Ember","#E8922E"],["Sky","#38BDF8"],["Violet","#A78BFA"],["Green","#4ADE80"],
      ["Rose","#FB7185"],["Gold","#FBBF24"],["Slate","#94A3B8"],["Teal","#2DD4BF"],
    ];
    const roleSets={2:["Client communication / lead","Hands-on technician"],3:["Client communication / lead","Hands-on technician","Evidence / documentation"]};
    const rows=studentIds.map((sid,i)=>{
      const teamIndex=teamSize?Math.floor(i/teamSize):null;
      const actualSize=teamSize?Math.min(teamSize,studentIds.length-teamIndex*teamSize):0;
      const roles=actualSize>3?["Client communication / lead","Hands-on technician","Evidence / documentation","Safety / equipment manager","Verification technician"].slice(0,actualSize):(roleSets[actualSize]||roleSets[3]);
      const color=teamIndex===null?null:palette[teamIndex%palette.length];
      const teamKey=teamIndex===null?null:`W${week}-${mode}${teamIndex+1}`;
      return {
          student_id:sid,scenario_id:scenarioId,
          course_id:courseId,week,title:`[W${week}] ${scenario.title}`,
          description:scenario.description,priority:scenario.priority,group_tag:teamKey,
          inquiry_limit:Number(scenario.inquiryLimit||0),client_responses:scenario.clientResponses||{},
          team_key:teamKey,team_name:teamKey?`${color[0]} Team ${teamIndex+1}`:null,
          color_name:color?.[0]||null,color_hex:color?.[1]||null,
          team_role:teamKey?roles[((i-teamIndex*teamSize)+week-1)%roles.length]:null,
        };
    });

    const {error:rowsErr} = await supabase.rpc("create_lab_assignment_with_tickets",{
      p_class_id:classId||session.class_id,
      p_week_label:`Week ${week} — ${scenario.title}`,
      p_tickets:rows,
    });
    if (rowsErr) { showToast("Push failed: "+rowsErr.message,"error"); return; }
    showToast(`Week ${week} lab pushed to ${studentIds.length} student(s)!`);
  }

  async function saveLabNote(assignedTicketId, content) {
    const serialized = typeof content === "string" ? content : JSON.stringify(content);
    const {error} = await supabase.rpc("save_my_lab_note", {
      p_assigned_ticket_id: assignedTicketId,
      p_content: serialized,
    });
    if (error) throw error;
  }

  async function saveFieldJournalLink(ticketId, fields) {
    const {error} = await supabase.rpc("save_my_field_journal_link", {
      p_assigned_ticket_id:ticketId,
      p_manual_type:fields.manualType,
      p_service_log_number:Number(fields.serviceLogNumber),
      p_station_id:fields.stationId,
      p_asset_ids:fields.assetIds.split(",").map(value=>value.trim()).filter(Boolean),
      p_team_role:fields.teamRole,
      p_impact:fields.impact||null,
      p_urgency:fields.urgency||null,
      p_chosen_priority:fields.chosenPriority||null,
      p_clarifying_question:fields.clarifyingQuestion,
      p_client_response:fields.clientResponse,
      p_escalation_reason:fields.escalationReason,
      p_verification_checklist:fields.verification,
      p_client_resolution:fields.clientResolution,
    });
    if(error) throw error;
    await refreshAssignedTickets(session);
    return {savedAt:new Date().toISOString()};
  }

  async function saveTeamContribution(ticketId,role,contribution){
    const {error}=await supabase.rpc("save_my_team_contribution",{p_assigned_ticket_id:ticketId,p_team_role:role,p_contribution:contribution});
    if(error) throw error;
    await refreshAssignedTickets(session);
  }

  async function saveTeamSharedOutcome(ticketId,sharedOutcome,expectedUpdatedAt){
    const {error}=await supabase.rpc("save_my_team_shared_outcome",{p_assigned_ticket_id:ticketId,p_shared_outcome:sharedOutcome,p_expected_updated_at:expectedUpdatedAt||null});
    if(error) throw error;
    await refreshAssignedTickets(session);
  }

  async function updateAssignedTicketStatus(ticketId, status) {
    const {error} = await supabase.rpc("update_my_assigned_ticket_status", {
      p_ticket_id: ticketId,
      p_status: status,
    });
    if (error) { showToast("Status update failed: "+error.message,"error"); throw error; }
    setAssignedTickets(prev=>prev.map(t=>t.id===ticketId?{...t,status}:t));
    return {savedAt:new Date().toISOString()};
  }

  async function reviewAssignedTicket(ticketId, action, manualChecked, feedback) {
    const {error} = await supabase.rpc("review_assigned_ticket", {
      p_assigned_ticket_id:ticketId,
      p_action:action,
      p_manual_checked:Boolean(manualChecked),
      p_feedback:feedback?.trim()||null,
    });
    if(error){ showToast(`Review failed: ${error.message}`,"error"); throw error; }
    await refreshAssignedTickets(session);
    showToast(action==="Approved"?"Ticket approved and closed.":action==="Returned"?"Ticket returned with feedback.":"Ticket reopened with feedback.");
  }

  if(!ready) return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100vh",background:"#0D0D0D",gap:14}}>
      <GlobalStyles />
      <div style={{fontFamily:"'Raleway',sans-serif",fontSize:28,fontWeight:800,color:"#F0EDE8",letterSpacing:"-0.02em",animation:"ember-pulse 1.4s ease-in-out infinite"}}>
        Cinder<span style={{color:"#E8922E"}}>.</span>
      </div>
      <div style={{fontSize:12,color:"#6A5848",letterSpacing:"0.1em",textTransform:"uppercase"}}>Loading</div>
    </div>
  );
  if(!session) return <Login onSignIn={loadProfile} />;

  function dismissOnboarding() {
    localStorage.setItem(`cinder:onboarded:${session.id}`, "1");
    setShowOnboarding(false);
  }

  return (
    <Shell session={session} onLogout={logout} view={view} setView={setView} unread={0}>
      {showOnboarding && <OnboardingModal onDone={dismissOnboarding} />}
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      {view==="dashboard" && (
        <Dashboard session={session} tickets={[]} users={classStudents} activeLabs={{}}
          assignedTickets={assignedTickets}
          onOpenAssigned={id=>{
            if(session.role==="admin") setView("queue");
            else { setDeepAssigned(id); setView("my-tickets"); }
          }} />
      )}
      {view==="my-tickets" && (
        <MyTickets session={session} tickets={[]} users={classStudents}
          assignedTickets={assignedTickets}
          readinessChecks={readinessChecks}
          safetyAcknowledgments={safetyAcknowledgments}
          onSubmitReadiness={submitReadinessCheck}
          onSubmitClientInquiry={submitClientInquiry}
          onAcknowledgeSafety={acknowledgeSafety}
          initialAssigned={deepAssigned}
          onConsumeInitial={()=>setDeepAssigned(null)}
          onSaveNote={saveLabNote}
          onSaveFieldJournal={saveFieldJournalLink}
          onSaveTeamContribution={saveTeamContribution}
          onSaveTeamSharedOutcome={saveTeamSharedOutcome}
          onStatusChange={updateAssignedTicketStatus}
          onOpen={()=>{}} />
      )}
      {view==="queue" && session.role==="admin" && (
        <AssignmentQueue tickets={assignedTickets} students={classStudents} onReview={reviewAssignedTicket} />
      )}
      {view==="labs" && session.role==="admin" && (
        <LabsHub
          session={session} classStudents={classStudents}
          customScenarios={customScenarios}
          onActivate={pushLabAssignment}
          onSaveScenario={saveCustomScenario}
          onDeleteScenario={deleteCustomScenario}
          onImportScenarios={importScenarios}
        />
      )}
      {view==="admin" && session.role==="admin" && (
        <AdminPanel session={session} classStudents={classStudents}
          onResetAssigned={()=>setAssignedTickets([])}
          onRotateClassCode={rotateClassCode}
          showToast={showToast} />
      )}
      {view==="kb" && (
        <KnowledgeBase session={session} kb={kb}
          onSave={async(article)=>{
            try {
              const summary = article.status==="submitted" ? "Submitted for review"
                : article.status==="published" ? "Published by reviewer"
                : article.status==="changes_requested" ? "Changes requested"
                : "Draft updated";
              const saved = await saveKnowledgeArticle(article,session.id,summary);
              setKb(current=>{
                const exists=current.some(a=>a.id===saved.id);
                return exists?current.map(a=>a.id===saved.id?saved:a):[saved,...current];
              });
              const message = saved.status==="published" ? "Article published!"
                : saved.status==="submitted" ? "Article submitted for review."
                : saved.status==="changes_requested" ? "Changes requested."
                : "Draft saved.";
              showToast(message);
              return saved;
            } catch(error) {
              console.error("knowledge base save error:",error);
              showToast("Could not save article: "+error.message,"error");
              return null;
            }
          }}
          onDelete={async(id)=>{
            try {
              await deleteKnowledgeArticle(id);
              setKb(current=>current.filter(a=>a.id!==id));
              showToast("Article deleted.");
              return true;
            } catch(error) {
              console.error("knowledge base delete error:",error);
              showToast("Could not delete article: "+error.message,"error");
              return false;
            }
          }}
        />
      )}
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════
// ONBOARDING MODAL
// ═══════════════════════════════════════════════════════════════
const ONBOARD_STEPS = [
  { icon:"🔥", title:"Welcome to Cinder", body:"Cinder is your IT Help Desk training platform. You'll work through real-world IT scenarios, document your troubleshooting process, and build hands-on skills every lab day." },
  { icon:"🎫", title:"Your Ticket Queue", body:"When your instructor assigns a lab, a ticket lands in your My Tickets queue — just like a real client request. Read it carefully, then work through the issue on the physical equipment." },
  { icon:"📓", title:"Ember Field Journal", body:"As you work each ticket, document your process in the physical Ember Field Journal — Initial Hypothesis, Troubleshooting Steps, Resolution, and Connections. This booklet is your lab submission at midterm and final." },
  { icon:"📖", title:"Knowledge Base", body:"The Knowledge Base is a shared class reference. After completing a lab, consider submitting an article explaining what you learned. Your classmates will benefit from it." },
  { icon:"✅", title:"You're ready!", body:"That's the quick tour. Your instructor will push a ticket to your queue each lab session. Open it in My Tickets, read the client request, work the problem, and document everything. Good luck!" },
];

function OnboardingModal({onDone}) {
  const [step,setStep]=useState(0);
  const s=ONBOARD_STEPS[step];
  const isLast=step===ONBOARD_STEPS.length-1;
  return (
    <div style={{position:"fixed",inset:0,background:"#0D0D0Dcc",display:"flex",alignItems:"center",justifyContent:"center",zIndex:10000,fontFamily:"'Inter',sans-serif"}}>
      <div style={{background:"#1A1A1A",border:"1px solid #242424",borderRadius:16,padding:40,maxWidth:460,width:"90%",textAlign:"center"}}>
        <div style={{fontSize:48,marginBottom:16}}>{s.icon}</div>
        <div style={{fontFamily:"'Raleway',sans-serif",fontSize:22,fontWeight:800,color:"#F0EDE8",marginBottom:12,letterSpacing:"-0.01em"}}>{s.title}</div>
        <div style={{fontSize:14,color:"#8A7868",lineHeight:1.8,marginBottom:32}}>{s.body}</div>
        {/* Step dots */}
        <div style={{display:"flex",justifyContent:"center",gap:6,marginBottom:28}}>
          {ONBOARD_STEPS.map((_,i)=>(
            <div key={i} style={{width:i===step?20:6,height:6,borderRadius:3,background:i===step?"#E8922E":"#2A2A2A",transition:"width 0.2s"}} />
          ))}
        </div>
        <div style={{display:"flex",gap:10}}>
          {step>0&&<button onClick={()=>setStep(s=>s-1)} style={{flex:1,background:"none",border:"1px solid #242424",color:"#8A7868",borderRadius:8,padding:"12px",fontSize:13,cursor:"pointer"}}>Back</button>}
          <button onClick={isLast?onDone:()=>setStep(s=>s+1)}
            style={{flex:2,background:"#E8922E",border:"none",color:"#0D0D0D",borderRadius:8,padding:"12px",fontSize:13,fontWeight:700,cursor:"pointer"}}>
            {isLast?"Get Started →":"Next →"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// LOGIN
// ═══════════════════════════════════════════════════════════════
function Login({ onSignIn }) {
  function getStoredCodes() { try { return JSON.parse(localStorage.getItem("cinder:codes")||"{}"); } catch { return {}; } }
  function saveCode(a, c) { const m=getStoredCodes(); m[a.toLowerCase().trim()]=c.toUpperCase(); localStorage.setItem("cinder:codes",JSON.stringify(m)); }

  const [tab, setTab]         = useState("signin");
  const [alias, setAlias]     = useState("");
  const [classCode, setClassCode] = useState("");
  const [extraCodes, setExtraCodes] = useState([]); // additional class codes for join
  const [pass, setPass]       = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr]         = useState("");
  const [loading, setLoading] = useState(false);

  function handleAliasChange(val) {
    setAlias(val);
    setErr("");
    const saved = getStoredCodes()[val.toLowerCase().trim()];
    if (saved) setClassCode(saved);
    else if (tab === "signin") setClassCode("");
  }

  function makeEmail(a, loginKey) {
    const loginAlias = a.toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_+|_+$/g,"");
    return `${loginAlias}@${loginKey}.cinder.io`;
  }

  const codeKnown = !!getStoredCodes()[alias.toLowerCase().trim()];

  async function preparePublicAuthRequest() {
    // Login, enrollment, and password reset begin as anonymous operations.
    // Removing a stale local session prevents an invalid bearer token from
    // turning an otherwise valid public RPC into a 403 response.
    await supabase.auth.signOut({scope:"local"});
  }

  async function handleSignIn() {
    setErr(""); setLoading(true);
    if (!alias.trim() || !pass) { setErr("Alias and password required."); setLoading(false); return; }
    const code = classCode.trim();
    if (!code) { setErr("Enter your class code."); setLoading(false); return; }
    await preparePublicAuthRequest();
    const {data:email,error:resolveErr} = await supabase.rpc("resolve_student_login", {
      p_alias: alias.trim(),
      p_class_code: code,
    });
    if (resolveErr || !email) { setErr("Invalid alias, class code, or password."); setLoading(false); return; }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) { setErr("Invalid alias, class code, or password."); setLoading(false); return; }
    saveCode(alias.trim(), code);
    const profile = await onSignIn(data.user.id);
    if (!profile) setErr("Account found but profile missing — contact your instructor.");
    setLoading(false);
  }

  async function handleJoin() {
    setErr(""); setLoading(true);
    const allCodes = [classCode.trim(), ...extraCodes.map(c=>c.trim())].filter(Boolean);
    if (!allCodes.length || !alias.trim() || !pass) { setErr("All fields required."); setLoading(false); return; }
    if (pass !== confirm) { setErr("Passwords do not match."); setLoading(false); return; }
    if (pass.length < 6)  { setErr("Password must be at least 6 characters."); setLoading(false); return; }
    await preparePublicAuthRequest();

    // Exact-code validation returns only sanitized metadata when every code is
    // open and unexpired. It never exposes the classes table or partial matches.
    const {data:classes,error:codeErr} = await supabase.rpc("validate_enrollment_codes", {
      p_codes: allCodes,
    });
    if (codeErr || !classes?.length) { setErr("One or more class codes are invalid or unavailable."); setLoading(false); return; }
    const primaryClass = classes[0];

    const email = makeEmail(alias.trim(), primaryClass.login_key);
    const { data, error: signUpErr } = await supabase.auth.signUp({ email, password: pass });
    if (signUpErr) { setErr(signUpErr.message); setLoading(false); return; }

    // Complete profile + memberships atomically. Protected ownership and role
    // values are derived inside the database rather than accepted from the UI.
    const { error: enrollmentErr } = await supabase.rpc("complete_student_enrollment", {
      p_alias: alias.trim(),
      p_class_codes: allCodes,
    });
    if (enrollmentErr) { setErr("Account created but enrollment failed. Contact your instructor."); setLoading(false); return; }

    saveCode(alias.trim(), allCodes[0]);
    const profile = await onSignIn(data.user.id);
    if (!profile) setErr("Joined but profile missing — contact your instructor.");
    setLoading(false);
  }

  const tabBtn = (id, label) => (
    <button onClick={()=>{setTab(id);setErr("");setOk("");}}
      style={{flex:1,padding:"10px 0",background:tab===id?"#E8922E":"transparent",
        color:tab===id?"#0D0D0D":"#6A5848",border:"none",borderRadius:6,
        fontSize:12,fontWeight:700,cursor:"pointer",letterSpacing:"0.06em",textTransform:"uppercase"}}>
      {label}
    </button>
  );

  // ── Reset password tab state ──
  const [resetPin, setResetPin]         = useState("");
  const [newPass, setNewPass]           = useState("");
  const [confirmNew, setConfirmNew]     = useState("");
  const [ok, setOk]                     = useState("");

  async function handleReset() {
    setErr(""); setOk(""); setLoading(true);
    if (!alias.trim() || !classCode.trim() || !resetPin.trim() || !newPass) {
      setErr("All fields required."); setLoading(false); return;
    }
    if (newPass !== confirmNew) { setErr("Passwords do not match."); setLoading(false); return; }
    if (newPass.length < 6)    { setErr("Password must be at least 6 characters."); setLoading(false); return; }
    await preparePublicAuthRequest();
    const { data, error } = await supabase.rpc("reset_student_password", {
      p_alias: alias.trim(), p_class_code: classCode.trim(),
      p_pin: resetPin.trim(), p_new_password: newPass,
    });
    setLoading(false);
    if (error) { setErr("Reset failed. Check your details and try again."); return; }
    if (data === "ok") {
      setOk("Password updated. You can now sign in.");
      setResetPin(""); setNewPass(""); setConfirmNew("");
      saveCode(alias.trim(), classCode.trim());
      setTimeout(()=>{ setTab("signin"); setOk(""); }, 2000);
    } else if (data === "invalid_credentials") {
      setErr("Alias, class code, or PIN is incorrect.");
    } else if (data === "password_too_short") {
      setErr("Password must be at least 6 characters.");
    } else {
      setErr("Reset failed — contact your instructor.");
    }
  }

  return (
    <div style={{minHeight:"100vh",background:"#0D0D0D",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Inter',sans-serif"}}>
      <GlobalStyles />
      <div style={{width:420}}>
        <div style={{textAlign:"center",marginBottom:40}}>
          <div style={{fontSize:11,letterSpacing:"0.3em",color:"#6A5848",textTransform:"uppercase",marginBottom:8}}>Cinder by Ember</div>
          <div style={{fontFamily:"'Raleway',sans-serif",fontSize:36,fontWeight:800,color:"#F0EDE8",letterSpacing:"-0.02em"}}>Cinder<span style={{color:"#E8922E"}}>.</span></div>
          <div style={{fontSize:12,color:"#6A5848",marginTop:6}}>IT Help Desk Training System</div>
        </div>
        <div style={{background:"#1A1A1A",border:"1px solid #242424",borderRadius:12,padding:32}}>
          <div style={{display:"flex",gap:4,background:"#0D0D0D",borderRadius:8,padding:4,marginBottom:24}}>
            {tabBtn("signin","Sign In")}
            {tabBtn("join","Join Class")}
            {tabBtn("reset","Reset Password")}
          </div>

          {/* ── SIGN IN ── */}
          {tab==="signin" && <>
            <Field label="Alias">
              <input value={alias} onChange={e=>handleAliasChange(e.target.value)}
                style={inputStyle} placeholder="Your alias" autoComplete="username" />
            </Field>
            {!codeKnown && (
              <Field label="Class Code">
                <input value={classCode} onChange={e=>{setClassCode(e.target.value);setErr("");}}
                  style={inputStyle} placeholder="e.g. FALL2026-NET" />
              </Field>
            )}
            <Field label="Password">
              <input value={pass} type="password" onChange={e=>{setPass(e.target.value);setErr("");}}
                style={inputStyle} placeholder="••••••••" autoComplete="current-password"
                onKeyDown={e=>e.key==="Enter"&&handleSignIn()} />
            </Field>
            {err && <div style={{color:"#f87171",fontSize:12,marginBottom:12}}>{err}</div>}
            <button onClick={handleSignIn} style={{...btnPrimary,opacity:loading?0.6:1}} disabled={loading}>
              {loading ? "Please wait…" : "Sign In →"}
            </button>
            <p style={{fontSize:11,color:"#4A3828",textAlign:"center",marginTop:16}}>
              Forgot your password? Use the Reset Password tab.<br/>You'll need the PIN from your instructor.
            </p>
          </>}

          {/* ── JOIN CLASS ── */}
          {tab==="join" && <>
            <Field label="Alias">
              <input value={alias} onChange={e=>handleAliasChange(e.target.value)}
                style={inputStyle} placeholder="Choose an alias" />
            </Field>
            <Field label="Class Code(s)">
              <input value={classCode} onChange={e=>{setClassCode(e.target.value);setErr("");}}
                style={{...inputStyle, marginBottom:6}}
                placeholder="e.g. FALL2026-NET (from your instructor)" />
              {extraCodes.map((code,i)=>(
                <div key={i} style={{display:"flex",gap:6,marginBottom:6}}>
                  <input value={code} onChange={e=>{const n=[...extraCodes];n[i]=e.target.value;setExtraCodes(n);setErr("");}}
                    style={{...inputStyle,flex:1}} placeholder={`Additional class code ${i+2}`} />
                  <button onClick={()=>setExtraCodes(extraCodes.filter((_,j)=>j!==i))}
                    style={{background:"none",border:"1px solid #7f1d1d44",color:"#f87171",borderRadius:6,padding:"0 10px",cursor:"pointer",fontSize:16}}>×</button>
                </div>
              ))}
              <button onClick={()=>setExtraCodes([...extraCodes,""])}
                style={{background:"none",border:"1px dashed #4A3828",color:"#6A5848",borderRadius:6,padding:"6px 12px",fontSize:11,cursor:"pointer",width:"100%",marginTop:2}}>
                + Add another class
              </button>
            </Field>
            <Field label="Password">
              <input value={pass} type="password" onChange={e=>{setPass(e.target.value);setErr("");}}
                style={inputStyle} placeholder="••••••••" />
            </Field>
            <Field label="Confirm Password">
              <input value={confirm} type="password" onChange={e=>{setConfirm(e.target.value);setErr("");}}
                style={inputStyle} placeholder="••••••••"
                onKeyDown={e=>e.key==="Enter"&&handleJoin()} />
            </Field>
            {err && <div style={{color:"#f87171",fontSize:12,marginBottom:12}}>{err}</div>}
            <button onClick={handleJoin} style={{...btnPrimary,opacity:loading?0.6:1}} disabled={loading}>
              {loading ? "Please wait…" : "Join Class →"}
            </button>
            <p style={{fontSize:11,color:"#4A3828",textAlign:"center",marginTop:16,lineHeight:1.6}}>
              No personal information is collected.<br/>Your alias is the only identifier stored.
            </p>
          </>}

          {/* ── RESET PASSWORD ── */}
          {tab==="reset" && <>
            <div style={{background:"#0D0D0D",border:"1px solid #2E2E2E",borderRadius:8,padding:"12px 14px",marginBottom:20,fontSize:12,color:"#8A7868",lineHeight:1.7}}>
              Ask your instructor for a reset PIN. Enter it below along with your alias and class code to set a new password.
            </div>
            <Field label="Alias">
              <input value={alias} onChange={e=>handleAliasChange(e.target.value)}
                style={inputStyle} placeholder="Your alias" />
            </Field>
            {!codeKnown && (
              <Field label="Class Code">
                <input value={classCode} onChange={e=>{setClassCode(e.target.value);setErr("");}}
                  style={inputStyle} placeholder="e.g. FALL2026-NET" />
              </Field>
            )}
            <Field label="Reset PIN (from instructor)">
              <input value={resetPin} onChange={e=>{setResetPin(e.target.value);setErr("");}}
                style={inputStyle} placeholder="4-digit PIN" maxLength={8} />
            </Field>
            <Field label="New Password">
              <input value={newPass} type="password" onChange={e=>{setNewPass(e.target.value);setErr("");}}
                style={inputStyle} placeholder="••••••••" />
            </Field>
            <Field label="Confirm New Password">
              <input value={confirmNew} type="password" onChange={e=>{setConfirmNew(e.target.value);setErr("");}}
                style={inputStyle} placeholder="••••••••"
                onKeyDown={e=>e.key==="Enter"&&handleReset()} />
            </Field>
            {err && <div style={{color:"#f87171",fontSize:12,marginBottom:12}}>{err}</div>}
            {ok  && <div style={{color:"#86efac",fontSize:12,marginBottom:12}}>{ok}</div>}
            <button onClick={handleReset} style={{...btnPrimary,opacity:loading?0.6:1}} disabled={loading}>
              {loading ? "Resetting…" : "Reset Password →"}
            </button>
          </>}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SHELL
// ═══════════════════════════════════════════════════════════════
function Shell({session,onLogout,view,setView,unread,children}) {
  const [navOpen,setNavOpen] = useState(false);

  // Close drawer when navigating
  function confirmLeaveDraft(){
    return view!=="my-tickets"||!hasClassroomDraft(localStorage)||window.confirm("You have a note that has not reached the server. It is saved on this device. Leave My Tickets?");
  }
  function nav(id){ if(!confirmLeaveDraft()) return; setView(id); setNavOpen(false); }
  function logout(){ if(confirmLeaveDraft()) onLogout(); }

  // Courses this student actually has access to, derived from real class enrollment.
  // Admins aren't enrolled in classes the same way, so they see every course.
  const enrolledCourseIds = session.role==="admin" ? COURSES.map(c=>c.id) : (session.courseIds||[]);

  const navItems=[
    {id:"dashboard",  label:"Dashboard",    roles:["student","tech","admin"], icon:"⊞"},
    {id:"my-tickets", label:"My Tickets",   roles:["student"],                icon:"≡"},
    {id:"queue",      label:"Assignment Queue", roles:["admin"],                icon:"▤"},
    {id:"kb",         label:"Knowledge Base",roles:["student","tech","admin"],icon:"📖"},
    {id:"labs",       label:"Labs",         roles:["admin"],                  icon:"🔬"},
    {id:"admin",      label:"Admin Panel",  roles:["admin"],                  icon:"⚙"},
  ].filter(n=>n.roles.includes(session.role) && (!n.courses||n.courses.some(c=>enrolledCourseIds.includes(c))));

  const sidebarContent = (
    <>
      <div style={{padding:"24px 20px 12px"}}>
        <div style={{fontFamily:"'Raleway',sans-serif",fontSize:18,fontWeight:800,color:"#F0EDE8",letterSpacing:"-0.01em"}}>Ember<span style={{color:"#E8922E"}}>.</span></div>
        <div style={{fontSize:10,color:"#6A5848",letterSpacing:"0.18em",textTransform:"uppercase",marginTop:2}}>Cinder</div>
      </div>
      <div style={{padding:"0 12px 12px",display:"flex",gap:4,flexWrap:"wrap"}}>
        {COURSES.filter(c=>enrolledCourseIds.includes(c.id)).map(c=>(
          <span key={c.id} style={{fontSize:9,background:c.color+"18",color:c.color,border:`1px solid ${c.color}33`,borderRadius:3,padding:"2px 6px",fontWeight:700,letterSpacing:"0.06em"}}>
            {c.icon} {c.id.toUpperCase()}
          </span>
        ))}
      </div>
      <nav style={{padding:"4px 12px",flex:1}}>
        {navItems.map(n=>(
          <button key={n.id} onClick={()=>nav(n.id)}
            style={{display:"flex",alignItems:"center",justifyContent:"space-between",width:"100%",padding:"11px 12px",borderRadius:8,
              background:view===n.id?"#1A1A1A":"transparent",
              border:view===n.id?"1px solid #242424":"1px solid transparent",
              color:view===n.id?"#F0EDE8":"#8A7868",
              fontSize:13,cursor:"pointer",textAlign:"left",marginBottom:2,transition:"all 0.15s"}}>
            <span style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:14}}>{n.icon}</span>{n.label}</span>
            {n.id==="inbox"&&unread>0&&<span style={{background:"#ef4444",color:"#fff",borderRadius:10,fontSize:10,padding:"1px 6px",fontWeight:700}}>{unread}</span>}
          </button>
        ))}
      </nav>
      <div style={{padding:"16px 20px",borderTop:"1px solid #242424"}}>
        <div style={{fontSize:12,color:"#B8A898",fontWeight:500}}>{session.name}</div>
        <div style={{fontSize:10,marginTop:3,display:"flex",gap:6,flexWrap:"wrap"}}>
          <span style={{background:ROLE_COLOR[session.role]+"22",color:ROLE_COLOR[session.role],padding:"1px 6px",borderRadius:3,textTransform:"uppercase",letterSpacing:"0.08em",fontSize:9,fontWeight:700}}>{session.role}</span>
          {session.role!=="admin"&&enrolledCourseIds.length>0&&<span style={{color:"#4A3828",fontSize:9}}>{enrolledCourseIds.map(id=>id.toUpperCase()).join(" + ")}</span>}
        </div>
        <button onClick={logout} style={{marginTop:12,fontSize:11,color:"#6A5848",background:"none",border:"none",cursor:"pointer",padding:0}}>← Sign out</button>
      </div>
    </>
  );

  return (
    <div style={{display:"flex",minHeight:"100vh",background:"#0D0D0D",fontFamily:"'Inter',sans-serif"}}>
      <GlobalStyles />

      {/* Mobile top bar */}
      <div className="mob-topbar">
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <button onClick={()=>setNavOpen(o=>!o)}
            style={{background:"none",border:"1px solid #2A2A2A",color:"#8A7868",borderRadius:6,width:36,height:36,fontSize:18,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",lineHeight:1}}>
            {navOpen?"✕":"☰"}
          </button>
          <div style={{fontFamily:"'Raleway',sans-serif",fontSize:18,fontWeight:800,color:"#F0EDE8"}}>Ember<span style={{color:"#E8922E"}}>.</span></div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          {unread>0&&<span style={{background:"#ef4444",color:"#fff",borderRadius:10,fontSize:10,padding:"2px 7px",fontWeight:700}}>{unread}</span>}
          <span style={{fontSize:11,color:"#6A5848"}}>{session.name.split(" ")[0]}</span>
        </div>
      </div>

      {/* Overlay */}
      <div className={`mob-overlay${navOpen?" open":""}`} onClick={()=>setNavOpen(false)} />

      {/* Sidebar */}
      <div className={`shell-sidebar${navOpen?" open":""}`}>
        {sidebarContent}
      </div>

      {/* Main content */}
      <div className="shell-content">{children}</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════
function Dashboard({session,tickets,users,activeLabs,assignedTickets,onOpenAssigned}) {
  const at = assignedTickets || [];
  const stats = {
    new:at.filter(t=>["New","Triage"].includes(t.status)).length,
    inProgress:at.filter(t=>t.status==="In Progress").length,
    verification:at.filter(t=>t.status==="Verification").length,
    closed:at.filter(t=>t.status==="Closed").length,
    breached:at.filter(t=>t.priority&&slaInfo(t.created_at,t.priority,t.status)?.breached).length,
  };

  // For students, merge assigned tickets into recent (shape them to match localStorage tickets)
  const assignedAsTickets = at.map(t=>({
    id:t.id, title:t.title.replace(/^\[W\d+\] /,""), status:t.status,
    ticketNumber:t.ticket_number,
    priority:t.priority, courseId:t.course_id, created:t.created_at||t.created,
    submittedBy:session.id, assignedTo:null, notes:[], _isAssigned:true,
  }));
  const recent=[...assignedAsTickets].sort((a,b)=>new Date(b.created)-new Date(a.created)).slice(0,5);

  return (
    <div>
      <PageTitle title="Dashboard" sub={`Welcome back, ${session.name.split(" ")[0]}`} />

      {/* Active assignment callouts (from Supabase assigned_tickets) */}
      {at.length>0&&(
        <div style={{marginBottom:28}}>
          <SectionLabel>Active Assignments</SectionLabel>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {at.map(t=>{
              const course=courseById(t.course_id);
              const isOpen=t.status!=="Closed";
              return (
                <div key={t.id} onClick={()=>onOpenAssigned(t.id)}
                  style={{background:"#0D0D0D",border:`1px solid ${course?.color||"#E8922E"}44`,
                    borderLeft:`3px solid ${course?.color||"#E8922E"}`,
                    borderRadius:10,padding:"14px 20px",cursor:"pointer",
                    display:"flex",alignItems:"center",justifyContent:"space-between",gap:16}}
                  onMouseEnter={e=>e.currentTarget.style.background="#181410"}
                  onMouseLeave={e=>e.currentTarget.style.background="#0D0D0D"}>
                  <div>
                    {course&&<div style={{fontSize:11,color:course.color,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:3}}>
                      {course.icon} {course.label}
                    </div>}
                    <div style={{fontSize:10,color:"#6A5848",fontFamily:"'JetBrains Mono',monospace",marginBottom:3}}>{t.ticket_number}</div>
                    <div style={{color:"#EDE9E3",fontSize:14,fontWeight:600}}>{t.title.replace(/^\[W\d+\] /,"")}</div>
                    <div style={{marginTop:4}}>{badge(t.status,STATUS_COLOR[t.status])}</div>
                  </div>
                  <div style={{fontSize:12,color:"#E8922E",whiteSpace:"nowrap"}}>View in My Tickets →</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="stats-grid">
        {[
          {label:"New / Triage",val:stats.new,         color:"#3b82f6"},
          {label:"In Progress", val:stats.inProgress,  color:"#f59e0b"},
          {label:"Verification",val:stats.verification,color:"#22c55e"},
          {label:"Closed",      val:stats.closed,      color:"#6b7280"},
          {label:"SLA Breached",val:stats.breached,    color:"#ef4444"},
        ].map(s=>(
          <div key={s.label} style={{background:"#1A1A1A",border:`1px solid ${s.label==="SLA Breached"&&s.val>0?"#ef444444":"#242424"}`,borderRadius:12,padding:"18px 22px"}}>
            <div style={{fontSize:11,color:"#6A5848",textTransform:"uppercase",letterSpacing:"0.1em"}}>{s.label}</div>
            <div style={{fontSize:34,fontWeight:700,color:s.color,fontFamily:"'Raleway',sans-serif",lineHeight:1.2,marginTop:4}}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* Course progress (admin view) */}
      {session.role==="admin"&&(
        <div style={{marginBottom:28}}>
          <SectionLabel>Course Overview</SectionLabel>
          <div className="course-grid">
            {COURSES.map(c=>{
              const cTickets=at.filter(t=>t.course_id===c.id);
              const open=cTickets.filter(t=>["New","Triage"].includes(t.status)).length;
              const active=cTickets.filter(t=>t.status!=="Closed").length;
              return (
                <div key={c.id} style={{background:"#1A1A1A",border:`1px solid ${c.color}33`,borderRadius:12,padding:"18px 22px"}}>
                  <div style={{fontSize:11,color:c.color,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:8}}>{c.icon} {c.label}</div>
                  <div style={{fontSize:12,color:"#8A7868"}}>{c.term} Quarter · {active} active lab{active!==1?"s":""}</div>
                  <div style={{fontSize:12,color:"#8A7868",marginTop:2}}>{cTickets.length} total tickets · {open} awaiting triage</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <SectionLabel>Recent Tickets</SectionLabel>
      <TicketTable tickets={recent} users={users} session={session}
        onOpen={onOpenAssigned}
        showSLA showCourse />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SUBMIT TICKET
// ═══════════════════════════════════════════════════════════════
function SubmitTicket({session,courses,onSubmit,onBack}) {
  const filteredCourses = courses.filter(c=>(session.courseIds||[]).includes(c.id));
  // If a student's class has no course_id set yet (misconfigured), fall back
  // to showing every course rather than leaving the dropdown empty.
  const availCourses = session.role==="admin"||filteredCourses.length===0 ? courses : filteredCourses;

  const [form,setForm]=useState({
    title:"", courseId: availCourses[0]?.id||"net",
    categories:[], priority:"Medium", description:"", linkedCourse:""
  });
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const course=courseById(form.courseId);

  function toggleCat(c) {
    set("categories", form.categories.includes(c)
      ? form.categories.filter(x=>x!==c)
      : [...form.categories,c]);
  }

  return (
    <div style={{maxWidth:660}}>
      {onBack&&<button onClick={onBack} style={{...btnGhost,marginBottom:20}}>← Back to My Tickets</button>}
      <PageTitle title="Submit a Ticket" sub="Document an issue or lab finding." />
      <Card>
        <Field label="Course">
          <select value={form.courseId} onChange={e=>set("courseId",e.target.value)} style={inputStyle}>
            {availCourses.map(c=><option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
          </select>
        </Field>
        <Field label="Issue Title">
          <input value={form.title} onChange={e=>set("title",e.target.value)} style={inputStyle} placeholder="Brief description of the issue" />
        </Field>
        <Field label="Categories (select all that apply)">
          <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
            {course?.categories.map(c=>(
              <button key={c} onClick={()=>toggleCat(c)}
                style={{padding:"5px 12px",borderRadius:6,fontSize:12,cursor:"pointer",
                  background:form.categories.includes(c)?course.color+"33":"#0D0D0D",
                  color:form.categories.includes(c)?course.color:"#8A7868",
                  border:`1px solid ${form.categories.includes(c)?course.color+"66":"#242424"}`,
                  fontWeight:form.categories.includes(c)?700:400}}>
                {c}
              </button>
            ))}
          </div>
        </Field>
        {course?.categories.includes("Cross-Course")&&form.categories.includes("Cross-Course")&&(
          <Field label="Linked Course">
            <select value={form.linkedCourse} onChange={e=>set("linkedCourse",e.target.value)} style={inputStyle}>
              <option value="">None</option>
              {courses.filter(c=>c.id!==form.courseId).map(c=><option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </Field>
        )}
        <Field label="Priority">
          <select value={form.priority} onChange={e=>set("priority",e.target.value)} style={inputStyle}>
            {PRIORITIES.map(p=><option key={p}>{p}</option>)}
          </select>
        </Field>
        <Field label="Description">
          <textarea value={form.description} onChange={e=>set("description",e.target.value)}
            style={{...inputStyle,height:140,resize:"vertical"}}
            placeholder="Describe the issue in detail. For labs, document what you observed and what you tried." />
        </Field>
        <button onClick={()=>{if(form.title.trim()&&form.description.trim()&&form.categories.length>0)onSubmit(form);}}
          style={{...btnPrimary,opacity:(!form.title.trim()||!form.description.trim()||form.categories.length===0)?0.4:1}}
          disabled={!form.title.trim()||!form.description.trim()||form.categories.length===0}>
          Submit Ticket →
        </button>
        {form.categories.length===0&&<div style={{fontSize:11,color:"#6A5848",marginTop:8,textAlign:"center"}}>Select at least one category</div>}
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MY TICKETS
// ═══════════════════════════════════════════════════════════════
const VERIFICATION_ITEMS = [
  ["symptomRetested","Original symptom retested"],
  ["fixConfirmed","Fix remains after restart/reconnect"],
  ["safetyChecked","Workspace and equipment safety checked"],
  ["clientConfirmed","Client-facing result confirmed"],
];

function FieldJournalLink({ticket,session,onSave}) {
  const defaultManual=ticket.course_id==="net"?"Network":ticket.course_id==="sec"?"Security":"Hardware";
  const [form,setForm]=useState({
    manualType:defaultManual,serviceLogNumber:ticket.week||1,stationId:"",assetIds:"",teamRole:"",
    impact:"",urgency:"",chosenPriority:ticket.priority||"",clarifyingQuestion:"",clientResponse:"",
    escalationReason:"",verification:{},clientResolution:"",
  });
  const [loading,setLoading]=useState(true);
  const [saveState,setSaveState]=useState({phase:"idle",lastSavedAt:null,error:null});

  useEffect(()=>{
    let active=true;
    supabase.from("field_journal_links").select("*")
      .eq("assigned_ticket_id",ticket.id).eq("student_id",session.id).maybeSingle()
      .then(({data,error})=>{
        if(!active) return;
        if(error) setSaveState({phase:"failed",lastSavedAt:null,error:"Could not load the Field Journal link."});
        if(data) setForm({
          manualType:data.manual_type,serviceLogNumber:data.service_log_number,stationId:data.station_id||"",
          assetIds:(data.asset_ids||[]).join(", "),teamRole:data.team_role||"",impact:data.impact||"",
          urgency:data.urgency||"",chosenPriority:data.chosen_priority||"",clarifyingQuestion:data.clarifying_question||"",
          clientResponse:data.client_response||"",escalationReason:data.escalation_reason||"",
          verification:data.verification_checklist||{},clientResolution:data.client_resolution||"",
        });
        if(data?.updated_at) setSaveState({phase:"saved",lastSavedAt:data.updated_at,error:null});
        setLoading(false);
      });
    return ()=>{ active=false; };
  },[ticket.id,session.id]);

  function update(field,value){ setForm(current=>({...current,[field]:value})); setSaveState(current=>({...current,phase:"idle",error:null})); }
  async function save(){
    if(saveState.phase==="saving") return;
    setSaveState(current=>({...current,phase:"saving",error:null}));
    try {
      const result=await onSave(ticket.id,form);
      setSaveState({phase:"saved",lastSavedAt:result?.savedAt||new Date().toISOString(),error:null});
    } catch(error) {
      setSaveState(current=>({...current,phase:"failed",error:error?.message||"Field Journal link was not saved."}));
    }
  }

  const serviceRef=`TKT-${String(form.serviceLogNumber||0).padStart(4,"0")}`;
  const stateText=saveState.phase==="saving"?"Saving…":saveState.phase==="failed"?`Not saved — ${saveState.error}`:saveState.lastSavedAt?`Saved ${new Date(saveState.lastSavedAt).toLocaleTimeString([], {hour:"numeric",minute:"2-digit"})}`:"Not saved yet";
  if(loading) return <div style={{marginTop:16,color:"#6A5848",fontSize:12}}>Loading Field Journal link…</div>;

  return (
    <div style={{marginTop:16,background:"#141414",border:"1px solid #1E1E1E",borderRadius:10,overflow:"hidden"}}>
      <div style={{padding:"14px 20px",borderBottom:"1px solid #1E1E1E",display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",flexWrap:"wrap"}}>
        <div>
          <div style={{fontSize:11,textTransform:"uppercase",letterSpacing:"0.1em",color:"#E8922E",fontWeight:700}}>Printed Field Journal Link</div>
          <div style={{fontSize:12,color:"#8A7868",marginTop:4}}>Detailed tool, action, reason, and observation notes stay in the printed manual.</div>
        </div>
        <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:12,color:"#F0EDE8",background:"#0D0D0D",border:"1px solid #2A2A2A",borderRadius:6,padding:"6px 10px"}}>
          {form.manualType} · {serviceRef} ↔ {ticket.ticket_number}
        </div>
      </div>
      <div style={{padding:"18px 20px"}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:"0 14px"}}>
          <Field label="Manual Type"><select value={form.manualType} onChange={event=>update("manualType",event.target.value)} style={inputStyle}>{["Hardware","Network","Security"].map(value=><option key={value}>{value}</option>)}</select></Field>
          <Field label="Service Log Number"><input type="number" min="1" max="99" value={form.serviceLogNumber} onChange={event=>update("serviceLogNumber",event.target.value)} style={inputStyle}/></Field>
          <Field label="Station ID"><input value={form.stationId} onChange={event=>update("stationId",event.target.value)} style={inputStyle} placeholder="e.g. HW-POST-01"/></Field>
          <Field label="Asset IDs"><input value={form.assetIds} onChange={event=>update("assetIds",event.target.value)} style={inputStyle} placeholder="Comma-separated asset tags"/></Field>
          <Field label="Student Team Role"><input value={form.teamRole} onChange={event=>update("teamRole",event.target.value)} style={inputStyle} placeholder="Lead, diagnostics, documentation…"/></Field>
          <Field label="Chosen Priority"><select value={form.chosenPriority} onChange={event=>update("chosenPriority",event.target.value)} style={inputStyle}><option value="">Choose…</option>{PRIORITIES.map(value=><option key={value}>{value}</option>)}</select></Field>
          <Field label="Impact"><select value={form.impact} onChange={event=>update("impact",event.target.value)} style={inputStyle}><option value="">Choose…</option>{["Single user","Small group","Classroom","Service wide"].map(value=><option key={value}>{value}</option>)}</select></Field>
          <Field label="Urgency"><select value={form.urgency} onChange={event=>update("urgency",event.target.value)} style={inputStyle}><option value="">Choose…</option>{["Low","Normal","High","Immediate"].map(value=><option key={value}>{value}</option>)}</select></Field>
        </div>
        <Field label="Clarifying Question"><textarea value={form.clarifyingQuestion} onChange={event=>update("clarifyingQuestion",event.target.value)} style={{...inputStyle,minHeight:58,resize:"vertical"}} placeholder="What did you need to ask before acting?"/></Field>
        <Field label="Client Response"><textarea value={form.clientResponse} onChange={event=>update("clientResponse",event.target.value)} style={{...inputStyle,minHeight:58,resize:"vertical"}} placeholder="What information did the client provide?"/></Field>
        <Field label="Escalation Reason"><textarea value={form.escalationReason} onChange={event=>update("escalationReason",event.target.value)} style={{...inputStyle,minHeight:58,resize:"vertical"}} placeholder="If escalated, what exceeded your access, time, or skill boundary?"/></Field>
        <Field label="Verification Checklist">
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:8}}>{VERIFICATION_ITEMS.map(([key,label])=><label key={key} style={{display:"flex",alignItems:"center",gap:8,fontSize:12,color:"#B8A898",background:"#101010",border:"1px solid #242424",borderRadius:6,padding:"8px 10px"}}><input type="checkbox" checked={Boolean(form.verification[key])} onChange={event=>update("verification",{...form.verification,[key]:event.target.checked})}/>{label}</label>)}</div>
        </Field>
        <Field label="Client-facing Resolution"><textarea value={form.clientResolution} onChange={event=>update("clientResolution",event.target.value)} style={{...inputStyle,minHeight:70,resize:"vertical"}} placeholder="Briefly state what was restored and any next step. Do not copy the troubleshooting log."/></Field>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}>
          <div role="status" aria-live="polite" style={{fontSize:11,color:saveState.phase==="failed"?"#f87171":saveState.phase==="saved"?"#4ade80":"#8A7868"}}>{stateText}</div>
          <button onClick={save} disabled={saveState.phase==="saving"||!form.manualType||!Number(form.serviceLogNumber)} style={{...btnPrimary,width:"auto",padding:"8px 18px",opacity:saveState.phase==="saving"?0.5:1}}>Save Field Journal Link</button>
        </div>
      </div>
    </div>
  );
}

const STUDENT_FLOW = [
  {label:"Triage",statuses:["New","Triage"]},
  {label:"Work",statuses:["In Progress"]},
  {label:"Communicate",statuses:["Waiting","Escalated"]},
  {label:"Verify",statuses:["Verification"]},
  {label:"Signed off",statuses:["Closed"]},
];

function StudentWorkflow({status}) {
  const active=Math.max(0,STUDENT_FLOW.findIndex(step=>step.statuses.includes(status)));
  return <div style={{display:"grid",gridTemplateColumns:"repeat(5,minmax(64px,1fr))",gap:6,marginBottom:20,overflowX:"auto"}}>
    {STUDENT_FLOW.map((step,index)=><div key={step.label} style={{minWidth:64,borderTop:`3px solid ${index<=active?"#E8922E":"#242424"}`,paddingTop:7,fontSize:10,color:index===active?"#F0EDE8":index<active?"#8A7868":"#4A3828",fontWeight:index===active?700:500}}>{index+1}. {step.label}</div>)}
  </div>;
}

function ReadinessStation({checks,onSubmit}) {
  const pending=checks.filter(check=>!check.passed);
  const [activeId,setActiveId]=useState(null);
  const [answers,setAnswers]=useState({});
  const [result,setResult]=useState(null);
  const [submitting,setSubmitting]=useState(false);
  // activeId is only a preference. Fall back to the first pending check so a
  // late RPC response never renders an empty card, and hold a just-passed
  // check on screen while its result is still displayed.
  const active=pending.find(check=>check.check_id===activeId)
    ||(result&&checks.find(check=>check.check_id===activeId))
    ||pending[0];
  if(pending.length===0&&!result) return null;

  async function submit(){
    if(!active||submitting) return;
    setActiveId(active.check_id); setSubmitting(true); setResult(null);
    try { setResult(await onSubmit(active.check_id,answers)); }
    catch(error){ setResult({error:error?.message||"Readiness check could not be submitted."}); }
    finally { setSubmitting(false); }
  }

  return <Card style={{marginBottom:28,border:"1px solid #E8922E55",background:"#181410"}}>
    <SectionLabel>Preparation station</SectionLabel>
    <h2 style={{margin:"0 0 6px",fontSize:19,color:"#F0EDE8"}}>Complete readiness before hands-on work</h2>
    <p style={{margin:"0 0 18px",fontSize:12,color:"#8A7868",lineHeight:1.6}}>Score 80% or higher to release your own ticket. A retry never holds up prepared teammates.</p>
    {(pending.length>1||(result&&pending.length>0))&&<div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>{pending.map(check=><button key={check.check_id} onClick={()=>{setActiveId(check.check_id);setAnswers({});setResult(null);}} style={{...btnGhost,borderColor:activeId===check.check_id?"#E8922E":"#2A2A2A",color:activeId===check.check_id?"#E8922E":"#8A7868"}}>{check.title}</button>)}</div>}
    {active&&<>
      <div style={{fontSize:14,fontWeight:700,color:"#EDE9E3",marginBottom:4}}>{active.title}</div>
      {active.instructions&&<div style={{fontSize:12,color:"#8A7868",marginBottom:16}}>{active.instructions}</div>}
      <div style={{display:"flex",flexDirection:"column",gap:14}}>{active.questions.map((question,index)=><div key={question.id} style={{background:"#141414",border:"1px solid #242424",borderRadius:8,padding:14}}>
        <div style={{fontSize:13,color:"#D8C8B8",marginBottom:10}}>{index+1}. {question.prompt}</div>
        <div style={{display:"grid",gap:7}}>{question.options.map(option=><label key={option.id} style={{fontSize:12,color:"#A89888",display:"flex",gap:8,alignItems:"flex-start"}}><input type="radio" name={`${active.check_id}-${question.id}`} checked={answers[question.id]===option.id} onChange={()=>setAnswers(current=>({...current,[question.id]:option.id}))} style={{accentColor:"#E8922E"}} />{option.text}</label>)}</div>
        {result?.feedback?.find(item=>item.id===question.id)&&<div style={{marginTop:10,fontSize:11,color:result.feedback.find(item=>item.id===question.id).correct?"#4ade80":"#fbbf24"}}>{result.feedback.find(item=>item.id===question.id).correct?"Correct. ":"Review: "}{result.feedback.find(item=>item.id===question.id).explanation}</div>}
      </div>)}</div>
      {result?.error&&<div role="alert" style={{color:"#f87171",fontSize:12,marginTop:12}}>{result.error}</div>}
      {result&&!result.error&&<div role="status" style={{color:result.passed?"#4ade80":"#fbbf24",fontSize:13,marginTop:14,fontWeight:700}}>{result.passed?`Ready — ${result.score_percent}%. Your ticket is released.`:`${result.score_percent}%. Review the explanations, then try again.`}</div>}
      <button onClick={submit} disabled={submitting||Object.keys(answers).length!==5||result?.passed} style={{...btnPrimary,width:"auto",marginTop:16,opacity:submitting||Object.keys(answers).length!==5?0.45:1}}>{submitting?"Checking…":active.attempt_count?"Retry readiness check":"Submit readiness check"}</button>
    </>}
  </Card>;
}

function SafetyAcknowledgment({session,acknowledgments,onAcknowledge}){
  const [saving,setSaving]=useState(null);
  const [error,setError]=useState("");
  const pending=(session.classes||[]).filter(classRow=>!acknowledgments.some(row=>row.class_id===classRow.id));
  if(pending.length===0) return null;
  async function acknowledge(classId){setSaving(classId);setError("");try{await onAcknowledge(classId);}catch(reason){setError(reason?.message||"Acknowledgment failed.");}finally{setSaving(null);}}
  return <Card style={{marginBottom:20,border:"1px solid #38bdf844"}}><SectionLabel>First-session safety acknowledgment</SectionLabel><p style={{fontSize:12,color:"#8A7868",lineHeight:1.6}}>After the instructor-led safety-equipment walkthrough, acknowledge each enrolled lab once.</p>{pending.map(classRow=><div key={classRow.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,padding:"8px 0"}}><span style={{fontSize:13,color:"#D8C8B8"}}>{classRow.name}</span><button onClick={()=>acknowledge(classRow.id)} disabled={saving===classRow.id} style={{...btnGhost,width:"auto"}}>{saving===classRow.id?"Saving…":"I completed the walkthrough"}</button></div>)}{error&&<div role="alert" style={{fontSize:11,color:"#f87171"}}>{error}</div>}</Card>;
}

function ClientInquiryPanel({ticket,onSubmit}) {
  const history=[...(ticket.ticket_client_inquiries||[])].sort((a,b)=>new Date(a.created_at)-new Date(b.created_at));
  const limit=Number(ticket.inquiry_limit||0);
  const [question,setQuestion]=useState("");
  const [purpose,setPurpose]=useState("");
  const [requestId,setRequestId]=useState(()=>crypto.randomUUID());
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState("");
  const remaining=Math.max(0,limit-history.length);
  if(limit===0) return null;
  async function submit(){
    if(!question.trim()||!purpose||saving||remaining===0) return;
    setSaving(true);setError("");
    try { await onSubmit(ticket.id,requestId,question,purpose); setQuestion("");setPurpose("");setRequestId(crypto.randomUUID()); }
    catch(reason){ setError(reason?.message?.includes("inquiry_limit_reached")?"This ticket's inquiry limit has been reached.":reason?.message||"The inquiry was not sent."); }
    finally { setSaving(false); }
  }
  return <div style={{marginTop:16,background:"#141414",border:"1px solid #1E1E1E",borderRadius:10,padding:18}}>
    <div style={{display:"flex",justifyContent:"space-between",gap:12,marginBottom:8}}><SectionLabel>Client inquiries</SectionLabel><span style={{fontSize:11,color:"#8A7868"}}>{history.length} of {limit} used</span></div>
    <p style={{margin:"0 0 14px",fontSize:12,color:"#8A7868",lineHeight:1.55}}>Ask only when the answer will change your triage. Write the question before identifying its purpose.</p>
    {history.map(item=><div key={item.id} style={{borderLeft:"2px solid #E8922E",paddingLeft:12,marginBottom:14,fontSize:12,lineHeight:1.55}}>
      <div style={{color:"#D8C8B8",fontWeight:600}}>You: {item.question}</div>
      <div style={{color:"#6A5848",fontSize:10,margin:"2px 0 5px"}}>{CLIENT_INQUIRY_PURPOSES.find(([key])=>key===item.purpose)?.[1]} · {fmt(item.created_at)}</div>
      <div style={{color:"#B8A898"}}>Client: {item.response}</div>
    </div>)}
    {remaining>0?<>
      <textarea value={question} maxLength={500} onChange={event=>{setQuestion(event.target.value);if(!event.target.value.trim())setPurpose("");}} placeholder="Write your question to the client…" style={{...inputStyle,minHeight:72,resize:"vertical"}} />
      <select aria-label="Inquiry purpose" value={purpose} disabled={!question.trim()} onChange={event=>setPurpose(event.target.value)} style={{...inputStyle,marginTop:9,opacity:question.trim()?1:0.45}}><option value="">Select the question's purpose…</option>{CLIENT_INQUIRY_PURPOSES.map(([key,label])=><option key={key} value={key}>{label}</option>)}</select>
      {error&&<div role="alert" style={{fontSize:11,color:"#f87171",marginTop:8}}>{error}</div>}
      <button onClick={submit} disabled={!question.trim()||!purpose||saving} style={{...btnPrimary,width:"auto",marginTop:10,opacity:!question.trim()||!purpose||saving?0.45:1}}>{saving?"Sending…":`Ask client · ${remaining} remaining`}</button>
    </>:<div style={{fontSize:11,color:"#6A5848"}}>Inquiry limit reached. Continue triage with the evidence you have.</div>}
  </div>;
}

function TeamContribution({ticket,onSave,onSaveSharedOutcome}){
  const incident=Array.isArray(ticket.team_incidents)?ticket.team_incidents[0]:ticket.team_incidents;
  const saved=Array.isArray(ticket.team_contributions)?ticket.team_contributions[0]:ticket.team_contributions;
  const assignedRole=saved?.team_role||"";
  const [contribution,setContribution]=useState(saved?.contribution||"");
  const [saving,setSaving]=useState(false);const [message,setMessage]=useState("");
  const [sharedOutcome,setSharedOutcome]=useState(incident?.shared_outcome||"");
  const [savingOutcome,setSavingOutcome]=useState(false);
  const [roster,setRoster]=useState([]);
  useEffect(()=>{let active=true;supabase.rpc("team_roster",{p_assigned_ticket_id:ticket.id}).then(({data})=>{if(active)setRoster(data||[]);});return()=>{active=false;};},[ticket.id]);
  if(!ticket.team_incident_id) return null;
  async function submit(){setSaving(true);setMessage("");try{await onSave(ticket.id,assignedRole,contribution);setMessage("Individual contribution recorded.");}catch(error){setMessage(error?.message||"Contribution was not saved.");}finally{setSaving(false);}}
  async function submitOutcome(){setSavingOutcome(true);setMessage("");try{await onSaveSharedOutcome(ticket.id,sharedOutcome,incident?.shared_outcome_updated_at);setMessage("Shared team outcome recorded.");}catch(error){setMessage(error?.message==="shared_outcome_changed"?"A teammate updated this outcome. Reopen the ticket to load their version.":error?.message||"Shared outcome was not saved.");}finally{setSavingOutcome(false);}}
  return <Card style={{marginTop:16,border:`1px solid ${incident?.color_hex||"#A78BFA"}55`}}><div style={{display:"flex",justifyContent:"space-between",gap:12}}><SectionLabel>Linked team incident</SectionLabel><span style={{fontSize:11,color:incident?.color_hex||"#A78BFA"}}>{incident?.team_name||ticket.group_tag} · {incident?.color_name}</span></div>{incident?.title&&<div style={{fontSize:13,color:"#EDE9E3",fontWeight:700,marginBottom:6}}>{incident.title}</div>}{incident?.description&&<p style={{fontSize:11,color:"#8A7868",lineHeight:1.55,marginTop:0}}>{incident.description}</p>}<DetailRow label="Your role this lab" val={assignedRole||"Not assigned"}/>{roster.length>0&&<div style={{background:"#111",border:"1px solid #242424",borderRadius:6,padding:9,marginBottom:14}}>{roster.map(member=><div key={member.student_alias} style={{fontSize:10,color:member.contribution_recorded?"#4ADE80":"#FBBF24",marginBottom:3}}>{member.contribution_recorded?"✓":"○"} {member.student_alias} · {member.team_role} · {member.ticket_status}</div>)}</div>}<Field label="Shared verified outcome"><textarea value={sharedOutcome} maxLength={2000} onChange={event=>{setSharedOutcome(event.target.value);setMessage("");}} placeholder="What result did the team verify together?" style={{...inputStyle,minHeight:64,resize:"vertical"}}/>{incident?.shared_outcome_updated_at&&<div style={{fontSize:9,color:"#6A5848",marginTop:5}}>Last updated {fmt(incident.shared_outcome_updated_at)}</div>}<button onClick={submitOutcome} disabled={savingOutcome||sharedOutcome.trim().length<10} style={{...btnGhost,marginTop:8,opacity:savingOutcome||sharedOutcome.trim().length<10?0.45:1}}>{savingOutcome?"Saving…":"Save shared outcome"}</button></Field><p style={{fontSize:11,color:"#8A7868",lineHeight:1.55}}>Record only what you personally contributed below. The team’s technical outcome is shared; your evidence remains individual.</p><textarea value={contribution} maxLength={1000} onChange={event=>{setContribution(event.target.value);setMessage("");}} placeholder="What did you personally do, observe, communicate, or verify?" style={{...inputStyle,minHeight:78,resize:"vertical"}}/><button onClick={submit} disabled={saving||contribution.trim().length<10||!assignedRole} style={{...btnPrimary,width:"auto",marginTop:10,opacity:saving||contribution.trim().length<10?0.45:1}}>{saving?"Saving…":"Save individual contribution"}</button>{message&&<div role="status" style={{fontSize:11,color:message.includes("recorded")?"#4ADE80":"#F87171",marginTop:8}}>{message}</div>}</Card>;
}

function MyTickets({session,tickets,users,assignedTickets,readinessChecks=[],safetyAcknowledgments=[],initialAssigned,onConsumeInitial,onOpen,onSaveNote,onSaveFieldJournal,onSaveTeamContribution,onSaveTeamSharedOutcome,onStatusChange,onSubmitReadiness,onSubmitClientInquiry,onAcknowledgeSafety}) {
  const [selectedAssigned,setSelectedAssigned]=useState(initialAssigned||null);
  const [atNotes,setAtNotes]=useState([]);
  const [noteText,setNoteText]=useState("");
  const [postingNote,setPostingNote]=useState(false);
  const [noteSave,setNoteSave]=useState({phase:"idle",lastSavedAt:null,error:null});
  const [statusSave,setStatusSave]=useState({phase:"idle",lastSavedAt:null,error:null});
  const [statusHistory,setStatusHistory]=useState([]);
  const [reviewHistory,setReviewHistory]=useState([]);
  const mine=tickets.filter(t=>t.submittedBy===session.id||t.assignedTo===session.id)
    .sort((a,b)=>new Date(b.created)-new Date(a.created));

  // Consume deep-link from Dashboard
  useEffect(()=>{
    if(initialAssigned){ setSelectedAssigned(initialAssigned); onConsumeInitial?.(); }
  },[initialAssigned]);

  // Load notes from lab_notes when an assigned ticket is opened
  useEffect(()=>{
    if(!selectedAssigned){ setAtNotes([]); setNoteText(""); return; }
    const draft = loadClassroomDraft(localStorage,session.id,selectedAssigned);
    setNoteText(draft?.text||"");
    setNoteSave(draft?.text
      ? {phase:"failed",lastSavedAt:null,error:"Draft recovered from this device. Retry when connected."}
      : {phase:"idle",lastSavedAt:null,error:null});
    supabase.from("lab_notes")
      .select("content, updated_at")
      .eq("assigned_ticket_id",selectedAssigned)
      .eq("student_id",session.id)
      .maybeSingle()
      .then(({data,error})=>{
        if(error){
          setNoteSave(current=>({...current,phase:"failed",error:"Could not load the last server save."}));
          return;
        }
        const raw = data?.content;
        try {
          const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
          setAtNotes(parsed?.notes || []);
        } catch {
          setAtNotes([]);
        }
        if(data?.updated_at) setNoteSave(current=>({...current,lastSavedAt:data.updated_at}));
      });
  },[selectedAssigned,session.id]);

  useEffect(()=>{
    if(!selectedAssigned){ setStatusHistory([]); return; }
    const loadHistory=()=>supabase.from("ticket_status_history")
        .select("id, from_status, to_status, changed_by, changed_by_alias, changed_at, reopened")
        .eq("assigned_ticket_id",selectedAssigned)
        .order("changed_at",{ascending:true})
        .then(({data,error})=>{
          if(error) console.error("ticket history load error:",error);
          else setStatusHistory(data||[]);
        });
    loadHistory();
    const channel=supabase.channel(`ticket-history:${selectedAssigned}`)
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"ticket_status_history",filter:`assigned_ticket_id=eq.${selectedAssigned}`},loadHistory)
      .subscribe();
    return ()=>{ supabase.removeChannel(channel); };
  },[selectedAssigned]);

  useEffect(()=>{
    if(!selectedAssigned){ setReviewHistory([]); return; }
    const loadReviews=()=>supabase.from("ticket_verification_reviews")
      .select("id, action, manual_checked, feedback, reviewer_alias, created_at")
      .eq("assigned_ticket_id",selectedAssigned)
      .order("created_at",{ascending:true})
      .then(({data,error})=>{
        if(error) console.error("verification review load error:",error);
        else setReviewHistory(data||[]);
      });
    loadReviews();
    const channel=supabase.channel(`ticket-reviews:${selectedAssigned}`)
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"ticket_verification_reviews",filter:`assigned_ticket_id=eq.${selectedAssigned}`},loadReviews)
      .subscribe();
    return ()=>{ supabase.removeChannel(channel); };
  },[selectedAssigned]);

  useEffect(()=>{
    if(!selectedAssigned) return;
    if(noteText.trim()) {
      const existing = loadClassroomDraft(localStorage,session.id,selectedAssigned);
      saveClassroomDraft(localStorage,session.id,selectedAssigned,{
        id:existing?.id||crypto.randomUUID(),text:noteText,updatedAt:new Date().toISOString(),
      });
    } else if(noteSave.phase!=="saving") {
      clearClassroomDraft(localStorage,session.id,selectedAssigned);
    }
  },[noteText,selectedAssigned,session.id,noteSave.phase]);

  const hasUnsavedNote = Boolean(noteText.trim());
  useEffect(()=>{
    if(!hasUnsavedNote) return;
    const warn = event=>{ event.preventDefault(); event.returnValue=""; };
    window.addEventListener("beforeunload",warn);
    return ()=>window.removeEventListener("beforeunload",warn);
  },[hasUnsavedNote]);

  async function postNote(){
    if(!noteText.trim()||postingNote) return;
    setPostingNote(true);
    setNoteSave(current=>({...current,phase:"saving",error:null}));
    const draft = loadClassroomDraft(localStorage,session.id,selectedAssigned);
    const newNote={id:draft?.id||crypto.randomUUID(),author:session.id,authorName:session.name||session.email||"You",text:noteText.trim(),ts:draft?.updatedAt||new Date().toISOString()};
    const next=appendUniqueNote(atNotes,newNote);
    try {
      await onSaveNote(selectedAssigned,{notes:next});
      const savedAt=new Date().toISOString();
      setAtNotes(next);
      setNoteText("");
      clearClassroomDraft(localStorage,session.id,selectedAssigned);
      setNoteSave({phase:"saved",lastSavedAt:savedAt,error:null});
    } catch(error) {
      setNoteSave(current=>({...current,phase:"failed",error:error?.message||"Save failed. Your draft is safe on this device."}));
    } finally {
      setPostingNote(false);
    }
  }

  async function changeStatus(ticketId,nextStatus){
    setStatusSave(current=>({...current,phase:"saving",error:null}));
    try {
      const result=await onStatusChange(ticketId,nextStatus);
      setStatusSave({phase:"saved",lastSavedAt:result?.savedAt||new Date().toISOString(),error:null});
      setStatusHistory(history=>[...history,{
        id:`confirmed-${Date.now()}`,
        from_status:assignedTickets.find(ticket=>ticket.id===ticketId)?.status||null,
        to_status:nextStatus,
        changed_by:session.id,
        changed_by_alias:session.name,
        changed_at:result?.savedAt||new Date().toISOString(),
        reopened:assignedTickets.find(ticket=>ticket.id===ticketId)?.status==="Closed",
      }]);
    } catch(error) {
      setStatusSave(current=>({...current,phase:"failed",error:error?.message||"Status was not saved."}));
    }
  }

  function SaveState({state,label="Work"}) {
    const color=state.phase==="failed"?"#f87171":state.phase==="saved"?"#4ade80":"#8A7868";
    const text=state.phase==="saving"?"Saving…":state.phase==="failed"?`Not saved — ${state.error}`:state.lastSavedAt?`Saved ${new Date(state.lastSavedAt).toLocaleTimeString([], {hour:"numeric",minute:"2-digit"})}`:`${label} not saved yet`;
    return <div role="status" aria-live="polite" style={{fontSize:11,color,marginTop:6}}>{text}</div>;
  }

  function leaveAssignedTicket(){
    if(hasUnsavedNote&&!window.confirm("This note has not reached the server yet. It is saved as a draft on this device. Leave the ticket?")) return;
    setSelectedAssigned(null);
  }

  // ── Assigned ticket detail — matches TicketDetail layout exactly ──
  if(selectedAssigned) {
    const at = assignedTickets.find(t=>t.id===selectedAssigned);
    if(at) {
      const course = courseById(at.course_id);
      const scenario = SCENARIOS.find(s=>s.id===at.scenario_id);
      const requester = scenario ? PERSON_BY_ID[scenario.requesterId] : null;
      const orgColor = requester ? (ORG_COLOR[requester.org]||"#E8922E") : "#E8922E";
      const railColor = PRI_RAIL[at.priority] || "#6b7280";
      const isResolved = at.status==="Closed";
      const studentTransitions=STATUS_TRANSITIONS[at.status]||[];
      const statusOptions = [at.status,...studentTransitions.filter(next=>next!=="Closed"&&at.status!=="Closed")];
      const nextActions=statusOptions.filter(status=>status!==at.status);
      const initials = name => name.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase();

      return (
        <div style={{maxWidth:1040,fontFamily:"'Inter',sans-serif"}}>
          <StudentWorkflow status={at.status}/>

          {/* Top breadcrumb bar */}
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20,paddingBottom:16,borderBottom:"1px solid #1E1E1E"}}>
            <button onClick={leaveAssignedTicket} style={btnGhost}>
              ← Back
            </button>
            <span style={{color:"#3A3A3A",fontSize:12}}>/</span>
            <span style={{fontSize:12,fontFamily:"'JetBrains Mono',monospace",color:"#6A5848",background:"#1A1A1A",border:"1px solid #242424",borderRadius:4,padding:"3px 8px"}}>
              {at.ticket_number||at.id?.slice(0,8)||"—"}
            </span>
            {course&&<span style={{fontSize:11,color:course.color,fontWeight:700,background:course.color+"15",border:`1px solid ${course.color}30`,borderRadius:4,padding:"3px 8px"}}>{course.icon} {course.id.toUpperCase()}</span>}
            {at.group_tag&&<span style={{fontSize:11,color:"#a78bfa",background:"#a78bfa15",borderRadius:4,padding:"3px 8px"}}>👥 {at.group_tag}</span>}
            <div style={{flex:1}}/>
            <div style={{textAlign:"right"}}>{badge(at.status,STATUS_COLOR[at.status])}<SaveState state={statusSave} label="Status" /></div>
          </div>

          {/* Title block */}
          <div style={{marginBottom:24,display:"flex",alignItems:"flex-start",gap:12}}>
            <div style={{width:4,alignSelf:"stretch",background:isResolved?"#2A2A2A":railColor,borderRadius:2,flexShrink:0,minHeight:32}}/>
            <div style={{flex:1}}>
              <div style={{fontFamily:"'Raleway',sans-serif",fontSize:22,fontWeight:800,color:"#F0EDE8",lineHeight:1.2,marginBottom:10}}>
                {at.title.replace(/^\[W\d+\] /,"")}
              </div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
                <span style={{fontSize:11,fontWeight:700,color:railColor,background:railColor+"18",border:`1px solid ${railColor}40`,borderRadius:4,padding:"2px 8px",textTransform:"uppercase",letterSpacing:"0.06em"}}>{at.priority}</span>
              </div>
            </div>
          </div>

          <div className="detail-grid">
            {/* Main column */}
            <div>
              {/* Email-style description */}
              <div style={{background:"#141414",border:"1px solid #1E1E1E",borderRadius:10,overflow:"hidden"}}>
                {requester && (
                  <div style={{padding:"14px 20px",borderBottom:"1px solid #1E1E1E",background:"#111",display:"flex",alignItems:"center",gap:12}}>
                    <div style={{width:36,height:36,borderRadius:8,background:`${orgColor}20`,border:`1px solid ${orgColor}40`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:orgColor,flexShrink:0,fontFamily:"'Raleway',sans-serif"}}>
                      {initials(requester.name)}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:13,fontWeight:600,color:"#EDE9E3"}}>
                        {requester.name} <span style={{fontWeight:400,color:"#4A3828",fontFamily:"'JetBrains Mono',monospace",fontSize:11}}>&#60;{requester.email}&#62;</span>
                      </div>
                      <div style={{fontSize:11,color:"#6A5848",marginTop:1}}>
                        {requester.role} · <span style={{color:orgColor}}>{requester.orgName}</span>
                        {at.created_at&&<><span style={{color:"#2A2A2A",margin:"0 6px"}}>·</span><span>{fmt(at.created_at)}</span></>}
                      </div>
                    </div>
                  </div>
                )}
                <div style={{padding:"20px 24px"}}>
                  <p style={{color:"#C8B8A8",fontSize:14,lineHeight:1.8,margin:0,whiteSpace:"pre-wrap"}}>{at.description}</p>
                </div>
              </div>

              <FieldJournalLink key={`journal-${at.id}`} ticket={at} session={session} onSave={onSaveFieldJournal} />
              <TeamContribution key={`team-${at.id}`} ticket={at} onSave={onSaveTeamContribution} onSaveSharedOutcome={onSaveTeamSharedOutcome}/>
              <ClientInquiryPanel key={`client-${at.id}`} ticket={at} onSubmit={onSubmitClientInquiry} />

              {/* Activity thread */}
              <div style={{marginTop:16,background:"#141414",border:"1px solid #1E1E1E",borderRadius:10,overflow:"hidden"}}>
                <div style={{padding:"10px 20px",borderBottom:"1px solid #1E1E1E",display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:11,textTransform:"uppercase",letterSpacing:"0.1em",color:"#4A4038",fontWeight:600}}>Activity · {atNotes.length} note{atNotes.length!==1?"s":""}</span>
                </div>
                {atNotes.length===0&&(
                  <div style={{padding:"24px",textAlign:"center",color:"#3A3A3A",fontSize:13}}>No activity yet — add the first note below.</div>
                )}
                {atNotes.map((n,i)=>{
                  const ini=initials(n.authorName||"?");
                  return(
                    <div key={i} style={{padding:"16px 20px",borderBottom:i<atNotes.length-1?"1px solid #1A1A1A":"none",display:"flex",gap:12,alignItems:"flex-start"}}>
                      <div style={{width:30,height:30,borderRadius:"50%",background:"#E8922E22",border:"1px solid #E8922E44",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:"#E8922E",flexShrink:0}}>{ini}</div>
                      <div style={{flex:1}}>
                        <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:6}}>
                          <span style={{fontSize:12,fontWeight:600,color:"#B8A898"}}>{n.authorName||"You"}</span>
                          <span style={{fontSize:11,color:"#3A3A3A"}}>{timeAgo(n.ts)}</span>
                        </div>
                        <div style={{background:"#1A1A1A",border:"1px solid #242424",borderRadius:8,padding:"10px 14px",fontSize:13,color:"#C8B8A8",lineHeight:1.7,whiteSpace:"pre-wrap"}}>{n.text}</div>
                      </div>
                    </div>
                  );
                })}
                {/* Reply box */}
                <div style={{padding:"16px 20px",borderTop:atNotes.length?"1px solid #1E1E1E":"none",display:"flex",gap:12,alignItems:"flex-start"}}>
                  <div style={{width:30,height:30,borderRadius:"50%",background:"#E8922E22",border:"1px solid #E8922E44",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:"#E8922E",flexShrink:0}}>
                    {initials(session.alias||session.email||"?")}
                  </div>
                  <div style={{flex:1}}>
                    <textarea value={noteText} onChange={e=>{setNoteText(e.target.value);setNoteSave(current=>({...current,phase:"idle",error:null}));}}
                      placeholder="Add a note or update…"
                      style={{...inputStyle,minHeight:80,resize:"vertical",lineHeight:1.6,fontSize:13,width:"100%",boxSizing:"border-box"}} />
                    <div style={{display:"flex",justifyContent:"flex-end",marginTop:8}}>
                      <button onClick={postNote} disabled={!noteText.trim()||postingNote}
                        style={{...btnPrimary,width:"auto",padding:"8px 20px",fontSize:13,opacity:(!noteText.trim()||postingNote)?0.4:1}}>
                        {postingNote?"Posting…":"Post Note"}
                      </button>
                    </div>
                    <SaveState state={noteSave} label="Note" />
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <div className="student-action-card" style={{background:"#181410",border:"1px solid #E8922E55",borderRadius:10,padding:"16px"}}>
                <div style={{fontSize:10,color:"#E8922E",textTransform:"uppercase",letterSpacing:"0.1em",fontWeight:700,marginBottom:6}}>Next required action</div>
                <div style={{fontSize:12,color:"#B8A898",lineHeight:1.55,marginBottom:12}}>{at.status==="New"?"Read the client request, assess impact and urgency, then begin triage.":at.status==="Verification"?"Your work is waiting for instructor sign-off. Resume only if you need to make a correction.":at.status==="Closed"?"Instructor sign-off is complete. No further action is required.":"Post a concise progress update, keep detailed steps in print, then advance the ticket."}</div>
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {nextActions.map(next=><button key={next} disabled={statusSave.phase==="saving"} onClick={()=>changeStatus(at.id,next)} style={{...btnPrimary,width:"100%",padding:"9px 12px"}}>{next==="Verification"?"Submit for instructor verification":next==="Escalated"?"Escalate with reason":next==="In Progress"?"Continue work":`Move to ${next}`}</button>)}
                </div>
                <SaveState state={statusSave} label="Status" />
              </div>
              <div style={{background:"#141414",border:"1px solid #1E1E1E",borderRadius:10,overflow:"hidden"}}>
                <div style={{padding:"10px 16px",borderBottom:"1px solid #1E1E1E",fontSize:10,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.12em",color:"#4A4038"}}>Properties</div>
                <div style={{padding:"14px 16px"}}>
                  <DetailRow label="Status" val={badge(at.status,STATUS_COLOR[at.status])} />
                  <DetailRow label="Priority" val={<span style={{fontSize:11,fontWeight:700,color:railColor}}>{at.priority}</span>} />
                  {course&&<DetailRow label="Course" val={<span style={{color:course.color,fontSize:12}}>{course.icon} {course.label}</span>} />}
                  {at.lab_assignments?.week_label&&<DetailRow label="Assignment" val={<span style={{fontSize:11,color:"#8A7868"}}>{at.lab_assignments.week_label}</span>} />}
                </div>
              </div>

              {requester&&(
                <div style={{background:"#141414",border:"1px solid #1E1E1E",borderRadius:10,overflow:"hidden"}}>
                  <div style={{padding:"10px 16px",borderBottom:"1px solid #1E1E1E",fontSize:10,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.12em",color:"#4A4038"}}>Contact</div>
                  <div style={{padding:"16px"}}><RequesterChip requesterId={scenario.requesterId} /></div>
                </div>
              )}

              <div style={{background:"#141414",border:"1px solid #1E1E1E",borderRadius:10,padding:"14px 16px"}}>
                {at.created_at&&<div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <span style={{fontSize:11,color:"#4A3828"}}>Created</span>
                  <span style={{fontSize:11,color:"#6A5848"}}>{fmt(at.created_at)}</span>
                </div>}
              </div>

              <div style={{background:"#141414",border:"1px solid #1E1E1E",borderRadius:10,overflow:"hidden"}}>
                <div style={{padding:"10px 16px",borderBottom:"1px solid #1E1E1E",fontSize:10,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.12em",color:"#4A4038"}}>Status History</div>
                <div style={{padding:"12px 16px",display:"flex",flexDirection:"column",gap:12}}>
                  {statusHistory.map(entry=>(
                    <div key={entry.id} style={{fontSize:11,lineHeight:1.5}}>
                      <div style={{color:entry.reopened?"#f59e0b":"#B8A898",fontWeight:600}}>
                        {entry.reopened?"Reopened → ":entry.from_status?`${entry.from_status} → `:"Created as "}{entry.to_status}
                      </div>
                      <div style={{color:"#6A5848"}}>{entry.changed_by_alias} · {fmt(entry.changed_at)}</div>
                    </div>
                  ))}
                  {reviewHistory.map(entry=>(
                    <div key={`review-${entry.id}`} style={{fontSize:11,lineHeight:1.5,borderLeft:`2px solid ${entry.action==="Approved"?"#4ade80":"#f59e0b"}`,paddingLeft:10}}>
                      <div style={{color:entry.action==="Approved"?"#4ade80":"#f59e0b",fontWeight:700}}>
                        Instructor {entry.action}{entry.manual_checked?" · printed manual checked":""}
                      </div>
                      {entry.feedback&&<div style={{color:"#B8A898",marginTop:2}}>{entry.feedback}</div>}
                      <div style={{color:"#6A5848"}}>{entry.reviewer_alias} · {fmt(entry.created_at)}</div>
                    </div>
                  ))}
                  {statusHistory.length===0&&reviewHistory.length===0&&<div style={{fontSize:11,color:"#4A3828"}}>No status history available.</div>}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }
  }

  const hasAssigned = assignedTickets && assignedTickets.length>0;
  const total = mine.length + (assignedTickets?.length||0);

  return (
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24}}>
        <PageTitle title="My Tickets" sub={`${total} ticket${total!==1?"s":""}`} />
      </div>

      <SafetyAcknowledgment session={session} acknowledgments={safetyAcknowledgments} onAcknowledge={onAcknowledgeSafety} />
      <ReadinessStation checks={readinessChecks} onSubmit={onSubmitReadiness} />

      {/* Assigned tickets — same row style as TicketTable */}
      {hasAssigned && (
        <div style={{marginBottom:32}}>
          <SectionLabel>Active Assignments</SectionLabel>
          <div style={{background:"#141414",border:"1px solid #1E1E1E",borderRadius:10,overflow:"hidden"}}>
            <style>{`.at-row:hover{background:#1E1A17 !important;}`}</style>
            {assignedTickets.map((t,i)=>{
              const course = courseById(t.course_id);
              const scenario = SCENARIOS.find(s=>s.id===t.scenario_id);
              const requester = scenario ? PERSON_BY_ID[scenario.requesterId] : null;
              const orgColor = requester ? (ORG_COLOR[requester.org]||"#E8922E") : "#E8922E";
              const railColor = PRI_RAIL[t.priority]||"#6b7280";
              const isResolved = t.status==="Closed";
              const initials = requester ? requester.name.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase() : "?";
              const journalLink=Array.isArray(t.field_journal_links)?t.field_journal_links[0]:t.field_journal_links;
              return (
                <div key={t.id} className="at-row student-ticket-row" onClick={()=>setSelectedAssigned(t.id)}
                  style={{display:"flex",alignItems:"center",gap:0,
                    borderBottom:i<assignedTickets.length-1?"1px solid #1A1A1A":"none",
                    cursor:"pointer",background:"transparent",transition:"background 0.1s"}}>
                  {/* Priority rail */}
                  <div style={{width:4,alignSelf:"stretch",background:isResolved?"#2A2A2A":railColor,opacity:isResolved?0.3:1,flexShrink:0}}/>
                  <div style={{flex:1,display:"flex",alignItems:"center",gap:0,padding:"0 0 0 0",minWidth:0}}>
                    {/* Subject */}
                    <div style={{flex:1,padding:"14px 16px",minWidth:0}}>
                      <div style={{fontSize:10,color:"#6A5848",fontFamily:"'JetBrains Mono',monospace",marginBottom:3}}>{t.ticket_number}</div>
                      {journalLink&&<div style={{fontSize:9,color:"#8A7868",marginBottom:3}}>{journalLink.manual_type} · TKT-{String(journalLink.service_log_number).padStart(4,"0")}</div>}
                      <div style={{fontSize:13,fontWeight:500,color:isResolved?"#6A5848":"#EDE9E3",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                        {t.title.replace(/^\[W\d+\] /,"")}
                      </div>
                      {course&&<div style={{fontSize:10,color:course.color,fontWeight:600,marginTop:3}}>{course.icon} {course.id.toUpperCase()}</div>}
                    </div>
                    {/* Contact */}
                    <div className="student-ticket-meta" style={{width:160,padding:"14px 16px",flexShrink:0}}>
                      {requester ? (
                        <div style={{display:"flex",alignItems:"center",gap:7}}>
                          <div style={{width:24,height:24,borderRadius:5,background:`${orgColor}20`,border:`1px solid ${orgColor}40`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,color:orgColor,flexShrink:0}}>
                            {initials}
                          </div>
                          <div style={{minWidth:0}}>
                            <div style={{fontSize:12,color:"#C8B8A8",fontWeight:500,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{requester.name}</div>
                            <div style={{fontSize:10,color:orgColor,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{requester.orgName}</div>
                          </div>
                        </div>
                      ) : <span style={{color:"#2A2A2A",fontSize:12}}>—</span>}
                    </div>
                    {/* Priority */}
                    <div className="student-ticket-meta" style={{width:90,padding:"14px 16px",flexShrink:0}}>
                      <span style={{fontSize:10,fontWeight:700,color:railColor,background:railColor+"18",border:`1px solid ${railColor}40`,borderRadius:4,padding:"2px 8px",textTransform:"uppercase",letterSpacing:"0.06em"}}>{t.priority}</span>
                    </div>
                    {/* Status */}
                    <div style={{width:110,padding:"14px 16px",flexShrink:0}}>{badge(t.status,STATUS_COLOR[t.status])}</div>
                    {/* Age */}
                    <div className="student-ticket-meta" style={{width:80,padding:"14px 16px",fontSize:11,color:"#4A3828",flexShrink:0}}>{t.created_at?timeAgo(t.created_at):""}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Submitted tickets */}
      {mine.length>0 && (
        <div>
          {hasAssigned&&<SectionLabel>Submitted Tickets</SectionLabel>}
          <TicketTable tickets={mine} users={users} session={session} onOpen={onOpen} showSLA showCourse />
        </div>
      )}
      {total===0&&<EmptyState msg="No tickets yet." />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// QUEUE
// ═══════════════════════════════════════════════════════════════
function AssignmentQueue({tickets,students,onReview}) {
  const [filter,setFilter]=useState("Awaiting review");
  const [expanded,setExpanded]=useState(null);
  const [manualChecked,setManualChecked]=useState(false);
  const [feedback,setFeedback]=useState("");
  const [saving,setSaving]=useState(false);
  const studentName=id=>students.find(student=>student.id===id)?.alias||"Unknown student";
  const latestReview=ticket=>[...(ticket.ticket_verification_reviews||[])].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at))[0];
  const journalFor=ticket=>Array.isArray(ticket.field_journal_links)?ticket.field_journal_links[0]:ticket.field_journal_links;
  const lastActivity=ticket=>{
    const journal=journalFor(ticket);
    return Math.max(
      new Date(ticket.created_at||0).getTime(),
      ...(ticket.ticket_status_history||[]).map(entry=>new Date(entry.changed_at).getTime()),
      ...(ticket.ticket_verification_reviews||[]).map(entry=>new Date(entry.created_at).getTime()),
      ...(journal?.updated_at?[new Date(journal.updated_at).getTime()]:[]),
    );
  };
  const matchesFilter=ticket=>{
    const review=latestReview(ticket);
    if(filter==="Awaiting review") return ticket.status==="Verification";
    if(filter==="Returned") return review?.action==="Returned";
    if(filter==="Approved") return review?.action==="Approved";
    if(filter==="Reopened") return review?.action==="Reopened";
    return true;
  };
  const visible=tickets.filter(matchesFilter).sort((a,b)=>lastActivity(b)-lastActivity(a));
  const awaiting=tickets.filter(ticket=>ticket.status==="Verification").length;

  async function submit(ticket,action){
    if(saving) return;
    if(action==="Approved"&&!manualChecked) return;
    if(action!=="Approved"&&!feedback.trim()) return;
    setSaving(true);
    try {
      await onReview(ticket.id,action,manualChecked,feedback);
      setExpanded(null); setManualChecked(false); setFeedback("");
    } finally { setSaving(false); }
  }

  return (
    <div>
      <PageTitle title="Instructor Verification" sub={`${awaiting} ticket${awaiting!==1?"s":""} awaiting printed-manual review and sign-off.`} />
      <div style={{display:"flex",gap:8,marginBottom:20,flexWrap:"wrap"}}>
        {["Awaiting review","Returned","Approved","Reopened","All"].map(value=>(
          <button key={value} onClick={()=>setFilter(value)} style={{padding:"6px 14px",borderRadius:6,fontSize:12,
            background:filter===value?"#E8922E":"#1A1A1A",color:filter===value?"#0D0D0D":"#B8A898",
            border:`1px solid ${filter===value?"#E8922E":"#242424"}`,fontWeight:filter===value?700:400}}>
            {value}{value==="Awaiting review"?` (${awaiting})`:""}
          </button>
        ))}
      </div>
      {visible.length===0?<EmptyState msg={filter==="Awaiting review"?"No tickets are awaiting instructor review.":"No tickets in this review view."}/>:(
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {visible.map(ticket=>{
            const course=courseById(ticket.course_id);
            const journalLink=journalFor(ticket);
            const review=latestReview(ticket);
            const isOpen=expanded===ticket.id;
            const incident=Array.isArray(ticket.team_incidents)?ticket.team_incidents[0]:ticket.team_incidents;
            const teamTickets=ticket.team_incident_id?tickets.filter(item=>item.team_incident_id===ticket.team_incident_id):[];
            return <div key={ticket.id} style={{background:"#141414",border:`1px solid ${isOpen?"#E8922E55":"#1E1E1E"}`,borderRadius:10,overflow:"hidden"}}>
              <button onClick={()=>{setExpanded(isOpen?null:ticket.id);setManualChecked(false);setFeedback("");}}
                style={{width:"100%",background:"none",border:"none",padding:"16px 18px",display:"grid",gridTemplateColumns:"120px minmax(180px,1.5fr) minmax(130px,1fr) 130px",gap:16,textAlign:"left",alignItems:"center"}}>
                <div>
                  <div style={{fontSize:11,color:"#E8922E",fontFamily:"'JetBrains Mono',monospace",fontWeight:700}}>{ticket.ticket_number}</div>
                  {incident&&<div style={{fontSize:9,color:incident.color_hex,marginTop:4}}>● {incident.team_name}</div>}
                  {journalLink&&<div style={{fontSize:9,color:"#8A7868",marginTop:4}}>{journalLink.manual_type} · TKT-{String(journalLink.service_log_number).padStart(4,"0")}</div>}
                </div>
                <div>
                  <div style={{fontSize:13,color:"#EDE9E3",fontWeight:600}}>{ticket.title.replace(/^\[W\d+\] /,"")}</div>
                  <div style={{fontSize:10,color:course?.color||"#6A5848",marginTop:3}}>{course?.label||ticket.course_id?.toUpperCase()||"General"}</div>
                </div>
                <div>
                  <div style={{fontSize:12,color:"#B8A898",fontFamily:"monospace"}}>{studentName(ticket.student_id)}</div>
                  <div style={{fontSize:10,color:"#6A5848",marginTop:3}}>{journalLink?.team_role||"Role not recorded"}</div>
                </div>
                <div>
                  {badge(ticket.status,STATUS_COLOR[ticket.status])}
                  <div style={{fontSize:9,color:"#6A5848",marginTop:5}}>Active {timeAgo(new Date(lastActivity(ticket)).toISOString())}</div>
                </div>
              </button>
              {isOpen&&<div style={{borderTop:"1px solid #242424",padding:"18px",background:"#101010"}}>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:10,marginBottom:16}}>
                  <DetailRow label="Station" val={journalLink?.station_id||"Not recorded"}/>
                  <DetailRow label="Assets" val={journalLink?.asset_ids?.join(", ")||"Not recorded"}/>
                  <DetailRow label="Priority" val={journalLink?.chosen_priority||ticket.priority}/>
                  <DetailRow label="Last activity" val={fmt(new Date(lastActivity(ticket)).toISOString())}/>
                </div>
                {journalLink?.client_resolution&&<div style={{background:"#141414",border:"1px solid #242424",borderRadius:7,padding:12,marginBottom:14}}><div style={{fontSize:10,color:"#6A5848",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:5}}>Client-facing resolution</div><div style={{fontSize:12,color:"#B8A898",lineHeight:1.5}}>{journalLink.client_resolution}</div></div>}
                {incident&&<div style={{background:"#141414",border:`1px solid ${incident.color_hex}44`,borderRadius:7,padding:12,marginBottom:14}}><div style={{fontSize:10,color:incident.color_hex,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:8}}>{incident.team_name} · {incident.color_name} · Team readiness</div>{teamTickets.map(member=>{const contribution=Array.isArray(member.team_contributions)?member.team_contributions[0]:member.team_contributions;const complete=Boolean(contribution?.contribution);return <div key={member.id} style={{fontSize:11,color:complete?"#4ADE80":"#FBBF24",marginBottom:5}}>{complete?"✓":"○"} {studentName(member.student_id)} · {contribution?.team_role||"Role missing"} · {member.status}</div>;})}</div>}
                {(ticket.ticket_client_inquiries||[]).length>0&&<div style={{background:"#141414",border:"1px solid #242424",borderRadius:7,padding:12,marginBottom:14}}><div style={{fontSize:10,color:"#6A5848",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:8}}>Client inquiry history</div>{[...ticket.ticket_client_inquiries].sort((a,b)=>new Date(a.created_at)-new Date(b.created_at)).map(item=><div key={item.id} style={{fontSize:11,lineHeight:1.5,marginBottom:9,borderLeft:"2px solid #E8922E",paddingLeft:9}}><div style={{color:"#D8C8B8"}}>Student: {item.question}</div><div style={{color:"#8A7868"}}>Client: {item.response}</div><div style={{color:"#4A4038",fontSize:9}}>{CLIENT_INQUIRY_PURPOSES.find(([key])=>key===item.purpose)?.[1]} · {fmt(item.created_at)}</div></div>)}</div>}
                {review?.feedback&&<div style={{fontSize:11,color:"#f59e0b",marginBottom:14}}>Last {review.action.toLowerCase()} feedback: {review.feedback}</div>}
                {(ticket.status==="Verification"||ticket.status==="Closed")&&<>
                  {ticket.status==="Verification"&&<label style={{display:"flex",gap:9,alignItems:"center",fontSize:12,color:"#D8C8B8",marginBottom:12}}><input type="checkbox" checked={manualChecked} onChange={event=>setManualChecked(event.target.checked)}/> I checked the student’s printed Service Log entry.</label>}
                  <textarea value={feedback} onChange={event=>setFeedback(event.target.value)} style={{...inputStyle,minHeight:72,resize:"vertical",marginBottom:12}} placeholder={ticket.status==="Closed"?"Why is this ticket being reopened?":"Actionable feedback required when returning; optional approval note"}/>
                  <div style={{display:"flex",gap:10,justifyContent:"flex-end",flexWrap:"wrap"}}>
                    {ticket.status==="Verification"&&<button disabled={saving||!feedback.trim()} onClick={()=>submit(ticket,"Returned")} style={{...btnGhost,color:"#f59e0b",borderColor:"#f59e0b55"}}>Return with feedback</button>}
                    {ticket.status==="Verification"&&<button disabled={saving||!manualChecked} onClick={()=>submit(ticket,"Approved")} style={{...btnPrimary,width:"auto",padding:"8px 16px"}}>Approve & close</button>}
                    {ticket.status==="Closed"&&<button disabled={saving||!feedback.trim()} onClick={()=>submit(ticket,"Reopened")} style={{...btnGhost,color:"#f59e0b",borderColor:"#f59e0b55"}}>Reopen ticket</button>}
                  </div>
                </>}
              </div>}
            </div>;
          })}
        </div>
      )}
    </div>
  );
}

function Queue({session,tickets,users,onOpen}) {
  const [filter,setFilter]=useState("Open");
  const [courseFilter,setCourseFilter]=useState("all");

  const visible=tickets
    .filter(t=>filter==="All"?true:t.status===filter)
    .filter(t=>courseFilter==="all"?true:t.courseId===courseFilter)
    .sort((a,b)=>{
      const pri={Critical:0,High:1,Medium:2,Low:3};
      const aB=slaInfo(a.created,a.priority,a.status)?.breached?-1:0;
      const bB=slaInfo(b.created,b.priority,b.status)?.breached?-1:0;
      return (aB-bB)||(pri[a.priority]-pri[b.priority]);
    });

  return (
    <div>
      <PageTitle title="Ticket Queue" sub={`${visible.length} ticket${visible.length!==1?"s":""} shown`} />
      <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap"}}>
        {["Open","In Progress","Pending","Resolved","All"].map(s=>(
          <button key={s} onClick={()=>setFilter(s)}
            style={{padding:"6px 14px",borderRadius:6,fontSize:12,cursor:"pointer",
              background:filter===s?"#E8922E":"#1A1A1A",color:filter===s?"#0D0D0D":"#B8A898",
              border:"1px solid "+(filter===s?"#E8922E":"#242424"),fontWeight:filter===s?700:400}}>
            {s}
          </button>
        ))}
      </div>
      <div style={{display:"flex",gap:8,marginBottom:20}}>
        <button onClick={()=>setCourseFilter("all")}
          style={{padding:"5px 12px",borderRadius:6,fontSize:11,cursor:"pointer",background:courseFilter==="all"?"#4A3828":"transparent",color:courseFilter==="all"?"#EDE9E3":"#8A7868",border:"1px solid #242424"}}>
          All Courses
        </button>
        {COURSES.map(c=>(
          <button key={c.id} onClick={()=>setCourseFilter(c.id)}
            style={{padding:"5px 12px",borderRadius:6,fontSize:11,cursor:"pointer",
              background:courseFilter===c.id?c.color+"22":"transparent",
              color:courseFilter===c.id?c.color:"#8A7868",
              border:`1px solid ${courseFilter===c.id?c.color+"55":"#242424"}`}}>
            {c.icon} {c.id.toUpperCase()}
          </button>
        ))}
      </div>
      {visible.length===0?<EmptyState msg="No tickets in this view."/>
        :<TicketTable tickets={visible} users={users} session={session} onOpen={onOpen} showAssigned showSLA showCourse />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TICKET DETAIL
// ═══════════════════════════════════════════════════════════════
function SLABar({ticket}) {
  const [,setTick]=useState(0);
  useEffect(()=>{
    if(ticket.status==="Resolved"||ticket.status==="Closed") return;
    const id=setInterval(()=>setTick(n=>n+1),1000);
    return ()=>clearInterval(id);
  },[ticket.status]);
  const info=slaInfo(ticket.created,ticket.priority,ticket.status);
  if(!info) return <div style={{fontSize:12,color:"#22c55e"}}>✓ Resolved within SLA</div>;
  return (
    <div>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
        <span style={{fontSize:11,color:"#6A5848",textTransform:"uppercase",letterSpacing:"0.08em"}}>SLA Resolution</span>
        <span style={{fontSize:12,color:info.color,fontWeight:700,animation:info.breached?"pulse 1s infinite":"none"}}>
          {info.breached?"⚠ BREACHED":fmtDur(info.msLeft)+" remaining"}
        </span>
      </div>
      <div style={{height:6,background:"#0D0D0D",borderRadius:3,overflow:"hidden"}}>
        <div style={{height:"100%",width:`${Math.round(info.pct*100)}%`,background:info.color,borderRadius:3,transition:"width 1s linear",boxShadow:info.pct<0.25?`0 0 8px ${info.color}`:"none"}} />
      </div>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"#6A5848",marginTop:4}}>
        <span>Target: {SLA[ticket.priority].resolution}h</span>
        <span>Deadline: {fmt(slaDeadline(ticket.created,ticket.priority).toISOString())}</span>
      </div>
    </div>
  );
}

function TicketDetail({ticket,session,users,onUpdate,onBack}) {
  const [note,setNote]=useState("");
  const [status,setStatus]=useState(ticket.status);
  const [assignedTo,setAssigned]=useState(ticket.assignedTo||"");
  const [priority,setPriority]=useState(ticket.priority);
  const techs=users.filter(u=>u.role==="tech"||u.role==="admin");
  const course=courseById(ticket.courseId);
  const requester=PERSON_BY_ID[ticket.requesterId];
  const orgColor=requester?(ORG_COLOR[requester.org]||"#6A5848"):"#6A5848";
  function nameOf(id){return users.find(u=>u.id===id)?.name||"Unknown";}
  function initials(name){return name.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase();}
  const canEdit=session.role==="tech"||session.role==="admin";
  const railColor=PRI_RAIL[priority]||"#6b7280";
  const isResolved=["Resolved","Closed"].includes(status);

  function makeNotifBatch(updated,newStatus,newAssigned) {
    const batch=[];
    if(newStatus!==ticket.status) {
      const sub=users.find(u=>u.id===ticket.submittedBy);
      if(sub) batch.push(makeNotif(sub.id,`[${ticket.id}] Status: ${newStatus}`,
        `Your ticket "${ticket.title}" is now: ${newStatus}`,ticket.id));
    }
    if(newAssigned&&newAssigned!==ticket.assignedTo)
      batch.push(makeNotif(newAssigned,`[${ticket.id}] Assigned to you`,
        `You have been assigned: "${ticket.title}"\nPriority: ${updated.priority}\nSLA: ${SLA[updated.priority].resolution}h`,ticket.id));
    return batch;
  }

  async function saveChanges() {
    const updated={...ticket,status,assignedTo:assignedTo||null,priority};
    await onUpdate(updated,makeNotifBatch(updated,status,assignedTo));
  }

  async function addNote() {
    if(!note.trim()) return;
    const updated={...ticket,status,assignedTo:assignedTo||null,priority,
      notes:[...ticket.notes,{author:session.id,text:note.trim(),ts:new Date().toISOString()}]};
    const batch=[];
    const targets=new Set();
    if(ticket.submittedBy!==session.id) targets.add(ticket.submittedBy);
    if(ticket.assignedTo&&ticket.assignedTo!==session.id) targets.add(ticket.assignedTo);
    targets.forEach(id=>batch.push(makeNotif(id,`[${ticket.id}] New note`,
      `Note on "${ticket.title}":\n"${note.trim().slice(0,100)}${note.length>100?"…":""}"`,ticket.id)));
    await onUpdate(updated,batch);
    setNote("");
  }

  return (
    <div style={{maxWidth:1040,fontFamily:"'Inter',sans-serif"}}>

      {/* Top breadcrumb bar */}
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20,paddingBottom:16,borderBottom:"1px solid #1E1E1E"}}>
        <button onClick={onBack} style={btnGhost}>
          ← Back
        </button>
        <span style={{color:"#3A3A3A",fontSize:12}}>/</span>
        <span style={{fontSize:12,fontFamily:"'JetBrains Mono',monospace",color:"#6A5848",background:"#1A1A1A",border:"1px solid #242424",borderRadius:4,padding:"3px 8px"}}>{ticket.id}</span>
        {course&&<span style={{fontSize:11,color:course.color,fontWeight:700,background:course.color+"15",border:`1px solid ${course.color}30`,borderRadius:4,padding:"3px 8px"}}>{course.icon} {course.id.toUpperCase()}</span>}
        <div style={{flex:1}} />
        {/* Status quick-change for techs */}
        {canEdit&&(
          <select value={status} onChange={e=>setStatus(e.target.value)}
            style={{...inputStyle,width:"auto",padding:"6px 10px",fontSize:12,background:STATUS_COLOR[status]+"18",border:`1px solid ${STATUS_COLOR[status]}55`,color:STATUS_COLOR[status],fontWeight:700}}>
            {STATUSES.map(s=><option key={s} style={{background:"#1A1A1A",color:"#EDE9E3"}}>{s}</option>)}
          </select>
        )}
        {!canEdit&&badge(status,STATUS_COLOR[status])}
      </div>

      {/* Title block */}
      <div style={{marginBottom:24,display:"flex",alignItems:"flex-start",gap:12}}>
        <div style={{width:4,alignSelf:"stretch",background:isResolved?"#2A2A2A":railColor,borderRadius:2,flexShrink:0,minHeight:32}} />
        <div style={{flex:1}}>
          <div style={{fontFamily:"'Raleway',sans-serif",fontSize:22,fontWeight:800,color:"#F0EDE8",lineHeight:1.2,marginBottom:10}}>{ticket.title}</div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
            <span style={{fontSize:11,fontWeight:700,color:railColor,background:railColor+"18",border:`1px solid ${railColor}40`,borderRadius:4,padding:"2px 8px",textTransform:"uppercase",letterSpacing:"0.06em"}}>{priority}</span>
            {ticket.categories?.map(c=><span key={c} style={{background:"#1E1E1E",color:"#6A5848",borderRadius:4,padding:"2px 7px",fontSize:11,border:"1px solid #2A2A2A"}}>{c}</span>)}
            {ticket.linkedCourse&&<span style={{fontSize:11,color:"#a78bfa",background:"#a78bfa18",borderRadius:4,padding:"2px 7px",border:"1px solid #a78bfa40"}}>↔ {ticket.linkedCourse.toUpperCase()}</span>}
          </div>
        </div>
      </div>

      <div className="detail-grid">

        {/* ── Main column ── */}
        <div>

          {/* SLA bar */}
          <div style={{background:"#111",border:"1px solid #1E1E1E",borderRadius:8,padding:"14px 18px",marginBottom:16}}>
            <SLABar ticket={{...ticket,priority}} />
          </div>

          {/* Original request — styled like an email */}
          <div style={{background:"#141414",border:"1px solid #1E1E1E",borderRadius:10,overflow:"hidden",marginBottom:16}}>
            {/* Email-style header */}
            <div style={{padding:"14px 20px",borderBottom:"1px solid #1E1E1E",background:"#111",display:"flex",alignItems:"center",gap:12}}>
              {requester ? (
                <>
                  <div style={{width:36,height:36,borderRadius:8,background:`${orgColor}20`,border:`1px solid ${orgColor}40`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:orgColor,flexShrink:0,fontFamily:"'Raleway',sans-serif"}}>
                    {initials(requester.name)}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:600,color:"#EDE9E3"}}>{requester.name} <span style={{fontWeight:400,color:"#4A3828",fontFamily:"'JetBrains Mono',monospace",fontSize:11}}>&#60;{requester.email}&#62;</span></div>
                    <div style={{fontSize:11,color:"#6A5848",marginTop:1}}>
                      {requester.role} · <span style={{color:orgColor}}>{requester.orgName}</span>
                      <span style={{color:"#2A2A2A",margin:"0 6px"}}>·</span>
                      <span>{fmt(ticket.created)}</span>
                    </div>
                  </div>
                </>
              ) : (
                <div style={{flex:1}}>
                  <div style={{fontSize:13,color:"#8A7868"}}>Submitted by <strong style={{color:"#C8B8A8"}}>{nameOf(ticket.submittedBy)}</strong></div>
                  <div style={{fontSize:11,color:"#4A3828",marginTop:1}}>{fmt(ticket.created)}</div>
                </div>
              )}
            </div>
            {/* Body */}
            <div style={{padding:"20px 24px"}}>
              <p style={{color:"#C8B8A8",fontSize:14,lineHeight:1.8,margin:0,whiteSpace:"pre-wrap"}}>{ticket.description}</p>
            </div>
          </div>

          {/* Activity thread */}
          <div style={{background:"#141414",border:"1px solid #1E1E1E",borderRadius:10,overflow:"hidden"}}>
            <div style={{padding:"12px 20px",borderBottom:"1px solid #1E1E1E",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <span style={{fontSize:11,textTransform:"uppercase",letterSpacing:"0.1em",color:"#4A4038",fontWeight:600}}>Activity · {ticket.notes.length} note{ticket.notes.length!==1?"s":""}</span>
            </div>

            {ticket.notes.length===0&&(
              <div style={{padding:"24px",textAlign:"center",color:"#3A3A3A",fontSize:13}}>No activity yet — add the first note below.</div>
            )}

            {ticket.notes.map((n,i)=>{
              const author=users.find(u=>u.id===n.author);
              const authorInitials=author?initials(author.name):"?";
              const isMe=n.author===session.id;
              return (
                <div key={i} style={{padding:"16px 20px",borderBottom:i<ticket.notes.length-1?"1px solid #1A1A1A":"none",display:"flex",gap:12,alignItems:"flex-start"}}>
                  <div style={{width:32,height:32,borderRadius:"50%",background:isMe?"#E8922E22":"#1E1E1E",border:`1px solid ${isMe?"#E8922E44":"#2A2A2A"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:isMe?"#E8922E":"#6A5848",flexShrink:0}}>
                    {authorInitials}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",alignItems:"baseline",gap:8,marginBottom:6}}>
                      <span style={{fontSize:13,fontWeight:600,color:"#C8B8A8"}}>{author?.name||"Unknown"}</span>
                      <span style={{fontSize:11,color:"#6A5848"}}>{author?.role||""}</span>
                      <span style={{fontSize:11,color:"#3A3A3A",marginLeft:"auto"}}>{fmt(n.ts)}</span>
                    </div>
                    <div style={{fontSize:13,color:"#A89888",lineHeight:1.7,whiteSpace:"pre-wrap",background:"#111",borderRadius:6,padding:"10px 14px",border:"1px solid #1E1E1E"}}>{n.text}</div>
                  </div>
                </div>
              );
            })}

            {/* Reply box */}
            <div style={{padding:"16px 20px",borderTop:"1px solid #1E1E1E",background:"#111"}}>
              <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
                <div style={{width:32,height:32,borderRadius:"50%",background:"#E8922E22",border:"1px solid #E8922E44",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:"#E8922E",flexShrink:0}}>
                  {initials(session.name)}
                </div>
                <div style={{flex:1}}>
                  <textarea value={note} onChange={e=>setNote(e.target.value)}
                    style={{...inputStyle,minHeight:80,resize:"vertical",background:"#141414",border:"1px solid #2A2A2A",borderRadius:8,lineHeight:1.6,fontSize:13}}
                    placeholder="Add a note or update…" />
                  <div style={{display:"flex",justifyContent:"flex-end",marginTop:8}}>
                    <button onClick={addNote} disabled={!note.trim()}
                      style={{background:"#E8922E",color:"#0D0D0D",border:"none",borderRadius:6,padding:"8px 20px",fontSize:12,fontWeight:700,cursor:note.trim()?"pointer":"default",opacity:note.trim()?1:0.4,fontFamily:"'Inter',sans-serif",letterSpacing:"0.02em"}}>
                      Post Note
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Sidebar ── */}
        <div style={{display:"flex",flexDirection:"column",gap:12}}>

          {/* Properties */}
          <div style={{background:"#141414",border:"1px solid #1E1E1E",borderRadius:10,overflow:"hidden"}}>
            <div style={{padding:"10px 16px",borderBottom:"1px solid #1E1E1E",fontSize:10,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.12em",color:"#4A4038"}}>Properties</div>
            <div style={{padding:"14px 16px"}}>
              {canEdit ? (
                <>
                  <Field label="Status">
                    <select value={status} onChange={e=>setStatus(e.target.value)} style={inputStyle}>
                      {STATUSES.map(s=><option key={s}>{s}</option>)}
                    </select>
                  </Field>
                  <Field label="Priority">
                    <select value={priority} onChange={e=>setPriority(e.target.value)} style={inputStyle}>
                      {PRIORITIES.map(p=><option key={p}>{p}</option>)}
                    </select>
                  </Field>
                  <Field label="Assigned To">
                    <select value={assignedTo} onChange={e=>setAssigned(e.target.value)} style={inputStyle}>
                      <option value="">Unassigned</option>
                      {techs.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </Field>
                  <button onClick={saveChanges} style={{...btnPrimary,fontSize:12,padding:"8px 16px"}}>Save Changes</button>
                </>
              ) : (
                <>
                  <DetailRow label="Status" val={badge(status,STATUS_COLOR[status])} />
                  <DetailRow label="Priority" val={badge(priority,PRIORITY_COLOR[priority])} />
                  <DetailRow label="Assigned" val={assignedTo?nameOf(assignedTo):<span style={{color:"#3A3A3A"}}>Unassigned</span>} />
                </>
              )}
            </div>
          </div>

          {/* Contact */}
          {requester&&(
            <div style={{background:"#141414",border:"1px solid #1E1E1E",borderRadius:10,overflow:"hidden"}}>
              <div style={{padding:"10px 16px",borderBottom:"1px solid #1E1E1E",fontSize:10,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.12em",color:"#4A4038"}}>Contact</div>
              <div style={{padding:"16px"}}>
                <RequesterChip requesterId={ticket.requesterId} />
              </div>
            </div>
          )}

          {/* SLA */}
          <div style={{background:"#141414",border:"1px solid #1E1E1E",borderRadius:10,overflow:"hidden"}}>
            <div style={{padding:"10px 16px",borderBottom:"1px solid #1E1E1E",fontSize:10,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.12em",color:"#4A4038"}}>SLA</div>
            <div style={{padding:"14px 16px"}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:8,alignItems:"center"}}>
                <span style={{fontSize:11,color:"#6A5848"}}>Response target</span>
                <span style={{fontSize:12,color:"#8A7868",fontFamily:"monospace"}}>{SLA[ticket.priority].response}h</span>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:12,alignItems:"center"}}>
                <span style={{fontSize:11,color:"#6A5848"}}>Resolution target</span>
                <span style={{fontSize:12,color:"#8A7868",fontFamily:"monospace"}}>{SLA[ticket.priority].resolution}h</span>
              </div>
              <div style={{background:"#111",borderRadius:6,padding:"10px 12px",fontSize:11}}>
                <div style={{color:"#4A3828",marginBottom:3}}>Deadline</div>
                <div style={{color:"#8A7868",fontFamily:"monospace"}}>{fmt(slaDeadline(ticket.created,ticket.priority).toISOString())}</div>
              </div>
            </div>
          </div>

          {/* Metadata */}
          <div style={{background:"#141414",border:"1px solid #1E1E1E",borderRadius:10,padding:"14px 16px"}}>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              <div style={{display:"flex",justifyContent:"space-between"}}>
                <span style={{fontSize:11,color:"#4A3828"}}>Created</span>
                <span style={{fontSize:11,color:"#6A5848"}}>{fmt(ticket.created)}</span>
              </div>
              {ticket.submittedBy&&!requester&&(
                <div style={{display:"flex",justifyContent:"space-between"}}>
                  <span style={{fontSize:11,color:"#4A3828"}}>Submitted by</span>
                  <span style={{fontSize:11,color:"#6A5848"}}>{nameOf(ticket.submittedBy)}</span>
                </div>
              )}
              {ticket.courseId&&(
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:11,color:"#4A3828"}}>Course</span>
                  {course&&<span style={{fontSize:11,color:course.color,fontWeight:600}}>{course.icon} {course.label}</span>}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// LABS — combines Lab Manager (push) + Scenario Library under one
// nav item, tabbed like Admin Panel's Students/Clients split.
// ═══════════════════════════════════════════════════════════════
function LabsHub({session,classStudents,customScenarios,onActivate,onSaveScenario,onDeleteScenario,onImportScenarios}) {
  const [tab,setTab]=useState("push"); // "push" | "readiness" | "library"
  const tabBtn=(id,label)=>(
    <button onClick={()=>setTab(id)}
      style={{padding:"8px 18px",background:tab===id?"#E8922E":"transparent",
        color:tab===id?"#0D0D0D":"#6A5848",border:"none",borderRadius:6,
        fontSize:12,fontWeight:700,cursor:"pointer",letterSpacing:"0.06em",textTransform:"uppercase"}}>
      {label}
    </button>
  );
  return (
    <div>
      <div style={{display:"flex",gap:4,background:"#1A1A1A",border:"1px solid #242424",borderRadius:8,padding:4,marginBottom:24,width:"fit-content"}}>
        {tabBtn("push","Push Labs")}
        {tabBtn("readiness","Readiness Checks")}
        {tabBtn("library","Scenario Library")}
      </div>
      {tab==="push"&&<LabManager session={session} classStudents={classStudents} customScenarios={customScenarios} onActivate={onActivate} />}
      {tab==="readiness"&&<ReadinessManager session={session} />}
      {tab==="library"&&<ScenarioLibrary customScenarios={customScenarios} onSave={onSaveScenario} onDelete={onDeleteScenario} onImport={onImportScenarios} />}
    </div>
  );
}

const blankReadinessQuestions=()=>Array.from({length:5},(_,index)=>({
  id:`q${index+1}`,prompt:"",correct:"a",explanation:"",
  options:[{id:"a",text:""},{id:"b",text:""},{id:"c",text:""},{id:"d",text:""}],
}));

function ReadinessManager({session}){
  const [assignments,setAssignments]=useState([]);
  const [checks,setChecks]=useState([]);
  const [selectedAssignment,setSelectedAssignment]=useState("");
  const [form,setForm]=useState({id:null,title:"",instructions:"",status:"draft",questions:blankReadinessQuestions()});
  const [preview,setPreview]=useState(false);
  const [roster,setRoster]=useState([]);
  const [saving,setSaving]=useState(false);
  const [message,setMessage]=useState("");

  const load=useCallback(async()=>{
    const [assignmentRes,checkRes]=await Promise.all([
      supabase.from("lab_assignments").select("id,class_id,week_label,assigned_at,classes(name,course_id)").order("assigned_at",{ascending:false}),
      supabase.from("readiness_checks").select("*").order("created_at",{ascending:false}),
    ]);
    if(!assignmentRes.error) setAssignments(assignmentRes.data||[]);
    if(!checkRes.error) setChecks(checkRes.data||[]);
  },[]);
  useEffect(()=>{load();},[load]);

  function chooseAssignment(id){
    setSelectedAssignment(id); setPreview(false); setMessage("");
    const existing=checks.find(check=>check.assignment_id===id);
    setForm(existing?{...existing,questions:existing.questions||blankReadinessQuestions()}:{id:null,title:"",instructions:"",status:"draft",questions:blankReadinessQuestions()});
    setRoster([]);
  }
  useEffect(()=>{
    if(!form.id){setRoster([]);return;}
    supabase.rpc("readiness_roster",{p_check_id:form.id}).then(({data,error})=>{if(!error)setRoster(data||[]);});
  },[form.id,form.status]);
  function updateQuestion(index,key,value){setForm(current=>({...current,questions:current.questions.map((q,i)=>i===index?{...q,[key]:value}:q)}));}
  function updateOption(questionIndex,optionIndex,value){setForm(current=>({...current,questions:current.questions.map((q,i)=>i===questionIndex?{...q,options:q.options.map((option,j)=>j===optionIndex?{...option,text:value}:option)}:q)}));}
  const complete=Boolean(selectedAssignment&&form.title.trim()&&form.questions.every(q=>q.prompt.trim()&&q.explanation.trim()&&q.options.every(option=>option.text.trim())));

  async function save(status){
    if(!complete||saving) return;
    // Dropping a published check back to draft removes the gate, releasing
    // every student's ticket without a passing score.
    if(status==="draft"&&form.status==="published"
       &&!window.confirm("Saving this as a draft unpublishes the check and immediately releases every student's ticket, even for students who have not passed. Continue?")) return;
    const assignment=assignments.find(item=>item.id===selectedAssignment);
    setSaving(true); setMessage("");
    const payload={assignment_id:selectedAssignment,class_id:assignment.class_id,title:form.title.trim(),instructions:form.instructions.trim(),status,passing_percent:80,questions:form.questions,created_by:session.id,published_at:status==="published"?new Date().toISOString():null,updated_at:new Date().toISOString()};
    const operation=form.id
      ? supabase.from("readiness_checks").update(payload).eq("id",form.id).select().single()
      : supabase.from("readiness_checks").insert(payload).select().single();
    const {data,error}=await operation;
    if(error) setMessage(error.message);
    else {setForm({...data,questions:data.questions||[]});setMessage(status==="published"?"Published. Assigned students now enter the preparation station.":"Draft saved.");await load();}
    setSaving(false);
  }

  return <div style={{maxWidth:1000}}>
    <PageTitle title="Readiness Checks" sub="Author five questions, preview the student view, and publish the gate for an assigned lab." />
    <Field label="Lab assignment"><select value={selectedAssignment} onChange={event=>chooseAssignment(event.target.value)} style={inputStyle}><option value="">Select an assignment…</option>{assignments.map(item=><option key={item.id} value={item.id}>{item.classes?.name||"Class"} — {item.week_label}</option>)}</select></Field>
    {!selectedAssignment&&<EmptyState msg="Push a lab, then select its assignment here to attach a readiness check." />}
    {selectedAssignment&&<Card>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,marginBottom:18}}><SectionLabel>{form.id?`Editing ${form.status} check`:"New draft"}</SectionLabel><button onClick={()=>setPreview(value=>!value)} style={btnGhost}>{preview?"Edit":"Preview"}</button></div>
      {preview?<div>
        <h2 style={{color:"#F0EDE8",fontSize:19}}>{form.title||"Untitled readiness check"}</h2><p style={{color:"#8A7868",fontSize:12}}>{form.instructions}</p>
        {form.questions.map((question,index)=><div key={question.id} style={{padding:"12px 0",borderTop:"1px solid #242424"}}><div style={{color:"#D8C8B8",fontSize:13,marginBottom:7}}>{index+1}. {question.prompt||"Question not written"}</div>{question.options.map(option=><div key={option.id} style={{fontSize:12,color:option.id===question.correct?"#4ade80":"#8A7868",padding:"2px 0"}}>{option.id.toUpperCase()}. {option.text||"Option not written"}</div>)}</div>)}
      </div>:<>
        <Field label="Title"><input value={form.title} onChange={event=>setForm(current=>({...current,title:event.target.value}))} style={inputStyle} placeholder="Week 1 Hardware readiness" /></Field>
        <Field label="Instructions"><textarea value={form.instructions} onChange={event=>setForm(current=>({...current,instructions:event.target.value}))} style={{...inputStyle,minHeight:70}} placeholder="Review the safety station if you need another attempt." /></Field>
        {form.questions.map((question,index)=><div key={question.id} style={{background:"#141414",border:"1px solid #242424",borderRadius:8,padding:16,marginBottom:12}}>
          <Field label={`Question ${index+1}`}><input value={question.prompt} onChange={event=>updateQuestion(index,"prompt",event.target.value)} style={inputStyle} /></Field>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>{question.options.map((option,optionIndex)=><div key={option.id} style={{display:"flex",gap:7,alignItems:"center"}}><input type="radio" name={`correct-${index}`} checked={question.correct===option.id} onChange={()=>updateQuestion(index,"correct",option.id)} style={{accentColor:"#E8922E"}}/><input value={option.text} onChange={event=>updateOption(index,optionIndex,event.target.value)} style={inputStyle} placeholder={`Option ${option.id.toUpperCase()}`} /></div>)}</div>
          <Field label="Explanation shown after submission"><input value={question.explanation} onChange={event=>updateQuestion(index,"explanation",event.target.value)} style={inputStyle} /></Field>
        </div>)}
      </>}
      {message&&<div role="status" style={{fontSize:12,color:message.includes("saved")||message.includes("Published")?"#4ade80":"#f87171",marginBottom:12}}>{message}</div>}
      <div style={{display:"flex",gap:8}}><button onClick={()=>save("draft")} disabled={!complete||saving} style={{...btnGhost,opacity:complete?1:0.4}}>{form.status==="published"?"Unpublish to draft":"Save draft"}</button><button onClick={()=>save("published")} disabled={!complete||saving} style={{...btnPrimary,width:"auto",opacity:complete?1:0.4}}>{form.status==="published"?"Publish correction":"Publish check"}</button></div>
    </Card>}
    {form.id&&<Card style={{marginTop:16}}><SectionLabel>Student readiness</SectionLabel>{roster.length===0?<div style={{fontSize:12,color:"#6A5848"}}>No assigned students.</div>:<div style={{display:"grid",gap:7}}>{roster.map(student=><div key={student.student_id} style={{display:"grid",gridTemplateColumns:"1fr 110px 80px",gap:12,padding:"8px 0",borderBottom:"1px solid #242424",fontSize:12}}><span style={{color:"#D8C8B8"}}>{student.alias}</span><span style={{color:student.readiness_state==="ready"?"#4ade80":student.readiness_state==="preparing"?"#fbbf24":"#6A5848",textTransform:"capitalize"}}>{student.readiness_state}</span><span style={{color:"#8A7868",textAlign:"right"}}>{student.last_score==null?"—":`${student.last_score}%`}</span></div>)}</div>}</Card>}
  </div>;
}

// ═══════════════════════════════════════════════════════════════
// LAB MANAGER (Instructor)
// Two-column: left = class + students + assignment options
//             right = scenario browser (all courses) + preview
// ═══════════════════════════════════════════════════════════════
function LabManager({session,classStudents,customScenarios,onActivate}) {
  const myClasses = session.classes||[];
  const [activeClassId,setActiveClassId]=useState(myClasses[0]?.id||null);
  const [assignMode,setAssignMode]=useState("broadcast");
  const [selectedStudents,setSelectedStudents]=useState([]);
  const [pushing,setPushing]=useState(false);
  const [scenarioCourseTab,setScenarioCourseTab]=useState("net");
  const [scenarioSearch,setScenarioSearch]=useState("");
  const [selectedScenario,setSelectedScenario]=useState(null);
  const [weekOverride,setWeekOverride]=useState("");
  const [teamSize,setTeamSize]=useState(3);

  const activeClass=myClasses.find(c=>c.id===activeClassId)||myClasses[0];
  const classCourse=courseById(activeClass?.course_id)||courseById("net");
  const courseStudents=classStudents.filter(u=>u.enrolled_class_id===activeClassId);

  // ALL scenarios from all courses + custom
  const allBuiltIn=SEED_SCENARIOS;
  const allCustom=(customScenarios||[]).map(s=>({...s,courseId:s.course_id}));
  const everything=[...allBuiltIn,...allCustom];

  const tabScenarios=everything
    .filter(s=>(s.courseId||s.course_id)===scenarioCourseTab)
    .filter(s=>scenarioSearch===""||s.title.toLowerCase().includes(scenarioSearch.toLowerCase()));

  function toggleStudent(uid){setSelectedStudents(s=>s.includes(uid)?s.filter(x=>x!==uid):[...s,uid]);}

  async function pushSelected(){
    if(!selectedScenario||!activeClassId) return;
    const assignees=assignMode==="broadcast"?courseStudents.map(u=>u.id):selectedStudents;
    if(assignees.length===0) return;
    const week=weekOverride?parseInt(weekOverride):(selectedScenario.week||1);
    setPushing(true);
    await onActivate(selectedScenario.courseId||selectedScenario.course_id,week,selectedScenario.id,assignMode,assignees,activeClassId,teamSize);
    setPushing(false);
    setSelectedStudents([]);
  }

  if(myClasses.length===0) return (
    <div style={{maxWidth:900}}>
      <PageTitle title="Lab Manager" sub="Assign scenarios to students." />
      <EmptyState msg="No classes found. Make sure classes exist in Supabase." />
    </div>
  );

  const COURSE_TABS=[
    {id:"net",label:"Networking",color:"#38bdf8"},
    {id:"hw",label:"Hardware",color:"#fb923c"},
    {id:"cyber",label:"Cybersecurity",color:"#a78bfa"},
    {id:"custom",label:"Custom",color:"#E8922E"},
  ];

  return (
    <div style={{maxWidth:1100}}>
      <PageTitle title="Lab Manager" sub="Pick a class, browse scenarios, and push to students." />

      {/* Class tabs */}
      <div style={{display:"flex",gap:8,marginBottom:24,flexWrap:"wrap"}}>
        {myClasses.map(c=>{
          const ci=courseById(c.course_id)||{color:"#E8922E",icon:"📋"};
          const isActive=activeClassId===c.id;
          return (
            <button key={c.id} onClick={()=>{setActiveClassId(c.id);setSelectedStudents([]);}}
              style={{padding:"8px 18px",borderRadius:8,fontSize:13,cursor:"pointer",
                background:isActive?ci.color+"22":"#141414",color:isActive?ci.color:"#8A7868",
                border:`1px solid ${isActive?ci.color+"55":"#1E1E1E"}`,fontWeight:isActive?700:400}}>
              {ci.icon} {c.name}
            </button>
          );
        })}
      </div>

      <div className="lab-grid">

        {/* ── Left: Class panel ── */}
        <div style={{display:"flex",flexDirection:"column",gap:12}}>

          {/* Assignment options */}
          <div style={{background:"#141414",border:"1px solid #1E1E1E",borderRadius:10,overflow:"hidden"}}>
            <div style={{padding:"10px 16px",borderBottom:"1px solid #1E1E1E",fontSize:10,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.12em",color:"#4A4038"}}>Assignment Options</div>
            <div style={{padding:"14px 16px"}}>
              <Field label="Mode">
                <select value={assignMode} onChange={e=>{setAssignMode(e.target.value);setSelectedStudents([]);}} style={inputStyle}>
                  <option value="broadcast">Broadcast — whole class</option>
                  <option value="individual">Individual — select students</option>
                  <option value="pairs">Pairs</option>
                  <option value="teams">Teams</option>
                </select>
              </Field>
              <Field label="Week (optional override)">
                <input value={weekOverride} onChange={e=>setWeekOverride(e.target.value)}
                  type="number" min={1} max={10} placeholder={`Default: ${selectedScenario?.week||"—"}`}
                  style={inputStyle} />
              </Field>
              {assignMode==="teams"&&<Field label="Students per team"><select value={teamSize} onChange={e=>setTeamSize(Number(e.target.value))} style={inputStyle}><option value={3}>3 — core roles</option><option value={4}>4 — add safety/equipment</option><option value={5}>5 — add safety and verification</option></select></Field>}
            </div>
          </div>

          {/* Students */}
          <div style={{background:"#141414",border:"1px solid #1E1E1E",borderRadius:10,overflow:"hidden"}}>
            <div style={{padding:"10px 16px",borderBottom:"1px solid #1E1E1E",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <span style={{fontSize:10,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.12em",color:"#4A4038"}}>Students</span>
              <span style={{fontSize:11,color:"#6A5848"}}>{courseStudents.length} enrolled</span>
            </div>
            <div style={{padding:"10px 12px",maxHeight:280,overflowY:"auto"}}>
              {courseStudents.length===0
                ? <div style={{color:"#4A4038",fontSize:12,padding:"8px 4px"}}>No students enrolled in this class.</div>
                : courseStudents.map(u=>{
                    const checked=assignMode==="broadcast"||selectedStudents.includes(u.id);
                    return (
                      <label key={u.id} style={{display:"flex",alignItems:"center",gap:9,padding:"7px 8px",borderRadius:6,cursor:"pointer",
                        background:selectedStudents.includes(u.id)?"#1E1E1E":"transparent"}}>
                        <input type="checkbox"
                          checked={assignMode==="broadcast"?true:selectedStudents.includes(u.id)}
                          disabled={assignMode==="broadcast"}
                          onChange={()=>toggleStudent(u.id)}
                          style={{accentColor:classCourse.color}} />
                        <span style={{fontSize:13,color:checked?"#EDE9E3":"#8A7868"}}>{u.alias}</span>
                      </label>
                    );
                  })
              }
            </div>
          </div>

          {/* Push button */}
          <button onClick={pushSelected}
            disabled={pushing||!selectedScenario||(assignMode!=="broadcast"&&selectedStudents.length===0)}
            style={{...btnPrimary,background:selectedScenario?classCourse.color:"#2A2A2A",
              color:selectedScenario?"#0D0D0D":"#4A4038",
              opacity:pushing?0.6:1,fontSize:13}}>
            {pushing?"Pushing…":selectedScenario?`Push "${selectedScenario.title.slice(0,30)}${selectedScenario.title.length>30?"…":""}" →`:"← Select a scenario first"}
          </button>
          {selectedScenario&&assignMode==="broadcast"&&(
            <div style={{fontSize:11,color:"#6A5848",textAlign:"center",marginTop:-4}}>
              Will push to all {courseStudents.length} student(s) in this class
            </div>
          )}
        </div>

        {/* ── Right: Scenario browser ── */}
        <div>
          {/* Course tabs + search */}
          <div style={{display:"flex",gap:6,marginBottom:12,alignItems:"center",flexWrap:"wrap"}}>
            {COURSE_TABS.map(t=>(
              <button key={t.id} onClick={()=>{setScenarioCourseTab(t.id);setScenarioSearch("");}}
                style={{padding:"6px 14px",borderRadius:6,fontSize:12,cursor:"pointer",
                  background:scenarioCourseTab===t.id?t.color+"22":"#141414",
                  color:scenarioCourseTab===t.id?t.color:"#8A7868",
                  border:`1px solid ${scenarioCourseTab===t.id?t.color+"55":"#1E1E1E"}`,
                  fontWeight:scenarioCourseTab===t.id?700:400}}>
                {t.label}
              </button>
            ))}
            <input value={scenarioSearch} onChange={e=>setScenarioSearch(e.target.value)}
              style={{...inputStyle,width:200,padding:"6px 10px",fontSize:12,marginLeft:"auto"}}
              placeholder="Search scenarios…" />
          </div>

          {/* Scenario list */}
          <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:16,maxHeight:320,overflowY:"auto"}}>
            {tabScenarios.length===0&&<EmptyState msg="No scenarios in this category." />}
            {tabScenarios.map(s=>{
              const course=courseById(s.courseId||s.course_id);
              const requester=PERSON_BY_ID[s.requesterId];
              const orgColor=requester?(ORG_COLOR[requester.org]||"#6A5848"):"#6A5848";
              const isSelected=selectedScenario?.id===s.id;
              return (
                <div key={s.id} onClick={()=>setSelectedScenario(s)}
                  style={{background:isSelected?"#1E1A17":"#141414",
                    border:`1px solid ${isSelected?classCourse.color+"55":"#1E1E1E"}`,
                    borderLeft:`3px solid ${isSelected?classCourse.color:(course?.color||"#242424")}`,
                    borderRadius:8,padding:"12px 16px",cursor:"pointer",transition:"all 0.1s"}}
                  onMouseEnter={e=>{if(!isSelected)e.currentTarget.style.background="#1A1A1A";}}
                  onMouseLeave={e=>{if(!isSelected)e.currentTarget.style.background="#141414";}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                    {s.week&&<span style={{fontSize:10,fontFamily:"monospace",color:"#4A4038",background:"#1E1E1E",borderRadius:3,padding:"1px 5px"}}>W{s.week}</span>}
                    {s._builtin===false&&<span style={{fontSize:9,color:"#E8922E",border:"1px solid #E8922E44",borderRadius:3,padding:"1px 4px"}}>custom</span>}
                    <span style={{fontSize:10,fontWeight:700,color:orgColor,marginLeft:"auto"}}>{requester?.orgName||""}</span>
                  </div>
                  <div style={{fontSize:13,fontWeight:500,color:"#EDE9E3",marginBottom:4,lineHeight:1.3}}>{s.title}</div>
                  <div style={{display:"flex",gap:6,alignItems:"center"}}>
                    <span style={{fontSize:10,color:PRIORITY_COLOR[s.priority]||"#6A5848",fontWeight:700}}>{s.priority}</span>
                    <span style={{fontSize:10,color:"#4A4038"}}>·</span>
                    <span style={{fontSize:10,color:"#6A5848"}}>{s.mode}</span>
                    {s.linkedCourse&&<span style={{fontSize:10,color:"#a78bfa"}}>↔ {s.linkedCourse.toUpperCase()}</span>}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected scenario preview */}
          {selectedScenario&&(()=>{
            const requester=PERSON_BY_ID[selectedScenario.requesterId];
            const orgColor=requester?(ORG_COLOR[requester.org]||"#E8922E"):"#E8922E";
            const initials=requester?requester.name.split(" ").map(n=>n[0]).join("").slice(0,2):"?";
            return (
              <div style={{background:"#0D0D0D",border:"1px solid #1E1E1E",borderRadius:10,overflow:"hidden"}}>
                <div style={{padding:"10px 16px",borderBottom:"1px solid #1E1E1E",display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:10,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.12em",color:"#4A4038"}}>Preview — what students receive</span>
                  <span style={{fontSize:10,color:"#2A2A2A",marginLeft:"auto"}}>instructor notes below</span>
                </div>
                {/* Email header */}
                {requester&&(
                  <div style={{padding:"12px 16px",borderBottom:"1px solid #1A1A1A",background:"#111",display:"flex",alignItems:"center",gap:10}}>
                    <div style={{width:32,height:32,borderRadius:6,background:`${orgColor}20`,border:`1px solid ${orgColor}40`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:orgColor,flexShrink:0,fontFamily:"'Raleway',sans-serif"}}>
                      {initials}
                    </div>
                    <div>
                      <div style={{fontSize:12,fontWeight:600,color:"#EDE9E3"}}>{requester.name} <span style={{fontWeight:400,color:"#4A3828",fontSize:10,fontFamily:"monospace"}}>&#60;{requester.email}&#62;</span></div>
                      <div style={{fontSize:10,color:orgColor}}>{requester.orgName} · {requester.role}</div>
                    </div>
                  </div>
                )}
                <div style={{padding:"14px 16px"}}>
                  <div style={{fontSize:13,fontWeight:600,color:"#EDE9E3",marginBottom:10}}>{selectedScenario.title}</div>
                  <div style={{fontSize:12,color:"#8A7868",lineHeight:1.7,whiteSpace:"pre-wrap",marginBottom:selectedScenario.instructorNotes?16:0}}>{selectedScenario.description}</div>
                  {selectedScenario.instructorNotes&&(
                    <div style={{borderTop:"1px solid #1E1E1E",paddingTop:12}}>
                      <div style={{fontSize:9,textTransform:"uppercase",letterSpacing:"0.12em",color:"#E8922E",marginBottom:6,fontWeight:700}}>🔬 Physical Lab Task — Instructor Only</div>
                      <div style={{fontSize:11,color:"#A89888",lineHeight:1.7,whiteSpace:"pre-wrap",background:"#E8922E08",border:"1px solid #E8922E22",borderRadius:6,padding:"10px 12px"}}>{selectedScenario.instructorNotes}</div>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SCENARIO LIBRARY
// ═══════════════════════════════════════════════════════════════
const BLANK_SCENARIO = {
  title:"", course_id:"net", week:1, priority:"Medium",
  mode:"broadcast", categories:[], requesterId:"",
  description:"", instructorNotes:"", inquiryLimit:0, clientResponses:emptyClientResponses(),
};

function toTicketTemplateRow({requesterId="",instructorNotes="",inquiryLimit=0,clientResponses={},scenario:storedScenario,...row}) {
  return {...row,scenario:{...(storedScenario||{}),requesterId,instructorNotes,inquiryLimit:Number(inquiryLimit),clientResponses}};
}

function fromTicketTemplateRow(row) {
  return {...row,...(row.scenario||{})};
}
const COURSE_COLOR = {net:"#38bdf8",hw:"#fb923c",cyber:"#a78bfa"};
const COURSE_LABEL = {net:"Networking",hw:"Hardware",cyber:"Cybersecurity"};

function ScenarioLibrary({customScenarios,onSave,onDelete,onImport}) {
  const [editing,setEditing]   = useState(null);
  const [filter,setFilter]     = useState("all");
  const [importing,setImporting] = useState(false);
  const [importErr,setImportErr] = useState("");
  const [scenarioErr,setScenarioErr] = useState("");
  const [saving,setSaving]     = useState(false);
  const [form,setForm]         = useState(BLANK_SCENARIO);

  const builtIn = SCENARIOS.map(s=>({...s,course_id:s.courseId,_builtin:true}));
  const all = [...builtIn,...customScenarios];
  const filtered = filter==="all" ? all : filter==="custom" ? customScenarios : all.filter(s=>s.course_id===filter||s.courseId===filter);

  function startNew()  { setScenarioErr(""); setForm({...BLANK_SCENARIO,clientResponses:emptyClientResponses()}); setEditing("new"); }
  function startEdit(s){ setScenarioErr(""); setForm({...BLANK_SCENARIO,...s,clientResponses:{...emptyClientResponses(),...(s.clientResponses||{})}}); setEditing(s); }
  function cancel()    { setEditing(null); setImporting(false); setImportErr(""); setScenarioErr(""); }

  async function handleSave() {
    if (!form.title.trim() || !form.description.trim()) return;
    if(Number(form.inquiryLimit)>0&&CLIENT_INQUIRY_PURPOSES.some(([key])=>!form.clientResponses?.[key]?.response?.trim())) {
      setScenarioErr("Author a client response for every purpose before saving an inquiry-enabled scenario.");
      return;
    }
    setScenarioErr("");
    setSaving(true);
    const ok = await onSave(editing==="new" ? form : {...form, id: editing.id});
    setSaving(false);
    if (ok) setEditing(null);
  }

  function handleImportFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        let rows;
        if (file.name.endsWith(".json")) {
          rows = JSON.parse(ev.target.result);
          if (!Array.isArray(rows)) throw new Error("JSON must be an array of scenarios.");
        } else {
          const lines = ev.target.result.trim().split("\n");
          const headers = lines[0].split(",").map(h=>h.trim().replace(/^"|"$/g,""));
          rows = lines.slice(1).map(line=>{
            const vals = line.split(",").map(v=>v.trim().replace(/^"|"$/g,""));
            return Object.fromEntries(headers.map((h,i)=>[h,vals[i]||""]));
          });
        }
        const required = ["title","course_id","week","priority","mode","description"];
        const missing = rows.findIndex(r=>required.some(k=>!r[k]));
        if (missing>=0) throw new Error(`Row ${missing+1} is missing required fields.`);
        rows = rows.map((r,index)=>{
          const inquiryLimit=Number(r.inquiryLimit||0);
          if(!Number.isInteger(inquiryLimit)||inquiryLimit<0||inquiryLimit>3) throw new Error(`Row ${index+1} has an inquiry limit outside 0–3.`);
          if(inquiryLimit>0&&CLIENT_INQUIRY_PURPOSES.some(([key])=>!r.clientResponses?.[key]?.response?.trim()||!CLIENT_RESPONSE_QUALITIES.some(([quality])=>quality===(r.clientResponses?.[key]?.quality||"")))) throw new Error(`Row ${index+1} must author all six client responses and response qualities.`);
          return {...r,week:parseInt(r.week)||1,inquiryLimit,
            categories:r.categories?(Array.isArray(r.categories)?r.categories:r.categories.split(";").map(c=>c.trim())):[]};
        });
        setImportErr(""); onImport(rows); setImporting(false);
      } catch(err) { setImportErr(err.message); }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  // ── Editor view ──
  if (editing) {
    const persona = PERSON_BY_ID[form.requesterId];
    const orgColor = persona ? (ORG_COLOR[persona.org]||"#E8922E") : "#E8922E";
    const initials = persona ? persona.name.split(" ").map(n=>n[0]).join("").slice(0,2) : "?";

    return (
      <div style={{maxWidth:1060}}>
        <button onClick={cancel} style={{...btnGhost,marginBottom:20}}>← Back to Library</button>
        <PageTitle title={editing==="new"?"New Custom Scenario":"Edit Scenario"}
          sub="Custom scenarios are saved to Supabase and available in Lab Manager." />

        <div className="scenario-editor-grid">
          {/* Form */}
          <div style={{background:"#141414",border:"1px solid #1E1E1E",borderRadius:10,padding:"24px"}}>

            <div className="scenario-form-grid">
              <div style={{gridColumn:"1/-1"}}>
                <Field label="Title — Subject line the student sees">
                  <input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))}
                    style={inputStyle} placeholder="e.g. WiFi down in the waiting room" />
                </Field>
              </div>
              <Field label="Course">
                <select value={form.course_id} onChange={e=>setForm(f=>({...f,course_id:e.target.value}))} style={inputStyle}>
                  <option value="net">Networking Fundamentals</option>
                  <option value="hw">Hardware Essentials</option>
                  <option value="cyber">Cybersecurity Fundamentals</option>
                </select>
              </Field>
              <Field label="Week">
                <select value={form.week} onChange={e=>setForm(f=>({...f,week:parseInt(e.target.value)}))} style={inputStyle}>
                  {Array.from({length:10},(_,i)=>i+1).map(w=><option key={w} value={w}>Week {w}</option>)}
                </select>
              </Field>
              <Field label="Priority">
                <select value={form.priority} onChange={e=>setForm(f=>({...f,priority:e.target.value}))} style={inputStyle}>
                  {PRIORITIES.map(p=><option key={p} value={p}>{p}</option>)}
                </select>
              </Field>
              <Field label="Assignment Mode">
                <select value={form.mode} onChange={e=>setForm(f=>({...f,mode:e.target.value}))} style={inputStyle}>
                  <option value="broadcast">Broadcast — whole class</option>
                  <option value="individual">Individual</option>
                  <option value="pairs">Pairs</option>
                  <option value="teams">Teams</option>
                </select>
              </Field>
            </div>

            {/* Persona picker */}
            <Field label="Requester (persona)">
              <select value={form.requesterId} onChange={e=>setForm(f=>({...f,requesterId:e.target.value}))} style={inputStyle}>
                <option value="">— No requester —</option>
                {Object.values(PERSON_BY_ID).map(p=>(
                  <option key={p.id} value={p.id}>{p.name} · {p.orgName} — {p.role}</option>
                ))}
              </select>
            </Field>
            {persona&&(
              <div style={{background:"#0D0D0D",border:`1px solid ${orgColor}33`,borderRadius:8,padding:"10px 14px",marginTop:-6,marginBottom:14}}>
                <div style={{fontSize:12,color:orgColor,fontWeight:600,marginBottom:3}}>{persona.name}</div>
                <div style={{fontSize:11,color:"#6A5848",marginBottom:4}}>{persona.role} · {persona.orgName}</div>
                <div style={{fontSize:11,color:"#4A4038",fontStyle:"italic",lineHeight:1.5}}>
                  <span style={{color:"#6A5848",fontStyle:"normal",fontWeight:600}}>Voice: </span>{persona.voiceNotes}
                </div>
              </div>
            )}

            {/* Client ticket copy */}
            <Field label="Client Ticket Copy — write in the requester's voice">
              <textarea value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))}
                style={{...inputStyle,minHeight:180,resize:"vertical",lineHeight:1.7,fontFamily:"'JetBrains Mono',monospace",fontSize:12}}
                placeholder={persona
                  ? `Write as ${persona.name}.\n\n${persona.voiceNotes}\n\nExample opening: "${persona.quirk}"`
                  : "Select a requester above, then write the ticket in their voice.\n\nStudents will see this as the client's message — no lab instructions."
                } />
            </Field>

            {/* Instructor notes */}
            <Field label="Physical Lab Task — instructor only, never shown to students">
              <textarea value={form.instructorNotes||""} onChange={e=>setForm(f=>({...f,instructorNotes:e.target.value}))}
                style={{...inputStyle,minHeight:100,resize:"vertical",lineHeight:1.7,fontSize:12}}
                placeholder="Describe the physical equipment task, learning objectives, and what students should document in their Field Journal." />
            </Field>

            <div style={{borderTop:"1px solid #242424",paddingTop:18,marginTop:6}}>
              <SectionLabel>Scripted client inquiries</SectionLabel>
              <Field label="Ticket inquiry limit">
                <select value={form.inquiryLimit||0} onChange={e=>setForm(f=>({...f,inquiryLimit:Number(e.target.value)}))} style={inputStyle}>
                  <option value={0}>Disabled</option><option value={1}>1 inquiry</option><option value={2}>2 inquiries</option><option value={3}>3 inquiries</option>
                </select>
              </Field>
              {Number(form.inquiryLimit)>0&&<div style={{display:"flex",flexDirection:"column",gap:12}}>{CLIENT_INQUIRY_PURPOSES.map(([key,label])=>{
                const scripted=form.clientResponses?.[key]||{response:"",quality:"exact"};
                return <div key={key} style={{background:"#0D0D0D",border:"1px solid #242424",borderRadius:8,padding:12}}>
                  <div style={{fontSize:11,color:"#D8C8B8",fontWeight:700,marginBottom:8}}>{label}</div>
                  <textarea aria-label={`${label} scripted response`} value={scripted.response} onChange={e=>setForm(f=>({...f,clientResponses:{...(f.clientResponses||{}),[key]:{...scripted,response:e.target.value}}}))} style={{...inputStyle,minHeight:64,resize:"vertical"}} placeholder="The client's automatic reply…" />
                  <select aria-label={`${label} response quality`} value={scripted.quality} onChange={e=>setForm(f=>({...f,clientResponses:{...(f.clientResponses||{}),[key]:{...scripted,quality:e.target.value}}}))} style={{...inputStyle,marginTop:8}}>{CLIENT_RESPONSE_QUALITIES.map(([value,name])=><option key={value} value={value}>{name}</option>)}</select>
                </div>;
              })}</div>}
              {scenarioErr&&<div role="alert" style={{fontSize:11,color:"#f87171",marginTop:10}}>{scenarioErr}</div>}
            </div>

            <div style={{display:"flex",gap:10}}>
              <button onClick={handleSave}
                disabled={saving||!form.title.trim()||!form.description.trim()}
                style={{...btnPrimary,flex:1,opacity:saving?0.6:1}}>
                {saving?"Saving…":"Save Scenario"}
              </button>
              <button onClick={cancel} style={{background:"none",border:"1px solid #242424",color:"#8A7868",borderRadius:6,padding:"10px 20px",fontSize:13,cursor:"pointer"}}>Cancel</button>
            </div>
          </div>

          {/* Live preview */}
          <div>
            <div style={{fontSize:10,textTransform:"uppercase",letterSpacing:"0.12em",color:"#4A4038",marginBottom:8,fontWeight:600}}>Live Preview — student view</div>
            <div style={{background:"#141414",border:"1px solid #1E1E1E",borderRadius:10,overflow:"hidden"}}>
              {/* Email header */}
              <div style={{padding:"12px 16px",borderBottom:"1px solid #1E1E1E",background:"#111",display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:32,height:32,borderRadius:6,background:`${orgColor}20`,border:`1px solid ${orgColor}40`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:orgColor,flexShrink:0,fontFamily:"'Raleway',sans-serif"}}>
                  {initials}
                </div>
                <div>
                  <div style={{fontSize:12,fontWeight:600,color:"#EDE9E3"}}>{persona?.name||"No requester selected"} {persona&&<span style={{fontWeight:400,color:"#4A3828",fontSize:10,fontFamily:"monospace"}}>&#60;{persona.email}&#62;</span>}</div>
                  {persona&&<div style={{fontSize:10,color:orgColor}}>{persona.orgName} · {persona.role}</div>}
                </div>
              </div>
              {/* Subject + body */}
              <div style={{padding:"14px 16px"}}>
                <div style={{fontSize:13,fontWeight:600,color:form.title?"#EDE9E3":"#3A3A3A",marginBottom:10}}>{form.title||"Subject line will appear here"}</div>
                <div style={{fontSize:12,color:form.description?"#8A7868":"#2A2A2A",lineHeight:1.7,whiteSpace:"pre-wrap",minHeight:60}}>
                  {form.description||"Ticket copy will appear here as you type…"}
                </div>
              </div>
              {/* Instructor notes preview */}
              {form.instructorNotes&&(
                <div style={{borderTop:"1px solid #1A1A1A",padding:"12px 16px",background:"#0D0D0D"}}>
                  <div style={{fontSize:9,textTransform:"uppercase",letterSpacing:"0.12em",color:"#E8922E",marginBottom:6,fontWeight:700}}>🔬 Physical Lab Task — Instructor Only</div>
                  <div style={{fontSize:11,color:"#A89888",lineHeight:1.6,whiteSpace:"pre-wrap"}}>{form.instructorNotes}</div>
                </div>
              )}
              {Number(form.inquiryLimit)>0&&<div style={{borderTop:"1px solid #1A1A1A",padding:"12px 16px",background:"#101010"}}><div style={{fontSize:9,textTransform:"uppercase",letterSpacing:"0.12em",color:"#E8922E",marginBottom:8,fontWeight:700}}>Client response preview · {form.inquiryLimit} allowed</div>{CLIENT_INQUIRY_PURPOSES.map(([key,label])=><div key={key} style={{fontSize:10,color:"#8A7868",marginBottom:6}}><span style={{color:"#B8A898",fontWeight:600}}>{label}:</span> {form.clientResponses?.[key]?.response||"Not authored"} <span style={{color:"#4A4038"}}>({form.clientResponses?.[key]?.quality||"exact"})</span></div>)}</div>}
            </div>
            {/* Badge preview */}
            <div style={{display:"flex",gap:6,marginTop:10,flexWrap:"wrap"}}>
              {form.course_id&&<span style={{fontSize:10,color:COURSE_COLOR[form.course_id],background:COURSE_COLOR[form.course_id]+"18",borderRadius:4,padding:"2px 7px",fontWeight:700}}>{COURSE_LABEL[form.course_id]}</span>}
              {form.week&&<span style={{fontSize:10,color:"#6A5848",background:"#1E1E1E",borderRadius:4,padding:"2px 7px"}}>Week {form.week}</span>}
              {form.priority&&<span style={{fontSize:10,color:PRIORITY_COLOR[form.priority],background:PRIORITY_COLOR[form.priority]+"18",borderRadius:4,padding:"2px 7px",fontWeight:700}}>{form.priority}</span>}
              {form.mode&&<span style={{fontSize:10,color:"#6A5848",background:"#1E1E1E",borderRadius:4,padding:"2px 7px"}}>{form.mode}</span>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Library list view ──
  return (
    <div style={{maxWidth:960}}>
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:24}}>
        <PageTitle title="Scenario Library" sub={`${builtIn.length} built-in · ${customScenarios.length} custom`} />
        <div style={{display:"flex",gap:8,marginTop:4}}>
          <button onClick={()=>setImporting(true)} style={{background:"none",border:"1px solid #242424",color:"#8A7868",borderRadius:6,padding:"8px 16px",fontSize:12,cursor:"pointer"}}>
            Import JSON / CSV
          </button>
          <button onClick={startNew} style={{...btnPrimary,width:"auto",padding:"8px 18px"}}>+ New Scenario</button>
        </div>
      </div>

      {importing && (
        <Card style={{marginBottom:20}}>
          <SectionLabel>Import Scenarios</SectionLabel>
          <p style={{fontSize:12,color:"#8A7868",marginBottom:12,lineHeight:1.6}}>
            Upload a <strong style={{color:"#B8A898"}}>JSON</strong> file (array of objects) or <strong style={{color:"#B8A898"}}>CSV</strong> file.<br/>
            Required: <code style={{color:"#E8922E"}}>title, course_id, week, priority, mode, description</code><br/>
            Optional: <code style={{color:"#6A5848"}}>requesterId, instructorNotes, categories</code> (categories semicolon-separated in CSV)
          </p>
          {importErr && <div style={{color:"#f87171",fontSize:12,marginBottom:10}}>{importErr}</div>}
          <input type="file" accept=".json,.csv" onChange={handleImportFile} style={{color:"#B8A898",fontSize:13}} />
          <button onClick={cancel} style={{display:"block",marginTop:12,background:"none",border:"none",color:"#6A5848",fontSize:12,cursor:"pointer"}}>Cancel</button>
        </Card>
      )}

      {/* Filter tabs */}
      <div style={{display:"flex",gap:8,marginBottom:20,flexWrap:"wrap"}}>
        {[{id:"all",label:"All"},{id:"custom",label:"Custom Only"},{id:"net",label:"Networking"},{id:"hw",label:"Hardware"},{id:"cyber",label:"Cybersecurity"}].map(f=>(
          <button key={f.id} onClick={()=>setFilter(f.id)}
            style={{padding:"6px 14px",borderRadius:6,fontSize:12,cursor:"pointer",
              background:filter===f.id?"#E8922E22":"#1A1A1A",
              color:filter===f.id?"#E8922E":"#8A7868",
              border:`1px solid ${filter===f.id?"#E8922E55":"#242424"}`}}>
            {f.label}
          </button>
        ))}
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {filtered.map(s=>{
          const cid=s.course_id||s.courseId;
          const requester=PERSON_BY_ID[s.requesterId];
          const orgColor=requester?(ORG_COLOR[requester.org]||"#6A5848"):"#6A5848";
          return (
            <div key={s.id} style={{background:"#141414",border:"1px solid #1E1E1E",borderRadius:10,padding:"14px 18px",display:"flex",alignItems:"center",gap:14}}>
              <div style={{width:4,alignSelf:"stretch",borderRadius:2,background:COURSE_COLOR[cid]||"#6A5848",flexShrink:0}}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                  <span style={{fontSize:13,fontWeight:600,color:"#EDE9E3"}}>{s.title}</span>
                  {s._builtin&&<span style={{fontSize:9,color:"#4A3828",border:"1px solid #4A3828",borderRadius:3,padding:"1px 5px",flexShrink:0}}>built-in</span>}
                </div>
                <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                  <span style={{fontSize:11,color:COURSE_COLOR[cid]||"#6A5848",fontWeight:600}}>{COURSE_LABEL[cid]||cid}</span>
                  <span style={{color:"#2A2A2A"}}>·</span>
                  <span style={{fontSize:11,color:"#6A5848"}}>Week {s.week}</span>
                  <span style={{color:"#2A2A2A"}}>·</span>
                  {badge(s.priority,PRIORITY_COLOR[s.priority])}
                  {requester&&<span style={{fontSize:11,color:orgColor,fontWeight:600}}>{requester.name}</span>}
                  {requester&&<span style={{fontSize:10,color:"#4A4038"}}>{requester.orgName}</span>}
                </div>
              </div>
              {!s._builtin && (
                <div style={{display:"flex",gap:6,flexShrink:0}}>
                  <button onClick={()=>startEdit(s)} style={{background:"none",border:"1px solid #1E1E1E",color:"#8A7868",borderRadius:6,padding:"5px 12px",fontSize:11,cursor:"pointer"}}>Edit</button>
                  <button onClick={()=>{if(window.confirm("Delete this scenario?"))onDelete(s.id);}}
                    style={{background:"none",border:"1px solid #7f1d1d44",color:"#f87171",borderRadius:6,padding:"5px 12px",fontSize:11,cursor:"pointer"}}>Delete</button>
                </div>
              )}
            </div>
          );
        })}
        {filtered.length===0 && <EmptyState msg="No scenarios match this filter." />}
      </div>
    </div>
  );
}

// Inbox, AdminPanel, shared components follow
function Inbox({session,notifs,onRead,onReadAll,onOpen}) {
  const [sel,setSel]=useState(null);
  const mine=notifs.filter(n=>n.toId===session.id).sort((a,b)=>new Date(b.ts)-new Date(a.ts));
  const unread=mine.filter(n=>!n.read).length;
  const selN=mine.find(n=>n.id===sel);
  return (
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24}}>
        <PageTitle title="Inbox" sub={unread+" unread"} />
        {unread>0&&<button onClick={onReadAll} style={{background:"none",border:"1px solid #242424",color:"#8A7868",borderRadius:6,padding:"6px 14px",fontSize:12,cursor:"pointer"}}>Mark all read</button>}
      </div>
      {mine.length===0?<EmptyState msg="Your inbox is empty." />:(
        <div className="kb-layout-grid">
          <div style={{background:"#1A1A1A",border:"1px solid #242424",borderRadius:12,overflow:"hidden"}}>
            {mine.map((n,i)=>(
              <div key={n.id} onClick={()=>{setSel(n.id);if(!n.read)onRead(n.id);}}
                style={{padding:"13px 16px",borderBottom:i<mine.length-1?"1px solid #242424":"none",cursor:"pointer",
                  background:sel===n.id?"#2A2420":"transparent",
                  borderLeft:!n.read?"3px solid #E8922E":"3px solid transparent"}}
                onMouseEnter={e=>{if(sel!==n.id)e.currentTarget.style.background="#221E1A";}}
                onMouseLeave={e=>{if(sel!==n.id)e.currentTarget.style.background="transparent";}}>
                <div style={{display:"flex",justifyContent:"space-between",gap:8}}>
                  <div style={{fontSize:13,color:n.read?"#8A7868":"#EDE9E3",fontWeight:n.read?400:600,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",flex:1}}>{n.subject}</div>
                  {!n.read&&<span style={{width:7,height:7,borderRadius:"50%",background:"#E8922E",flexShrink:0,marginTop:4,display:"block"}}/>}
                </div>
                <div style={{fontSize:11,color:"#6A5848",marginTop:3}}>{new Date(n.ts).toLocaleString("en-US",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}</div>
              </div>
            ))}
          </div>
          {selN?(
            <div style={{background:"#1A1A1A",border:"1px solid #242424",borderRadius:12,padding:24}}>
              <div style={{marginBottom:16}}>
                <div style={{fontFamily:"'Raleway',sans-serif",fontSize:18,fontWeight:700,color:"#F0EDE8",marginBottom:4}}>{selN.subject}</div>
                <div style={{fontSize:12,color:"#6A5848"}}>{new Date(selN.ts).toLocaleString()}</div>
              </div>
              <div style={{borderTop:"1px solid #242424",paddingTop:16,color:"#B8A898",fontSize:14,lineHeight:1.8,whiteSpace:"pre-wrap"}}>{selN.body}</div>
              {selN.ticketId&&<button onClick={()=>onOpen(selN.ticketId)} style={{...btnPrimary,marginTop:20,width:"auto",padding:"8px 20px"}}>View Ticket {selN.ticketId} →</button>}
            </div>
          ):(
            <div style={{background:"#1A1A1A",border:"1px solid #242424",borderRadius:12,padding:40,textAlign:"center",color:"#6A5848",fontSize:14}}>Select a message to read</div>
          )}
        </div>
      )}
    </div>
  );
}

function AdminPanel({session, classStudents, onResetAssigned, onRotateClassCode, showToast}) {
  const allClasses = session.classes || [];
  const [search,   setSearch]   = useState("");
  const [filterQ,  setFilterQ]  = useState(""); // quarter filter
  const [filterY,  setFilterY]  = useState(""); // year filter
  const [pinMap,   setPinMap]   = useState({}); // profileId → generated PIN display
  const [activeTab, setActiveTab] = useState("students"); // "students" | "clients"

  // Derive available quarters/years from loaded classes
  const quarters = [...new Set(allClasses.map(c=>c.quarter).filter(Boolean))].sort();
  const years    = [...new Set(allClasses.map(c=>c.year).filter(Boolean))].sort((a,b)=>b-a);

  const visibleClasses = allClasses.filter(c => {
    if (filterQ && c.quarter !== filterQ) return false;
    if (filterY && c.year !== Number(filterY)) return false;
    return true;
  });

  const filteredStudents = search.trim()
    ? classStudents.filter(s => s.alias?.toLowerCase().includes(search.toLowerCase()))
    : classStudents;

  const byClass = visibleClasses.map(cls => ({
    cls,
    students: filteredStudents.filter(s => s.enrolled_class_id === cls.id),
  }));

  const totalStudents = classStudents.length;

  async function generatePin(student) {
    const pin = String(Math.floor(1000 + Math.random() * 9000));
    const { error } = await supabase.rpc("set_student_reset_pin", {
      p_profile_id: student.id, p_pin: pin,
    });
    if (error) { showToast("Failed to set PIN — check Supabase logs."); return; }
    setPinMap(m => ({...m, [student.id]: pin}));
  }

  const tabBtn = (id, label) => (
    <button onClick={()=>setActiveTab(id)}
      style={{padding:"8px 18px",background:activeTab===id?"#E8922E":"transparent",
        color:activeTab===id?"#0D0D0D":"#6A5848",border:"none",borderRadius:6,
        fontSize:12,fontWeight:700,cursor:"pointer",letterSpacing:"0.06em",textTransform:"uppercase"}}>
      {label}
    </button>
  );

  return (
    <div style={{maxWidth:960}}>
      <PageTitle title="Admin Panel"
        sub={`${totalStudents} student${totalStudents!==1?"s":""} · ${allClasses.length} class${allClasses.length!==1?"es":""}`} />

      {/* Tab bar */}
      <div style={{display:"flex",gap:4,background:"#1A1A1A",border:"1px solid #242424",borderRadius:8,padding:4,marginBottom:24,width:"fit-content"}}>
        {tabBtn("students","Enrolled Students")}
        {tabBtn("clients","Client Directory")}
      </div>

      {/* ── STUDENTS TAB ── */}
      {activeTab==="students" && <>
        {/* Filters */}
        <div style={{display:"flex",gap:10,marginBottom:20,flexWrap:"wrap",alignItems:"center"}}>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Search by alias…" style={{...inputStyle, width:220}} />
          {quarters.length > 0 && (
            <select value={filterQ} onChange={e=>setFilterQ(e.target.value)} style={{...inputStyle,width:"auto"}}>
              <option value="">All quarters</option>
              {quarters.map(q=><option key={q} value={q}>{q}</option>)}
            </select>
          )}
          {years.length > 0 && (
            <select value={filterY} onChange={e=>setFilterY(e.target.value)} style={{...inputStyle,width:"auto"}}>
              <option value="">All years</option>
              {years.map(y=><option key={y} value={y}>{y}</option>)}
            </select>
          )}
          {(filterQ||filterY||search) && (
            <button onClick={()=>{setSearch("");setFilterQ("");setFilterY("");}}
              style={{background:"none",border:"1px solid #2E2E2E",color:"#6A5848",borderRadius:6,padding:"8px 14px",fontSize:12,cursor:"pointer"}}>
              Clear
            </button>
          )}
        </div>

        {byClass.map(({cls, students}) => (
          <div key={cls.id} style={{marginBottom:24}}>
            <Card>
              <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:students.length?16:0}}>
                <div>
                  <div style={{fontFamily:"'Raleway',sans-serif",fontWeight:700,fontSize:15,color:"#F0EDE8"}}>{cls.name}</div>
                  <div style={{fontSize:12,color:"#6A5848",marginTop:3,display:"flex",gap:12,flexWrap:"wrap"}}>
                    <span>Code: <span style={{color:"#B8A898",fontFamily:"monospace"}}>{cls.code}</span></span>
                    {cls.course_id && <span style={{color:"#8A7868"}}>{cls.course_id.toUpperCase()}</span>}
                    {cls.quarter   && <span style={{color:"#8A7868"}}>{cls.quarter} {cls.year||""}</span>}
                  </div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
                  <div style={{fontSize:12,color:"#6A5848"}}>{students.length} student{students.length!==1?"s":""}</div>
                  <button onClick={async()=>{
                    const next=window.prompt("Enter a new enrollment code (8–64 letters, numbers, or hyphens). Existing enrolled accounts will keep working.");
                    if(next===null) return;
                    const normalized=next.trim().toUpperCase();
                    if(!/^[A-Z0-9][A-Z0-9-]{7,63}$/.test(normalized)) {
                      showToast("Use 8–64 letters, numbers, or hyphens.","error"); return;
                    }
                    await onRotateClassCode(cls.id,normalized);
                  }}
                    style={{background:"none",border:"1px solid #2E2E2E",color:"#8A7868",borderRadius:6,padding:"5px 10px",fontSize:11,cursor:"pointer"}}>
                    Rotate Code
                  </button>
                </div>
              </div>

              {students.length === 0
                ? <div style={{color:"#4A3828",fontSize:13}}>No students enrolled yet.</div>
                : (
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                    <thead>
                      <tr style={{borderBottom:"1px solid #242424"}}>
                        {["Alias","Reset PIN",""].map(h=>(
                          <th key={h} style={{textAlign:"left",padding:"6px 8px",color:"#6A5848",fontSize:11,textTransform:"uppercase",letterSpacing:"0.07em"}}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {students.map(s => {
                        const shownPin = pinMap[s.id];
                        return (
                          <tr key={s.id+cls.id} style={{borderBottom:"1px solid #111"}}>
                            <td style={{padding:"9px 8px",color:"#EDE9E3",fontFamily:"monospace"}}>{s.alias}</td>
                            <td style={{padding:"9px 8px"}}>
                              {shownPin
                                ? <span style={{fontFamily:"monospace",fontSize:15,fontWeight:700,color:"#E8922E",background:"#E8922E15",border:"1px solid #E8922E44",borderRadius:4,padding:"2px 8px"}}>
                                    {shownPin}
                                  </span>
                                : <span style={{color:"#4A3828",fontSize:12}}>—</span>
                              }
                            </td>
                            <td style={{padding:"9px 8px",textAlign:"right"}}>
                              <button onClick={()=>generatePin(s)}
                                style={{background:"none",border:"1px solid #2E2E2E",color:"#8A7868",borderRadius:6,padding:"4px 10px",fontSize:11,cursor:"pointer"}}>
                                {shownPin ? "Regenerate PIN" : "Set PIN"}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )
              }
            </Card>
          </div>
        ))}

        {visibleClasses.length === 0 && (
          <EmptyState msg="No classes match the current filter." />
        )}

        {/* Danger Zone */}
        <Card style={{marginTop:8}}>
          <SectionLabel>Danger Zone</SectionLabel>
          <div style={{background:"#0D0D0D",border:"1px solid #7f1d1d44",borderRadius:8,padding:16,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div>
              <div style={{color:"#fca5a5",fontSize:13,fontWeight:600}}>Reset Shared Assignment Data</div>
              <div style={{color:"#6A5848",fontSize:12}}>Clears all assigned tickets and graded lab notes from Supabase.</div>
            </div>
            <button onClick={async()=>{
              if(!window.confirm("This will delete ALL assigned tickets and lab notes for every student. This cannot be undone. Continue?")) return;
              const { error } = await supabase.rpc("admin_reset_assigned_tickets");
              if(error) { showToast("Reset failed: "+error.message,"error"); return; }
              onResetAssigned?.();
              showToast("All assigned tickets cleared. Students will see an empty queue.");
            }}
              style={{background:"#7f1d1d",border:"none",color:"#fca5a5",borderRadius:6,padding:"8px 16px",fontSize:12,cursor:"pointer",whiteSpace:"nowrap"}}>
              Reset All
            </button>
          </div>
        </Card>
      </>}

      {/* ── CLIENT DIRECTORY TAB ── */}
      {activeTab==="clients" && (
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(340px,1fr))",gap:16}}>
          {CLIENTS.map(c=>(
            <Card key={c.id}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                <div style={{fontFamily:"'Raleway',sans-serif",fontWeight:700,fontSize:14,color:"#F0EDE8"}}>{c.company}</div>
                <span style={{fontSize:10,color:"#6A5848",background:"#0D0D0D",border:"1px solid #242424",borderRadius:4,padding:"2px 7px",whiteSpace:"nowrap",marginLeft:8}}>{c.industry}</span>
              </div>
              <div style={{fontSize:12,color:"#B8A898",marginBottom:4}}>
                <span style={{color:"#6A5848"}}>Contact: </span>{c.contact}
                <span style={{color:"#4A3828"}}> · {c.title}</span>
              </div>
              <div style={{fontSize:11,color:"#6A5848",marginBottom:8}}>{c.size}</div>
              <div style={{fontSize:11,color:"#4A3828",borderTop:"1px solid #242424",paddingTop:8,lineHeight:1.7}}>{c.notes}</div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function SLACompact({ticket}) {
  const [,setT]=useState(0);
  useEffect(()=>{ if(ticket.status==="Resolved"||ticket.status==="Closed") return; const id=setInterval(()=>setT(n=>n+1),1000); return ()=>clearInterval(id); },[ticket.status]);
  const info=slaInfo(ticket.created,ticket.priority,ticket.status);
  if(!info) return <span style={{fontSize:11,color:"#4A3828"}}>-</span>;
  return (<span style={{display:"inline-flex",alignItems:"center",gap:5,fontSize:11}}><span style={{width:7,height:7,borderRadius:"50%",background:info.color,display:"inline-block"}}/><span style={{color:info.color,fontWeight:700}}>{info.breached?"BREACH":fmtDur(info.msLeft)}</span></span>);
}

function RequesterChip({requesterId, inline=false}) {
  const p = PERSON_BY_ID[requesterId];
  if (!p) return null;
  const color = ORG_COLOR[p.org] || "#6A5848";
  const initials = p.name.split(" ").map(n=>n[0]).join("").slice(0,2);
  if (inline) return <span style={{fontSize:11,color,fontWeight:600}}>{p.name}</span>;
  return (
    <div style={{display:"flex",alignItems:"center",gap:12}}>
      <div style={{width:40,height:40,borderRadius:8,background:`${color}20`,border:`1px solid ${color}40`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700,color,flexShrink:0,fontFamily:"'Raleway',sans-serif"}}>
        {initials}
      </div>
      <div style={{minWidth:0}}>
        <div style={{fontSize:14,fontWeight:600,color:"#F0EDE8",lineHeight:1.2}}>{p.name}</div>
        <div style={{fontSize:12,color,marginTop:2}}>{p.orgName}</div>
        <div style={{fontSize:11,color:"#6A5848",marginTop:1}}>{p.role}</div>
        <div style={{fontSize:10,color:"#4A3828",fontFamily:"'JetBrains Mono',monospace",marginTop:2}}>{p.email}</div>
      </div>
    </div>
  );
}

function timeAgo(iso) {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms/60000), h = Math.floor(ms/3600000), d = Math.floor(ms/86400000);
  if (d > 1) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  if (m > 0) return `${m}m ago`;
  return "just now";
}

const PRI_RAIL = { Critical:"#ef4444", High:"#f97316", Medium:"#f59e0b", Low:"#6b7280" };

function TicketTable({tickets,users,session,onOpen,showAssigned=false,showSLA=false,showCourse=false}) {
  const [isMobile,setIsMobile] = useState(()=>window.innerWidth<768);
  useEffect(()=>{
    const fn=()=>setIsMobile(window.innerWidth<768);
    window.addEventListener("resize",fn);
    return ()=>window.removeEventListener("resize",fn);
  },[]);

  function initials(name){return name.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase();}

  if(isMobile) return (
    <div style={{background:"#141414",border:"1px solid #1E1E1E",borderRadius:10,overflow:"hidden"}}>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}} .tkt-card:active{background:#1E1A17;}`}</style>
      {tickets.map((t,i)=>{
        const course=courseById(t.courseId);
        const sla=slaInfo(t.created,t.priority,t.status);
        const requester=PERSON_BY_ID[t.requesterId];
        const orgColor=requester?(ORG_COLOR[requester.org]||"#6A5848"):"#6A5848";
        const railColor=PRI_RAIL[t.priority]||"#6b7280";
        const isResolved=t.ticketNumber?t.status==="Closed":t.status==="Resolved"||t.status==="Closed";
        return (
          <div key={t.id} className="tkt-card" onClick={()=>onOpen(t.id)}
            style={{display:"flex",gap:0,borderBottom:i<tickets.length-1?"1px solid #1A1A1A":"none",cursor:"pointer",background:"transparent",transition:"background 0.1s"}}>
            <div style={{width:4,background:isResolved?"#2A2A2A":railColor,flexShrink:0,opacity:isResolved?0.3:1}}/>
            <div style={{flex:1,padding:"12px 14px",minWidth:0}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:5}}>
                <span style={{fontSize:10,fontFamily:"'JetBrains Mono',monospace",color:"#4A3828"}}>{t.ticketNumber||t.id}</span>
                {course&&showCourse&&<span style={{fontSize:9,color:course.color,fontWeight:700}}>{course.icon} {course.id.toUpperCase()}</span>}
                {sla?.breached&&<span style={{fontSize:9,color:"#ef4444",fontWeight:700,animation:"pulse 1.2s infinite"}}>● BREACH</span>}
              </div>
              <div style={{fontSize:13,fontWeight:500,color:isResolved?"#6A5848":"#EDE9E3",marginBottom:6,lineHeight:1.3}}>{t.title}</div>
              <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                {badge(t.status,STATUS_COLOR[t.status])}
                <span style={{fontSize:10,fontWeight:700,color:railColor}}>{t.priority}</span>
                {requester&&<span style={{fontSize:11,color:orgColor}}>{requester.name}</span>}
                <span style={{fontSize:10,color:"#3A3A3A",marginLeft:"auto"}}>{timeAgo(t.created)}</span>
              </div>
            </div>
            <div style={{display:"flex",alignItems:"center",padding:"0 12px",color:"#3A3A3A",fontSize:14,flexShrink:0}}>›</div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div style={{background:"#141414",border:"1px solid #1E1E1E",borderRadius:10,overflow:"hidden"}}>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}} .tkt-row:hover{background:#1E1A17 !important;}`}</style>
      <div style={{display:"grid",gridTemplateColumns:`4px 120px 1fr ${showCourse?"80px ":""}160px 100px 110px${showAssigned?" 110px":""}${showSLA?" 90px":""} 90px`,
        borderBottom:"1px solid #1E1E1E"}}>
        {["","#","Subject",showCourse&&"Course","Contact","Priority","Status",showAssigned&&"Assigned",showSLA&&"SLA","Age"].filter(v=>v!==false).map((h,i)=>(
          <div key={i} style={{padding:"10px 14px",fontSize:10,fontWeight:600,color:"#4A4038",textTransform:"uppercase",letterSpacing:"0.1em"}}>{h}</div>
        ))}
      </div>

      {tickets.map(t=>{
        const course=courseById(t.courseId);
        const sla=slaInfo(t.created,t.priority,t.status);
        const requester=PERSON_BY_ID[t.requesterId];
        const orgColor=requester?(ORG_COLOR[requester.org]||"#6A5848"):"#6A5848";
        const assigned=t.assignedTo?users.find(u=>u.id===t.assignedTo):null;
        const railColor=PRI_RAIL[t.priority]||"#6b7280";
        const isResolved=t.ticketNumber?t.status==="Closed":t.status==="Resolved"||t.status==="Closed";
        return (
          <div key={t.id} className="tkt-row" onClick={()=>onOpen(t.id)}
            style={{display:"grid",gridTemplateColumns:`4px 120px 1fr ${showCourse?"80px ":""}160px 100px 110px${showAssigned?" 110px":""}${showSLA?" 90px":""} 90px`,
              borderBottom:"1px solid #1A1A1A",cursor:"pointer",background:"transparent",transition:"background 0.1s",alignItems:"center"}}>
            <div style={{height:"100%",background:isResolved?"#2A2A2A":railColor,opacity:isResolved?0.3:1,alignSelf:"stretch"}}/>
            <div style={{padding:"13px 14px"}}>
              <div style={{fontSize:11,fontFamily:"'JetBrains Mono',monospace",color:"#6A5848"}}>{t.ticketNumber||t.id}</div>
              {sla?.breached&&<div style={{fontSize:9,color:"#ef4444",fontWeight:700,marginTop:2,animation:"pulse 1.2s infinite"}}>● SLA BREACH</div>}
            </div>
            <div style={{padding:"13px 14px",minWidth:0}}>
              <div style={{fontSize:13,fontWeight:500,color:isResolved?"#6A5848":"#EDE9E3",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{t.title}</div>
              {t.categories?.length>0&&<div style={{display:"flex",gap:4,marginTop:4,flexWrap:"wrap"}}>{t.categories.slice(0,2).map(c=><span key={c} style={{fontSize:9,background:"#1E1E1E",color:"#6A5848",borderRadius:3,padding:"1px 5px"}}>{c}</span>)}</div>}
            </div>
            {showCourse&&<div style={{padding:"13px 14px"}}>{course?<span style={{fontSize:10,color:course.color,fontWeight:700,background:course.color+"18",borderRadius:3,padding:"2px 6px"}}>{course.icon} {course.id.toUpperCase()}</span>:<span style={{color:"#2A2A2A"}}>—</span>}</div>}
            <div style={{padding:"13px 14px",minWidth:0}}>
              {requester?(<div style={{display:"flex",alignItems:"center",gap:7}}>
                <div style={{width:24,height:24,borderRadius:5,background:`${orgColor}20`,border:`1px solid ${orgColor}40`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,color:orgColor,flexShrink:0}}>{initials(requester.name)}</div>
                <div style={{minWidth:0}}>
                  <div style={{fontSize:12,color:"#C8B8A8",fontWeight:500,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{requester.name}</div>
                  <div style={{fontSize:10,color:orgColor,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{requester.orgName}</div>
                </div>
              </div>):<span style={{color:"#2A2A2A",fontSize:12}}>—</span>}
            </div>
            <div style={{padding:"13px 14px"}}><span style={{fontSize:10,fontWeight:700,color:railColor,background:railColor+"18",border:`1px solid ${railColor}40`,borderRadius:4,padding:"2px 8px",textTransform:"uppercase"}}>{t.priority}</span></div>
            <div style={{padding:"13px 14px"}}>{badge(t.status,STATUS_COLOR[t.status])}</div>
            {showAssigned&&<div style={{padding:"13px 14px"}}>{assigned?(<div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:22,height:22,borderRadius:"50%",background:"#2A2A2A",border:"1px solid #3A3A3A",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,color:"#8A7868",flexShrink:0}}>{initials(assigned.name)}</div><span style={{fontSize:11,color:"#8A7868"}}>{assigned.name.split(" ")[0]}</span></div>):<span style={{fontSize:11,color:"#2A2A2A"}}>Unassigned</span>}</div>}
            {showSLA&&<div style={{padding:"13px 14px"}}><SLACompact ticket={t}/></div>}
            <div style={{padding:"13px 14px",fontSize:11,color:"#4A3828"}}>{timeAgo(t.created)}</div>
          </div>
        );
      })}
    </div>
  );
}



// ═══════════════════════════════════════════════════════════════
// KNOWLEDGE BASE
// ═══════════════════════════════════════════════════════════════
const KB_ARTICLE_TEMPLATE = `## Overview
Explain the topic in a few clear sentences.

## Why It Matters
Describe when an IT professional would use this knowledge.

## Key Details
- Important fact or concept
- Important fact or concept

## Steps or Example
1. Start with the first action or example.
2. Continue in a logical order.
3. Explain how to confirm the result.

## Common Mistakes
- Note a likely mistake and how to avoid it.

## Related Topics
- Add useful tags above so Cinder can connect this article to related knowledge.

## Sources
- List the lab, documentation, or reference used.`;

const GENERIC_KB_TAGS = new Set(["it","terms and concepts","intro to it","guide","resources","websites","index"]);

function relatedKnowledgeArticles(article,kb) {
  const articleTags=new Set((article.tags||[]).map(t=>t.toLowerCase()).filter(t=>!GENERIC_KB_TAGS.has(t)));
  return kb
    .filter(candidate=>candidate.id!==article.id&&candidate.status==="published")
    .map(candidate=>{
      const shared=(candidate.tags||[]).map(t=>t.toLowerCase()).filter(t=>articleTags.has(t)&&!GENERIC_KB_TAGS.has(t));
      const score=shared.length*10+(candidate.courseId===article.courseId?2:0)+(candidate.category===article.category?1:0);
      return {...candidate,sharedTags:shared,relatedScore:score};
    })
    .filter(candidate=>candidate.sharedTags.length>0)
    .sort((a,b)=>b.relatedScore-a.relatedScore||a.title.localeCompare(b.title))
    .slice(0,6);
}

function KnowledgeBase({session,kb,onSave,onDelete}) {
  const [subview,setSubview]=useState("list"); // list | read | edit
  const [selected,setSelected]=useState(null);
  const [search,setSearch]=useState("");
  const [catFilter,setCatFilter]=useState("all");
  const [courseFilter,setCourseFilter]=useState("all");
  const [tagFilter,setTagFilter]=useState("");

  const canPublish=session.role==="tech"||session.role==="admin";

  const visible=kb
    .filter(a=>canPublish?true:(a.status==="published"||a.authorId===session.id))
    .filter(a=>catFilter==="all"?true:a.category===catFilter)
    .filter(a=>courseFilter==="all"?true:a.courseId===courseFilter)
    .filter(a=>tagFilter===""?true:a.tags?.some(t=>t.toLowerCase()===tagFilter.toLowerCase()))
    .filter(a=>search===""?true:
      a.title.toLowerCase().includes(search.toLowerCase())||
      a.body.toLowerCase().includes(search.toLowerCase())||
      a.tags?.some(t=>t.toLowerCase().includes(search.toLowerCase())));

  const pendingReview=kb.filter(a=>a.status==="submitted");

  function newArticle() {
    const blank={id:"kb-"+Date.now(),title:"",courseId:"net",category:"General",
      status:"draft",authorId:session.id,body:KB_ARTICLE_TEMPLATE,tags:[],
      created:new Date().toISOString(),updated:new Date().toISOString()};
    setSelected(blank); setSubview("edit");
  }

  if(subview==="edit"&&selected) return (
    <KBEditor article={selected} session={session} canPublish={canPublish}
      onSave={async(a)=>{ const saved=await onSave(a); if(saved){setSelected(saved);setSubview("read");} }}
      onCancel={()=>{ setSubview(kb.find(x=>x.id===selected.id)?"read":"list"); }} />
  );

  if(subview==="read"&&selected) {
    const art=kb.find(a=>a.id===selected.id)||selected;
    const related=relatedKnowledgeArticles(art,kb);
    return <KBArticle article={art} session={session} canPublish={canPublish}
      relatedArticles={related}
      onOpenRelated={article=>{setSelected(article);setSubview("read");}}
      onSelectTag={tag=>{setTagFilter(tag);setSelected(null);setSubview("list");}}
      onEdit={()=>{ setSelected(art); setSubview("edit"); }}
      onDelete={async()=>{ const deleted=await onDelete(art.id); if(deleted)setSubview("list"); }}
      onBack={()=>setSubview("list")} />;
  }

  return (
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24}}>
        <PageTitle title="Knowledge Base" sub={`${visible.length} article${visible.length!==1?"s":""}`} />
        <button onClick={newArticle} style={{...btnPrimary,width:"auto",padding:"9px 20px"}}>+ New Article</button>
      </div>

      {/* Search + filters */}
      <div style={{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap"}}>
        <input value={search} onChange={e=>setSearch(e.target.value)}
          style={{...inputStyle,flex:1,minWidth:200}} placeholder="Search articles…" />
        <select value={courseFilter} onChange={e=>setCourseFilter(e.target.value)} style={{...inputStyle,width:"auto"}}>
          <option value="all">All Courses</option>
          {COURSES.map(c=><option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
        </select>
        {tagFilter&&(
          <button onClick={()=>setTagFilter("")}
            style={{background:"#E8922E18",border:"1px solid #E8922E55",color:"#F0B060",borderRadius:6,padding:"8px 12px",fontSize:12,cursor:"pointer"}}>
            #{tagFilter} ×
          </button>
        )}
      </div>

      {/* Pending review (tech/admin only) */}
      {canPublish&&pendingReview.length>0&&(
        <div style={{marginBottom:20}}>
          <SectionLabel>⏳ Pending Review ({pendingReview.length})</SectionLabel>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {pendingReview.map(a=>(
              <div key={a.id} onClick={()=>{setSelected(a);setSubview("read");}}
                style={{background:"#0D0D0D",border:"1px solid #f59e0b44",borderLeft:"3px solid #f59e0b",borderRadius:8,padding:"12px 16px",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}}
                onMouseEnter={e=>e.currentTarget.style.background="#181410"}
                onMouseLeave={e=>e.currentTarget.style.background="#0D0D0D"}>
                <div>
                  <div style={{color:"#EDE9E3",fontSize:14,fontWeight:600}}>{a.title||"Untitled Submission"}</div>
                  <div style={{fontSize:11,color:"#f59e0b",marginTop:2}}>Submitted · {a.category}</div>
                </div>
                <span style={{fontSize:12,color:"#f59e0b"}}>Review →</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Article grid */}
      {visible.length===0?<EmptyState msg="No articles found."/>:(
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:14}}>
          {visible.map(a=>{
            const course=courseById(a.courseId);
            return (
              <div key={a.id} onClick={()=>{setSelected(a);setSubview("read");}}
                style={{background:"#1A1A1A",border:`1px solid ${a.status==="draft"?"#f59e0b33":"#242424"}`,borderRadius:12,padding:20,cursor:"pointer",transition:"border-color 0.15s,background 0.15s"}}
                onMouseEnter={e=>{e.currentTarget.style.background="#221E1A";e.currentTarget.style.borderColor=course?.color+"55"||"#E8922E";}}
                onMouseLeave={e=>{e.currentTarget.style.background="#1A1A1A";e.currentTarget.style.borderColor=a.status==="draft"?"#f59e0b33":"#242424";}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                  {course&&<span style={{fontSize:10,color:course.color,fontWeight:700,background:course.color+"18",border:`1px solid ${course.color}33`,borderRadius:3,padding:"2px 7px"}}>{course.icon} {course.id.toUpperCase()}</span>}
                  {a.status==="draft"&&<span style={{fontSize:10,color:"#f59e0b",background:"#f59e0b18",border:"1px solid #f59e0b33",borderRadius:3,padding:"2px 7px",fontWeight:700}}>DRAFT</span>}
                </div>
                <div style={{fontFamily:"'Raleway',sans-serif",fontSize:16,fontWeight:700,color:"#F0EDE8",marginBottom:6,lineHeight:1.3}}>{a.title||"Untitled"}</div>
                <div style={{fontSize:12,color:"#6A5848",marginBottom:10}}>{a.category}</div>
                <div style={{fontSize:12,color:"#8A7868",lineHeight:1.6,display:"-webkit-box",WebkitLineClamp:3,WebkitBoxOrient:"vertical",overflow:"hidden"}}>
                  {a.body.replace(/#{1,6} /g,"").replace(/```[\s\S]*?```/g,"[code]").replace(/\*\*/g,"").slice(0,180)}
                </div>
                {a.tags?.length>0&&(
                  <div style={{display:"flex",flexWrap:"wrap",gap:4,marginTop:10}}>
                    {a.tags.slice(0,4).map(t=><span key={t} style={{fontSize:10,color:"#6A5848",background:"#242424",borderRadius:3,padding:"2px 6px"}}>#{t}</span>)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function KBArticle({article,session,canPublish,relatedArticles,onOpenRelated,onSelectTag,onEdit,onDelete,onBack}) {
  const course=courseById(article.courseId);
  // Very simple markdown renderer
  // Inline formatting shared by paragraphs and list items — handles `code` and **bold**
  function renderInline(text) {
    const parts=text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
    return parts.map((p,j)=>{
      if(p.startsWith("`")) return <code key={j} style={{background:"#0D0D0D",border:"1px solid #242424",borderRadius:3,padding:"1px 6px",fontSize:12,color:"#E8922E",fontFamily:"monospace"}}>{p.slice(1,-1)}</code>;
      if(p.startsWith("**")) return <strong key={j} style={{color:"#EDE9E3",fontWeight:700}}>{p.slice(2,-2)}</strong>;
      return p;
    });
  }
  function renderMd(text) {
    const lines=text.split("\n");
    return lines.map((line,i)=>{
      if(line.startsWith("### ")) return <h3 key={i} style={{color:"#F0EDE8",fontFamily:"'Raleway',sans-serif",fontSize:16,marginTop:20,marginBottom:6}}>{line.slice(4)}</h3>;
      if(line.startsWith("## "))  return <h2 key={i} style={{color:"#F0EDE8",fontFamily:"'Raleway',sans-serif",fontSize:19,marginTop:24,marginBottom:8,borderBottom:"1px solid #242424",paddingBottom:6}}>{line.slice(3)}</h2>;
      if(line.startsWith("# "))   return <h1 key={i} style={{color:"#F0EDE8",fontFamily:"'Raleway',sans-serif",fontSize:22,marginTop:24,marginBottom:10}}>{line.slice(2)}</h1>;
      if(line.startsWith("```"))  return null;
      if(line.startsWith("| "))   return <div key={i} style={{fontFamily:"monospace",fontSize:12,color:"#B8A898",borderBottom:"1px solid #24242433",padding:"4px 0"}}>{line}</div>;
      if(line.startsWith("- "))   return <li key={i} style={{color:"#B8A898",fontSize:14,marginBottom:4,marginLeft:16}}>{renderInline(line.slice(2))}</li>;
      if(line.match(/^\d+\. /))   return <li key={i} style={{color:"#B8A898",fontSize:14,marginBottom:6,marginLeft:16}}>{renderInline(line.replace(/^\d+\. /,""))}</li>;
      if(line.trim()==="")        return <div key={i} style={{height:8}}/>;
      return <p key={i} style={{color:"#B8A898",fontSize:14,lineHeight:1.7,margin:"4px 0"}}>{renderInline(line)}</p>;
    });
  }
  const canEdit=session.role==="tech"||session.role==="admin"||(article.authorId===session.id&&["draft","changes_requested"].includes(article.status));
  return (
    <div style={{maxWidth:800}}>
      <button onClick={onBack} style={{...btnGhost,marginBottom:20}}>← Back to Knowledge Base</button>
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:16,marginBottom:8}}>
        <div style={{flex:1}}>
          {course&&<span style={{fontSize:11,color:course.color,fontWeight:700,background:course.color+"18",border:`1px solid ${course.color}33`,borderRadius:3,padding:"2px 7px",marginBottom:8,display:"inline-block"}}>{course.icon} {course.label}</span>}
          <h1 style={{fontFamily:"'Raleway',sans-serif",fontSize:26,fontWeight:800,color:"#F0EDE8",margin:"8px 0",lineHeight:1.2}}>{article.title}</h1>
          <div style={{fontSize:12,color:"#6A5848",marginBottom:8}}>{article.category} · Updated {fmt(article.updated)}</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {article.status!=="published"&&<span style={{fontSize:11,color:article.status==="changes_requested"?"#f87171":"#f59e0b",background:"#f59e0b18",border:"1px solid #f59e0b44",borderRadius:4,padding:"2px 8px",fontWeight:700}}>{article.status.replaceAll("_"," ").toUpperCase()}</span>}
            {article.tags?.map(t=><button key={t} onClick={()=>onSelectTag(t)}
              title={`Show all articles tagged ${t}`}
              style={{fontSize:11,color:"#B8A898",background:"#242424",border:"1px solid #34302C",borderRadius:3,padding:"2px 7px",cursor:"pointer"}}>#{t}</button>)}
          </div>
        </div>
        {canEdit&&(
          <div style={{display:"flex",gap:8,flexShrink:0}}>
            <button onClick={onEdit} style={{background:"#1A1A1A",border:"1px solid #242424",color:"#B8A898",borderRadius:6,padding:"7px 14px",fontSize:12,cursor:"pointer"}}>Edit</button>
            {session.role==="admin"&&<button onClick={onDelete} style={{background:"none",border:"1px solid #7f1d1d44",color:"#f87171",borderRadius:6,padding:"7px 14px",fontSize:12,cursor:"pointer"}}>Delete</button>}
          </div>
        )}
      </div>
      {article.reviewNotes&&(
        <Card style={{marginTop:16,borderColor:"#f59e0b55"}}>
          <SectionLabel>Instructor Feedback</SectionLabel>
          <div style={{color:"#B8A898",fontSize:14,lineHeight:1.6,whiteSpace:"pre-wrap"}}>{article.reviewNotes}</div>
        </Card>
      )}
      <Card style={{marginTop:16}}>
        <div style={{lineHeight:1.8}}>{renderMd(article.body)}</div>
      </Card>
      {relatedArticles?.length>0&&(
        <Card style={{marginTop:16}}>
          <SectionLabel>Related Knowledge</SectionLabel>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:10}}>
            {relatedArticles.map(related=>(
              <button key={related.id} onClick={()=>onOpenRelated(related)}
                style={{background:"#0D0D0D",border:"1px solid #242424",borderRadius:8,padding:"12px 14px",textAlign:"left",cursor:"pointer"}}>
                <div style={{color:"#EDE9E3",fontSize:13,fontWeight:700,lineHeight:1.35}}>{related.title}</div>
                <div style={{color:"#6A5848",fontSize:10,marginTop:6}}>
                  {related.sharedTags.slice(0,3).map(tag=>`#${tag}`).join(" · ")}
                </div>
              </button>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function KBEditor({article,session,canPublish,onSave,onCancel}) {
  const [form,setForm]=useState({...article});
  const [tagInput,setTagInput]=useState(article.tags?.join(", ")||"");
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));

  function handleSave(status) {
    const tags=[...new Set(tagInput.split(",").map(t=>t.trim().toLowerCase()).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
    const updated={...form,tags,status,reviewerId:canPublish&&status!=="draft"?session.id:null,updated:new Date().toISOString()};
    onSave(updated);
  }

  return (
    <div style={{maxWidth:800}}>
      <button onClick={onCancel} style={{...btnGhost,marginBottom:20}}>← Cancel</button>
      <PageTitle title={String(form.id).startsWith("kb-")?form.title||"New Article":"Edit Article"} sub={form.status.replaceAll("_"," ")} />
      <Card>
        <Field label="Title">
          <input value={form.title} onChange={e=>set("title",e.target.value)} style={inputStyle} placeholder="Article title" />
        </Field>
        <div className="new-ticket-grid">
          <Field label="Course">
            <select value={form.courseId} onChange={e=>set("courseId",e.target.value)} style={inputStyle}>
              {COURSES.map(c=><option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
              <option value="">General</option>
            </select>
          </Field>
          <Field label="Category">
            <select value={form.category} onChange={e=>set("category",e.target.value)} style={inputStyle}>
              {KB_CATEGORIES.map(c=><option key={c}>{c}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Tags (comma separated)">
          <input value={tagInput} onChange={e=>setTagInput(e.target.value)} style={inputStyle} placeholder="e.g. cabling, switch, cisco" />
        </Field>
        <Field label="Body (Markdown supported)">
          <textarea value={form.body} onChange={e=>set("body",e.target.value)}
            style={{...inputStyle,height:360,resize:"vertical",fontFamily:"'Inter',sans-serif",fontSize:12,lineHeight:1.7}}
            placeholder={"## Overview\nDescribe the topic here.\n\n## Steps\n1. First step\n2. Second step\n\n## Notes\nAny additional tips."} />
        </Field>
        {canPublish&&(
          <Field label="Instructor feedback">
            <textarea value={form.reviewNotes||""} onChange={e=>set("reviewNotes",e.target.value)}
              style={{...inputStyle,height:90,resize:"vertical"}}
              placeholder="Explain what is strong or what the student should revise." />
          </Field>
        )}
        <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
          <button onClick={()=>handleSave(canPublish?form.status:"draft")}
            style={{...btnPrimary,background:"#242424",color:"#B8A898",flex:1,minWidth:150}}>
            {canPublish?"Save Review Notes":"Save Draft"}
          </button>
          {canPublish&&(
            <>
              {form.status==="submitted"&&(
                <button onClick={()=>handleSave("changes_requested")} style={{...btnPrimary,flex:1,minWidth:150,background:"#7f1d1d",color:"#F0EDE8"}}>
                  Request Changes
                </button>
              )}
              <button onClick={()=>handleSave("published")} style={{...btnPrimary,flex:1,minWidth:150}}>
                {form.status==="published"?"Update Published Article":"Approve & Publish"}
              </button>
            </>
          )}
          {!canPublish&&(
            <button onClick={()=>handleSave("submitted")} style={{...btnPrimary,flex:1,minWidth:150,background:"#f59e0b",color:"#0D0D0D"}}>
              Submit for Review
            </button>
          )}
        </div>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// INCIDENT RESPONSE
// ═══════════════════════════════════════════════════════════════
function nextIncidentId(incidents) {
  const nums=incidents.map(i=>parseInt(i.id.split("-")[1])||0);
  return "INC-"+String(Math.max(0,...nums)+1).padStart(3,"0");
}

function IncidentResponse({session,incidents,tickets,users,onSave,onDelete}) {
  const [subview,setSubview]=useState("list");
  const [selected,setSelected]=useState(null);
  const [phaseFilter,setPhaseFilter]=useState("all");

  const canCreate=session.role==="tech"||session.role==="admin";

  const visible=incidents
    .filter(i=>phaseFilter==="all"?true:i.phase===phaseFilter)
    .sort((a,b)=>new Date(b.created)-new Date(a.created));

  function newIncident() {
    const blank={
      id:nextIncidentId(incidents),
      title:"", severity:"High", phase:"Identify", courseId:"cyber",
      affectedSystems:[], description:"", linkedTickets:[],
      timeline:[], postMortem:"",
      created:new Date().toISOString(), createdBy:session.id,
    };
    setSelected(blank); setSubview("detail");
  }

  if(subview==="detail"&&selected) {
    const inc=incidents.find(i=>i.id===selected.id)||selected;
    return <IRDetail incident={inc} session={session} users={users} tickets={tickets}
      onSave={async(updated)=>{ await onSave(updated); setSelected(updated); }}
      onDelete={async()=>{ await onDelete(inc.id); setSubview("list"); }}
      onBack={()=>setSubview("list")} />;
  }

  return (
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24}}>
        <PageTitle title="Incident Response" sub={`${incidents.length} incident${incidents.length!==1?"s":""} on record`} />
        {canCreate&&<button onClick={newIncident} style={{...btnPrimary,width:"auto",padding:"9px 20px"}}>+ New Incident</button>}
      </div>

      {/* Phase filter */}
      <div style={{display:"flex",gap:8,marginBottom:20,flexWrap:"wrap"}}>
        <button onClick={()=>setPhaseFilter("all")}
          style={{padding:"5px 14px",borderRadius:6,fontSize:12,cursor:"pointer",background:phaseFilter==="all"?"#4A3828":"transparent",color:phaseFilter==="all"?"#EDE9E3":"#8A7868",border:"1px solid #242424"}}>
          All
        </button>
        {IR_PHASES.map(p=>(
          <button key={p} onClick={()=>setPhaseFilter(p)}
            style={{padding:"5px 14px",borderRadius:6,fontSize:12,cursor:"pointer",
              background:phaseFilter===p?IR_PHASE_COLOR[p]+"33":"transparent",
              color:phaseFilter===p?IR_PHASE_COLOR[p]:"#8A7868",
              border:`1px solid ${phaseFilter===p?IR_PHASE_COLOR[p]+"55":"#242424"}`}}>
            {p}
          </button>
        ))}
      </div>

      {visible.length===0?<EmptyState msg="No incidents recorded." />:(
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {visible.map(inc=>{
            const course=courseById(inc.courseId);
            return (
              <div key={inc.id} onClick={()=>{setSelected(inc);setSubview("detail");}}
                style={{background:"#1A1A1A",border:`1px solid ${IR_SEVERITY_COLOR[inc.severity]}44`,borderLeft:`3px solid ${IR_SEVERITY_COLOR[inc.severity]}`,borderRadius:12,padding:"16px 20px",cursor:"pointer",transition:"background 0.1s"}}
                onMouseEnter={e=>e.currentTarget.style.background="#221E1A"}
                onMouseLeave={e=>e.currentTarget.style.background="#1A1A1A"}>
                <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:16}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
                      <span style={{fontSize:12,color:"#6A5848",fontFamily:"monospace"}}>{inc.id}</span>
                      {badge(inc.severity,IR_SEVERITY_COLOR[inc.severity])}
                      <span style={{fontSize:11,color:IR_PHASE_COLOR[inc.phase],background:IR_PHASE_COLOR[inc.phase]+"22",border:`1px solid ${IR_PHASE_COLOR[inc.phase]}44`,borderRadius:4,padding:"2px 8px",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.04em"}}>{inc.phase}</span>
                      {course&&<span style={{fontSize:10,color:course.color,fontWeight:700}}>{course.icon}</span>}
                    </div>
                    <div style={{fontFamily:"'Raleway',sans-serif",fontSize:16,fontWeight:700,color:"#F0EDE8",marginBottom:4}}>{inc.title||"Untitled Incident"}</div>
                    <div style={{fontSize:12,color:"#8A7868",display:"flex",gap:16}}>
                      <span>{inc.affectedSystems?.length||0} system{inc.affectedSystems?.length!==1?"s":""} affected</span>
                      <span>{inc.timeline?.length||0} timeline entries</span>
                      {inc.linkedTickets?.length>0&&<span>{inc.linkedTickets.length} linked ticket{inc.linkedTickets.length!==1?"s":""}</span>}
                    </div>
                  </div>
                  <div style={{fontSize:12,color:"#6A5848",textAlign:"right",flexShrink:0}}>
                    <div>{fmt(inc.created)}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function IRDetail({incident,session,users,tickets,onSave,onDelete,onBack}) {
  const [form,setForm]=useState({...incident,affectedSystems:[...(incident.affectedSystems||[])],linkedTickets:[...(incident.linkedTickets||[])],timeline:[...(incident.timeline||[])]});
  const [newSystem,setNewSystem]=useState("");
  const [noteText,setNoteText]=useState("");
  const [notePhase,setNotePhase]=useState(form.phase);
  const [linkTicket,setLinkTicket]=useState("");
  const [editing,setEditing]=useState(!incident.title);
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const canEdit=session.role==="tech"||session.role==="admin"||incident.createdBy===session.id;

  function nameOf(id){return users.find(u=>u.id===id)?.name||"Unknown";}

  function addSystem(){if(newSystem.trim()){set("affectedSystems",[...form.affectedSystems,newSystem.trim()]);setNewSystem("");}}
  function removeSystem(s){set("affectedSystems",form.affectedSystems.filter(x=>x!==s));}

  function addTimelineNote(){
    if(!noteText.trim()) return;
    const entry={ts:new Date().toISOString(),author:session.id,phase:notePhase,note:noteText.trim()};
    set("timeline",[...form.timeline,entry]);
    setNoteText("");
  }

  function toggleLinkedTicket(tid){
    set("linkedTickets",form.linkedTickets.includes(tid)?form.linkedTickets.filter(x=>x!==tid):[...form.linkedTickets,tid]);
  }

  const unlinkedTickets=tickets.filter(t=>!form.linkedTickets.includes(t.id));

  const phaseIndex=IR_PHASES.indexOf(form.phase);

  return (
    <div style={{maxWidth:900}}>
      <button onClick={onBack} style={{...btnGhost,marginBottom:20}}>← Back to Incidents</button>

      {/* Header */}
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:16,marginBottom:20}}>
        <div style={{flex:1}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
            <span style={{fontSize:12,color:"#6A5848",fontFamily:"monospace"}}>{form.id}</span>
            {badge(form.severity,IR_SEVERITY_COLOR[form.severity])}
          </div>
          {editing?(
            <input value={form.title} onChange={e=>set("title",e.target.value)}
              style={{...inputStyle,fontFamily:"'Raleway',sans-serif",fontSize:22,fontWeight:700,marginBottom:8}}
              placeholder="Incident title" />
          ):(
            <h1 style={{fontFamily:"'Raleway',sans-serif",fontSize:24,fontWeight:800,color:"#F0EDE8",margin:"0 0 8px"}}>{form.title||"Untitled Incident"}</h1>
          )}
        </div>
        {canEdit&&(
          <div style={{display:"flex",gap:8,flexShrink:0}}>
            {editing?(
              <button onClick={async()=>{await onSave(form);setEditing(false);}} style={{...btnPrimary,width:"auto",padding:"8px 18px"}}>Save</button>
            ):(
              <button onClick={()=>setEditing(true)} style={{background:"#1A1A1A",border:"1px solid #242424",color:"#B8A898",borderRadius:6,padding:"8px 14px",fontSize:12,cursor:"pointer"}}>Edit</button>
            )}
            {session.role==="admin"&&<button onClick={onDelete} style={{background:"none",border:"1px solid #7f1d1d44",color:"#f87171",borderRadius:6,padding:"8px 14px",fontSize:12,cursor:"pointer"}}>Delete</button>}
          </div>
        )}
      </div>

      {/* PICERL Phase stepper */}
      <Card style={{marginBottom:20}}>
        <SectionLabel>Response Phase</SectionLabel>
        <div style={{display:"flex",gap:0}}>
          {IR_PHASES.map((p,i)=>{
            const done=i<phaseIndex;
            const active=i===phaseIndex;
            return (
              <button key={p} onClick={()=>canEdit&&set("phase",p)}
                style={{flex:1,padding:"10px 4px",fontSize:11,fontWeight:active?700:400,cursor:canEdit?"pointer":"default",
                  background:active?IR_PHASE_COLOR[p]+"33":done?"#1A1A1A":"#0D0D0D",
                  color:active?IR_PHASE_COLOR[p]:done?"#6A5848":"#4A3828",
                  border:`1px solid ${active?IR_PHASE_COLOR[p]+"55":"#242424"}`,
                  borderRadius:i===0?"6px 0 0 6px":i===IR_PHASES.length-1?"0 6px 6px 0":"0",
                  textAlign:"center",lineHeight:1.3,transition:"all 0.15s",letterSpacing:"0.02em"}}>
                {done?"✓ ":""}{p}
              </button>
            );
          })}
        </div>
      </Card>

      <div className="ir-grid">
        {/* Left col */}
        <div>
          {/* Description */}
          <Card style={{marginBottom:16}}>
            <SectionLabel>Description</SectionLabel>
            {editing?(
              <textarea value={form.description} onChange={e=>set("description",e.target.value)}
                style={{...inputStyle,height:120,resize:"vertical"}}
                placeholder="Describe what happened, how it was detected, and initial observations." />
            ):(
              <p style={{color:"#B8A898",fontSize:14,lineHeight:1.7,margin:0,whiteSpace:"pre-wrap"}}>{form.description||<span style={{color:"#4A3828"}}>No description yet.</span>}</p>
            )}
          </Card>

          {/* Timeline */}
          <Card style={{marginBottom:16}}>
            <SectionLabel>Timeline</SectionLabel>
            {form.timeline.length===0&&<div style={{color:"#6A5848",fontSize:13,marginBottom:16}}>No entries yet. Start documenting what you observe.</div>}
            <div style={{position:"relative"}}>
              {form.timeline.map((e,i)=>(
                <div key={i} style={{display:"flex",gap:14,marginBottom:16,position:"relative"}}>
                  <div style={{display:"flex",flexDirection:"column",alignItems:"center",flexShrink:0}}>
                    <div style={{width:10,height:10,borderRadius:"50%",background:IR_PHASE_COLOR[e.phase],marginTop:3,flexShrink:0,zIndex:1}}/>
                    {i<form.timeline.length-1&&<div style={{width:2,flex:1,background:"#242424",marginTop:4}}/>}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:4}}>
                      <span style={{fontSize:11,color:IR_PHASE_COLOR[e.phase],fontWeight:700,textTransform:"uppercase",letterSpacing:"0.05em"}}>{e.phase}</span>
                      <span style={{fontSize:11,color:"#6A5848"}}>{fmt(e.ts)}</span>
                      <span style={{fontSize:11,color:"#8A7868"}}>· {nameOf(e.author)}</span>
                    </div>
                    <div style={{fontSize:13,color:"#B8A898",lineHeight:1.6,whiteSpace:"pre-wrap"}}>{e.note}</div>
                  </div>
                </div>
              ))}
            </div>
            {canEdit&&(
              <div style={{borderTop:"1px solid #242424",paddingTop:16,marginTop:8}}>
                <div style={{display:"flex",gap:10,marginBottom:8}}>
                  <select value={notePhase} onChange={e=>setNotePhase(e.target.value)} style={{...inputStyle,width:"auto"}}>
                    {IR_PHASES.map(p=><option key={p}>{p}</option>)}
                  </select>
                </div>
                <textarea value={noteText} onChange={e=>setNoteText(e.target.value)}
                  style={{...inputStyle,height:80,resize:"vertical"}}
                  placeholder="Document an observation, action taken, or finding…" />
                <button onClick={addTimelineNote} style={{...btnPrimary,marginTop:8,opacity:noteText.trim()?1:0.4}} disabled={!noteText.trim()}>Add to Timeline</button>
              </div>
            )}
          </Card>

          {/* Post-mortem */}
          {(form.phase==="Lessons Learned"||form.postMortem)&&(
            <Card>
              <SectionLabel>Post-Mortem / Lessons Learned</SectionLabel>
              {editing?(
                <textarea value={form.postMortem} onChange={e=>set("postMortem",e.target.value)}
                  style={{...inputStyle,height:160,resize:"vertical"}}
                  placeholder={"What happened?\nWhat was the impact?\nWhat went well?\nWhat should change?\nAction items:"} />
              ):(
                <p style={{color:"#B8A898",fontSize:14,lineHeight:1.7,margin:0,whiteSpace:"pre-wrap"}}>{form.postMortem||<span style={{color:"#4A3828"}}>No post-mortem written yet.</span>}</p>
              )}
            </Card>
          )}
        </div>

        {/* Right col */}
        <div>
          {/* Metadata */}
          <Card style={{marginBottom:16}}>
            <SectionLabel>Incident Details</SectionLabel>
            {editing?(
              <>
                <Field label="Severity">
                  <select value={form.severity} onChange={e=>set("severity",e.target.value)} style={inputStyle}>
                    {IR_SEVERITIES.map(s=><option key={s}>{s}</option>)}
                  </select>
                </Field>
                <Field label="Course">
                  <select value={form.courseId} onChange={e=>set("courseId",e.target.value)} style={inputStyle}>
                    {COURSES.map(c=><option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
                  </select>
                </Field>
              </>
            ):(
              <>
                <DetailRow label="Severity" val={badge(form.severity,IR_SEVERITY_COLOR[form.severity])} />
                <DetailRow label="Phase" val={<span style={{color:IR_PHASE_COLOR[form.phase],fontWeight:700,fontSize:12}}>{form.phase}</span>} />
                <DetailRow label="Opened" val={fmt(form.created)} />
                <DetailRow label="Created by" val={nameOf(form.createdBy)} />
              </>
            )}
          </Card>

          {/* Affected Systems */}
          <Card style={{marginBottom:16}}>
            <SectionLabel>Affected Systems</SectionLabel>
            {form.affectedSystems.length===0&&<div style={{fontSize:12,color:"#6A5848",marginBottom:12}}>None listed.</div>}
            <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:12}}>
              {form.affectedSystems.map(s=>(
                <div key={s} style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:"#0D0D0D",borderRadius:6,padding:"6px 10px"}}>
                  <span style={{fontSize:12,color:"#B8A898"}}>{s}</span>
                  {canEdit&&<button onClick={()=>removeSystem(s)} style={{background:"none",border:"none",color:"#6A5848",cursor:"pointer",fontSize:11}}>✕</button>}
                </div>
              ))}
            </div>
            {canEdit&&(
              <div style={{display:"flex",gap:8}}>
                <input value={newSystem} onChange={e=>setNewSystem(e.target.value)}
                  onKeyDown={e=>e.key==="Enter"&&addSystem()}
                  style={{...inputStyle,flex:1,fontSize:12}} placeholder="e.g. Lab WS-03" />
                <button onClick={addSystem} style={{background:"#242424",border:"1px solid #242424",color:"#B8A898",borderRadius:6,padding:"0 12px",cursor:"pointer",fontSize:13,whiteSpace:"nowrap"}}>Add</button>
              </div>
            )}
          </Card>

          {/* Linked Tickets */}
          <Card>
            <SectionLabel>Linked Tickets</SectionLabel>
            {form.linkedTickets.length===0&&<div style={{fontSize:12,color:"#6A5848",marginBottom:12}}>No tickets linked.</div>}
            {form.linkedTickets.map(tid=>{
              const t=tickets.find(x=>x.id===tid);
              return t?(
                <div key={tid} style={{background:"#0D0D0D",borderRadius:6,padding:"8px 10px",marginBottom:6,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <div>
                    <div style={{fontSize:11,color:"#6A5848",fontFamily:"monospace"}}>{t.id}</div>
                    <div style={{fontSize:12,color:"#B8A898",marginTop:2}}>{t.title}</div>
                  </div>
                  {canEdit&&<button onClick={()=>toggleLinkedTicket(tid)} style={{background:"none",border:"none",color:"#6A5848",cursor:"pointer",fontSize:11}}>✕</button>}
                </div>
              ):null;
            })}
            {canEdit&&unlinkedTickets.length>0&&(
              <div style={{marginTop:8}}>
                <select value="" onChange={e=>{if(e.target.value)toggleLinkedTicket(e.target.value);}} style={{...inputStyle,fontSize:12}}>
                  <option value="">Link a ticket…</option>
                  {unlinkedTickets.map(t=><option key={t.id} value={t.id}>{t.id} — {t.title.slice(0,40)}</option>)}
                </select>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
