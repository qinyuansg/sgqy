"""v1 timeline so the sound helper can start. Superseded by director/animate.py (same schema)."""
import json, os
E = []
def ev(t, sfx, part, gain=0.8, pan=0.0, dur=None, var=0):
    d = dict(t=round(t, 4), sfx=sfx, part=part, gain=gain, pan=pan, var=var)
    if dur: d['dur'] = dur
    E.append(d)
# hook
ev(0.0, 'shimmer', 'hook_light_streak', 0.5, 0, dur=1.6)
ev(2.0, 'whoosh', 'hook_scatter', 0.7, 0, dur=0.6)          # whoosh ENDS at t
# wave 1: base
ev(2.0, 'thunk_metal', 'base_L', 1.0, -0.4); ev(2.5, 'thunk_metal', 'base_R', 0.9, 0.4)
for i in range(4): ev(3.0 + i*0.125, 'screw', f'anchor_L{i}', 0.6, -0.4, dur=0.11, var=i)
for i in range(4): ev(3.5 + i*0.125, 'screw', f'anchor_R{i}', 0.6, 0.4, dur=0.11, var=i+4)
# wave 2: drive (macro hero)
ev(4.0, 'thunk_metal', 'motor', 0.9, -0.2); ev(4.5, 'clack', 'brake', 0.7, -0.2)
ev(5.0, 'thunk_metal', 'ring_gear', 0.8, -0.2, var=1)
for i in range(3): ev(5.25 + i*0.25, 'gear_tick', f'planet_{i}', 0.7, -0.3 + 0.1*i, var=i)
ev(6.0, 'gear_tick', 'sun_gear', 0.8, -0.2, var=5); ev(6.25, 'clack', 'carrier', 0.7, -0.2, var=1)
ev(6.5, 'click', 'output_shaft', 0.7, -0.2); ev(6.75, 'spring', 'return_spring', 0.6, -0.2)
ev(7.0, 'click', 'encoder', 0.6, -0.2, var=1)
ev(7.75, 'glass_slide', 'column_tube', 0.8, -0.2, dur=0.5); ev(7.75, 'glass_clink', 'column_tube', 0.9, -0.2)
# wave 3: electronics
ev(8.0, 'thunk_metal', 'psu_L', 0.8, -0.4, var=2); ev(8.25, 'thunk_metal', 'psu_R', 0.7, 0.4, var=3)
ev(8.5, 'click', 'pcb_L', 0.8, -0.4, var=2); ev(8.75, 'click', 'pcb_R', 0.7, 0.4, var=3)
for i in range(4): ev(9.0 + i*0.25, 'snap', f'sensor_{i}', 0.7, (-0.4, 0.4)[i % 2], var=i)
for i in range(4): ev(9.5 + i*0.125 + 0.0625, 'click', f'cable_{i}', 0.45, (-0.3, 0.3)[i % 2], var=4+i)
# wave 4: glass body
for i, (p, pan) in enumerate((('post_front_L', -0.5), ('post_front_R', 0.5), ('post_rear_L', -0.3), ('post_rear_R', 0.3))):
    ev(10.0 + i*0.25, 'glass_clink', p, 0.9, pan, var=i)
ev(11.25, 'glass_slide', 'side_panel_L', 0.6, -0.4, dur=0.25); ev(11.25, 'glass_clink', 'side_panel_L', 0.8, -0.4, var=4)
ev(11.75, 'glass_slide', 'side_panel_R', 0.6, 0.4, dur=0.25); ev(11.75, 'glass_clink', 'side_panel_R', 0.8, 0.4, var=5)
# wave 5: top rail
ev(12.0, 'snap', 'led_strip', 0.7, 0, var=6)
ev(12.25, 'tap', 'rfid_coil', 0.6, -0.3); ev(12.5, 'click', 'qr_module', 0.7, -0.3, var=8)
ev(12.75, 'clack', 'lcd_module', 0.7, -0.3, var=2); ev(13.0, 'click', 'camera_pod', 0.8, -0.3, var=9)
ev(13.25, 'glass_clink', 'rail_lid_L', 1.0, -0.4, var=6); ev(13.5, 'glass_clink', 'rail_lid_R', 0.9, 0.4, var=7)
for i in range(4): ev(13.5 + i*0.125, 'screw', f'lid_screw_{i}', 0.6, (-0.4, 0.4)[i % 2], dur=0.1, var=8+i)
# wave 6: wings
ev(14.0, 'clack', 'clamp_L', 0.8, -0.3, var=3); ev(14.25, 'clack', 'clamp_R', 0.8, 0.3, var=4)
ev(14.5, 'glass_clink', 'wing_L', 0.9, -0.2, var=8); ev(14.5, 'lock_clunk', 'wing_L', 0.9, -0.2)
ev(15.0, 'glass_clink', 'wing_R', 0.9, 0.2, var=9); ev(15.0, 'lock_clunk', 'wing_R', 0.9, 0.2, var=1)
ev(15.25, 'tap', 'badge', 0.8, 0, var=1)
ev(16.0, 'riser', 'pre_drop', 0.8, 0, dur=0.75)                # riser ENDS at t
# drop / alive
ev(16.0, 'impact_drop', 'drop', 1.0, 0)
ev(16.0, 'power_up', 'light_wave', 0.8, 0, dur=2.5)
ev(18.0, 'ui_boot', 'screens_on', 0.6, 0)
# in use
ev(20.0, 'card_tap', 'card', 0.8, -0.3); ev(20.12, 'beep_ok', 'reader', 0.7, -0.3)
ev(20.25, 'shimmer', 'led_green', 0.5, 0, dur=0.5)
ev(20.5, 'servo', 'wings_open', 0.8, 0, dur=0.9); ev(21.4, 'lock_clunk', 'wings_open_stop', 0.6, 0, var=2)
ev(22.0, 'whoosh', 'light_pass', 0.6, 0, dur=0.8)
ev(22.75, 'servo', 'wings_close', 0.7, 0, dur=0.75); ev(23.5, 'lock_clunk', 'wings_closed', 0.8, 0, var=3)
ev(24.0, 'final_hit', 'hero', 0.7, 0)
E.sort(key=lambda e: e['t'])
T = dict(version=1, fps=60, bpm=120, duration_s=26.0, frames=1560, drop_t=16.0,
  sections=[dict(name='hook', t0=0, t1=2, busy=0.3), dict(name='w1_base', t0=2, t1=4, busy=0.6),
    dict(name='w2_drive', t0=4, t1=8, busy=0.8), dict(name='w3_electronics', t0=8, t1=10, busy=0.9),
    dict(name='w4_glass_body', t0=10, t1=12, busy=0.9), dict(name='w5_top_rail', t0=12, t1=14, busy=1.0),
    dict(name='w6_wings', t0=14, t1=16, busy=0.8), dict(name='drop_alive', t0=16, t1=20, busy=0.2),
    dict(name='in_use', t0=20, t1=24, busy=0.5), dict(name='hero_orbit', t0=24, t1=26, busy=0.0)],
  sfx_vocabulary=sorted({e['sfx'] for e in E}), events=E)
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'shared', 'timeline.json')
json.dump(T, open(out, 'w'), indent=1)
print(len(E), 'events', T['sfx_vocabulary'])
