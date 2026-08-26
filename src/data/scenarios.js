import { IT111_SCENARIO_BANK } from "./networkScenarioBank.js";
import { IT161_ADVANCED_BANK } from "./hardwareAdvancedBank.js";

// ─────────────────────────────────────────────
// scenarios.js
// Built-in scenario banks for Networking, Hardware, and Security.
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
// Instructor-only setup, fault, and answer material is stored in Supabase's
// private schema and is never imported into this browser module.
// ─────────────────────────────────────────────

const LEGACY_SCENARIOS = [

  // ══════════════════════════════════════════
  // NETWORKING FUNDAMENTALS (net)
  // Aligned to "Networking Essentials: A CompTIA Network+ (N10-008)"
  // 6th ed. (Beasley/Nilkaew) — same Mon lecture / Wed lab structure as
  // Hardware. Each week adapts one of the department's own real Cisco
  // lab documents (Labs 1-14, some dated 2011-2017) to Cinder's ticket
  // format, using actual shop inventory: 7x Cisco 1941 + 2x Cisco 2800 +
  // 6x Cisco 2811 routers, 7x Catalyst 2960 + 8x Catalyst 3560 switches,
  // 5x Netgear FS105 unmanaged switches, TP-Link/Linksys wireless gear,
  // and a strong cable-termination/testing kit (crimpers, punchdown
  // tools, Fluke LinkRunner/IntelliTone/EtherScope/CableIQ).
  // Dynamic routing protocols (RIP, OSPF, EIGRP) are intentionally out —
  // static routing only, per instructor call to keep Ch9 to one week.
  // Ch3 (Fiber), Ch5 (Interconnecting LANs), Ch10 (Managing Infra),
  // Ch12 (Cloud), Ch13 (Codes/Standards) have no lab — lecture only,
  // same "tabled" treatment as Printers in Hardware.
  // ══════════════════════════════════════════

  {
    // Ch1: Intro to Computer Networks — adapts Lab 1 (Office LAN / Ping
    // Exercise). Host PCs are the general-use laptop fleet, since this
    // quarter's Hardware-built PCs don't exist until Hardware Week 5.
    id: "sc-net-01", courseId: "net", week: 1,
    title: "Wires everywhere in the back closet — can someone sort this out and get it working?",
    requesterId: "cmw-marcus",
    mode: "broadcast", priority: "Low",
    categories: ["Cable/Physical Layer","Diagnostics"],
    description:
`There's a bunch of cables in the back closet. Some of them go to the computers, some of them I don't know where they go. Gary set most of this up before he left. Can someone actually wire it up properly and make sure the computers can talk to each other? Whatever "talk to each other" means.

— Marcus`,
  },

  {
    // Ch2: Physical Layer Cabling: Twisted-Pair — adapts Lab 2 (UTP).
    id: "sc-net-02", courseId: "net", week: 2,
    title: "Need a few cables made for a new setup — not sure what kind we actually need",
    requesterId: "emb-priya",
    mode: "broadcast", priority: "Low",
    categories: ["Cable/Physical Layer"],
    description:
`Hi! We need a couple of network cables made for a new setup — just regular ones, but I think someone mentioned we might also need a "crossover" one? I honestly don't know the difference. Can whoever makes them also double check they actually work before handing them over? Thank you! 😊

— Priya`,
  },

  {
    // Ch4: Wireless Networking — adapts Lab 3 (site survey). Teams mode
    // matches the original lab's "each group" instruction.
    id: "sc-net-03", courseId: "net", week: 3,
    title: "Need a proper wireless site survey before we recommend anything to a client",
    requesterId: "emb-dean",
    mode: "teams", priority: "Medium",
    categories: ["Wireless"],
    description:
`We're evaluating wireless coverage for a space before recommending an access point layout to a client. I need an actual site survey — signal readings across the floor plan, a recommended AP placement, and a rough equipment list with cost. Standard documentation on this one, please.

— Dean Okafor
Ember Service Operations`,
  },

  {
    // Ch6: TCP/IP — adapts Lab 4 / 4a (subnetting). Paper exercise, no
    // equipment required.
    id: "sc-net-04", courseId: "net", week: 4,
    title: "Need our addressing plan checked before we touch any equipment",
    requesterId: "pgd-tina",
    mode: "broadcast", priority: "Low",
    categories: ["Diagnostics"],
    description:
`We're planning some network changes and I want our addressing worked out properly before anyone touches a cable. Can you go through the addressing scheme we sketched out and confirm the subnets, network addresses, and broadcast addresses are actually right?

— Tina`,
  },

  {
    // Ch6: TCP/IP — adapts Lab 14 (IPv6 addressing).
    id: "sc-net-05", courseId: "net", week: 5,
    title: "Let's get ahead of IPv6 before it's forced on us",
    requesterId: "emb-dean",
    mode: "individual", priority: "Medium",
    categories: ["Router/Routing"],
    description:
`I want to get ahead of IPv6 rather than scramble later. Configure IPv6 addressing on one of the lab routers and confirm it's actually working — I want to see the full, unabbreviated address recorded, not just the shorthand, along with the commands you used to verify it.

— Dean Okafor
Ember Service Operations`,
  },

  {
    // Ch7: Introduction to Router Configuration — adapts Lab 5 (basic
    // router CLI).
    id: "sc-net-06", courseId: "net", week: 6,
    title: "New router came in — needs to be set up before Friday",
    requesterId: "pgd-tina",
    mode: "individual", priority: "Medium",
    categories: ["Router/Routing"],
    description:
`Hi — we received the router we ordered. It's still sitting in the box. We need it configured and ready to go before Friday. I don't have any previous config documentation for it. Can someone get it named, secured, and ready? Let me know if you need anything from our end.

Thanks,
Tina Park`,
  },

  {
    // Ch9: Routing Protocols (static routing only — RIP/OSPF/EIGRP
    // dropped from scope) — adapts Lab 7 (static routes).
    id: "sc-net-07", courseId: "net", week: 7,
    title: "Shop floor network and office network still can't talk to each other",
    requesterId: "cmw-walt",
    mode: "pairs", priority: "High",
    categories: ["Router/Routing"],
    description:
`The shop floor network and the office network still can't talk to each other and I need them to. I don't care how — figure out whatever routing needs to happen and prove it actually works.

— Walt Jensen, Cascade Millworks`,
  },

  {
    // Ch8: Introduction to Switch Configuration — adapts Lab 6 (basic
    // switch CLI).
    id: "sc-net-08", courseId: "net", week: 8,
    title: "There's a new switch in a box back there — can you get it doing something?",
    requesterId: "cmw-marcus",
    mode: "individual", priority: "Medium",
    categories: ["Switch Configuration"],
    description:
`There's a new switch in a box back there. I don't know what to do with it. Can you get it set up so it actually does something?

— Marcus`,
  },

  {
    // Ch8: Introduction to Switch Configuration — adapts Lab 10 (static
    // VLANs, with router sub-interfaces for controlled inter-VLAN
    // routing per the original lab).
    id: "sc-net-09", courseId: "net", week: 9,
    title: "Need to separate shop floor from office — they're on the same network",
    requesterId: "cmw-walt",
    mode: "pairs", priority: "High",
    categories: ["VLAN/Segmentation"],
    description:
`I need the shop floor computers off the same network as the office. I don't want the guys on the floor getting into the QuickBooks machine. This should have been done already. How long will this take and what's it going to cost us.

— Walt Jensen, Cascade Millworks`,
  },

  {
    // Ch11: Network Security — adapts Lab 11 (Windows/macOS host
    // firewall rules).
    id: "sc-net-10", courseId: "net", week: 10,
    title: "Need proper firewall rules before our compliance review — not just \"it's on\"",
    requesterId: "pgd-reyes",
    mode: "individual", priority: "Medium",
    categories: ["Diagnostics"],
    description:
`WE HAVE A COMPLIANCE REVIEW COMING UP AND I NEED TO KNOW OUR WORKSTATIONS AREN'T WIDE OPEN. Someone needs to set up proper firewall rules — I want to know exactly what's allowed in and out, not just told "the firewall is on."

— Dr. Reyes`,
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
  },

];

export const SCENARIOS = [
  ...IT111_SCENARIO_BANK,
  ...IT161_ADVANCED_BANK,
  ...LEGACY_SCENARIOS.filter(scenario=>scenario.courseId!=="net"&&!(scenario.courseId==="hw"&&scenario.week>=5&&scenario.week<=10)),
];
