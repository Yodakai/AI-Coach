import { NextResponse } from "next/server";

// Sports you want to cover
const SPORTS = ["nfl", "nba", "mlb", "nhl", "cfb", "cbb"];

export async function GET() {
  try {
    // --- 1. Fetch from SportsDataIO (teams/schedules) ---
    const sportsDataPromises = SPORTS.map(async (sport) => {
      const url = `${process.env.SPORTSDATAIO_BASE_URL}/${sport}/scores/json/Teams`;
      const res = await fetch(url, {
        headers: {
          "Ocp-Apim-Subscription-Key": process.env.SPORTSDATAIO_API_KEY!,
        },
        // Optional: cache to reduce rate-limit usage
        next: { revalidate: 60 },
      });

      if (!res.ok) {
        throw new Error(`SportsDataIO error for ${sport}`);
      }

      const data = await res.json();
      return { sport, teams: data };
    });

    const sportsData = await Promise.all(sportsDataPromises);

    // --- 2. Fetch from The Odds API (odds/lines) ---
    const oddsPromises = SPORTS.map(async (sport) => {
      const sportKey = mapSportKey(sport);
      const url = `${process.env.ODDS_API_BASE_URL}/sports/${sportKey}/odds/?regions=us&markets=h2h,spreads,totals&apiKey=${process.env.ODDS_API_KEY}`;

      const res = await fetch(url, {
        next: { revalidate: 60 },
      });

      if (!res.ok) {
        throw new Error(`The Odds API error for ${sport}`);
      }

      const data = await res.json();
      return { sport, odds: data };
    });

    const oddsData = await Promise.all(oddsPromises);

    // --- 3. Merge feeds ---
    const merged = SPORTS.map((sport) => {
      return {
        sport,
        teams: sportsData.find((s) => s.sport === sport)?.teams || [],
        odds: oddsData.find((o) => o.sport === sport)?.odds || [],
      };
    });

    return NextResponse.json({ success: true, data: merged });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// Helper: Map sport code → Odds API sport key
function mapSportKey(sport: string) {
  switch (sport) {
    case "nfl":
      return "americanfootball_nfl";
    case "nba":
      return "basketball_nba";
    case "mlb":
      return "baseball_mlb";
    case "nhl":
      return "icehockey_nhl";
    case "cfb":
      return "americanfootball_ncaaf";
    case "cbb":
      return "basketball_ncaab";
    default:
      return sport;
  }
}
