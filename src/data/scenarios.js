// ─────────────────────────────────────────────
// scenarios.js
// 30 pre-built scenarios — 10 per course.
//
// Tickets land in the student's queue as real
// client requests. NO lab framing is shown to
// students. The client voice matches the persona.
//
// Fields:
//   id            unique string
//   courseId      "net" | "hw" | "cyber"
//   week          1–10
//   title         short subject line (client voice)
//   requesterId   persona ID from people.js
//   mode          "broadcast" | "individual" | "pairs" | "teams"
//   priority      "Low" | "Medium" | "High" | "Critical"
//   categories    array matching course categories
//   linkedCourse  (optional) cross-course link
//   description   the client's ticket — written in persona voice.
//                 Students see this. No lab instructions here.
//   instructorNotes  physical task context — ADMIN ONLY.
//                 What the student actually does with real equipment.
// ─────────────────────────────────────────────

export const SCENARIOS = [

  // ══════════════════════════════════════════
  // NETWORKING FUNDAMENTALS (net)
  // ══════════════════════════════════════════

  {
    id: "sc-net-01", courseId: "net", week: 1,
    title: "Wires everywhere in the server closet — can someone sort this out?",
    requesterId: "cmw-marcus",
    mode: "broadcast", priority: "Low",
    categories: ["Cable/Physical Layer"],
    description:
`There's a bunch of cables in the back closet. Some of them go to the computers, some of them I don't know where they go. Gary set most of this up before he left. We just need someone to come look at it and tell us what's what.

— Marcus`,
    instructorNotes:
`Physical task: Walk the lab environment and identify every cable type present (Cat5e, Cat6, fiber, console/rollover). Tag or document each cable's purpose and destination. Record standards (TIA-568B), max lengths, and speeds in the Field Journal. Submit ticket with findings.`,
  },

  {
    id: "sc-net-02", courseId: "net", week: 2,
    title: "Two computers can't see each other on the network",
    requesterId: "cmw-marcus",
    mode: "broadcast", priority: "Medium",
    categories: ["Switch Configuration","Diagnostics"],
    description:
`The two computers at the estimating station. They used to share files and now they don't. Something about a network. I don't know what changed. They're both plugged into that switch on the wall.

— Marcus`,
    instructorNotes:
`Physical task: Cable two lab workstations to an unmanaged switch. Assign static IPs in the same subnet. Verify connectivity with ping. Draw physical topology in Field Journal. Record IP assignments and test results.`,
  },

  {
    id: "sc-net-03", courseId: "net", week: 3,
    title: "New switch came in — needs to be set up before Friday",
    requesterId: "pgd-tina",
    mode: "individual", priority: "Medium",
    categories: ["Switch Configuration"],
    description:
`Hi — we received the Cisco switch we ordered. It's still in the box on Dr. Reyes' desk. We need it configured and ready to go before Friday. I don't have the previous config documentation (I think Gary handled the last one). Can someone get it named, secured, and ready? Let me know if you need anything from our end.

Thanks,
Tina Park
Office Manager — Port Gardner Dental`,
    instructorNotes:
`Physical task: Connect to Cisco Catalyst via console cable. Access CLI. Set hostname, configure enable password and line passwords, save running config. Document all commands used and their purpose in Field Journal.`,
  },

  {
    id: "sc-net-04", courseId: "net", week: 4,
    title: "Need to separate shop floor from office — they're on the same network",
    requesterId: "cmw-walt",
    mode: "pairs", priority: "High",
    categories: ["VLAN/Segmentation"],
    description:
`I need the shop floor computers off the same network as the office. I don't want the guys on the floor getting into the QuickBooks machine. This should have been done already. How long will this take and what's it going to cost us.

— Walt Jensen, Cascade Millworks`,
    instructorNotes:
`Physical task: Create two VLANs on Cisco switch (VLAN 10 — Office, VLAN 20 — Shop Floor). Assign ports. Verify same-VLAN communication succeeds and cross-VLAN communication fails (pre-routing). Draw VLAN topology diagram in Field Journal.`,
  },

  {
    id: "sc-net-05", courseId: "net", week: 5,
    title: "Router needs to be configured — operatories can't reach the server",
    requesterId: "pgd-tina",
    mode: "broadcast", priority: "High",
    categories: ["Router/Routing"],
    description:
`The operatory workstations can't reach our practice management server since we moved things around last week. I think it's the router — the IT company that was here before said something about routing between subnets. I've attached a rough diagram of what we think the setup should look like. Can you take a look?

— Tina`,
    instructorNotes:
`Physical task: Configure Cisco router — assign IPs to two interfaces, enable routing between subnets, verify end-to-end connectivity from hosts on each subnet. Record routing table output (show ip route) in Field Journal.`,
  },

  {
    id: "sc-net-06", courseId: "net", week: 6,
    title: "WiFi is out in the waiting room — moved the access point yesterday",
    requesterId: "pgd-beth",
    mode: "individual", priority: "High",
    categories: ["Wireless","Diagnostics"],
    description:
`Hi! So the waiting room WiFi stopped working. I moved the access point yesterday because it was kind of in the way and the cord was ugly. I just plugged it back in the same way in the new spot. It looks like it's connected (the light is on) but nobody can get an internet connection. I didn't change any settings I don't think.

— Beth`,
    instructorNotes:
`Physical task: Diagnose wireless AP — check DHCP scope, SSID broadcast settings, and cable/VLAN tagging from the move. Identify why clients can't get an IP despite the AP showing as connected. Document each diagnostic step in Field Journal using the Ember 8-step troubleshooting method.`,
  },

  {
    id: "sc-net-07", courseId: "net", week: 7,
    title: "Need someone to check what's on the network — something seems off",
    requesterId: "pgd-tina",
    mode: "broadcast", priority: "Medium",
    categories: ["Diagnostics"],
    description:
`We've been having some intermittent slowdowns and I want to make sure there's nothing unexpected on our network. Can someone capture and analyze what traffic is actually going across it? Looking for anything that doesn't belong — unusual devices, unexpected connections, that kind of thing.

— Tina`,
    instructorNotes:
`Physical task: Use Wireshark to capture live traffic on the lab network. Identify at minimum: one ARP request/reply, one ICMP exchange, one TCP three-way handshake. Annotate each in Field Journal with packet header labels.`,
  },

  {
    id: "sc-net-08", courseId: "net", week: 8,
    title: "New workstation won't connect — built it last week and now it's just sitting there",
    requesterId: "cmw-cody",
    mode: "individual", priority: "High",
    categories: ["Cross-Course","Switch Configuration","Diagnostics"],
    linkedCourse: "hw",
    description:
`So I built this PC last week and now I'm trying to get it on the network and it won't connect. I already tried plugging it into three different ports on the switch. I also tried going into the network settings and changing some stuff but I'm not sure if I made it better or worse. The NIC shows up in Device Manager at least.

— Cody`,
    instructorNotes:
`Cross-course: The PC assembled in Hardware Lab 3 is the endpoint. Verify NIC seating and drivers, configure NIC, assign to VLAN 10, verify connectivity to router gateway. Reference Hardware lab build notes. Document IP config and ping results in Field Journal.`,
  },

  {
    id: "sc-net-09", courseId: "net", week: 9,
    title: "URGENT — Multiple systems down, network completely unresponsive",
    requesterId: "pgd-reyes",
    mode: "broadcast", priority: "Critical",
    categories: ["Diagnostics","Switch Configuration","Router/Routing"],
    description:
`NETWORK IS DOWN. OPERATORIES 1, 2 AND 3 CANNOT REACH THE SERVER. PATIENTS ARE WAITING. WE CANNOT ACCESS SCHEDULING OR PATIENT RECORDS. THIS IS A PATIENT SAFETY ISSUE. NEED SOMEONE HERE NOW.

— Dr. Reyes`,
    instructorNotes:
`Instructor introduces 3 hidden faults into the lab network before class. Students must diagnose each fault, open or update relevant tickets, and document the resolution path. Field Journal: write a brief incident report for each fault discovered. Students manage their own ticket queue during this exercise.`,
  },

  {
    id: "sc-net-10", courseId: "net", week: 10,
    title: "New office opening — need full network built from scratch",
    requesterId: "emb-rosa",
    mode: "teams", priority: "Critical",
    categories: ["Cross-Course","Router/Routing","VLAN/Segmentation","Wireless"],
    linkedCourse: "hw",
    description:
`We have a new client opening a second location and they need a complete network infrastructure before they open next month. The space is empty — no existing equipment. Scope: router, two switches, VLAN segmentation (staff/guest), wireless coverage, and four workstations networked and ready. I told them we'd have a plan by end of week. This is a relationship we can't afford to drop.

— Rosa`,
    instructorNotes:
`Capstone: Teams build complete small-office network — 1 router, 2 switches, 2 VLANs, wireless AP, 4 endpoints including hardware-built PCs. Every decision documented as a ticket. Field Journal: complete network diagram, IP addressing scheme, and lessons learned section.`,
  },


  // ══════════════════════════════════════════
  // HARDWARE ESSENTIALS (hw)
  // ══════════════════════════════════════════

  {
    id: "sc-hw-01", courseId: "hw", week: 1,
    title: "Computer is making a weird noise and I don't want to touch it",
    requesterId: "cmw-denise",
    mode: "broadcast", priority: "Low",
    categories: ["Component Failure"],
    description:
`Hi, I'm so sorry to bother you with this. There's a computer here that's been making a sort of grinding or clicking noise for a while. I didn't want to mess with it in case I made it worse. It still works, mostly. I just thought someone should probably look at it before something bad happens. No rush though, I know you're all very busy.

— Denise`,
    instructorNotes:
`Physical task: Open lab desktop cases and create a full component inventory — CPU model, RAM type and capacity, storage type and size, GPU, motherboard form factor, PSU wattage. Sketch interior of case with labels in Field Journal. The "noise" context gives realistic intake framing.`,
  },

  {
    id: "sc-hw-02", courseId: "hw", week: 2,
    title: "Computer won't start — just makes beeping sounds",
    requesterId: "cmw-marcus",
    mode: "pairs", priority: "High",
    categories: ["POST/Boot Issue"],
    description:
`The computer at the CNC station won't turn on. It just beeps a few times and then nothing. It was working fine yesterday. I don't know what the beeps mean.

— Marcus`,
    instructorNotes:
`Physical task: Identify the POST beep code pattern, diagnose the likely cause (RAM seating, GPU, CPU). Reseat or swap the faulty component and resolve. Field Journal: complete beep code reference chart and record which component caused the failure and how it was confirmed.`,
  },

  {
    id: "sc-hw-03", courseId: "hw", week: 3,
    title: "Need a new computer built — ours are falling apart",
    requesterId: "cmw-walt",
    mode: "individual", priority: "High",
    categories: ["Component Failure","POST/Boot Issue"],
    description:
`Our machines are ancient. I'm not spending money on new ones from Dell when I've got parts sitting here. I need someone to put together a working computer from the components in that box. Should take what, an hour? Make sure it actually turns on before you leave.

— Walt`,
    instructorNotes:
`Physical task: Build a PC from component box — install CPU + cooler, seat RAM in correct slots, mount motherboard, connect storage and PSU, cable management, first POST. Document each step as notes. Field Journal: step-by-step build log including any issues encountered and how they were resolved.`,
  },

  {
    id: "sc-hw-04", courseId: "hw", week: 4,
    title: "Windows is installed but half the devices show question marks",
    requesterId: "cmw-cody",
    mode: "individual", priority: "Medium",
    categories: ["OS Installation"],
    description:
`OK so I installed Windows on the computer I built but there's a bunch of yellow question marks in the Device Manager. I looked some of them up online and tried downloading a couple drivers but I'm not sure if I got the right ones. Some of them are still showing up as unknown devices. Can someone come check?

— Cody`,
    instructorNotes:
`Physical task: Install Windows 11 on the PC built in Lab 3 (or a lab machine). After installation, identify all unknown devices in Device Manager, find and install correct drivers from manufacturer sources. Field Journal: before/after Device Manager state, driver sources documented.`,
  },

  {
    id: "sc-hw-05", courseId: "hw", week: 5,
    title: "Need someone to check BIOS settings before we roll these out",
    requesterId: "emb-dean",
    mode: "broadcast", priority: "Medium",
    categories: ["BIOS/Firmware"],
    description:
`Before these machines go to the client, I want confirmation that BIOS settings are correct across all of them. Specifically: boot order, SATA mode (AHCI not IDE), virtualization enabled, Secure Boot status, and date/time accurate. Document current state for each machine and flag any that need changes. Standard pre-deployment checklist.

— Dean Okafor
Ember Service Operations`,
    instructorNotes:
`Physical task: Access BIOS/UEFI on each lab machine. Record all settings as found. Enable virtualization if not already on. Correct boot order if needed. Field Journal: record all BIOS settings found and document any changes made with rationale.`,
  },

  {
    id: "sc-hw-06", courseId: "hw", week: 6,
    title: "Laptop is just really slow and I'm running out of space",
    requesterId: "cmw-denise",
    mode: "pairs", priority: "High",
    categories: ["Laptop Repair","Component Failure"],
    description:
`Hi again, sorry to be a bother. My laptop has been really slow lately and I keep getting a message that says the disk is almost full. I cleared out some files I didn't think I needed but it didn't really help. Also it sometimes freezes when I have QuickBooks and email open at the same time. I know it's probably old. I just wondered if there was anything you could do.

— Denise`,
    instructorNotes:
`Physical task: Safely disassemble lab laptop, upgrade RAM and swap to SSD, reassemble, boot to BIOS to verify detection, boot to OS. Field Journal: disassembly diagram with screw types and locations noted. Document upgrade rationale — why RAM + SSD addresses the reported symptoms.`,
  },

  {
    id: "sc-hw-07", courseId: "hw", week: 7,
    title: "Keyboard stopped working and the monitor is doing something weird",
    requesterId: "cmw-marcus",
    mode: "individual", priority: "Medium",
    categories: ["Peripheral"],
    description:
`The keyboard at the front desk stopped working. Also the monitor on that same computer is flickering. And actually the USB thing I plug into it doesn't show up anymore either. Three things. Same computer. I don't know.

— Marcus`,
    instructorNotes:
`Physical task: Three peripherals — USB drive not detected, monitor flickering, keyboard intermittent. Diagnose each independently using Device Manager, display settings, and hardware swap testing. Open a separate note entry per peripheral in the ticket. Field Journal: troubleshooting flowchart for each peripheral.`,
  },

  {
    id: "sc-hw-08", courseId: "hw", week: 8,
    title: "New computer needs to get on the network — NIC might need drivers",
    requesterId: "cmw-cody",
    mode: "individual", priority: "High",
    categories: ["Cross-Course","OS Installation","Peripheral"],
    linkedCourse: "net",
    description:
`So I built this PC and installed Windows and it still won't connect to the network. The networking team said something about subnets and VLANs. I think the NIC might need drivers — I already tried reinstalling them but I used a random one I found online. Can someone check the NIC and then coordinate with the network side to get it connected properly?

— Cody`,
    instructorNotes:
`Cross-course: Verify NIC is properly seated, install correct manufacturer NIC drivers, configure TCP/IP settings per the Networking team's subnet and VLAN plan, confirm ping to router gateway. Field Journal: record IP config, reference Networking VLAN notes from Lab 4.`,
  },

  {
    id: "sc-hw-09", courseId: "hw", week: 9,
    title: "Three machines are down and we're losing money every minute",
    requesterId: "cmw-walt",
    mode: "broadcast", priority: "Critical",
    categories: ["Component Failure","POST/Boot Issue","Peripheral"],
    description:
`Three machines down on the shop floor. Can't run any of the CNC equipment. I don't know what's wrong with them. I need them back up today. Every hour they're down is money out of my pocket. I'll be honest — I'm not happy about this.

— Walt Jensen`,
    instructorNotes:
`Instructor introduces hidden hardware faults into 3 lab machines before class. Students triage incoming tickets, assign to team members, track resolution, and document findings. Field Journal: incident report format for each machine — problem statement, impact, root cause, resolution steps.`,
  },

  {
    id: "sc-hw-10", courseId: "hw", week: 10,
    title: "Full workstation deployment for new office — four machines, ready by Friday",
    requesterId: "emb-rosa",
    mode: "teams", priority: "Critical",
    categories: ["Cross-Course","OS Installation","Component Failure"],
    linkedCourse: "net",
    description:
`Same client as the network build. Four workstations need to go in alongside the network infrastructure — built from components, Windows installed, drivers clean, joined to the network, and verified working. These machines need to be signed off before the client takes possession. I need a deployment checklist for each one.

— Rosa`,
    instructorNotes:
`Capstone: Teams deploy 4 workstations from bare hardware — build, OS install, driver setup, network join (coordinated with NET capstone), final verification. Field Journal: completed deployment checklist signed off for each machine. Lessons learned section required.`,
  },


  // ══════════════════════════════════════════
  // CYBERSECURITY FUNDAMENTALS (cyber)
  // ══════════════════════════════════════════

  {
    id: "sc-cy-01", courseId: "cyber", week: 1,
    title: "Can you check the security on the workstations before our compliance review?",
    requesterId: "emb-priya",
    mode: "broadcast", priority: "Low",
    categories: ["Vulnerability Report"],
    description:
`Hi! We have a compliance review coming up next month and I want to make sure we're not missing anything obvious on the workstations. Things like: is Windows up to date? Is antivirus running? Are there any weird open ports? I know you're all very capable — just flag anything that looks off! Thanks so much 😊

— Priya`,
    instructorNotes:
`Physical task: Security baseline audit on assigned workstation — OS patch level, Windows Defender status, open ports via netstat. Document current security posture and any misconfigurations found. Field Journal: security baseline checklist with pass/fail for each item.`,
  },

  {
    id: "sc-cy-02", courseId: "cyber", week: 2,
    title: "Need a full map of what's on the network — something's not right",
    requesterId: "emb-dean",
    mode: "broadcast", priority: "Medium",
    categories: ["Vulnerability Report","Threat Intel"],
    description:
`I want a full scan of the lab subnet — all live hosts, open ports, and running services. Flag anything unexpected. I've seen some traffic that doesn't match what should be there. Document everything and submit as a threat intel ticket. Include your Nmap commands and full output.

— Dean`,
    instructorNotes:
`Physical task: Use Nmap to scan the lab subnet. Document all discovered hosts, open ports, and services. Flag any unexpected findings. Field Journal: Nmap output table — host, IP, open ports, services. Note anything that warrants further investigation.`,
  },

  {
    id: "sc-cy-03", courseId: "cyber", week: 3,
    title: "Password policy audit — we want to meet NIST standards",
    requesterId: "pgd-tina",
    mode: "individual", priority: "Medium",
    categories: ["Access Control","Policy Violation"],
    description:
`Hi — we're trying to get our password policies up to current standards. I've heard about NIST guidelines but I'm not sure where we stand right now. Can someone audit our current password policy settings and tell us what needs to change to be compliant? I'd like a written summary of before and after.

— Tina`,
    instructorNotes:
`Physical task: Audit local password policy on lab machine (min length, complexity, lockout thresholds). Compare against NIST SP 800-63B recommendations. Apply recommended changes. Field Journal: before/after policy settings table, summary of NIST guidelines and rationale for each change.`,
  },

  {
    id: "sc-cy-04", courseId: "cyber", week: 4,
    title: "Someone mentioned something called a WiFi Pineapple — are we at risk?",
    requesterId: "pgd-reyes",
    mode: "broadcast", priority: "High",
    categories: ["Threat Intel","Suspicious Activity"],
    description:
`A colleague mentioned they read about a device that can intercept WiFi traffic and impersonate networks. Given that we handle patient data over our wireless network, I need to understand if this is a real risk for us. What would an attacker be able to see? What can we do about it?

— Dr. Reyes`,
    instructorNotes:
`Controlled lab exercise with Hak5 WiFi Pineapple — perform passive recon scan, identify probe requests from devices, document what an attacker could observe. Field Journal: what data was visible, what the defensive implications are, and what specific mitigations would address the risk.`,
  },

  {
    id: "sc-cy-05", courseId: "cyber", week: 5,
    title: "Run a vulnerability scan on the server — I want to know what's exposed",
    requesterId: "pgd-tina",
    mode: "pairs", priority: "High",
    categories: ["Vulnerability Report"],
    description:
`I'd like a professional vulnerability assessment on our practice management server before renewal. I want to know exactly what vulnerabilities exist, how severe they are, and what we should fix first. Please submit a formal report with your findings and recommended remediation for each item.

— Tina`,
    instructorNotes:
`Physical task: Run vulnerability scan (OpenVAS, Nessus, or equivalent) against designated lab target VM. Categorize findings by severity (Critical/High/Medium/Low). Field Journal: top 5 findings with CVE numbers, severity ratings, and specific remediation steps for each.`,
  },

  {
    id: "sc-cy-06", courseId: "cyber", week: 6,
    title: "Something is wrong with one of the computers — acting very strange",
    requesterId: "pgd-tina",
    mode: "broadcast", priority: "Critical",
    categories: ["Incident Response","Suspicious Activity"],
    description:
`One of the workstations is behaving strangely — it's slow, there are processes I don't recognize running, and it seems to be sending data somewhere. I don't know if it's a virus or something worse. I've left it running because I wasn't sure if I should turn it off. Please advise immediately.

— Tina`,
    instructorNotes:
`Instructor stages a simulated malware alert on a lab machine (unusual processes, outbound connections visible in netstat). Students isolate the machine, collect evidence (process list, netstat, event logs), and write an incident response ticket. Field Journal: IR checklist — contain, collect, analyze, report. Reference PICERL framework.`,
  },

  {
    id: "sc-cy-07", courseId: "cyber", week: 7,
    title: "USB security concern — we found a drive plugged in that wasn't ours",
    requesterId: "emb-priya",
    mode: "broadcast", priority: "High",
    categories: ["Incident Response","Policy Violation","Access Control"],
    description:
`Hi — one of the techs found a USB drive plugged into a workstation that nobody knows anything about. I don't know how long it was there. We unplugged it but didn't touch anything else. I'm worried about what it might have done. Can someone assess the risk and tell us what our USB policy should look like going forward?

— Priya`,
    instructorNotes:
`Controlled lab exercise with Hak5 USB Rubber Ducky — execute a benign payload on lab machine, document what the attack accomplished and how fast it executed. Field Journal: attack timeline (from plug-in to completion), what defenses would have stopped it (USB policy, endpoint protection), recommended policy changes.`,
  },

  {
    id: "sc-cy-08", courseId: "cyber", week: 8,
    title: "Firewall audit — want to know if our rules are actually doing anything",
    requesterId: "emb-dean",
    mode: "individual", priority: "Medium",
    categories: ["Access Control","Vulnerability Report"],
    description:
`I want a full review of the Windows Firewall configuration on the lab machines before they go to the client. Looking for overly permissive rules, anything unnecessary, and any gaps. Submit your findings and proposed changes. Apply a default-deny outbound rule for the test application so I can verify you know how to do it.

— Dean`,
    instructorNotes:
`Physical task: Review Windows Firewall rules on lab machine. Identify overly permissive or unnecessary rules. Apply a default-deny outbound rule for a designated test application. Field Journal: before/after firewall rule table with justification for each change made.`,
  },

  {
    id: "sc-cy-09", courseId: "cyber", week: 9,
    title: "Security exercise — Red team active, Blue team on call",
    requesterId: "emb-rosa",
    mode: "teams", priority: "Critical",
    categories: ["Incident Response","Suspicious Activity","Threat Intel"],
    description:
`We're running a scheduled security exercise today. Red team has authorization to attempt access to lab systems using tools from this quarter. Blue team — your job is to detect, document, contain, and report. I'll be reviewing both queues. I want a full after-action report from the blue team lead by end of day.

— Rosa`,
    instructorNotes:
`Red vs Blue exercise: half class is red team (offensive), half is blue team managing the incident queue. Red team uses tools covered this quarter with instructor-defined scope. Blue team detects, documents, contains, reports. Field Journal: after-action report — what attacks succeeded, what was detected, what was missed, recommendations.`,
  },

  {
    id: "sc-cy-10", courseId: "cyber", week: 10,
    title: "Full environment hardening — client handoff next week",
    requesterId: "emb-rosa",
    mode: "teams", priority: "Critical",
    categories: ["Access Control","Vulnerability Report","Incident Response","Policy Violation"],
    description:
`The full lab environment — network and workstations both — needs to be hardened before client handoff. OS hardening, network segmentation, access controls, and monitoring all need to be in place. Every change gets a ticket. I want a complete hardening report from each team and a final security posture summary from the admin.

— Rosa`,
    instructorNotes:
`Capstone: Teams harden the complete lab environment built across all three courses. OS hardening, network segmentation, access controls, monitoring. Every change documented as a ticket. Field Journal: complete hardening checklist with evidence for each control, lessons learned across all three courses, final security posture statement.`,
  },

];
