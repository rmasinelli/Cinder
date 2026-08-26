# IT 111 Networking I scenario bank

Status: implementation companion for Issue #42 and the Fall 2026 lab blueprint.

## Scope boundary

The bank contains nine Wednesday labs plus four equivalent final-practical variants. It assesses physical networking, TCP/IP reasoning, IPv4/subnetting, Cisco console work, switch basics, router interface basics, DHCP/DNS/wireless introduction, and integrated troubleshooting. VLAN and static-route configuration remain reference material and are explicitly outside every acceptance path.

Each built-in scenario in `src/data/networkScenarioBank.js` includes:

- five readiness prompts tied to Monday preparation;
- a client-voice ticket with two or three controlled inquiries;
- all six scripted client-response purposes and response quality;
- instructor-only setup, rotation, diagnostic branches, verification, reset, and printed Service Log criteria; and
- Network Field Journal knowledge-page references.

Readiness prompts are the authored content baseline. Before publishing a check, the instructor converts each prompt into the five-question Cinder format with plausible answer choices and an explanation. Correct-answer keys must remain in the protected readiness table and must never be added to the browser-delivered scenario module.

## Sequence and operating pattern

| Lab | Scenario | Mode | Hands-on proof | Field Journal pages |
| ---: | --- | --- | --- | --- |
| 1 | Pod safety and physical identification | Team/cohort | Device, port, cable, power, and safety identification | IT Safety; Cabling; Switch vs. Router |
| 2 | Cable termination and testing | Pairs | Each student terminates/reterminates and interprets a tester result | Cabling; Connectors & Ports |
| 3 | OSI/TCP-IP fault isolation | Individual | Layered tests and restored endpoint path | OSI; TCP/IP; Troubleshooting Tools |
| 4 | IPv4 endpoint configuration | Pairs | Each student configures one endpoint and verifies the other | IP Addressing & Subnetting |
| 5 | Subnet/address-plan verification | Individual | Network, broadcast, usable range, invalid-address reasoning | IP Addressing & Subnetting |
| 6 | Switch console and basic configuration | Teams of three | Every student consoles, cables, or verifies; learned MAC and ping proof | Switch vs. Router; Cabling; Troubleshooting Tools |
| 7 | Router console and interface configuration | Pairs | Interface state/address plus gateway reachability | Router Configuration; IP Addressing |
| 8 | DHCP, DNS, and wireless fault separation | Teams | Lease, IP, name-resolution, and signal evidence | DHCP; DNS; Wireless; Troubleshooting Tools |
| 9 | Integrated pod restoration | Teams of three | Physical, switch, interface, endpoint, and ping/show evidence | All core networking pages |
| Final | Pod commission variants A-D | Teams of three, two rotations | Subnet, cables, switch identity, router interface, endpoints, connectivity, equivalent fault | All core networking pages |

## Four-pod rotation

Four identical `2 router + 2 switch` Cisco pods support four active teams of three. The other four teams begin at the preparation station with subnet calculation, ticket analysis, client inquiry, and verification planning. At the midpoint, teams exchange. A second equivalent variant is staged before the next hands-on rotation.

No student receives hands-on credit without recording an individual console or cabling action in both the linked child ticket and printed Service Log. The shared team outcome records the verified result; it does not replace individual evidence.

## Final equivalence

Variants A-D change the IPv4 block and one safe instructor-held fault card while preserving the same work. The fault mapping is deliberately absent from this public repository:

- `/27` or `/28` subnet calculation;
- pod and laptop cabling;
- basic switch identity and forwarding verification;
- one router LAN-interface address and state;
- laptop IPv4 settings;
- gateway/peer connectivity proof; and
- one physical, interface-state, or endpoint-address fault.

The variants deliberately exclude VLANs and static routes. Known-good laptops remain the fallback when a Hardware-built endpoint is unavailable.

## Instructor acceptance checklist

- Readiness check published with five prompts, plausible choices, and protected answer explanations.
- Pod/variant card prepared and photographed before students enter.
- Known-good console and patch leads separated from staged-fault items.
- Client replies reviewed for fairness; required evidence is obtainable by inquiry or test.
- Each child ticket identifies the assigned role and personal console/cabling contribution.
- One printed Service Log number is linked; Cinder does not duplicate the five detailed evidence rows.
- Connectivity and reset are observed before sign-off.
- Baseline is restored in under ten minutes before the next rotation.
