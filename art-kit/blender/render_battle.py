# Spike: render a battle sprite strip from CC0 Quaternius models in our own pixel style.
# Blender does the 3D (pose, camera, three flat passes at 4x); numpy (bundled with
# Blender) does the pixel art: 4x4 majority downsample, 3 shade bands per material
# with hue shift, per-part outlines and lines where parts overlap.
#
# Usage: blender -b --factory-startup -P render_battle.py -- <asset root> <out.png> [headScale]
import bpy, sys, math, os
import numpy as np
from mathutils import Vector, Euler

args = sys.argv[sys.argv.index('--') + 1:]
ROOT, OUT = args[0], args[1]
HEAD_SCALE = float(args[2]) if len(args) > 2 else 1.6
SIZE, SS = int(os.environ.get('SIZE', 96)), 4  # final sprite size, supersampling factor
CAM_YAW = float(os.environ.get('CAM_YAW', -0.95))  # battle view: body toward the enemy (screen right)...
HEAD_TURN = float(os.environ.get('HEAD_TURN', -0.6))  # ...head turned back toward us
PITCH = math.radians(14)

UBC = f"{ROOT}/ubc/Universal Base Characters[Standard]"
OUTFIT = f"{ROOT}/outfits/Modular Character Outfits - Fantasy[Standard]/Exports/glTF (Godot-Unreal)/Outfits/Male_Ranger.gltf"
ANIMS = f"{ROOT}/ual/Universal Animation Library[Standard]/Unreal-Godot/UAL1_Standard.glb"

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene


def imp(path):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    return [o for o in bpy.data.objects if o not in before]


base = imp(f"{UBC}/Base Characters/Godot - UE/Superhero_Male_FullBody.gltf")
outfit = imp(OUTFIT)
hair = imp(f"{UBC}/Hairstyles/Rigged to Head Bone/glTF (Godot -Unreal)/Hair_SimpleParted.gltf")
anim_objs = imp(ANIMS)

rig = next(o for o in base if o.type == 'ARMATURE')
# Everything follows one skeleton; drop helper meshes and the mannequin.
for o in outfit + hair + anim_objs + base:
    if o.type == 'MESH' and (o.name.startswith('Icosphere') or o.name == 'Mannequin'):
        o.hide_render = True
    if o.type == 'MESH':
        for m in o.modifiers:
            if m.type == 'ARMATURE':
                m.object = rig
    if o.type == 'ARMATURE' and o is not rig:
        o.hide_render = True
for o in outfit:
    if any(k and k in o.name for k in os.environ.get('HIDE', 'Head_Hood').split(',')):
        o.hide_render = True
# The outfit covers the body; keep only the base head (it pokes through otherwise).
body = next(o for o in base if o.type == 'MESH' and o.name.startswith('SuperHero'))
vg_keep = {'Head', 'neck_01'}
idx_keep = {g.index for g in body.vertex_groups if g.name in vg_keep}
import bmesh
bm = bmesh.new(); bm.from_mesh(body.data)
deform = bm.verts.layers.deform.active
kill = [v for v in bm.verts if not any(i in idx_keep and w > 0.5 for i, w in v[deform].items())]
bmesh.ops.delete(bm, geom=kill, context='VERTS')
bm.to_mesh(body.data); bm.free()

# ---- Our own sword (not from any pack): blade, guard, grip, parented to the right hand ----
def box(name, size, loc, color):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o = bpy.context.object; o.name = name; o.scale = size
    bpy.ops.object.transform_apply(scale=True)
    m = bpy.data.materials.new(name + '_mat'); m.diffuse_color = color
    o.data.materials.append(m)
    return o

blade = box('Blade', (0.07, 0.02, 0.8), (0, 0, 0.47), (0.78, 0.82, 0.9, 1))
guard = box('Guard', (0.26, 0.06, 0.05), (0, 0, 0.07), (0.85, 0.65, 0.2, 1))
grip = box('Grip', (0.05, 0.05, 0.18), (0, 0, -0.02), (0.35, 0.2, 0.12, 1))
bpy.ops.object.select_all(action='DESELECT')
for o in (blade, guard, grip): o.select_set(True)
bpy.context.view_layer.objects.active = blade
bpy.ops.object.join()
sword = blade; sword.name = 'Sword'
sword.parent = rig; sword.parent_type = 'BONE'; sword.parent_bone = 'hand_r'
sword.matrix_parent_inverse.identity()
# Bone space: Y runs along the hand; the blade sticks out of the fist along the bone's Z.
sword.location = (0.0, -bpy.data.objects[rig.name].data.bones['hand_r'].length * 0.0 + 0.02, 0.0)
sword.rotation_euler = Euler((math.radians(-90), 0, 0))


def set_action(name):
    act = bpy.data.actions[name]
    ad = rig.animation_data or rig.animation_data_create()
    ad.action = act
    if hasattr(ad, 'action_slot') and len(getattr(act, 'slots', [])):
        ad.action_slot = act.slots[0]
    return act


def pose(action, t):
    act = set_action(action)
    f0, f1 = act.frame_range
    scene.frame_set(int(round(f0 + (f1 - f0) * t)))
    # Freeze this frame's pose, then stop the clip so our tweaks survive the render.
    rig.animation_data.action = None
    pb = rig.pose.bones
    pb['Head'].scale = (HEAD_SCALE,) * 3
    # Turn the head back toward the camera, on top of the clip's own head pose.
    pb['Head'].rotation_mode = 'QUATERNION'
    from mathutils import Quaternion
    pb['Head'].rotation_quaternion = pb['Head'].rotation_quaternion @ Quaternion((0, 1, 0), HEAD_TURN)
    bpy.context.view_layer.update()


# ---- Camera: orthographic, 3/4 battle angle ----
cam_data = bpy.data.cameras.new('cam'); cam_data.type = 'ORTHO'
cam = bpy.data.objects.new('cam', cam_data); scene.collection.objects.link(cam); scene.camera = cam
pose('Sword_Idle', 0)
pts = [rig.matrix_world @ b.head for b in rig.pose.bones]
zmin, zmax = min(p.z for p in pts), max(p.z for p in pts)
height = (zmax - zmin) + 0.35 * HEAD_SCALE
target = Vector((0, 0, zmin + height * 0.47))
dist = 10
d = Vector((-math.sin(CAM_YAW) * math.cos(PITCH), -math.cos(CAM_YAW) * math.cos(PITCH), math.sin(PITCH)))
cam.location = target + d * dist
cam.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler()
cam_data.ortho_scale = height * 1.45

r = scene.render
r.engine = 'BLENDER_WORKBENCH'
r.resolution_x = r.resolution_y = SIZE * SS
r.film_transparent = True
r.image_settings.file_format = 'PNG'; r.image_settings.color_mode = 'RGBA'
scene.view_settings.view_transform = 'Standard'
sh = scene.display.shading
scene.display.render_aa = 'OFF'
sh.show_specular_highlight = False; sh.show_cavity = False; sh.show_shadows = False
sh.show_object_outline = False


def render_pass(light, color_type):
    sh.light = light; sh.color_type = color_type
    if color_type == 'SINGLE': sh.single_color = (1, 1, 1)
    path = os.path.join(bpy.app.tempdir, f'pass_{light}_{color_type}.png')
    r.filepath = path
    bpy.ops.render.render(write_still=True)
    img = bpy.data.images.load(path)
    a = np.array(img.pixels[:], dtype=np.float32).reshape(img.size[1], img.size[0], 4)[::-1]
    bpy.data.images.remove(img)
    return a


def stylize(albedo, shade, ids):
    H = W = SIZE
    S = SS
    alpha = (ids[..., 3] > 0.5)
    key = (np.round(ids[..., 0] * 255).astype(np.int32) << 16) | (np.round(ids[..., 1] * 255).astype(np.int32) << 8) | np.round(ids[..., 2] * 255).astype(np.int32)
    key[~alpha] = -1
    out_id = np.full((H, W), -1, np.int32)
    out_alb = np.zeros((H, W, 3), np.float32)
    out_sh = np.zeros((H, W), np.float32)
    for y in range(H):
        for x in range(W):
            k = key[y*S:(y+1)*S, x*S:(x+1)*S].ravel()
            if (k >= 0).sum() < S * S / 2: continue
            vals, cnt = np.unique(k[k >= 0], return_counts=True)
            m = vals[cnt.argmax()]
            sel = (key[y*S:(y+1)*S, x*S:(x+1)*S] == m)
            out_id[y, x] = m
            out_alb[y, x] = albedo[y*S:(y+1)*S, x*S:(x+1)*S, :3][sel].mean(0)
            out_sh[y, x] = shade[y*S:(y+1)*S, x*S:(x+1)*S, 0][sel].mean()
    solid = out_id >= 0

    # Flatten texture noise: within each part, snap albedo to a few base colors.
    def to_hsv(c):
        mx, mn = c.max(-1), c.min(-1); d = mx - mn + 1e-6
        h = np.where(mx == c[..., 0], ((c[..., 1] - c[..., 2]) / d) % 6, np.where(mx == c[..., 1], (c[..., 2] - c[..., 0]) / d + 2, (c[..., 0] - c[..., 1]) / d + 4)) / 6
        return h, np.where(mx > 0, d / (mx + 1e-6), 0), mx
    def from_hsv(h, s, v):
        i = np.floor(h * 6) % 6; f = h * 6 - np.floor(h * 6)
        p, q, t = v * (1 - s), v * (1 - s * f), v * (1 - s * (1 - f))
        return np.stack([np.choose(i.astype(int), [v, q, p, p, t, v]), np.choose(i.astype(int), [t, v, v, q, p, p]), np.choose(i.astype(int), [p, p, t, v, v, q])], -1)
    h, s, v = to_hsv(out_alb)
    # Our palette: brighter and more saturated than the realistic texture, then posterized.
    v = np.round((0.22 + 0.95 * v) * 6) / 6
    s = np.clip(s * 1.35 + 0.05, 0, 1)

    # Clean clusters: snap each pixel to a small color set, then a 3x3 majority vote
    # inside each part, so texture speckle becomes flat clumps.
    qh = np.round(h * 16) % 16; qs = np.round(s * 4); qv = np.round(v * 6)
    q = (qh * 100 + qs * 10 + qv).astype(np.int32)
    q[~solid] = -1
    q2 = q.copy()
    for _ in range(2):
        for y in range(1, H - 1):
            for x in range(1, W - 1):
                if q[y, x] < 0: continue
                win = q[y-1:y+2, x-1:x+2]; ids_w = out_id[y-1:y+2, x-1:x+2]
                cand = win[(ids_w == out_id[y, x]) & (win >= 0)]
                vals, cnt = np.unique(cand, return_counts=True)
                if cnt.max() >= 5: q2[y, x] = vals[cnt.argmax()]
        q = q2.copy()
    h = np.where(solid, (q // 100) / 16, h); s = np.where(solid, ((q // 10) % 10) / 4, s); v = np.where(solid, (q % 10) / 6, v)

    # Three bands from the lighting pass, hue-shifted: shadows cooler, lights warmer.
    band = np.where(out_sh < 0.42, 0, np.where(out_sh < 0.8, 1, 2))
    hs = np.where(band == 0, h + 0.03, np.where(band == 2, h - 0.02, h)) % 1
    vs = np.clip(np.where(band == 0, v * 0.66, np.where(band == 2, v * 1.15 + 0.06, v)), 0, 1)
    ss = np.clip(np.where(band == 0, s * 1.1 + 0.05, np.where(band == 2, s * 0.85, s)), 0, 1)
    col = from_hsv(hs, ss, vs)

    img = np.zeros((H, W, 4), np.float32)
    img[solid, :3] = col[solid]; img[solid, 3] = 1
    # Lines where one part meets another (drawn on the part below/right, 1 px).
    for dy, dx in ((0, 1), (1, 0)):
        a = out_id[:H-dy, :W-dx]; b = out_id[dy:, dx:]
        edge = (a >= 0) & (b >= 0) & (a != b)
        tgt = img[dy:, dx:]
        tgt[edge, :3] = np.minimum(tgt[edge, :3], from_hsv(hs[dy:, dx:][edge], np.clip(ss[dy:, dx:][edge] + 0.15, 0, 1), v[dy:, dx:][edge] * 0.42))
    # Outer outline: each part's own darkest tone.
    out = img.copy()
    for y in range(H):
        for x in range(W):
            if solid[y, x]: continue
            for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                yy, xx = y + dy, x + dx
                if 0 <= yy < H and 0 <= xx < W and solid[yy, xx]:
                    out[y, x, :3] = from_hsv(np.array(hs[yy, xx]), np.array(min(1, ss[yy, xx] + 0.2)), np.array(v[yy, xx] * 0.28)); out[y, x, 3] = 1
                    break
    return out


frames = [tuple((f.split(':')[0], float(f.split(':')[1]))) for f in os.environ.get('FRAMES', 'Sword_Idle:0,Sword_Idle:0.5,Sword_Attack:0.15,Sword_Attack:0.25,Sword_Attack:0.3,Sword_Attack:0.45,Sword_Attack:0.6,Sword_Attack:0.8').split(',')]
strip = np.zeros((SIZE, SIZE * len(frames), 4), np.float32)
for i, (act, t) in enumerate(frames):
    pose(act, t)
    alb = render_pass('FLAT', 'TEXTURE')
    shd = render_pass('STUDIO', 'SINGLE')
    ids = render_pass('FLAT', 'RANDOM')
    strip[:, i*SIZE:(i+1)*SIZE] = stylize(alb, shd, ids)
    print('frame', i, act, t)

img = bpy.data.images.new('strip', strip.shape[1], strip.shape[0], alpha=True)
img.pixels = strip[::-1].ravel().tolist()
img.filepath_raw = OUT; img.file_format = 'PNG'; img.save()
print('wrote', OUT)
