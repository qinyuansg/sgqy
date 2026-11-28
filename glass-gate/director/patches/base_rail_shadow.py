"""Patch for frames 140-146: the right base rail, flying in, throws the hard spot's shadow across the left rail
that has just landed (a three-frame black-out of its near end).

The spot is split in two for these frames: the original lights everything except the left rail, a twin lights only
the left rail and is not blocked by the right rail. Every other shadow in the frame stays as it was.

  render.py ... --frames 138,...,150 --patch director/patches/base_rail_shadow.py
"""
import bpy

RECEIVERS = ['BASE_rail_L'] + [f'BASE_foot_{i}_L' for i in range(4)]
BLOCKERS = ['BASE_rail_R'] + [f'BASE_foot_{i}_R' for i in range(4)]
LAMP = 'STUDIO_SPARK'


def _coll(name, entries):
    """entries: [(object name, 'INCLUDE' | 'EXCLUDE')]"""
    c = bpy.data.collections.new(name)
    for n, _ in entries:
        c.objects.link(bpy.data.objects[n])
    state = dict(entries)
    for co, ob in zip(c.collection_objects, c.objects):
        co.light_linking.link_state = state[ob.name]
    return c


def apply(sc):
    lamp = bpy.data.objects[LAMP]
    old = lamp.light_linking.receiver_collection      # the look rig's shared set (it keeps the spot off the floor)
    keep = []
    if old is not None:
        if old.children:
            raise RuntimeError(f'{old.name} has child collections; this patch does not handle them')
        keep = [(ob.name, co.light_linking.link_state) for co, ob in zip(old.collection_objects, old.objects)]
        if any(st == 'INCLUDE' for _, st in keep):
            raise RuntimeError(f'{old.name} is an include list; this patch expects an exclude list')
    twin = lamp.copy()                       # shares the lamp data, so energy, colour and drivers follow the original
    twin.name = LAMP + '_PATCH_TWIN'
    for c in lamp.users_collection:
        c.objects.link(twin)
    lamp.light_linking.receiver_collection = _coll('PATCH_spark_not_L', keep + [(n, 'EXCLUDE') for n in RECEIVERS])
    twin.light_linking.receiver_collection = _coll('PATCH_spark_only_L', [(n, 'INCLUDE') for n in RECEIVERS])
    twin.light_linking.blocker_collection = _coll('PATCH_spark_unblocked', [(n, 'EXCLUDE') for n in BLOCKERS])
