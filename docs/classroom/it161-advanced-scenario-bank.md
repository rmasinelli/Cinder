# IT 161 Hardware Labs 5-9 and final bank

Status: implementation companion for Issue #43 and the Fall 2026 lab blueprint.

## Course boundary

The advanced bank extends the earlier safety, component, assembly, and firmware work without duplicating it. It assesses hardware triage and firmware verification—not operating-system installation, driver management, or software repair.

Every browser-visible scenario in `src/data/hardwareAdvancedBank.js` includes five readiness prompts and canonical printed Field Journal references. Controlled client replies, staged variants, and instructor setup notes live only in `private.builtin_scenario_secrets`; the browser retrieves instructor notes only through the admin-only RPC. Client reports are incomplete but fair: the root cause is obtainable from a useful inquiry, physical inspection, manufacturer research, or a safe hands-on test.

`knowledgeRefs` are canonical page names in the printed Field Journal. They are intentionally routing labels rather than Cinder Knowledge Base links.

## Sequence

| Lab | Topic | Mode | Required proof | Field Journal pages |
| ---: | --- | --- | --- | --- |
| 5 | Power/no-power triage | Pairs | Power-path evidence and successful POST | Power Supplies & ESD; Connectors; POST |
| 6 | POST/RAM triage | Pairs | POST evidence and firmware memory detection | POST; RAM & Storage; Motherboard |
| 7 | Storage installation/diagnosis | Individual | Compatibility and repeatable firmware detection | RAM & Storage; Connectors; BIOS/UEFI |
| 8 | Display/peripheral faults and maintenance | Pairs | Independent fault chains, stable display/input, safe cleaning | Peripherals; Video; Safety |
| 9 | Ambiguous integrated incident | Individual | Manufacturer research, discriminating tests, three cold starts | All core Hardware pages |
| Final | Loose-parts build variants A-D | Individual, two waves | Build, explain, diagnose, firmware inventory, reset | All core Hardware pages |

## Capacity and rotations

Twelve complete caseless parts sets support twelve simultaneous individual builds. With 24 students, the final runs in two waves:

- Wave A builds and diagnoses at the twelve ESD stations.
- Wave B works in the desk room on compatibility research, ticket analysis, component explanations, and reset planning.
- The waves exchange after the instructor checkpoint and station reset.

Pairs are used only in Labs 5, 6, and 8. Both students must perform a physical inspection, connection, substitution, or verification and record their own contribution and printed Service Log. The final is individual; observers may not touch or diagnose another student's build.

## Safe fault library

Only instructor-staged, reversible faults are authorized:

- power switch/strip state or loose external/board power connector;
- front-panel start lead placement;
- partially seated or incorrectly placed compatible memory;
- wrong monitor input, loose display cable, or inactive output;
- loose SATA data/power connection; and
- other explicitly audited variants that can be restored in under ten minutes.

Never open a power supply, create a short, energize exposed conductors, damage contacts, contaminate thermal surfaces, or rely on an actually failed component when a known-good fallback is required. Multimeter work is limited to instructor-approved external test points.

## Final equivalence

Variants A-D use the same compatible loose-parts kit and assessment sequence. Their rotated fault contents live only on instructor-held cards and in the git-ignored private scenario pack. This public document records equivalence and safety requirements, never the answer-key mapping.

Each student must build, explain component function/compatibility, research manufacturer guidance, diagnose with evidence, show three cold starts and stable firmware inventory, then disassemble and inventory the station. Known-good components are the troubleshooting fallback. A known-good laptop is the downstream Networking fallback; it does not replace the Hardware assessment.

## Instructor acceptance checklist

- Readiness check published from the five protected-answer prompts.
- Variant and baseline cards sealed and photographed.
- Known-good parts labeled and separated from staged items.
- ESD mat, approved tools, monitor, and POST reference present.
- Client replies reviewed for fairness and no root-cause disclosure.
- One Cinder ticket links to one printed Service Log; detailed evidence is not duplicated.
- Personal hands-on contribution is recorded before sign-off.
- Firmware detection, repeated startup, and reset are observed.
- Kit inventory and safe storage are complete before the next rotation.
