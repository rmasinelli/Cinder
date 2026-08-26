function scenario({id,week,title,requesterId,mode,priority="Medium",categories,description,inquiryLimit=2,readiness,knowledgeRefs}){
  return {id,courseId:"hw",week,title,requesterId,mode,priority,categories,description,inquiryLimit,readiness,knowledgeRefs};
}

export const HARDWARE_ADVANCED_SCENARIOS=[
  scenario({
    id:"sc-hw-f26-05",week:5,requesterId:"cmw-cody",mode:"pairs",priority:"High",categories:["Component Failure","POST/Boot Issue"],
    title:"The bench computer shows no sign of power",
    description:`The open-bench computer was working earlier, but now nothing happens when I try to start it—no fan, no light, no beep. I checked that the power strip looked on, but I may have moved a connector while cleaning around it. Please find where power stops and verify the computer starts safely.\n\n— Cody Briggs`,
    readiness:["Trace facility power, PSU input, standby power, control signal, and motherboard power in a safe order.","Identify 24-pin ATX and CPU 4/8-pin power connectors without confusing them with PCIe power.","State when a PSU tester or instructor-approved external measurement is appropriate.","Explain why a power supply must never be opened.","Choose one-variable-at-a-time substitution and a final POST verification."],
    knowledgeRefs:["Power Supplies & ESD Safety","Connectors & Ports","POST & Boot Process"],
  }),
  scenario({
    id:"sc-hw-f26-06",week:6,requesterId:"cmw-cody",mode:"pairs",categories:["POST/Boot Issue","Component Failure"],
    title:"The computer powers on but will not complete POST",
    description:`The fans start now, but the computer will not reach the firmware screen. It may beep or restart, and I did reseat memory yesterday because I thought that would help. Please identify what the POST evidence means instead of swapping everything.\n\n— Cody Briggs`,
    readiness:["Separate power-on, POST, firmware entry, and operating-system boot stages.","Use board documentation to interpret diagnostic LEDs or beep patterns.","Identify correct single-module and dual-channel memory placement.","Apply minimal-configuration and known-good-module tests without changing several variables.","Verify installed memory in firmware after restoring POST."],
    knowledgeRefs:["POST & Boot Process","RAM & Storage Devices","Motherboard & Expansion"],
  }),
  scenario({
    id:"sc-hw-f26-07",week:7,requesterId:"cmw-denise",mode:"individual",categories:["Component Failure","BIOS/Firmware"],
    title:"The replacement storage device is not detected",
    description:`We installed a replacement storage device in the bench computer, but it does not appear where we expected. Please check compatibility, installation, power, and firmware detection. We only need the hardware verified—do not install or repair an operating system.\n\n— Denise Kowalski`,
    readiness:["Distinguish SATA data, SATA power, and M.2 form-factor/key requirements.","Verify device/motherboard compatibility using manufacturer documentation.","Inspect firmware detection without entering operating-system repair.","Use known-good cable, port, and device substitutions one variable at a time.","State how to verify and reset a storage installation safely."],
    knowledgeRefs:["RAM & Storage Devices","Connectors & Ports","BIOS/UEFI Configuration"],
  }),
  scenario({
    id:"sc-hw-f26-08",week:8,requesterId:"cmw-marcus",mode:"pairs",categories:["Peripheral","Component Failure"],inquiryLimit:3,
    title:"The monitor has no image and the desk accessories are unreliable",
    description:`The computer seems to start, but the monitor says there is no signal. The keyboard or mouse also cuts out sometimes, and the bench has collected a lot of dust. Please separate the faults, restore reliable hardware operation, and complete appropriate preventive maintenance.\n\n— Marcus Tran`,
    readiness:["Distinguish system no-POST from POST-with-no-display using observable evidence.","Trace monitor power, input selection, cable, output port, and GPU/onboard path.","Use known-good peripherals and ports without assuming simultaneous symptoms share one cause.","Apply safe compressed-air, fan restraint, and ESD practices during maintenance.","Verify display, input devices, ports, fans, and clean reset state."],
    knowledgeRefs:["Peripherals & I/O Troubleshooting","Video Cards & Displays","IT Safety & Operational Procedures"],
  }),
  scenario({
    id:"sc-hw-f26-09",week:9,requesterId:"cmw-sam",mode:"individual",priority:"High",categories:["Component Failure","POST/Boot Issue","BIOS/Firmware","Peripheral"],inquiryLimit:3,
    title:"The replacement motherboard must be bad—it behaves differently every time",
    description:`This bench computer is inconsistent: sometimes it appears dead, sometimes the fans run with no display, and once the storage device disappeared. I think the replacement motherboard is defective. Confirm the actual fault with evidence, research the manufacturer guidance, restore a verified hardware state, and tell me when replacement or escalation is justified.\n\n— Sam Whitefeather`,
    readiness:["Preserve initial state and rank hypotheses before changing components.","Use power, POST, display, firmware, and storage checkpoints to localize an intermittent report.","Research manufacturer compatibility and known issues with exact model identifiers.","Choose discriminating known-good tests and recognize escalation boundaries.","Define repeatable verification stronger than one successful start."],
    knowledgeRefs:["Power Supplies & ESD Safety","POST & Boot Process","Motherboard & Expansion","RAM & Storage Devices","Video Cards & Displays"],
  }),
];

const finalVariants=["A","B","C","D"];

export const HARDWARE_FINAL_SCENARIOS=finalVariants.map((variant)=>scenario({
  id:`sc-hw-f26-final-${variant.toLowerCase()}`,week:10,requesterId:"emb-dean",mode:"individual",priority:"High",inquiryLimit:3,
  categories:["Component Failure","POST/Boot Issue","BIOS/Firmware"],
  title:`Final practical ${variant}: build, explain, diagnose, and verify the workstation`,
  description:`Build the assigned open-bench workstation from loose compatible parts. Explain the function and compatibility of each major component, complete the instructor's initial-build checkpoint, diagnose the remaining safe hardware fault, verify firmware detects the required hardware, and reset the station. Manufacturer documentation and your printed Field Journal are allowed.\n\n— Dean Okafor, Ember Service Operations`,
  readiness:["Sequence a safe open-bench build from inspection through first POST.","Explain motherboard, CPU/cooling, RAM, PSU, storage, and display compatibility checks.","Identify minimum POST configuration and safe power-off/reseating practice.","Plan evidence-preserving diagnosis using POST and firmware inventory.","Define final verification, reset, and escalation requirements."],
  knowledgeRefs:["IT Safety & Operational Procedures","Motherboard & Expansion","Power Supplies & ESD Safety","POST & Boot Process","RAM & Storage Devices","BIOS/UEFI Configuration"],
}));

export const IT161_ADVANCED_BANK=[...HARDWARE_ADVANCED_SCENARIOS,...HARDWARE_FINAL_SCENARIOS];
