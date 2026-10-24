export type Niche = "shipping" | "refunds";
export type Rule = {
  id: string;
  label: string;
  signal: string;
  operator: string;
  threshold: number;
  weight: number;
  enabled: boolean;
};
export type Template = {
  id: Niche;
  name: string;
  description: string;
  priority: string;
  workflow: string[];
  evidence: string[];
  rules: Rule[];
};
export type Workspace = {
  id: string;
  name: string;
  niche: Niche;
  threshold: number;
  dashboard: string;
  version: number;
  rules: Rule[];
  template: Template;
};
export type Case = {
  id: string;
  externalId: string;
  status: string;
  createdAt: string;
  event: {
    account: string;
    order: string;
    amount: number;
    kind: string;
    addressToken: string;
    deviceToken: string;
    evidence: string[];
    signals: Record<string, number>;
  };
  assessment: {
    score: number;
    band: string;
    recommendation: string;
    reasons: {
      code: string;
      label: string;
      signal: string;
      observed: number;
      operator: string;
      threshold: number;
      points: number;
    }[];
    missingEvidence: string[];
    policyVersion: number;
    workflow: string[];
    requiredEvidence: string[];
  };
  outcome: null | {
    decision: string;
    note: string;
    reviewer: string;
    recordedAt: string;
  };
};
export async function api<T>(
  path: string,
  token = "",
  body?: unknown,
  method?: string,
): Promise<T> {
  const response = await fetch("/api" + path, {
    method: method ?? (body ? "POST" : "GET"),
    headers: {
      ...(token ? { Authorization: "Bearer " + token } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(
      data.error +
        (data.issues
          ? " — " +
            data.issues.map((x: any) => x.path + ": " + x.message).join(", ")
          : ""),
    );
  return data;
}
export const money = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
export const human = (s: string) => s.replaceAll("_", " ");
