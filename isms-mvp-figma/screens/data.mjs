// Shared demo data: the seven demo-scope use cases as correlated incidents.
// Illustrative values only (no real persons, flights or site data).
export const INCIDENTS = [
  { key: 'tailgate', id: 'INC-2417', sev: 'Critical', conf: 94, icon: 'door', title: 'Tailgating at Staff Door D-214', short: 'Tailgating · anti-passback', loc: 'T3 · Level 2 · Airside boundary', ago: '1m', signals: 5, X: 50, Y: 30.5, uc: 'Tailgating + anti-passback' },
  { key: 'fence', id: 'INC-2416', sev: 'Critical', conf: 91, icon: 'fence', title: 'Perimeter intrusion · Fence Sector 5', short: 'Fence intrusion · LiDAR-verified', loc: 'North perimeter · Segment 5-14', ago: '2m', signals: 4, X: 63, Y: 1, uc: 'AGIL Fence alarm' },
  { key: 'watch', id: 'INC-2415', sev: 'High', conf: 86, icon: 'eye', title: 'Watchlist person loitering · Row K', short: 'Watchlist person · loitering 23 min', loc: 'T1 · Departure hall · Row K', ago: '3m', signals: 4, X: 15, Y: 29, uc: 'Blacklist person · loitering' },
  { key: 'spoof', id: 'INC-2414', sev: 'High', conf: 82, icon: 'idcard', title: 'Identity spoofing · impossible presence', short: 'Identity spoofing · 2 doors, 4 min', loc: 'T3 Door A17 → T1 Door C2', ago: '5m', signals: 5, X: 19, Y: 36, uc: 'Identity spoofing' },
  { key: 'fight', id: 'INC-2413', sev: 'High', conf: 78, icon: 'fight', title: 'Fight detected · Arrival Belt 5', short: 'Fight detected · crowd forming', loc: 'T2 · Arrival hall · Belt 5', ago: '2m', signals: 3, X: 31, Y: 28, uc: 'Fight detection' },
  { key: 'bag', id: 'INC-2412', sev: 'High', conf: 88, icon: 'bag', title: 'Unattended bag · Gate B12', short: 'Unattended bag · owner located', loc: 'T2 · Gate B12 holdroom', ago: '12m', signals: 6, X: 34, Y: 39, uc: 'Bags left over' },
  { key: 'overstay', id: 'INC-2411', sev: 'Medium', conf: 73, icon: 'timer', title: 'Overstay in restricted zone · B2', short: 'Overstay · 3h 40m in zone B2', loc: 'T4 · Baggage hall B2', ago: '18m', signals: 3, X: 66, Y: 29.5, uc: 'Overstay detection' },
];
export const BY = Object.fromEntries(INCIDENTS.map(i => [i.key, i]));
