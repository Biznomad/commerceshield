export type ReplayNode = {
  id: string;
  label: string;
  type: string;
  caseIds: string[];
};
export type ReplayStep = { title: string; detail: string; nodeIds: string[] };
export function buildDemoReplay(nodes: ReplayNode[]): ReplayStep[] {
  const find = (type: string, label: string) =>
    nodes.find((n) => n.type === type && n.label === label);
  const account = find("account", "Morgan Lee"),
    order = find("order", "ORD-8201");
  const firstClaim = nodes.find(
    (n) =>
      n.type === "claim" && order?.caseIds.some((id) => n.caseIds.includes(id)),
  );
  const address = find("address", "addr_shared_018"),
    device = find("device", "device_7c2");
  const alex = find("account", "Alex Rivera"),
    sam = find("account", "Sam Chen");
  if (!account || !order || !firstClaim || !address || !device || !alex || !sam)
    return [];
  let visible: string[] = [];
  const step = (title: string, detail: string, add: ReplayNode[]) => {
    visible = [...new Set([...visible, ...add.map((n) => n.id)])];
    return { title, detail, nodeIds: [...visible] };
  };
  const branch = (a: ReplayNode) =>
    nodes.filter(
      (n) =>
        ["account", "order", "claim"].includes(n.type) &&
        n.caseIds.some((id) => a.caseIds.includes(id)),
    );
  return [
    step("Meet Morgan Lee", "Start with one fictional customer account.", [
      account,
    ]),
    step(
      "An account places an order",
      "Morgan Lee → ORD-8201. A line means this account placed this order.",
      [order],
    ),
    step(
      "A claim belongs to that order",
      `ORD-8201 → ${firstClaim.label}. The claim can be reviewed independently.`,
      [firstClaim],
    ),
    step(
      "Follow the shipping address",
      "ORD-8201 ships to addr_shared_018. The address is a token, not a raw address.",
      [address],
    ),
    step(
      "Alex shares the address",
      "Alex Rivera has a separate order and claim, connected to the same address token.",
      branch(alex),
    ),
    step(
      "Sam joins the same cluster",
      "Sam Chen adds a third account, order, and claim at this address.",
      branch(sam),
    ),
    step(
      "A shared device connects the accounts",
      "All three accounts use device_7c2. This is context to investigate, not proof of abuse.",
      [device],
    ),
    step(
      "See the full workspace",
      "Other fictional cases remain separate. Select any node to inspect its linked cases. This replay illustrates relationships, not event chronology.",
      nodes,
    ),
  ];
}
export function linkIsVisible(
  link: { source: any; target: any },
  visible: Set<string>,
) {
  return (
    visible.has(
      typeof link.source === "object" ? link.source.id : link.source,
    ) &&
    visible.has(typeof link.target === "object" ? link.target.id : link.target)
  );
}
