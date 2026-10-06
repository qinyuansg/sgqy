export const meta = {
  name: 'mv-integration-fix',
  description: 'Integration fixers: one agent per module group applies the QA findings + director direction, verifies via re-rendered shot strips and cut pairs',
  phases: [{ title: 'Fix', detail: 'module-group fixers (each owns distinct module files)' }],
}
const R = '/home/user/sgqy/mv-countless-tonights'
const P = R + '/previz'
const SCHEMA = { type: 'object', properties: {
  fixed: { type: 'array', items: { type: 'string' } },
  not_fixed: { type: 'array', items: { type: 'string' } },
  sec_per_frame: { type: 'object', additionalProperties: { type: 'number' } },
  notes: { type: 'string' } }, required: ['fixed', 'not_fixed', 'sec_per_frame', 'notes'] }

phase('Fix')
const res = await pipeline(args.groups, (g) => agent(`You are a senior previz artist/DP doing the INTEGRATION FIX pass on the music-video previz 《无数个今晚》 (stylised moving storyboard: faceless sculpted mannequins, real camera/light, exact timing to the song). You OWN these scene modules and may edit ONLY these files: ${g.modules.map((m) => `${P}/scenes/${m}.js (+ ${m}.md)`).join(', ')}. Do not edit engine/, lib/ or other modules (other fixers are editing them in parallel).
Read: ${R}/brief/treatment_zh.md (client brief — the authority), ${R}/shotlist/director_rulings.md, ${P}/QA_director_notes.md, ${P}/README_previz.md, ${P}/lib/README.md, ${P}/lib/ISSUES.md, your modules' code + .md notes, and ${R}/shotlist/shots.json for your modules' shots and their neighbours.
YOUR FINDINGS: read ${P}/qa/findings_by_module.json and take every finding whose "module" is one of: ${g.modules.join(', ')} (also the multi-module grain findings whose module list includes yours). These come from a whole-film QA review of ${P}/out/survey_v2 (shot strips shots/Sxxx.jpg = first|mid|last frame, cut pairs cuts/A-B.jpg). Fix every blocker and major; fix minors when cheap.
GLOBAL RULES for this pass:
1. GRAIN: the engine grain is fixed (integer hash). Delete any module-side grain quads/probes/materials and 'grain: 0' overrides; return per-era grain through post only: modern 0.035, navigator 0.042, home 0.040, migrant 0.044, chapel 0.038, map office 0.040, future 0.030. Nested views get no grain (engine handles).
2. FACES: faces must never read as pale mannequin masks. Carry emotion with light and framing: low-key side/back light, faces partly in shadow or silhouette against a brighter background, shallow focus, eye-line, gesture; avoid frontal lit faces and giant faceless heads; MCU over ECU where the shot list allows; no 'blindfold' shadow bands across eyes.
3. EXPOSURE: no unscripted near-black frames; every shot's subject must read (mean subject luminance clearly above black, highlights motivated); avoid >1.5-stop unmotivated jumps at cuts; night stays night but readable (moonlight/practicals, rim light, haze).
4. CUTS: match cuts must match position/scale/shape of the matched element (check both sides in the cut-pair images). The engine now CENTRES dissolves on the cut (transition_in.align; S070 'end'): the outgoing shot runs past its out_frame (u>1) and the incoming holds its first frame until its cut — re-check any dissolve touching your shots.
5. Named views used by other modules (view_*) keep their names and general framing contract; you may improve their look.
6. Determinism, no text/flags, performance ≤ 2.5 s/frame at 1280×536 (corridor S066 ≤ 4 s).
${g.extra ? 'DIRECTOR DIRECTION FOR THIS GROUP:\n' + g.extra : ''}
VERIFY: after fixing, regenerate the survey for your shots AND their neighbours: \`cd ${P} && python3 tools/survey.py out/fix_${g.name.replace(/\+/g, '_')} 960 --only <comma-separated ids>\` (it renders first/mid/last frames and cut pairs), LOOK at every strip and cut pair, iterate until the findings are resolved and the shots are genuinely good. Also render sync-point frames for timing-critical beats. Update each module's .md with an "Integration fixes" section.
Return: which findings you fixed (shot + one line), which you did not and why, measured s/frame for changed shots.`, { label: `fix:${g.name}`, phase: 'Fix', schema: SCHEMA }))
return res.map((r, i) => ({ group: args.groups[i].name, ...r }))
