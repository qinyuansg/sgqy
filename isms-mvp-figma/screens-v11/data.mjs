// Demo use cases expressed in the current V11 data model (alert card → Active Alarms → Investigation / SOP Flow).
// All names, IDs and numbers are illustrative.
export const ALERTS = [
  { key: 'tailgate', sev: 'Critical', title: 'Staff Door D-214', desc: 'Tailgating: 2 people crossed on 1 badge', ai: 'Co-pilot · 5 linked alarms', time: 'Now', X: 50, Y: 30.5, icon: 'door' },
  { key: 'fence', sev: 'Critical', title: 'Fence Sector 5', desc: 'Climb detected, verified by LiDAR (1.7 m)', ai: 'Co-pilot · fence + LiDAR + thermal agree', time: 'Now', X: 63, Y: 1, icon: 'fence' },
  { key: 'watch', sev: 'Warning', title: 'Departure Hall Row K', desc: 'Possible watchlist match, loitering 23 min', ai: 'Co-pilot · verify match first', time: '02:12 am', X: 15, Y: 29, icon: 'eye' },
  { key: 'spoof', sev: 'Warning', title: 'T1 Door C2', desc: 'Same card used at T3 A17 4 min earlier', ai: 'Co-pilot · impossible presence', time: '02:13 am', X: 19, Y: 36, icon: 'idcard' },
  { key: 'fight', sev: 'Warning', title: 'Arrival Hall Belt 5', desc: 'Fight detected, crowd forming (~14)', ai: 'Co-pilot · video + audio agree', time: '02:11 am', X: 31, Y: 28, icon: 'fight' },
  { key: 'bag', sev: 'Warning', title: 'Gate B12 Holdroom', desc: 'Unattended bag 12 min, owner located', ai: 'Co-pilot · owner found on 4 cameras', time: '02:04 am', X: 34, Y: 39, icon: 'bag' },
  { key: 'overstay', sev: 'Info', title: 'Baggage Hall B2', desc: 'Overstay 3h 40m in restricted zone', ai: 'Co-pilot · 4 rules triggered', time: '01:45 am', X: 66, Y: 29.5, icon: 'timer' },
];
export const BYK = Object.fromEntries(ALERTS.map(a => [a.key, a]));
