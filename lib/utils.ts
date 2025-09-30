export function detectSport(event: string) {
  const e = (event || "").toLowerCase();
  if (/(nfl|ravens|eagles|chiefs|cowboys)/.test(e)) return "NFL";
  if (/(nba|lakers|celtics|warriors|knicks)/.test(e)) return "NBA";
  if (/(mlb|yankees|dodgers|braves|astros)/.test(e)) return "MLB";
  if (/(ufc|mma|bellator)/.test(e)) return "UFC";
  if (/(atp|wta|wimbledon|us open|roland|open)/.test(e)) return "Tennis";
  return "Other";
}

export function maskHandle(email: string | null | undefined) {
  if (!email) return "anon";
  const [n, d] = (email || "").split("@");
  return `${(n || "user").slice(0, 3)}****@${d || "mail.com"}`;
}
