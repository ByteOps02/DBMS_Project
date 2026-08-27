export const CAMPUS_GATES = [
  "Main Gate (Academic)",
  "Hostel Main Gate",
  "North Boundary Gate",
  "South Gate",
] as const;

export type CampusGate = typeof CAMPUS_GATES[number];
