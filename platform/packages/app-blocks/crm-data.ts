export const stages = ["Discovery", "Qualified", "Proposal", "Won"] as const;
export type Stage = (typeof stages)[number];
export type Company = { id: string; name: string; industry: string };
export type Contact = {
  id: string;
  name: string;
  company: Company["id"];
  role: string;
  status: "Active" | "Prospect";
};
export type Opportunity = {
  id: string;
  name: string;
  company: Company["id"];
  stage: Stage;
  value: number;
};
export type Activity = {
  id: string;
  subject: string;
  contact: Contact["id"];
  kind: "Meeting" | "Follow-up" | "Note";
  date: string;
  complete: boolean;
  detail: string;
};

export const companies: Company[] = [
  { id: "alder", name: "Alder & Co.", industry: "Design" },
  { id: "northstar", name: "Northstar Labs", industry: "Software" },
  { id: "sable", name: "Sable House", industry: "Retail" },
  { id: "fieldwork", name: "Fieldwork Studio", industry: "Creative services" },
  { id: "orbit", name: "Orbit Works", industry: "Manufacturing" },
  { id: "linen", name: "Linen Supply", industry: "Distribution" },
];
export const contacts: Contact[] = [
  {
    id: "mira",
    name: "Mira Chen",
    company: "northstar",
    role: "Operations director",
    status: "Active",
  },
  {
    id: "jo",
    name: "Jordan Alvarez",
    company: "alder",
    role: "Co-founder",
    status: "Prospect",
  },
  {
    id: "amina",
    name: "Amina Okafor",
    company: "sable",
    role: "Head of retail",
    status: "Active",
  },
  {
    id: "kiran",
    name: "Kiran Shah",
    company: "fieldwork",
    role: "Studio lead",
    status: "Prospect",
  },
  {
    id: "eda",
    name: "Eda Demir",
    company: "orbit",
    role: "Program manager",
    status: "Active",
  },
  {
    id: "luca",
    name: "Luca Rossi",
    company: "linen",
    role: "Commercial lead",
    status: "Prospect",
  },
];
export const opportunities: Opportunity[] = [
  {
    id: "retail",
    name: "Retail workspace",
    company: "sable",
    stage: "Discovery",
    value: 18400,
  },
  {
    id: "procurement",
    name: "Procurement pilot",
    company: "linen",
    stage: "Discovery",
    value: 9600,
  },
  {
    id: "studio",
    name: "Studio rollout",
    company: "fieldwork",
    stage: "Qualified",
    value: 25000,
  },
  {
    id: "partner",
    name: "Partner onboarding",
    company: "alder",
    stage: "Qualified",
    value: 14750,
  },
  {
    id: "operations",
    name: "Operations expansion",
    company: "northstar",
    stage: "Proposal",
    value: 46000,
  },
  {
    id: "annual",
    name: "Annual workspace",
    company: "orbit",
    stage: "Won",
    value: 32200,
  },
];
export const activities: Activity[] = [
  {
    id: "walkthrough",
    subject: "Walk through the proposal",
    contact: "mira",
    kind: "Meeting",
    date: "2026-11-16",
    complete: false,
    detail:
      "Review the rollout in two phases and confirm who will own onboarding.",
  },
  {
    id: "scope",
    subject: "Send revised pilot scope",
    contact: "luca",
    kind: "Follow-up",
    date: "2026-11-17",
    complete: false,
    detail:
      "Discuss a small pilot with two teams before expanding to all accounts.",
  },
  {
    id: "handoff",
    subject: "Handoff notes",
    contact: "eda",
    kind: "Note",
    date: "2026-11-13",
    complete: true,
    detail:
      "The commercial team confirmed the handoff and agreed on the first review.",
  },
  {
    id: "discovery",
    subject: "Discovery with Sable House",
    contact: "amina",
    kind: "Meeting",
    date: "2026-11-19",
    complete: false,
    detail:
      "Map current store workflows and identify the first measurable improvement.",
  },
];

export type StageChanges = Partial<Record<Opportunity["id"], Stage>>;
export const companyFor = (id: Company["id"]) =>
  companies.find((company) => company.id === id)!;
export const contactFor = (id: Contact["id"]) =>
  contacts.find((person) => person.id === id)!;
export const salesRows = (changes: StageChanges) =>
  opportunities.map((deal) => ({
    ...deal,
    stage: changes[deal.id] ?? deal.stage,
  }));
export const stageSummary = (deals: Opportunity[], stage: Stage) =>
  deals.reduce(
    (result, deal) =>
      deal.stage === stage
        ? { count: result.count + 1, value: result.value + deal.value }
        : result,
    { count: 0, value: 0 },
  );
export const salesMetrics = (deals: Opportunity[]) => ({
  value: deals
    .filter((deal) => deal.stage !== "Won")
    .reduce((sum, deal) => sum + deal.value, 0),
  qualified: stageSummary(deals, "Qualified").count,
  people: contacts.length,
  tasks: activities.filter((activity) => !activity.complete).length,
});
export function readStageChanges(raw: string | null): StageChanges {
  if (!raw || raw.length > 1024) return {};
  try {
    const input: unknown = JSON.parse(raw);
    if (typeof input !== "object" || input === null || Array.isArray(input))
      return {};
    const record = input as Record<string, unknown>;
    return Object.fromEntries(
      opportunities.flatMap(({ id, stage }) =>
        typeof record[id] === "string" &&
        stages.includes(record[id] as Stage) &&
        record[id] !== stage
          ? [[id, record[id] as Stage]]
          : [],
      ),
    );
  } catch {
    return {};
  }
}
export const usd = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
