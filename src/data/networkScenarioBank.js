const purposes = ["scope","timing_change","symptom_error","environment_equipment","prior_troubleshooting","impact_urgency"];

function clientResponses(overrides={}) {
  const defaults={
    scope:"Only the equipment named in this ticket is affected.",
    timing_change:"The issue was noticed during today's setup; no other change is confirmed.",
    symptom_error:"There is no additional error message beyond the symptom in the ticket.",
    environment_equipment:"Use the assigned Cisco pod and the two designated lab laptops.",
    prior_troubleshooting:"No troubleshooting was attempted before the ticket was opened.",
    impact_urgency:"This blocks the assigned lab station, but no production service is affected.",
  };
  return Object.fromEntries(purposes.map(key=>[key,{response:overrides[key]?.response||overrides[key]||defaults[key],quality:overrides[key]?.quality||"exact"}]));
}

function scenario({id,week,title,requesterId="emb-dean",mode,priority="Medium",categories,description,inquiryLimit=2,responses,readiness,instructorNotes,knowledgeRefs,variantGroup}) {
  return {id,courseId:"net",week,title,requesterId,mode,priority,categories,description,inquiryLimit,clientResponses:clientResponses(responses),readiness, instructorNotes,knowledgeRefs,variantGroup};
}

export const NETWORK_SCENARIOS=[
  scenario({
    id:"sc-net-01",week:1,mode:"teams",priority:"Low",categories:["Cable/Physical Layer","Diagnostics"],
    title:"Document the new network pods before anyone changes them",
    description:`We have four Cisco training pods, but the handoff notes do not identify what is connected, where power can be isolated, or which cables belong to each station. Inventory your assigned pod, trace the physical path from laptop to network device, and demonstrate that it is safe and ready for student use.\n\n— Dean Okafor, Ember Service Operations`,
    readiness:["Locate emergency power, exits, first aid, and the equipment isolation point.","Distinguish router, switch, console, Ethernet, and power connections.","Explain why a console cable is not an Ethernet data link.","Identify link/activity indicators without changing configuration.","State the stop-and-escalate conditions for damaged or energized equipment."],
    knowledgeRefs:["IT Safety & Operational Procedures","Cabling","Switch vs. Router"],
    instructorNotes:`SETUP: Pod at documented baseline; label devices R1/R2/S1/S2 and provide two known-good laptops. No configuration changes required.\nROTATION: Cohort discovery, then teams of three rotate lead/communication, physical identification, and evidence roles. Every student must physically trace and identify at least one connection.\nDIAGNOSTIC BRANCHES: A missing label is resolved by tracing; damaged power/network hardware is an escalation, not a repair.\nVERIFY: Student identifies every device, console path, endpoint path, power isolation point, and safety equipment.\nRESET: Return cables to labeled storage positions; power state matches baseline; chairs and floor paths clear.\nPRINTED SERVICE LOG: Pod diagram, device/port identifiers, one safety observation, one escalation boundary, instructor initials.`
  }),
  scenario({
    id:"sc-net-02",week:2,mode:"pairs",priority:"Low",categories:["Cable/Physical Layer"],
    title:"Two new patch cables fail acceptance testing",
    description:`The new desk needs two Ethernet patch cables. Before they are issued, terminate and test them, identify any wiring defect, and provide only cables that pass. Record the standard you used so the next technician can reproduce the result.\n\n— Priya Nair`,
    responses:{symptom_error:"One tester result may show an open, reversal, or split pair; the exact result depends on your assigned variant.",environment_equipment:"Use the assigned bulk cable, connectors, crimper, visual aids, and cable tester."},
    readiness:["Order the conductors for T568A and T568B.","Choose straight-through wiring for unlike Ethernet devices.","Recognize open, short, reversal, and split-pair tester results.","Explain strain relief and maximum untwist near termination.","State when a damaged connector or tool must be removed from service."],
    knowledgeRefs:["Cabling","Connectors & Ports"],
    instructorNotes:`SETUP: One known-good reference cable; materials for two student cables; assign equivalent tester-fault cards (open, reversal, split pair).\nROTATION: Each student must terminate or reterminate at least one end and personally run/interpret one tester cycle.\nDIAGNOSTIC BRANCHES: Visual order error, incomplete seating, excessive untwist, or tester-indicated fault.\nVERIFY: Wire map passes end-to-end and both students explain the observed failed result before correction.\nRESET: Scrap ends disposed; tools counted; tester leads and known-good cable returned separately.\nPRINTED SERVICE LOG: Standard used, tool/action/why/observed rows, initial and final tester results, cable identifier, instructor initials.`
  }),
  scenario({
    id:"sc-net-03",week:3,mode:"individual",categories:["Diagnostics","Cable/Physical Layer"],
    title:"A connected laptop cannot reach its neighbor",
    description:`One laptop at the training station cannot communicate with the laptop beside it. The user says the network is “down,” but no one has established where the failure begins. Diagnose from the physical layer upward, identify the smallest supported fault domain, and verify the restored path.\n\n— Marcus Hill`,
    responses:{scope:"Only one of the two assigned laptops is reported affected.",timing_change:{response:"The user remembers moving cables earlier, but is not sure which one.",quality:"ambiguous"},prior_troubleshooting:"The user unplugged and reconnected one cable without labeling it."},
    readiness:["Put Physical, Data Link, Network, and Transport checks in troubleshooting order.","Relate link light, MAC address, IP address, and ping to layers.","Choose a known-good substitution without changing multiple variables.","Distinguish local interface, neighbor, and gateway tests.","Explain why a successful ping is evidence, not a complete diagnosis."],
    knowledgeRefs:["OSI Model","TCP/IP Model","Network Management & Troubleshooting Tools"],
    instructorNotes:`SETUP: Two laptops and switch; stage one equivalent fault: bad/loose cable, disabled adapter, wrong switch port, or incorrect endpoint address.\nDIAGNOSTIC BRANCHES: No link -> physical; link/no neighbor -> interface/address; local works/remote fails -> network path. Do not reveal the layer.\nVERIFY: Student states failed layer, discriminating test, correction, and ping/link proof.\nRESET: Restore baseline cable, adapter state, port, and addressing; verify both endpoints.\nPRINTED SERVICE LOG: Initial symptom, layered hypotheses, five evidence rows, final proof, and client-facing explanation.`
  }),
  scenario({
    id:"sc-net-04",week:4,mode:"pairs",categories:["Diagnostics"],
    title:"Replacement laptops need valid addresses before check-in",
    description:`Two replacement laptops are cabled but cannot be checked in until their IPv4 settings are assigned and verified. Use the address card for your station, avoid duplicate addresses, and prove each endpoint can reach the other.\n\n— Tina Park`,
    responses:{environment_equipment:"Use the two assigned laptops and the access switch shown on the station card.",scope:"Only the two replacement laptops are in scope; do not alter Cisco device configuration."},
    readiness:["Identify IPv4 address, mask, gateway, and DNS fields.","Convert a /24 mask between prefix and dotted decimal.","Determine whether two endpoints are in the same subnet.","Recognize APIPA and duplicate-address symptoms.","Use ipconfig or ip addr plus ping to verify configuration."],
    knowledgeRefs:["IP Addressing & Subnetting","Network Management & Troubleshooting Tools"],
    instructorNotes:`SETUP: Same-LAN switch path and address cards with equivalent /24 or /26 endpoint pairs; one card per pair.\nROTATION: Each student configures one endpoint, then cross-verifies the partner's work.\nDIAGNOSTIC BRANCHES: Duplicate address, mask mismatch, wrong gateway field, or disabled interface variant.\nVERIFY: Record effective settings and bidirectional ping; explain which fields matter for same-subnet traffic.\nRESET: Return endpoints to DHCP/baseline and confirm no static values remain.\nPRINTED SERVICE LOG: Address card, before/after configuration, duplicate check, bidirectional proof, individual role.`
  }),
  scenario({
    id:"sc-net-05",week:5,mode:"individual",categories:["Diagnostics"],
    title:"Validate the address plan before the pod is configured",
    description:`The installation plan divides one IPv4 network among several training stations. Check the assigned subnet, identify the usable host range and broadcast address, flag any invalid assignments, and produce an address plan another technician can follow without guessing.\n\n— Dean Okafor`,
    responses:{scope:"Validate only the subnet card assigned to you.",symptom_error:"At least one proposed address may be the network address, broadcast address, or outside the assigned subnet."},
    readiness:["Calculate network and broadcast addresses from an IPv4 prefix.","Determine usable host range and host capacity.","Recognize network and broadcast addresses as invalid endpoint assignments.","Check whether two addresses share a subnet.","Show subnet work rather than submitting only final values."],
    knowledgeRefs:["IP Addressing & Subnetting","Network Management & Troubleshooting Tools"],
    instructorNotes:`SETUP: Equivalent cards drawn from /26, /27, and /28 networks with equal calculation load; include one invalid proposed address. Preparation rotation uses paper before any equipment.\nDIAGNOSTIC BRANCHES: Wrong boundary, invalid reserved address, insufficient hosts, or mismatched prefix.\nVERIFY: Student explains boundary increment, usable range, and why the flagged address fails. Optional endpoint proof after calculation.\nRESET: Erase temporary device values; return subnet cards by variant.\nPRINTED SERVICE LOG: Binary or boundary work, network/broadcast/host range, rejected address with reason, verification method.`
  }),
  scenario({
    id:"sc-net-06",week:6,mode:"teams",categories:["Switch Configuration","Diagnostics"],
    title:"Commission the access switch for the training station",
    description:`The replacement access switch is at factory baseline. Give it the assigned identity, secure privileged access using the lab credential card, connect the endpoints, and prove the switch learned and forwarded their traffic. Do not create VLANs.\n\n— Dean Okafor`,
    responses:{prior_troubleshooting:{response:"Someone tried a password from another pod and assumed the switch was broken.",quality:"mistaken"},environment_equipment:"Use the assigned Cisco switch, console cable, two laptops, and sealed lab credential card."},
    readiness:["Identify user EXEC, privileged EXEC, and global configuration modes.","Choose console settings and verify the active console session.","Configure hostname and enable secret without exposing credentials in notes.","Use show interfaces status and show mac address-table.","Explain why VLAN configuration is outside this lab."],
    knowledgeRefs:["Switch vs. Router","Cabling","Network Management & Troubleshooting Tools"],
    instructorNotes:`SETUP: One switch per active team, console path, two laptops, known-good patch leads, pod-specific hostname/credential card. Baseline contains no student config.\nROTATIONS: Team A configures while Team B calculates/annotates port and verification plan; swap. Every student must make a console change or cable/verify a port.\nDIAGNOSTIC BRANCHES: Wrong console port/settings, administratively down port, bad cable, or mistaken password report. No VLAN work.\nVERIFY: show running-config identity, interface status, learned MACs, and endpoint ping.\nRESET: erase startup-config/reload or execute approved baseline script; verify baseline prompt and inventory cables.\nPRINTED SERVICE LOG: Commands with purpose (no passwords), port/MAC evidence, ping proof, personal console/cabling contribution.`
  }),
  scenario({
    id:"sc-net-07",week:7,mode:"pairs",categories:["Router/Routing","Diagnostics"],
    title:"Bring the training router interface online",
    description:`A router has been assigned to a new endpoint network, but its LAN interface is not yet commissioned. Apply the approved IPv4 address, bring the interface into service, connect the laptop, and prove the laptop can reach its default gateway. Do not add routes.\n\n— Tina Park`,
    responses:{symptom_error:"The laptop reports that its configured gateway is unreachable.",timing_change:{response:"A technician says the router was reset recently, but cannot confirm what configuration remained.",quality:"ambiguous"}},
    readiness:["Distinguish router interface addressing from endpoint addressing.","Use show ip interface brief to interpret status and protocol.","Configure an IPv4 address and no shutdown on the assigned interface.","Choose a valid laptop address in the same subnet.","Explain why static routes are outside this single-interface proof."],
    knowledgeRefs:["Router Configuration","IP Addressing & Subnetting","Network Management & Troubleshooting Tools"],
    instructorNotes:`SETUP: One router, console cable, laptop, patch cable, and equivalent /27 or /28 interface card. Use one LAN interface only.\nROTATION: Each student performs part of console configuration and independently verifies addressing/cabling.\nDIAGNOSTIC BRANCHES: Administratively down, wrong mask, wrong laptop gateway, wrong physical interface, or cable fault.\nVERIFY: show ip interface brief, running interface stanza, laptop effective config, and gateway ping. No static route commands.\nRESET: remove interface address/description, shutdown to baseline, restore laptop DHCP, inventory cables.\nPRINTED SERVICE LOG: Address calculation, command purpose, before/after interface state, gateway proof, individual contribution.`
  }),
  scenario({
    id:"sc-net-08",week:8,mode:"teams",categories:["Wireless","Diagnostics"],inquiryLimit:3,
    title:"Users connect to Wi-Fi but report that names do not work",
    description:`Several users say the training wireless network is unreliable: some devices receive settings automatically, one can reach an address but not a name, and another was moved closer to the access point without improvement. Separate DHCP, DNS, and wireless evidence before recommending a fix.\n\n— Dr. Reyes`,
    responses:{scope:{response:"Three assigned clients are in scope; the wired pod baseline should not be reconfigured.",quality:"exact"},timing_change:{response:"A user says this started after 'the Wi-Fi box was moved,' but the timing is uncertain.",quality:"ambiguous"},symptom_error:"One client lacks a valid lease; a second reaches the test IP but not the test hostname.",prior_troubleshooting:{response:"A user rebooted the access point twice and moved a laptop closer.",quality:"exact"}},
    readiness:["Identify DHCP-provided address, mask, gateway, and DNS values.","Distinguish IP reachability from DNS name resolution.","Use lease inspection, ping by address, and name lookup in order.","Relate signal strength/interference to wireless symptoms.","State when infrastructure changes require escalation."],
    knowledgeRefs:["DNS","DHCP & IPv6","Wireless Networking & Security","Network Management & Troubleshooting Tools"],
    instructorNotes:`SETUP: Controlled wireless/AP station or simulation plus three client cards: invalid/missing DHCP lease, incorrect DNS, and healthy wireless reference. Do not require production AP changes.\nROTATION: Lead handles client questions; hands-on role inspects client config; evidence role runs address/name tests. Every student must inspect, cable, or run a client test and record it. Rotate next week.\nDIAGNOSTIC BRANCHES: DHCP failure vs DNS failure vs weak/interfered radio path. User actions are not proof.\nVERIFY: Lease/effective settings, IP ping, name lookup, and signal observation identify separate fault domains.\nRESET: Forget lab SSID if required, restore automatic addressing/DNS, return AP and clients to baseline.\nPRINTED SERVICE LOG: Per-client symptom matrix, ordered tests, evidence-to-layer conclusion, escalation/recommendation.`
  }),
  scenario({
    id:"sc-net-09",week:9,mode:"teams",priority:"High",categories:["Cable/Physical Layer","Switch Configuration","Router/Routing","Diagnostics"],inquiryLimit:3,
    title:"Restore the training pod after an incomplete handoff",
    description:`The previous team left the pod in an unknown state. The assigned laptops cannot reliably reach their gateway. Restore service using the approved address plan, identify the actual fault instead of rebuilding blindly, prove connectivity, and leave a clean handoff. VLANs and static routes are not authorized.\n\n— Dean Okafor`,
    responses:{scope:"One switch, one router LAN interface, and two laptops are in scope.",timing_change:{response:"The prior team says they changed 'an address and maybe a cable,' but did not record which.",quality:"ambiguous"},symptom_error:"At least one endpoint cannot reach the assigned gateway.",prior_troubleshooting:{response:"They copied commands from another pod and then power-cycled both devices.",quality:"mistaken"}},
    readiness:["Plan physical, switch, router-interface, and endpoint checks in order.","Validate subnet membership before changing configuration.","Select show commands that preserve evidence.","Use ping and effective configuration to localize failure.","Recognize VLAN/static-route requests as escalation boundaries."],
    knowledgeRefs:["Cabling","OSI Model","IP Addressing & Subnetting","Switch vs. Router","Router Configuration","Network Management & Troubleshooting Tools"],
    instructorNotes:`SETUP: Stage one equivalent fault per pod: wrong endpoint mask, shutdown router interface, wrong switch port/cable, or duplicate endpoint address. Preserve a sealed baseline/variant card.\nROTATIONS: Two teams of three per pod. Rotation A performs console/cabling while B calculates subnet and plans verification; swap using equivalent fault.\nDIAGNOSTIC BRANCHES: Students must collect state before change and localize physical, switching, router-interface, or endpoint configuration.\nVERIFY: Cable/link proof, show output, effective endpoint settings, gateway ping, peer ping where topology permits, and stated root cause.\nRESET: Execute pod baseline checklist; erase staged changes; independently verify by instructor card.\nPRINTED SERVICE LOG: Initial state, hypothesis branches, five discriminating tests, final proof, reset confirmation, individual console/cabling role.`
  }),
];

const finalVariants=[
  ["A","10.44.18.0/27","router interface administratively down"],
  ["B","10.44.22.64/27","one endpoint uses the broadcast address"],
  ["C","172.20.48.0/28","one patch lead fails wire-map testing"],
  ["D","192.168.72.128/28","one endpoint has the wrong subnet mask"],
];

export const NETWORK_FINAL_SCENARIOS=finalVariants.map(([variant,subnet,fault],index)=>scenario({
  id:`sc-net-final-${variant.toLowerCase()}`,week:10,mode:"teams",priority:"High",variantGroup:"it111-final-2026",inquiryLimit:3,
  categories:["Cable/Physical Layer","Switch Configuration","Router/Routing","Diagnostics"],
  title:`Final practical ${variant}: commission and verify the assigned pod`,
  description:`Commission the assigned Cisco pod for the address block ${subnet}. Cable the pod and laptops, calculate and assign valid IPv4 settings, configure the required switch identity and router LAN interface, then prove connectivity while diagnosing the remaining equivalent fault. Do not configure VLANs or static routes. Every technician must record individual console or cabling participation.\n\n— Ember Service Operations`,
  responses:{scope:"Use one router LAN interface, both switches as assigned by the pod card, and the designated laptops.",timing_change:{response:"The pod was returned from another training rotation; its exact last change is not documented.",quality:"ambiguous"},symptom_error:`The acceptance path fails because ${fault}. The client does not know that cause.`,environment_equipment:`Use pod ${index+1}, the assigned console leads, tested patch cables, laptops, and approved subnet card.`,prior_troubleshooting:{response:"The previous group says they rebooted equipment and tried an address from a neighboring pod.",quality:"mistaken"},impact_urgency:"The pod must pass instructor acceptance before the next rotation can begin."},
  readiness:["Calculate network, broadcast, and usable range for the assigned prefix.","Choose valid router and laptop addresses without overlap.","Plan console, cabling, and verification responsibilities for three people.","Select show commands and endpoint commands that prove state.","State reset and escalation boundaries, including no VLANs or static routes."],
  knowledgeRefs:["Cabling","IP Addressing & Subnetting","Switch vs. Router","Router Configuration","Network Management & Troubleshooting Tools"],
  instructorNotes:`SETUP: Variant ${variant}; subnet ${subnet}; sealed fault: ${fault}. Prepare one router, two switches, laptops, console leads, tested patch leads, and clean baseline configs.\nROTATIONS: Teams of three. Rotation A configures/cables while Rotation B completes subnet/ticket analysis; swap with an equivalent variant. Roles: lead/client, hands-on, evidence/documentation. Every student must console or cable and record it.\nDIAGNOSTIC BRANCHES: Physical wire-map/link, switch forwarding/MAC learning, router interface status/address, endpoint address/mask/gateway. No VLAN or static-route configuration.\nVERIFY: Subnet work, pod/laptop cabling, switch identity, router interface config, effective endpoint settings, gateway/peer connectivity, relevant show output, root-cause proof.\nRESET: Instructor observes saved evidence, then team restores approved pod baseline, automatic laptop settings, cable inventory, and clean work area.\nPRINTED SERVICE LOG: One individual log per student linked to child ticket; assigned role; personal console/cabling action; five evidence rows; shared outcome reference; connectivity proof; reset and instructor initials.`
}));

export const IT111_SCENARIO_BANK=[...NETWORK_SCENARIOS,...NETWORK_FINAL_SCENARIOS];
