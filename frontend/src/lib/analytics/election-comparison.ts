
export type CandidateResult = {
  state: string;
  constituencyNumber: number;
  constituencyName: string;
  candidateName: string;
  party: string;
  totalVotes: number;
  votePercentage: number;
};

export type PartyPerformance = {
  party: string;
  totalVotes: number;
  voteShare: number;
  seatsWon: number;
};

export type ElectionComparison = {
  year: number;
  totalVotes: number;
  totalConstituencies: number;
  partyPerformances: PartyPerformance[];
};


export function calculatePartyPerformance(
  candidates: CandidateResult[]
): PartyPerformance[] {
  const partyTotals = new Map<string, number>();

  for (const candidate of candidates) {
    const rawParty = candidate.party?.trim();

    if (!rawParty || rawParty.toUpperCase() === "NOTA") {
    continue;
    }

    const party = normalizePartyName(rawParty);

    

    const votes = Number(candidate.totalVotes) || 0;

    partyTotals.set(
      party,
      (partyTotals.get(party) ?? 0) + votes
    );
  }

  const totalVotes = candidates.reduce((sum, candidate) => {
    return sum + (Number(candidate.totalVotes) || 0);
  }, 0);

  const partyPerformances = Array.from(
    partyTotals.entries()
  ).map(([party, votes]) => {
   
    const constituencyWinners = new Map<number, CandidateResult>();

    for (const candidate of candidates) {
    const currentWinner = constituencyWinners.get(
        candidate.constituencyNumber
    );

    const candidateVotes = Number(candidate.totalVotes) || 0;
    const winnerVotes = currentWinner
        ? Number(currentWinner.totalVotes) || 0
        : -1;

    const isNota = candidate.party?.trim().toUpperCase() === "NOTA";

    if (
        !isNota &&
        (!currentWinner || candidateVotes > winnerVotes)
    ) {
        constituencyWinners.set(
        candidate.constituencyNumber,
        candidate
        );
    }
    }

    const seatsWon = Array.from(constituencyWinners.values()).filter(
    (winner) => normalizePartyName(winner.party) === party
    ).length;


    return {
      party,
      totalVotes: votes,
      voteShare: totalVotes > 0 ? (votes / totalVotes) * 100 : 0,
      seatsWon,
    };
  });

  return partyPerformances.sort(
    (a, b) => b.totalVotes - a.totalVotes
  );
}


export type PartyYearComparison = {
  party: string;
  previousVotes: number;
  currentVotes: number;
  previousVoteShare: number;
  currentVoteShare: number;
  voteShareChange: number;
  previousSeats: number;
  currentSeats: number;
  seatChange: number;
};

export function comparePartyPerformance(
  previous: PartyPerformance[],
  current: PartyPerformance[]
): PartyYearComparison[] {
  const allParties = new Set([
    ...previous.map((party) => party.party),
    ...current.map((party) => party.party),
  ]);

  const previousByParty = new Map(
    previous.map((party) => [party.party, party])
  );

  const currentByParty = new Map(
    current.map((party) => [party.party, party])
  );

  return Array.from(allParties).map((partyName) => {
    const oldResult = previousByParty.get(partyName);
    const newResult = currentByParty.get(partyName);

    const previousVotes = oldResult?.totalVotes ?? 0;
    const currentVotes = newResult?.totalVotes ?? 0;
    const previousVoteShare = oldResult?.voteShare ?? 0;
    const currentVoteShare = newResult?.voteShare ?? 0;
    const previousSeats = oldResult?.seatsWon ?? 0;
    const currentSeats = newResult?.seatsWon ?? 0;

    return {
      party: partyName,
      previousVotes,
      currentVotes,
      previousVoteShare,
      currentVoteShare,
      voteShareChange: currentVoteShare - previousVoteShare,
      previousSeats,
      currentSeats,
      seatChange: currentSeats - previousSeats,
    };
  }).sort((a, b) => b.voteShareChange - a.voteShareChange);
}


export const PARTY_NAME_MAP: Record<string, string> = {
  "Tamilaga Vettri Kazhagam": "TVK",
  "TVK": "TVK",

  "Dravida Munnetra Kazhagam": "DMK",
  "DMK": "DMK",

  "All India Anna Dravida Munnetra Kazhagam": "AIADMK",
  "AIADMK": "AIADMK",
  "ADMK": "AIADMK",

  "Naam Tamilar Katchi": "NTK",
  "NTK": "NTK",

  "Viduthalai Siruthaigal Katchi":"VCK",
  "VCK": "VCK",
};

export function normalizePartyName(partyName: string): string {
  const normalized = partyName.trim().replace(/\s+/g, " ").toUpperCase();

  const matchingEntry = Object.entries(PARTY_NAME_MAP).find(
    ([alias]) =>
      alias.trim().replace(/\s+/g, " ").toUpperCase() === normalized
  );

  return matchingEntry?.[1] ?? partyName.trim();
}


export const TRACKED_PARTIES = ["NTK","TVK", "DMK", "AIADMK","BJP","INC", "PMK", "VCK" , "CPI", "CPI(M)","IUML","AMMKMNKZ","DMDK"] as const;
