# Inspect Quaternius CC0 packs: objects, armatures, bones, actions.
# Usage: blender -b --factory-startup -P inspect.py -- <asset root>
import bpy, sys, os
root = sys.argv[sys.argv.index('--') + 1]
bpy.ops.wm.read_factory_settings(use_empty=True)
def imp(p):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=p)
    return [o for o in bpy.data.objects if o not in before]
files = {
  'base': f"{root}/ubc/Universal Base Characters[Standard]/Base Characters/Godot - UE/Superhero_Male_FullBody.gltf",
  'ranger': f"{root}/outfits/Modular Character Outfits - Fantasy[Standard]/Exports/glTF (Godot-Unreal)/Outfits/Male_Ranger.gltf",
  'anims': f"{root}/ual/Universal Animation Library[Standard]/Unreal-Godot/UAL1_Standard.glb",
}
for k, p in files.items():
    objs = imp(p)
    print(f"== {k}: {len(objs)} objects")
    for o in objs:
        extra = ''
        if o.type == 'ARMATURE': extra = f" bones={len(o.data.bones)} first={[b.name for b in o.data.bones][:12]}"
        if o.type == 'MESH': extra = f" mats={[m.name for m in o.data.materials]} verts={len(o.data.vertices)}"
        print('  ', o.type, o.name, extra)
print('== actions', len(bpy.data.actions))
print(sorted(a.name for a in bpy.data.actions))
