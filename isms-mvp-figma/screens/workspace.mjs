// Incident workspace template — the one screen every use-case demo lands on.
// Left: what happened / why it matters / correlated signals. Centre: evidence.
// Right: recommended response (human decides) + incident-scoped Co-pilot.
import { Frame, T, SEV, rect, circle, text, rich, para, icon, g, textWidth } from '../lib/svg.mjs';
import { L, backdrop, shell, card, surface, chips, chip, button, timeline, plan, factors, bubbleUser, bubbleAI, suggest, askBox, incidentHeader, aiMark, hair, overline } from '../lib/ui.mjs';

export const COL = { lx: 112, lw: 400, cx: 536, cw: 880, rx: 1440, rw: 456, y: 208, y1: 1056 };

export function workspace(name, inc, o) {
  const F = new Frame(name);
  let s = backdrop(F) + shell(F, { active: 1, ask: o.ask });
  s += incidentHeader(F, inc);
  const { lx, lw, cx, cw, rx, rw, y, y1 } = COL;

  // ----- left column -----
  let ly = y;
  const sum = para(lx + 22, ly + 72, o.summary, lw - 44, { size: 14, lh: 21, fill: T.t1 });
  const sumH = 72 + sum.h + 46;
  let left = card(F, 'What happened', lx, ly, lw, sumH, { ai: true, title: 'What happened', meta: 'AI summary' },
    sum.svg + chips(F, lx + 22, ly + sumH - 40, (o.sources || []).map(t => ({ label: t, color: T.t2, bgo: 0.07, weight: 500, h: 22, size: 11.5 })), 6).svg);
  ly += sumH + 16;
  const fH = 60 + o.factors.length * 40 + 8;
  left += card(F, 'Why it matters', lx, ly, lw, fH, { icon: 'alert', title: 'Why it matters', meta: 'Risk factors' }, factors(F, lx + 22, ly + 58, lw - 44, o.factors));
  ly += fH + 16;
  const tH = y1 - ly;
  left += card(F, 'Correlated signals', lx, ly, lw, tH, { icon: 'link', title: 'Correlated signals', count: o.signals.length, meta: o.signalsMeta || 'One incident, not ' + o.signals.length + ' alarms' }, timeline(F, lx + 22, ly + 58, lw - 44, o.signals, { gap: o.signalGap || Math.min(56, (tH - 70) / o.signals.length) }));
  s += g(F, 'Left column', left);

  // ----- centre column (use-case specific) -----
  s += g(F, 'Evidence', o.center(F, { x: cx, y, w: cw, y1 }));

  // ----- right column -----
  const steps = o.plan;
  const pH = 104 + steps.length * 56 + 150;
  let r = card(F, 'Recommended response', rx, y, rw, pH, { ai: true, title: 'Recommended response', meta: o.sop || 'SOP-SEC-014', accent: T.blue, accentO: 0.35, topGlow: T.blue },
    text(rx + 22, y + 64, o.planSub || 'Built from SOP, site context and live evidence', { size: 12.5, fill: T.t3 }) +
    plan(F, rx + 22, y + 92, rw - 44, steps, { gap: 56 }) +
    hair(rx + 22, y + pH - 142, rx + rw - 22) +
    button(F, rx + 22, y + pH - 124, rw - 44, 46, o.approve || 'Approve response', { kind: 'primary', icon: 'check', kbd: '⏎' }) +
    button(F, rx + 22, y + pH - 68, (rw - 54) / 2, 42, 'Request more info', { kind: 'secondary', size: 14 }) +
    button(F, rx + 32 + (rw - 54) / 2, y + pH - 68, (rw - 54) / 2, 42, o.dismiss || 'Dismiss with reason', { kind: 'secondary', size: 14 }) +
    (o.hitl !== false ? '' : ''));
  // co-pilot
  const cy = y + pH + 16, cH = y1 - cy;
  let cp = '';
  let my = cy + 60;
  const u = bubbleUser(F, rx + 22, my, rw - 44, o.copilot.q);
  cp += u.svg; my += u.h + 14;
  const a = bubbleAI(F, rx + 22, my, rw - 44, o.copilot.a);
  cp += a.svg; my += a.h + 8;
  if (o.copilot.extra) { const ex = o.copilot.extra(F, rx + 56, my, rw - 78); cp += ex.svg; my += ex.h + 8; }
  const rows = Math.max(1, Math.floor((y1 - 76 - my + 8) / 36));
  const sg = suggest(F, rx + 22, 0, o.copilot.chips, { maxX: rx + rw - 22, bottom: y1 - 76, maxRows: rows });
  if (sg.y < my - 4) console.warn('  ! co-pilot overflow in', name, Math.round(my - sg.y));
  cp += sg.svg;
  cp += askBox(F, rx + 22, y1 - 64, rw - 44);
  r += card(F, 'Incident Co-pilot', rx, cy, rw, cH, { icon: 'sparkle', iconCol: T.violet, title: 'Ask Co-pilot', meta: 'Scoped to ' + inc.id }, cp);
  s += g(F, 'Right column', r);
  return F.render(s);
}

// small helper: titled card for the centre column
export function ccard(F, name, x, y, w, h, title, o = {}, body = '') { return card(F, name, x, y, w, h, { title, ...o }, body); }
