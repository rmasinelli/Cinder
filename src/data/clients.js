// Ember client companies — fictional SMBs served by Ember IT
// Used as ticket submitters in lab scenarios and the ticket queue.

export const CLIENTS = [
  {
    id: "cli-001",
    company: "Cascade Legal Group",
    industry: "Legal",
    contact: "Margaret Osei",
    title: "Office Manager",
    size: "22 users · 2 floors",
    notes: "Cisco 2960 switch stack, Windows 11 Pro, on-prem file server.",
  },
  {
    id: "cli-002",
    company: "Ridgeline Dental",
    industry: "Healthcare",
    contact: "Tom Kearney",
    title: "Practice Manager",
    size: "9 workstations · 1 location",
    notes: "Dentrix practice software, Meraki MX firewall, strict HIPAA posture.",
  },
  {
    id: "cli-003",
    company: "Northgate Realty",
    industry: "Real Estate",
    contact: "Sandra Chu",
    title: "Operations Lead",
    size: "31 users · 3 offices",
    notes: "Heavy OneDrive usage, remote agents, Netgear WAX APs.",
  },
  {
    id: "cli-004",
    company: "Bravo Roasting Co.",
    industry: "Food & Beverage",
    contact: "Darren Park",
    title: "Owner",
    size: "6 users · retail + roastery",
    notes: "Square POS, consumer-grade Ubiquiti gear, one NAS for recipes/orders.",
  },
  {
    id: "cli-005",
    company: "Summit CPA Group",
    industry: "Accounting",
    contact: "Priya Menon",
    title: "IT Liaison",
    size: "14 users · hybrid remote",
    notes: "QuickBooks, remote desktop via RDP, MFA enforced, Windows Server 2019.",
  },
  {
    id: "cli-006",
    company: "Harborview Medical Billing",
    industry: "Medical Billing",
    contact: "Joel Ramos",
    title: "Director of Operations",
    size: "18 users · open floor plan",
    notes: "HIPAA Business Associate, VPN required, thin clients on Citrix.",
  },
  {
    id: "cli-007",
    company: "Firewatch Security",
    industry: "Physical Security",
    contact: "Leah Torres",
    title: "Systems Administrator",
    size: "11 users + field devices",
    notes: "IP camera NVR, cellular-connected field tablets, PoE switch infrastructure.",
  },
  {
    id: "cli-008",
    company: "Fernwood Architecture",
    industry: "Architecture / Design",
    contact: "Chris Nakamura",
    title: "Studio Manager",
    size: "8 users · creative studio",
    notes: "Large AutoCAD + Revit files, 10GbE NAS, macOS mixed environment.",
  },
];

// Convenience map by id
export const CLIENT_BY_ID = Object.fromEntries(CLIENTS.map(c => [c.id, c]));
