# IT 161 hardware-station audit

Issue #17 is a physical readiness gate. Repository work can define the process and prefill inventory evidence, but a bench is not verified until an instructor tests the actual equipment in SHK 234.

Use [IT161-Hardware-Bench-Audit.xlsx](IT161-Hardware-Bench-Audit.xlsx) as the audit record and source for the four printed reset cards.

## What the current inventory supports

The supplied AppSheet backend lists enough nominally compatible kit parts for four consistent stations:

| Component | Candidate model | Recorded quantity |
| --- | --- | ---: |
| CPU and cooler | AMD `YD3000C6FHBOX` | 20 |
| Motherboard | ASRock `90-MXBAB0-A0UAYZ` | 22 |
| RAM | DDR4 8 GB kit `HX426C16FB3K2` | 23 |
| PSU | 450 W `100-BR-0450` | 21 |
| Storage | Kingston 120 GB `SQ500S37/120G` | 21 |
| Open bench | OpenBenchTable build platform | 4 |
| POST aid | OpenBenchTable debug card | 4 |
| Repair toolkit | IFIXIT Repair Business Toolkit | 4 |
| PSU tester | Generic power-supply tester | 5 |

These quantities are candidates, not verification. The workbook does not establish that the parts are mutually compatible, complete, or currently functional.

## Known blockers and uncertainties

- Eleven Fluke meters are marked working but also say they need 9 V batteries; recorded 9 V stock is zero.
- AA and AAA battery stock is also zero, while several diagnostic tools say they need batteries.
- A complete set of four known-good displays and display cables is not identified.
- Only three keyboards and one mouse are individually identifiable in the asset sheet.
- Known-good spare parts and staged-fault parts are not yet assigned or physically separated.
- No timed reset trial has been recorded.

## Label and storage standard

- Station labels: `BENCH-01` through `BENCH-04`.
- Component labels: station plus component, such as `BENCH-01-RAM-A`.
- Known-good spares: green label and green storage zone.
- Staged-fault parts: red label, fault ID, symptom, and red storage zone.
- Unknown, damaged, or failed parts: gray quarantine zone.
- A part moves from quarantine or fault storage to known-good storage only after a documented retest.

Do not use deliberately damaged mains wiring, swollen batteries, conductive debris, liquid contamination, or faults that can create uncontrolled heat. Prefer safe substitutions and reversible configuration faults.

## Physical audit sequence

1. Place and label the four OpenBenchTable platforms.
2. Assign exact component asset tags or locally generated bench labels in the workbook.
3. Verify CPU/socket, board, RAM generation, PSU connectors, storage interface, and video output compatibility.
4. POST every station with its green baseline components.
5. Verify firmware detects CPU, expected RAM, and storage.
6. Boot a known-good diagnostic image or baseline operating system.
7. Test the assigned display, cable, keyboard, and mouse at that station.
8. Function-test the debug card, PSU tester, meter, leads, toolkit, ESD equipment, and consumables.
9. Assign and label known-good spares and safe staged-fault parts in separate storage zones.
10. Stage a pilot fault, restore the station from the printed reset card, and record the elapsed time.

## Ready definition

A bench is ready only when:

- all ten component rows show `Verified`;
- every required tool row shows `Ready` or `Not required`;
- no required component is missing or failed;
- known-good, staged-fault, and quarantine parts have distinct labeled locations; and
- at least one realistic fault reset passes in ten minutes or less.

The dashboard intentionally begins with all four benches marked `NOT READY`. Instructor initials are the final sign-off; inventory counts alone cannot satisfy Issue #17.
