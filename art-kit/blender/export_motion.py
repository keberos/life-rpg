# Export joint positions from CC0 animation clips (Quaternius Universal Animation
# Library) so our own rig can follow the motion. Only skeleton movement is taken:
# no meshes, textures or other art.
#
# Output: one JSON per clip in art-kit/src/motion/, positions in our character
# space (+y up, +z = facing, +x = the character's left), metres.
#
# Usage: blender -b --factory-startup -P export_motion.py -- <UAL .glb> <out dir> Clip1,Clip2,... [step]
import bpy, sys, json, os

args = sys.argv[sys.argv.index('--') + 1:]
GLB, OUT_DIR, CLIPS = args[0], args[1], args[2].split(',')
STEP = int(args[3]) if len(args) > 3 else 2

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=GLB)
rig = next(o for o in bpy.data.objects if o.type == 'ARMATURE')
scene = bpy.context.scene

# Bone heads we need (UE-style names). _l is the character's left.
JOINTS = {
    'pelvis': 'pelvis', 'chest': 'spine_03', 'neck': 'neck_01', 'headBase': 'Head',
    'shoulderL': 'upperarm_l', 'elbowL': 'lowerarm_l', 'handL': 'hand_l', 'fingerL': 'middle_01_l',
    'shoulderR': 'upperarm_r', 'elbowR': 'lowerarm_r', 'handR': 'hand_r', 'fingerR': 'middle_01_r',
    'indexL': 'index_01_l', 'pinkyL': 'pinky_01_l', 'indexR': 'index_01_r', 'pinkyR': 'pinky_01_r',
    'hipL': 'thigh_l', 'kneeL': 'calf_l', 'ankleL': 'foot_l', 'toeL': 'ball_l',
    'hipR': 'thigh_r', 'kneeR': 'calf_r', 'ankleR': 'foot_r', 'toeR': 'ball_r',
}


def to_ours(p):
    # Blender: Z up, the character faces -Y, its left is +X.
    return [round(p.x, 4), round(p.z, 4), round(-p.y, 4)]


os.makedirs(OUT_DIR, exist_ok=True)
for clip in CLIPS:
    act = bpy.data.actions[clip]
    ad = rig.animation_data or rig.animation_data_create()
    ad.action = act
    if hasattr(ad, 'action_slot') and len(getattr(act, 'slots', [])):
        ad.action_slot = act.slots[0]
    f0, f1 = (int(x) for x in act.frame_range)
    frames = []
    for f in range(f0, f1 + 1, STEP):
        scene.frame_set(f)
        pb = rig.pose.bones
        fr = {k: to_ours(rig.matrix_world @ pb[b].head) for k, b in JOINTS.items()}
        fr['headTop'] = to_ours(rig.matrix_world @ pb['Head'].tail)
        frames.append(fr)
    path = os.path.join(OUT_DIR, f'{clip}.json')
    with open(path, 'w') as fh:
        json.dump({'clip': clip, 'source': 'Quaternius Universal Animation Library (CC0)', 'fps': scene.render.fps / STEP, 'frames': frames}, fh, separators=(',', ':'))
    print('wrote', path, len(frames), 'frames')
