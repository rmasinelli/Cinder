function scenario({id,week,title,requesterId,mode,priority="Medium",categories,description,inquiryLimit=2,readiness,knowledgeRefs}) {
  return {id,courseId:"net",week,title,requesterId,mode,priority,categories,description,inquiryLimit,readiness,knowledgeRefs};
}

export const NETWORK_SCENARIOS=[
  scenario({
    id:"sc-net-f26-01",week:1,requesterId:"emb-dean",mode:"teams",priority:"Low",categories:["Cable/Physical Layer","Diagnostics"],
    title:"Document the new network pods before anyone changes them",
    description:`We have four Cisco training pods, but the handoff notes do not identify what is connected, where power can be isolated, or which cables belong to each station. Inventory your assigned pod, trace the physical path from laptop to network device, and demonstrate that it is safe and ready for student use.\n\n— Dean Okafor, Ember Service Operations`,
    readiness:["Locate emergency power, exits, first aid, and the equipment isolation point.","Distinguish router, switch, console, Ethernet, and power connections.","Explain why a console cable is not an Ethernet data link.","Identify link/activity indicators without changing configuration.","State the stop-and-escalate conditions for damaged or energized equipment."],
    knowledgeRefs:["IT Safety & Operational Procedures","Cabling","Switch vs. Router"],
  }),
  scenario({
    id:"sc-net-f26-02",week:2,requesterId:"emb-priya",mode:"pairs",priority:"Low",categories:["Cable/Physical Layer"],
    title:"Two new patch cables fail acceptance testing",
    description:`The new desk needs two Ethernet patch cables. Before they are issued, terminate and test them, identify any wiring defect, and provide only cables that pass. Record the standard you used so the next technician can reproduce the result.\n\n— Priya Shah`,
    readiness:["Order the conductors for T568A and T568B.","Choose straight-through wiring for unlike Ethernet devices.","Recognize open, short, reversal, and split-pair tester results.","Explain strain relief and maximum untwist near termination.","State when a damaged connector or tool must be removed from service."],
    knowledgeRefs:["Cabling","Connectors & Ports"],
  }),
  scenario({
    id:"sc-net-f26-03",week:3,requesterId:"cmw-marcus",mode:"individual",categories:["Diagnostics","Cable/Physical Layer"],
    title:"A connected laptop cannot reach its neighbor",
    description:`One laptop at the training station cannot communicate with the laptop beside it. The user says the network is “down,” but no one has established where the failure begins. Diagnose from the physical layer upward, identify the smallest supported fault domain, and verify the restored path.\n\n— Marcus Tran`,
    readiness:["Put Physical, Data Link, Network, and Transport checks in troubleshooting order.","Relate link light, MAC address, IP address, and ping to layers.","Choose a known-good substitution without changing multiple variables.","Distinguish local interface, neighbor, and gateway tests.","Explain why a successful ping is evidence, not a complete diagnosis."],
    knowledgeRefs:["OSI Model","TCP/IP Model","Network Management & Troubleshooting Tools"],
  }),
  scenario({
    id:"sc-net-f26-04",week:4,requesterId:"pgd-tina",mode:"pairs",categories:["Diagnostics"],
    title:"Replacement laptops need valid addresses before check-in",
    description:`Two replacement laptops are cabled but cannot be checked in until their IPv4 settings are assigned and verified. Use the address card for your station, avoid duplicate addresses, and prove each endpoint can reach the other.\n\n— Tina Park`,
    readiness:["Identify IPv4 address, mask, gateway, and DNS fields.","Convert a /24 mask between prefix and dotted decimal.","Determine whether two endpoints are in the same subnet.","Recognize APIPA and duplicate-address symptoms.","Use ipconfig or ip addr plus ping to verify configuration."],
    knowledgeRefs:["IP Addressing & Subnetting","Network Management & Troubleshooting Tools"],
  }),
  scenario({
    id:"sc-net-f26-05",week:5,requesterId:"emb-dean",mode:"individual",categories:["Diagnostics"],
    title:"Validate the address plan before the pod is configured",
    description:`The installation plan divides one IPv4 network among several training stations. Check the assigned subnet, identify the usable host range and broadcast address, flag any invalid assignments, and produce an address plan another technician can follow without guessing.\n\n— Dean Okafor`,
    readiness:["Calculate network and broadcast addresses from an IPv4 prefix.","Determine usable host range and host capacity.","Recognize network and broadcast addresses as invalid endpoint assignments.","Check whether two addresses share a subnet.","Show subnet work rather than submitting only final values."],
    knowledgeRefs:["IP Addressing & Subnetting","Network Management & Troubleshooting Tools"],
  }),
  scenario({
    id:"sc-net-f26-06",week:6,requesterId:"emb-dean",mode:"teams",categories:["Switch Configuration","Diagnostics"],
    title:"Commission the access switch for the training station",
    description:`The replacement access switch is at factory baseline. Give it the assigned identity, secure privileged access using the lab credential card, connect the endpoints, and prove the switch learned and forwarded their traffic. Do not create VLANs.\n\n— Dean Okafor`,
    readiness:["Identify user EXEC, privileged EXEC, and global configuration modes.","Choose console settings and verify the active console session.","Configure hostname and enable secret without exposing credentials in notes.","Use show interfaces status and show mac address-table.","Explain why VLAN configuration is outside this lab."],
    knowledgeRefs:["Switch vs. Router","Cabling","Network Management & Troubleshooting Tools"],
  }),
  scenario({
    id:"sc-net-f26-07",week:7,requesterId:"pgd-tina",mode:"pairs",categories:["Router/Routing","Diagnostics"],
    title:"Bring the training router interface online",
    description:`A router has been assigned to a new endpoint network, but its LAN interface is not yet commissioned. Apply the approved IPv4 address, bring the interface into service, connect the laptop, and prove the laptop can reach its default gateway. Do not add routes.\n\n— Tina Park`,
    readiness:["Distinguish router interface addressing from endpoint addressing.","Use show ip interface brief to interpret status and protocol.","Configure an IPv4 address and no shutdown on the assigned interface.","Choose a valid laptop address in the same subnet.","Explain why static routes are outside this single-interface proof."],
    knowledgeRefs:["Router Configuration","IP Addressing & Subnetting","Network Management & Troubleshooting Tools"],
  }),
  scenario({
    id:"sc-net-f26-08",week:8,requesterId:"pgd-reyes",mode:"teams",categories:["Wireless","Diagnostics"],inquiryLimit:3,
    title:"Users connect to Wi-Fi but report that names do not work",
    description:`Several users say the training wireless network is unreliable: some devices receive settings automatically, one can reach an address but not a name, and another was moved closer to the access point without improvement. Separate DHCP, DNS, and wireless evidence before recommending a fix.\n\n— Dr. Reyes`,
    readiness:["Identify DHCP-provided address, mask, gateway, and DNS values.","Distinguish IP reachability from DNS name resolution.","Use lease inspection, ping by address, and name lookup in order.","Relate signal strength/interference to wireless symptoms.","State when infrastructure changes require escalation."],
    knowledgeRefs:["DNS","DHCP & IPv6","Wireless Networking & Security","Network Management & Troubleshooting Tools"],
  }),
  scenario({
    id:"sc-net-f26-09",week:9,requesterId:"emb-dean",mode:"teams",priority:"High",categories:["Cable/Physical Layer","Switch Configuration","Router/Routing","Diagnostics"],inquiryLimit:3,
    title:"Restore the training pod after an incomplete handoff",
    description:`The previous team left the pod in an unknown state. The assigned laptops cannot reliably reach their gateway. Restore service using the approved address plan, identify the actual fault instead of rebuilding blindly, prove connectivity, and leave a clean handoff. VLANs and static routes are not authorized.\n\n— Dean Okafor`,
    readiness:["Plan physical, switch, router-interface, and endpoint checks in order.","Validate subnet membership before changing configuration.","Select show commands that preserve evidence.","Use ping and effective configuration to localize failure.","Recognize VLAN/static-route requests as escalation boundaries."],
    knowledgeRefs:["Cabling","OSI Model","IP Addressing & Subnetting","Switch vs. Router","Router Configuration","Network Management & Troubleshooting Tools"],
  }),
];

const finalVariants=[
  ["A","10.44.18.0/27"],
  ["B","10.44.22.64/27"],
  ["C","172.20.48.0/28"],
  ["D","192.168.72.128/28"],
];

export const NETWORK_FINAL_SCENARIOS=finalVariants.map(([variant,subnet],index)=>scenario({
  id:`sc-net-f26-final-${variant.toLowerCase()}`,week:10,requesterId:"emb-dean",mode:"teams",priority:"High",inquiryLimit:3,
  categories:["Cable/Physical Layer","Switch Configuration","Router/Routing","Diagnostics"],
  title:`Final practical ${variant}: commission and verify the assigned pod`,
  description:`Commission the assigned Cisco pod for the address block ${subnet}. Cable the pod and laptops, calculate and assign valid IPv4 settings, configure the required switch identity and router LAN interface, then prove connectivity while diagnosing the remaining equivalent fault. Do not configure VLANs or static routes. Every technician must record individual console or cabling participation.\n\n— Dean Okafor, Ember Service Operations`,
  readiness:["Calculate network, broadcast, and usable range for the assigned prefix.","Choose valid router and laptop addresses without overlap.","Plan console, cabling, and verification responsibilities for three people.","Select show commands and endpoint commands that prove state.","State reset and escalation boundaries, including no VLANs or static routes."],
  knowledgeRefs:["Cabling","IP Addressing & Subnetting","Switch vs. Router","Router Configuration","Network Management & Troubleshooting Tools"],
}));

export const IT111_SCENARIO_BANK=[...NETWORK_SCENARIOS,...NETWORK_FINAL_SCENARIOS];
