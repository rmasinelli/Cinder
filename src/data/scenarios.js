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
  // Aligned to "Complete A+ Guide to IT Hardware and Software" (10th ed,
  // Schmidt/Lee) — Mon lecture covers that week's chapter, Wed lab is
  // pure hands-on execution of it. In scope: Ch1-9 + Ch11 (per the book's
  // own "Chapters 1-9 focus on hardware" framing, plus Ch11's design/
  // troubleshooting review). Ch10 (Mobile Devices) is intentionally
  // skipped — no mobile labs this course. Week 9 (Ch9, Printers) is
  // tabled pending equipment. Built against actual shop inventory: PC
  // Parts kit (~20-23 units each of PSU/RAM/CPU+cooler/GPU/SSD/mobo, no
  // cases — open test benches instead), Fluke multimeters + PSU testers,
  // bench monitors landing Aug, and 44x Raspberry Pi 4 (bonus, below).
  // ══════════════════════════════════════════

  {
    // Ch1: Introduction to the World of IT — part identification, technician
    // habits, orientation. Mirrors the book's Ex 1.1/1.2 (Identifying Tower
    // Computer Parts / Identifying Computer Parts).
    id: "sc-hw-01", courseId: "hw", week: 1,
    title: "Big box of computer parts in the back — can someone tell us what we've got?",
    requesterId: "cmw-denise",
    mode: "broadcast", priority: "Low",
    categories: ["Component Failure"],
    description:
`Hi, sorry to bother you — there's a big box of computer parts sitting in the back that's been there for a while now. Honestly I don't know what's in it or if any of it even works. Could someone go through it and tell us what we actually have? No rush, I just don't like not knowing what's taking up the space.

— Denise`,
    instructorNotes:
`Physical task: Unbox the PC Parts kit and identify each major component category at a glance — PSU, motherboard, RAM, CPU + cooler, GPU, storage. This is recognition, not deep analysis (that's Week 3). Cover lab orientation and ESD basics, and introduce the Field Journal as the ongoing documentation habit for the quarter. Field Journal: inventory table by category with quantities, one labeled photo/sketch per component type.`,
  },

  {
    // Ch2: Connectivity — port/cable ID. Mirrors Ex 2.1-2.5 (ports, display
    // ports, USB ports, cables).
    id: "sc-hw-02", courseId: "hw", week: 2,
    title: "I already know it's the cable — just need someone to actually map it out",
    requesterId: "cmw-sam",
    mode: "broadcast", priority: "Low",
    categories: ["Peripheral"],
    description:
`I've already looked at it myself — it's got to be a cable or a port issue somewhere on this batch of bench parts, I just don't know which ones go where. Somebody who actually knows this stuff should map it all out properly before we waste time guessing on a real job.

— Sam`,
    instructorNotes:
`Physical task: Identify and label every port and connector type present on the motherboards, PSUs, and drives in the parts kit — SATA data/power, 24-pin ATX, CPU 4/8-pin, PCIe power, USB headers, front-panel headers, video outputs. Match each connector to its cable and its correct use — this is also a good moment to (gently) confirm or debunk Sam's confident guess. Field Journal: connector reference sheet with photos/sketches and what each one powers or carries.`,
  },

  {
    // Ch3: On the Motherboard — component ID/analysis. Mirrors Ex 3.1/3.2
    // (Identifying ATX Motherboard Parts / Motherboard Analysis).
    id: "sc-hw-03", courseId: "hw", week: 3,
    title: "Something's wrong with one of the boards, I think — can you check all of them?",
    requesterId: "cmw-marcus",
    mode: "pairs", priority: "Medium",
    categories: ["Component Failure"],
    description:
`One of the boards in that stack might be bad, I think. Or maybe it's fine and it's something else. Can you go through them and just tell me what's actually on each one and if anything looks off?

— Marcus`,
    instructorNotes:
`Physical task: Full motherboard analysis using the ASRock boards from inventory — identify CPU socket type, RAM slot count/channels, expansion slot types (PCIe x16/x1), chipset, form factor, rear I/O. Visually inspect every board for damage (bent pins, bulging capacitors, burn marks) before any of them go into Week 5's build. Field Journal: labeled motherboard diagram calling out every major component.`,
  },

  {
    // Ch4: Introduction to Configuration — BIOS/UEFI, system resources.
    // Mirrors Ex 4.1/4.2 (System Expansion / BIOS/UEFI Options). Uses
    // whatever bench-capable systems already exist, since this quarter's
    // builds don't happen until Week 5.
    id: "sc-hw-04", courseId: "hw", week: 4,
    title: "Need BIOS settings confirmed and documented before we go further",
    requesterId: "emb-dean",
    mode: "broadcast", priority: "Medium",
    categories: ["BIOS/Firmware"],
    description:
`Before we put any more time into these, I want BIOS/UEFI settings confirmed and documented on the bench-capable systems we've already got — boot order, SATA mode (AHCI), virtualization enabled, Secure Boot status, and system clock. Flag anything that needs changing. Standard pre-deployment checklist.

— Dean Okafor
Ember Service Operations`,
    instructorNotes:
`Physical task: Access BIOS/UEFI on available bench-capable systems (this quarter's own builds don't exist until next week — use existing stock). Record all settings found, correct as needed, note anything that would block a clean OS install later. Field Journal: settings audit table per machine, changes made with rationale.`,
  },

  {
    // Ch5: Disassembly and Power — tools, ESD, EMI, power concepts. THE
    // build chapter. Mirrors Ex 5.1-5.3 (PSU connectors, replacement
    // parts, describing computer parts).
    id: "sc-hw-05", courseId: "hw", week: 5,
    title: "Got a box of parts sitting there — put one together and get it running",
    requesterId: "cmw-walt",
    mode: "broadcast", priority: "High",
    categories: ["Component Failure","POST/Boot Issue"],
    description:
`I've got a box of parts sitting there and I am not buying pre-builts from Dell. Put one together — CPU, memory, drive, all of it — and get it running. Doesn't need to be in a case, I don't care what it looks like, I care that it turns on. If the whole class can each build their own, even better, faster.

— Walt`,
    instructorNotes:
`Physical task: Full build directly on an anti-static mat / test bench, no case. Mount CPU + cooler on the motherboard (thermal paste required, clean old paste with 99% isopropyl alcohol), seat RAM, connect PSU to motherboard/GPU/SSD, first POST on the open bench. Inventory supports one build per student. Field Journal: step-by-step build log, thermal paste method used, first-POST result.`,
  },

  {
    // Ch6: Memory — installation, prep, troubleshooting.
    id: "sc-hw-06", courseId: "hw", week: 6,
    title: "I reseated something trying to fix it and now it won't boot at all",
    requesterId: "cmw-cody",
    mode: "pairs", priority: "Medium",
    categories: ["POST/Boot Issue"],
    description:
`So one of the test bench builds was acting up and I tried reseating some stuff myself to fix it. Now it just beeps a few times and won't boot at all. I think I might have made it worse. Sorry.

— Cody`,
    instructorNotes:
`Physical task: Before class, loosen a RAM stick or swap in a mismatched module on a working bench build. Students diagnose via POST beep code, then confirm with the Power Supply Tester and a Fluke multimeter (9V batteries arriving before term start) before correcting seating/channel configuration. Field Journal: beep code reference, memory configuration diagram (slots/channels used), root cause and fix.`,
  },

  {
    // Ch7: Storage Devices — SATA/SAS/SSD, RAID. The book itself includes
    // a paper-based SATA config exercise, so RAID stays conceptual here
    // since we don't stock RAID hardware.
    id: "sc-hw-07", courseId: "hw", week: 7,
    title: "It's just running a little slow, I think the drive might be getting full",
    requesterId: "cmw-denise",
    mode: "individual", priority: "Medium",
    categories: ["Component Failure"],
    description:
`Sorry to bring this up again — one of the bench machines has been running kind of slow and I keep seeing a low disk space warning. I didn't want to assume it was anything serious. Is there something small that could be done, or is it more than that?

— Denise`,
    instructorNotes:
`Physical task: Install/swap an SSD on a bench build, confirm correct SATA data + power connection, verify detection in BIOS, benchmark or compare against the prior configuration. Discuss RAID levels and use cases conceptually (paper exercise) since we don't stock RAID hardware. Field Journal: before/after storage configuration, RAID discussion notes.`,
  },

  {
    // Ch8: Video and Multimedia Devices — displays, sound, peripherals.
    id: "sc-hw-08", courseId: "hw", week: 8,
    title: "Keyboard stopped working and the monitor is doing something weird",
    requesterId: "cmw-marcus",
    mode: "individual", priority: "Medium",
    categories: ["Peripheral"],
    description:
`The keyboard at the front desk stopped working. Also the monitor on that same computer is flickering. And actually the USB thing I plug into it doesn't show up anymore either. Three things. Same computer. I don't know.

— Marcus`,
    instructorNotes:
`Physical task: Three simultaneous peripheral faults on one test bench machine — bad keyboard, flickering/no-signal monitor (using the new bench monitors), and an undetected USB device. Diagnose each independently via Device Manager, cable/port swap, and hardware-swap testing. Field Journal: a separate troubleshooting entry per peripheral.`,
  },

  // Week 9 (Ch9: Printers/Multifunction Devices) intentionally left blank —
  // tabled pending printer equipment. Add sc-hw-09 here once confirmed.

  {
    // Ch11: Computer Design and Troubleshooting Review — specialized
    // systems, subsystem design, troubleshooting methodology. Capstone.
    id: "sc-hw-10", courseId: "hw", week: 10,
    title: "Need computers specced and built for four different roles — not all the same job",
    requesterId: "emb-rosa",
    mode: "teams", priority: "Critical",
    categories: ["Component Failure","POST/Boot Issue","BIOS/Firmware"],
    description:
`We've got four different roles that all need machines, and they are not the same job. Front desk just needs something reliable and quiet. The design contractor needs real horsepower. The warehouse station just needs to survive. I need each one spec'd, built, and signed off appropriately for what it's actually going to do — and if anything won't boot or acts up, I want that walked through properly, not just guessed at.

— Rosa`,
    instructorNotes:
`Capstone: Teams design and build 4 systems for different specialized use cases from the parts kit — e.g., basic/thin-client, performance/workstation, media-capable, budget/durable — matching component choices to role, per Ch11's specialized-systems content. Apply a real troubleshooting methodology (flowchart/logic, not guessing) to any issue encountered along the way. Field Journal: design rationale per build (why these specs for this role), full troubleshooting log for any issue hit, final verification checklist.`,
  },

  {
    // Bonus / enrichment — not tied to a chapter or a required Wednesday.
    // Uses the 44x Raspberry Pi 4 fleet, otherwise untouched by this course.
    // Assign whenever there's slack (open lab, early finishers, extra credit).
    id: "sc-hw-11", courseId: "hw", week: 11,
    title: "[Bonus] Rosa wants small quiet computers for the front desk — can someone set one up?",
    requesterId: "emb-priya",
    mode: "broadcast", priority: "Low",
    categories: ["OS Installation"],
    description:
`Hi! So this one's a little different. Rosa wants to put small quiet computers at a couple of client front desks instead of full towers — I think they're called Raspberry Pis? We have a whole box of them. Can someone get one set up and actually working so we can show her what it can do? I don't really know what "headless" means but I heard that word and got a little nervous. 😊

— Priya`,
    instructorNotes:
`Bonus/enrichment — not part of the required 10-week sequence, doesn't map to a textbook chapter. Assign as extra credit, an open-lab activity, or filler for early finishers. Physical task: flash Raspberry Pi OS to a microSD card, boot the Pi, configure headless access (SSH + a static or reserved IP) with no monitor attached. 44 units in stock — one per student is realistic. Stretch step: connect the included Crickit add-on board and confirm it's detected. Field Journal: imaging steps, headless connection method used, one command run successfully over SSH to prove access.`,
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
