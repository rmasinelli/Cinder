# Fall 2026 IT 161 and IT 111 lab blueprint

Status: design baseline for the September 21-December 4 instructional period and finals.

This blueprint treats IT 161 Hardware and IT 111 Networking I as separate courses operating inside one simulated IT service organization. Most students belong to the same cohort and take both courses, but neither course requires enrollment in the other.

## Course operating model

- Monday instruction is asynchronous. Students complete lecture notes and a five-question readiness check before hands-on work.
- Wednesday is the required lab day.
- IT 161 Hardware runs from 5:00-7:10 p.m.
- IT 111 Networking I runs from 7:20-9:30 p.m.
- Students may take breaks as needed and may leave after completing the required work, equipment reset, and instructor sign-off.
- Students who finish may remain and use approved lab equipment.
- The instructor plans additional supervised access on Tuesdays and Thursdays for unfinished work; exact hours remain an operating decision.
- November 11 and November 25 have no normal lab. This leaves nine instructional Wednesday labs plus finals.

## End-state outcomes

### IT 161 Hardware

Given an unfamiliar malfunctioning computer, a student can safely begin a basic diagnosis, develop and test plausible hypotheses, research manufacturer documentation and known issues, recognize an escalation boundary, verify the resulting state, and communicate the result. By the final, the student can assemble a functional PC from loose parts and explain how the components interact.

The course does not assess operating-system installation, drivers, or routine update management.

### IT 111 Networking I

A student can identify and explain the TCP/IP stack, calculate IPv4 subnets, build and test cables, access Cisco routers and switches through the console, perform basic device and interface configuration, connect endpoints, assign addresses, and prove or troubleshoot connectivity. DHCP, DNS, and wireless are introduced. VLANs and static routing are outside this course's assessed scope.

### Shared priority order

1. Client communication
2. Sound triage
3. Appropriate escalation
4. Accurate documentation
5. Correct resolution

A wrong conclusion can still earn substantial credit when the student communicates well and follows a safe, evidence-based process. Correct answers without an explainable process do not demonstrate readiness.

## Printed lab books and Cinder

The printed Hardware and Network Field Journals remain mandatory and serve as the detailed evidence record. Each book already provides:

- the shared eight-step Ember troubleshooting method;
- a ticket-linked Service Log;
- five rows for `Tool/Action`, `Why`, and `Observed` evidence;
- resolution and knowledge-base connections; and
- lecture notes, field reflection, and updated reflection pages.

Cinder should not duplicate those handwritten troubleshooting details. Cinder owns:

- readiness checks and preparation-station routing;
- individual or team ticket assignment;
- client inquiries and scripted replies;
- student role and individual contribution;
- workflow state, escalation, verification, and sign-off;
- the reference linking the ticket to the printed Service Log; and
- instructor review history.

Every student completes an individual book entry, including during paired or team work.

## Standard Wednesday workflow

The two courses use the same service-desk rhythm.

| Hardware | Networking | Activity |
| --- | --- | --- |
| 5:00-5:10 | 7:20-7:30 | Check in and complete readiness check |
| 5:10-5:20 | 7:30-7:40 | Receive ticket and role; read client report; write any clarifying question |
| 5:20-6:35 | 7:40-8:55 | Form hypotheses, perform hands-on tests, research, communicate, and escalate when appropriate |
| 6:35-7:00 | 8:55-9:20 | Verify the outcome, reset equipment, and obtain instructor sign-off |
| 7:00-7:10 | 9:20-9:30 | Completion buffer or optional continued work |

The full ticket flow is:

1. Check in and receive a role and ticket.
2. Read the client report.
3. Decide whether a clarifying question is needed.
4. Form plausible hypotheses.
5. Perform discriminating hands-on tests.
6. Escalate when access, safety, time, or skill boundaries are reached.
7. Verify full functionality or document the verified remaining condition.
8. Restore the bench or pod to its documented baseline.
9. Obtain instructor sign-off.
10. Complete the reflection before the following Monday lesson.

## Readiness checks and preparation station

- Each lab has five readiness questions drawn from the asynchronous lesson and required preparation exercise.
- The passing threshold is 80%.
- Students may retry after reviewing explanations.
- A failed attempt sends the student to a preparation station; it does not block a prepared partner or team.
- The hands-on ticket becomes available to that student after the threshold is met.
- The first session includes a cohort safety-equipment discovery lab and a durable safety acknowledgment. That acknowledgment is not repeated weekly.
- Preparation work may include component identification for Hardware and addressing/subnetting exercises for Networking.

The readiness check should protect scarce lab time, not become a high-stakes quiz. Its result is completion evidence rather than a major grade.

## Client inquiry model

Client interaction should be automated so the instructor can circulate among physical stations.

1. The student first writes a professional clarifying question in free text.
2. Only after writing the question does the student classify its purpose:
   - scope or affected users;
   - timing or recent change;
   - exact symptom or error;
   - environment or equipment;
   - previous troubleshooting; or
   - business impact or urgency.
3. Cinder returns the ticket author's controlled response for that category.
4. The question, selected purpose, and response remain in ticket history.

Limits are ticket-specific: normally two inquiries, with three available for complex later incidents. A ticket may require no inquiry; students are graded on recognizing when a question is useful.

Labs 1-2 use direct, accurate clients. Later tickets progressively introduce incomplete recall, irrelevant details, mistaken assumptions, or actions that changed the system. Scripted ambiguity must remain fair: required evidence is always obtainable through a reasonable question or hands-on test.

## Individual, paired, and team work

The target mix is approximately 40% individual, 30% paired, and 30% team work.

For team incidents, Cinder uses:

- one parent incident carrying the shared client report and team color;
- one linked child ticket per student;
- a required individual role and contribution on every child ticket; and
- one shared technical outcome with individual evidence and reflection.

Core roles for teams of three:

1. Client communication and lead technician
2. Hands-on technician
3. Evidence and documentation technician

For groups larger than three, add an equipment manager/safety observer and then a verification technician. Roles remain stable during a lab and rotate the following week. Instructor sign-off is unavailable until each student records their role and contribution.

## Research and AI policy

Manufacturer documentation, technical references, search engines, and AI tools are allowed because technicians use external resources in practice.

Students must record:

- the source or tool;
- the question, query, or search terms;
- the relevant recommendation; and
- how the recommendation was accepted, rejected, or verified.

AI output is a hypothesis, not evidence. Advice must be verified using authoritative documentation, an observable test, or the equipment itself. Copying an answer without verification earns no triage credit. Students may not submit credentials, class codes, personal information, or client data to public AI tools.

## Assessment model

### Lab-book grade

- 60%: all nine lab entries substantially complete
- 30%: quality of three randomly sampled entries
- 10%: midterm/final organization, legibility, and required sections

One entry is randomly selected from each three-lab block after the block is complete. Students do not know the selection in advance. When feedback is returned, the selected lab, rubric score, and comments are identified. The instructor may inspect any additional entry when a sampled entry suggests a gap or inconsistency.

Each fully evaluated sample is split evenly:

- 50% technical evidence: accurate observations, appropriate tests, component or configuration work, and final verification
- 50% professional process: communication, triage reasoning, escalation, documentation, and handoff

Books are collected after Lab 5 for the midterm review and returned at the next class session. They are collected again for the final review.

### Immediate instructor sign-off

Before leaving, the student or team must demonstrate:

- safe equipment handling;
- reasonable hypotheses and tests;
- a working or accurately verified final state;
- correct bench or pod reset; and
- an individual role and contribution record.

For Labs 1-2, the instructor also checks client communication before work proceeds. Later communication is evaluated from the ticket and sampled book entry.

Detailed written accuracy can be reviewed after class; sign-off confirms the physical state and observable process, not the final book grade.

### At-home reflection

Every lab concludes with three prompts due before the next Monday lesson:

1. What evidence changed my thinking?
2. What would I do differently next time?
3. What should the next technician know?

## Nine-lab sequence

Each week introduces a new subject while later tickets deliberately reuse earlier skills with less guidance.

| Lab | Date | IT 161 Hardware | IT 111 Networking I | Work mode and progression |
| ---: | --- | --- | --- | --- |
| 1 | Sep 23 | Safety-equipment discovery, ESD, visual inspection, parts handling | Safety, pod orientation, physical network and device identification | Cohort/team orientation; exact client information; instructor communication check |
| 2 | Sep 30 | Component identification, compatibility, manufacturer research and known issues | Cabling, connector selection, construction/inspection, and cable testing | Individual/pairs; exact client information; instructor communication check |
| 3 | Oct 7 | Motherboard, expansion, firmware/BIOS, and baseline POST | OSI/TCP-IP models applied to a simple physical/connectivity fault | Individual sampled block closes; first ambiguity appears |
| 4 | Oct 14 | PC assembly from loose parts on safety mats | IPv4 addressing and endpoint configuration | Pairs; role rotation; build/configuration evidence emphasized |
| 5 | Oct 21 | Power delivery and no-power triage | Subnetting fundamentals and address-plan verification | Individual/pairs; midterm book collection after lab |
| 6 | Oct 28 | POST and RAM triage using safe staged faults | Cisco switch console access and basic configuration | Teams of three; second sampled block closes; client may report a mistaken assumption |
| 7 | Nov 4 | Storage installation and diagnosis; reinforce compatibility and power | Cisco router console access and interface configuration | Individual/pairs; less procedural guidance |
| - | Nov 11 | No normal lab | No normal lab | - |
| 8 | Nov 18 | Peripheral/display faults and preventive maintenance | DHCP and DNS introduction plus wireless fundamentals | Teams; client may have performed unhelpful troubleshooting |
| - | Nov 25 | No normal lab | No normal lab | - |
| 9 | Dec 2 | Ambiguous integrated hardware incident using prior skills | Integrated cabling, addressing, subnetting, device configuration, and diagnostic commands | Individual/team capstone; third sampled block closes |

The manuals' existing knowledge-base pages support this sequence. Hardware maps especially to IT Safety & Operational Procedures, Motherboard & Expansion, BIOS/UEFI Configuration, Power Supplies & ESD Safety, POST & Boot Process, RAM & Storage Devices, Peripherals & I/O Troubleshooting, Connectors & Ports, and Video Cards & Displays. Networking maps especially to Cabling, OSI Model, IP Addressing & Subnetting, Switch vs. Router, Router Configuration, DNS, DHCP & IPv6, Wireless Networking & Security, and Network Management & Troubleshooting Tools. VLAN and static-routing pages remain reference material rather than assessed outcomes.

## Equipment and rotation model

### Hardware

- Enrollment ceiling: 24 students
- Three dedicated workbenches
- Twelve complete caseless desktop parts sets
- Safety mats allow temporary build stations beyond the three dedicated benches
- One student per parts set is possible in two waves; paired and team work can run concurrently with research, client communication, and documentation tasks

All stations must follow Issue #17's baseline inventory, known-good/staged-fault separation, and under-ten-minute reset standard before scenario design depends on them.

### Networking

- Four all-Cisco pods
- Each pod contains two routers and two switches
- Active configuration teams contain three students
- With 24 students, each pod supports two rotating teams

While Rotation A cables and configures, Rotation B completes subnet calculation, ticket analysis, client inquiry, and verification planning. The rotations then exchange. No student receives hands-on credit without console or cabling participation recorded in their individual ticket and book.

## Finals

Students may use their printed books, manufacturer documentation, command references, approved web resources, and tools. The final measures application and verification, not memorization. Equivalent variants prevent direct copying while maintaining comparable difficulty.

### Hardware practical

- Individual assessment in two waves or an equivalent rotating schedule
- Build a functional PC from loose parts
- Explain component compatibility and interactions
- Research relevant manufacturer information
- Diagnose an individually assigned safe fault
- Verify firmware detection and readiness for deployment
- Reset and document the station

### Networking practical

- Teams of three at the four Cisco pods, using two rotations
- Interpret or calculate the assigned subnet
- Cable the pod and laptops
- Console into switches and routers
- Assign IPv4 addresses and configure required interfaces
- Prove connectivity and use diagnostic commands to isolate an equivalent variant fault
- Reset and document the pod

### Combined incident

The Hardware-built workstation becomes the Networking endpoint when it is ready. The student or team network-boots through the FOG server, selects the instructor-designated Linux image, connects the workstation to the assigned subnet, and proves connectivity. Imaging is a verification/deployment step, not an IT 161 operating-system-installation objective.

Known-good laptops are the required fallback so a hardware delay does not invalidate the Networking assessment.

## Cinder acceptance flow

A complete classroom path should support:

`Monday content -> readiness check -> prepared or prep station -> individual/team ticket -> client inquiry -> triage -> hands-on evidence in print -> escalation when needed -> verification -> equipment reset -> individual contribution -> instructor sign-off -> at-home reflection`

The system must keep Hardware and Networking visibly separate while preserving one student identity and cohort membership across both courses.

## Implementation dependencies

1. Complete the physical hardware audit in Issue #17.
2. Build and validate the POST/RAM pilot in Issue #18.
3. Rework the first four Hardware scenarios in Issue #19.
4. Add readiness checks and preparation-station routing in Issue #40.
5. Add controlled client inquiries and scripted responses in Issue #38.
6. Add linked team incidents, team colors, roles, and individual-contribution gates in Issue #41.
7. Add post-lab reflection tracking in Issue #39 after the critical hands-on path is stable.
8. Complete IT 161 Labs 5-9 and final variants in Issue #43.
9. Author the IT 111 nine-lab and final scenario bank in Issue #42.
10. Build the combined final deployment incident and rotation runbook in Issue #44.
11. Run the multi-student pilot in Issue #20.
12. Complete launch documentation and fallback planning in Issue #21.

## Deferred decisions

- Exact Tuesday/Thursday supervised access hours
- Final exam dates and rotation timetable
- Exact scripted client response bank for each scenario
- Exact randomization method for the three graded book samples
- Final equipment assignments and safe staged-fault inventory
