export const statuses = [
  "Confirmed",
  "Arriving",
  "Checked in",
  "Departed",
] as const;
export type Status = (typeof statuses)[number];
export type Reservation = {
  guest: string;
  initials: string;
  room: string;
  arrival: string;
  status: Status;
  total: number;
};
export const date = "2026-11-16";
export const reservations: Reservation[] = [
  {
    guest: "Amelia Rhodes",
    initials: "AR",
    room: "204 · Courtyard",
    arrival: "2026-11-16",
    status: "Arriving",
    total: 580,
  },
  {
    guest: "Noah Bennett",
    initials: "NB",
    room: "307 · Garden",
    arrival: "2026-11-15",
    status: "Checked in",
    total: 460,
  },
  {
    guest: "Sofia Demir",
    initials: "SD",
    room: "401 · Terrace",
    arrival: "2026-11-16",
    status: "Arriving",
    total: 720,
  },
  {
    guest: "Elias Morgan",
    initials: "EM",
    room: "202 · Courtyard",
    arrival: "2026-11-14",
    status: "Departed",
    total: 350,
  },
  {
    guest: "Mina Alvarez",
    initials: "MA",
    room: "302 · Garden",
    arrival: "2026-11-16",
    status: "Confirmed",
    total: 420,
  },
  {
    guest: "Deniz Yılmaz",
    initials: "DY",
    room: "305 · Garden",
    arrival: "2026-11-17",
    status: "Confirmed",
    total: 645,
  },
  {
    guest: "Theo Walker",
    initials: "TW",
    room: "206 · Courtyard",
    arrival: "2026-11-18",
    status: "Confirmed",
    total: 395,
  },
  {
    guest: "Yasemin Aydın",
    initials: "YA",
    room: "409 · Terrace",
    arrival: "2026-11-19",
    status: "Confirmed",
    total: 820,
  },
];
export const rooms = [
  {
    no: "204",
    name: "Courtyard King",
    detail: "King bed · floor 2 · courtyard view",
    status: "Ready",
  },
  {
    no: "307",
    name: "Garden Suite",
    detail: "Separate living room · floor 3 · garden view",
    status: "Occupied",
  },
  {
    no: "401",
    name: "Terrace Loft",
    detail: "Private terrace · floor 4 · evening light",
    status: "Ready",
  },
  {
    no: "305",
    name: "Garden Twin",
    detail: "Twin beds · floor 3 · garden view",
    status: "Housekeeping",
  },
] as const;
export const occupancy = [62, 69, 64, 77, 74, 88, 84];
export const week = ["Tue", "Wed", "Thu", "Fri", "Sat", "Sun", "Mon"];
export const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
