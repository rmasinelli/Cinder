# IT 161 + IT 111 Combined Final Deployment Runbook

Status: instructor operating plan for Issue #44. This runbook joins the separate course finals without combining their grades or allowing a Hardware delay to block Networking.

## Non-negotiable assessment boundaries

- IT 161 remains an individual loose-parts build, explanation, diagnosis, firmware-verification, and reset assessment.
- IT 111 remains a team-of-three cabling, subnetting, Cisco configuration, connectivity, troubleshooting, and reset assessment with individual evidence.
- Students may use their printed Field Journals, manufacturer documentation, command references, approved web resources, and normal lab tools.
- FOG/Linux imaging is scored only as deployment verification. Image selection, package management, drivers, and operating-system repair are not IT 161 objectives.
- A known-good laptop replaces an unavailable student-built PC immediately. A FOG outage changes the proof path, not the student's score ceiling.
- VLANs and static routes are outside scope.

## Capacity and equipment assignments

Prepare twelve numbered ESD build stations (`H01`-`H12`), four Cisco pods (`P1`-`P4`, each with two routers and two switches), and eight known-good laptops (`L1`-`L8`). Divide 24 students into Hardware Waves A/B of twelve and Networking Teams `T1`-`T8` of three.

| Team | Pod/rotation | Preferred endpoint | Reserved fallback | Network variant |
| --- | --- | --- | --- | --- |
| T1 | P1 / A | first accepted PC from T1 | L1 | A |
| T2 | P2 / A | first accepted PC from T2 | L2 | B |
| T3 | P3 / A | first accepted PC from T3 | L3 | C |
| T4 | P4 / A | first accepted PC from T4 | L4 | D |
| T5 | P1 / B | first accepted PC from T5 | L5 | C |
| T6 | P2 / B | first accepted PC from T6 | L6 | D |
| T7 | P3 / B | first accepted PC from T7 | L7 | A |
| T8 | P4 / B | first accepted PC from T8 | L8 | B |

The instructor records each student's Hardware station, sealed variant-card identifier, Networking team, pod, endpoint asset, and fallback asset on the offline master run sheet before students arrive. Cinder assigns client communication/lead, hands-on technician, and evidence/documentation roles from the selected roster order and week rotation. After pushing, copy the displayed assignment to the run sheet; do not promise a role before Cinder assigns it. Roles remain fixed for this assessment, and every student must still perform and record at least one console or cabling action.

## Block 1: IT 161 Hardware final (130 minutes)

| Time | Wave A | Wave B | Instructor action |
| ---: | --- | --- | --- |
| 0-10 | Safety brief and sealed-ticket check | Safety brief and sealed-ticket check | Confirm books/tools permitted; identify stop-work conditions |
| 10-60 | H01-H12 individual build, checkpoint, staged fault, diagnosis | Desk room: compatibility research, ticket analysis, component explanation, reset plan | Run checkpoints in station order; stage only assigned safe variant after power removal |
| 60-70 | De-energize, evidence capture, reset | Move to assigned stations | Confirm kits/tools reconciled; restage equivalent variants |
| 70-120 | Desk room completion/handoff | H01-H12 individual build, checkpoint, staged fault, diagnosis | Repeat checkpoint route; issue known-good parts only after evidence |
| 120-130 | Final documentation/sign-off | Final documentation/sign-off | Record accepted PC asset or Networking fallback before dismissal |

### Hardware variants

Use four equivalent instructor-held variant cards in equal counts within each wave. Variant contents must never be stored in this public repository, Cinder's browser bundle, or a student card. Each begins only after the student's initial-build checkpoint. Never stage an unsafe condition or use a damaged component. A student may finish with a documented escalation and still proceed to Networking on the reserved laptop; unresolved Hardware work remains graded in IT 161 only.

### Hardware acceptance gate

Before a PC is marked `NETWORK READY`, verify ESD/safe handling, compatible assembly, student explanation, successful POST, stable CPU/RAM/storage firmware inventory, three cold starts, and asset label. Otherwise mark `LAPTOP FALLBACK` and identify the unresolved Hardware ticket; do not consume Networking time repairing it.

## Block 2: IT 111 Networking and deployment final (130 minutes)

| Time | Rotation A teams T1-T4 | Rotation B teams T5-T8 | Instructor action |
| ---: | --- | --- | --- |
| 0-15 | Ticket/client inquiry, subnet plan, role/equipment check | Ticket/client inquiry, subnet plan, role/equipment check | Release sealed variant cards after readiness confirmation |
| 15-55 | Hands-on at P1-P4 | Prep station: subnet calculation, command/evidence plan, diagram | Observe individual console/cabling actions; do not troubleshoot for teams |
| 55-65 | Evidence capture and pod reset | Move to assigned pods | Verify reset, exchange endpoint/fault cards, use laptop fallback immediately when needed |
| 65-105 | Verification station: peer-check evidence and prepare handoff | Hands-on at P1-P4 | Observe second rotation and individual contributions |
| 105-120 | Combined deployment proof | Combined deployment proof | Run FOG/PXE or equivalent outage proof; verify address and connectivity |
| 120-130 | Final reset, individual book/ticket check, sign-off | Final reset, individual book/ticket check, sign-off | Confirm pod baseline, cable/tool count, and linked child tickets |

### Required proof for every network variant

Every team must show its subnet calculation; endpoint-to-pod cabling; valid, non-overlapping IPv4 settings; switch identity and forwarding evidence; router LAN-interface address and up/up state; endpoint effective configuration; gateway and peer connectivity; one evidence-based diagnosis of the staged fault; and a clean reset. Each student records their own role, hands-on console/cabling action, evidence, conclusion, and next-technician handoff in their child ticket and printed Service Log.

### Network variant matrix

| Variant | Address block | Protected fault-card class | Equivalent acceptance |
| --- | --- | --- | --- |
| A | `10.44.18.0/27` | Instructor-held A card | Subnet, physical, switching, interface, endpoint, and connectivity proof |
| B | `10.44.22.64/27` | Instructor-held B card | Subnet, physical, switching, interface, endpoint, and connectivity proof |
| C | `172.20.48.0/28` | Instructor-held C card | Subnet, physical, switching, interface, endpoint, and connectivity proof |
| D | `192.168.72.128/28` | Instructor-held D card | Subnet, physical, switching, interface, endpoint, and connectivity proof |

Do not copy protected fault-card contents onto student cards. Rotation B uses the variant assignment table so a pod receives a different protected card/address combination after reset.

### Attendance and incomplete-team procedure

Finalize the attending roster before pushing linked tickets. If a student becomes absent after the push, open any sibling in Instructor Verification, locate the missing member under Team readiness, choose **Mark absent**, and record an auditable reason. Cinder removes only that child ticket from the shared contribution/Verification gate; the absent student's ticket remains open for make-up work and receives no inferred score. Use **Restore** if the student returns. A present student who runs out of time is not excused: record the incomplete outcome, leave their ticket open, and defer team approval until their required contribution reaches Verification.

## Combined deployment proof and fallbacks

Use this decision order; the student keeps full access to the same scoring points on every path.

1. If the accepted student PC and FOG are available, connect the PC, select the instructor-designated Linux image, establish PXE/FOG contact, and verify the deployed endpoint receives/uses the planned network settings and reaches the required target.
2. If the student PC is not `NETWORK READY`, substitute the team's reserved laptop before cabling/configuration begins. Record the Hardware ticket reference and `LAPTOP FALLBACK`; complete all Networking proof unchanged.
3. If FOG is unavailable, record `FOG OUTAGE`, prove link, PXE/DHCP discovery where observable, correct endpoint settings, and gateway/peer connectivity using the accepted PC's existing boot environment or reserved laptop. Do not troubleshoot the FOG server during the assessment.
4. If Cinder is unavailable, switch to the printed offline packet. Preserve ticket ids, times, roles, inquiries, evidence, reset, and signatures for later instructor entry.
5. If a pod fails outside the staged variant and cannot be restored within five minutes, move the team to the spare/first-reset pod or use the offline topology/configuration evidence station. Record `POD OUTAGE`; do not reduce the score ceiling.

## Individual scoring (100 points)

Hardware and Networking are scored separately at 50 points each. Each half preserves the course-wide 50/50 technical versus professional-process balance.

| IT 161 Hardware | Points |
| --- | ---: |
| Technical: safe compatible build and component explanation | 12 |
| Technical: evidence-based fault diagnosis/correction or justified escalation | 8 |
| Technical: firmware inventory and three cold starts | 5 |
| Process: client communication and concise problem statement | 7 |
| Process: ordered triage and discriminating tests | 7 |
| Process: escalation judgment and manufacturer/tool use | 5 |
| Process: individual evidence, handoff, and complete reset | 6 |
| **Hardware total** | **50** |

| IT 111 Networking | Points |
| --- | ---: |
| Technical: subnet calculation and valid address plan | 6 |
| Technical: endpoint/pod cabling and switch forwarding evidence | 5 |
| Technical: IPv4 and router/switch interface configuration | 6 |
| Technical: gateway/peer connectivity and deployment proof | 5 |
| Technical: staged-fault diagnosis and verification | 3 |
| Process: client communication and role ownership | 7 |
| Process: layered triage and evidence selection | 7 |
| Process: escalation/fallback judgment and tool use | 5 |
| Process: individual contribution, handoff, and complete reset | 6 |
| **Networking total** | **50** |

FOG imaging contributes only within the five-point connectivity/deployment row. A successful fallback proof earns the same points; image speed, Linux customization, and memorized commands earn none. Team evidence may be shared, but every score is individual and requires the student's recorded contribution.

## Instructor closeout

- Reconcile 12 parts kits, 12 ESD stations, 8 laptops, 4 pods, console leads, tested patch leads, tools, and sealed variant cards.
- Confirm every Hardware ticket is marked `NETWORK READY` or `LAPTOP FALLBACK` and every Networking child ticket records endpoint/pod/role.
- Confirm each pod is at the approved baseline and each endpoint is restored to its baseline addressing/boot state.
- Collect printed books only after signatures and ticket/log numbers agree.
- Enter offline records into Cinder without rewriting student evidence; attach the original paper packet according to the course records process.
