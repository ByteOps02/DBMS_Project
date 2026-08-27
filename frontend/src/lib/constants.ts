export const CAMPUS_GATES = [
  "Main Gate",
  "Hostel Gate",
] as const;

export type CampusGate = typeof CAMPUS_GATES[number];
