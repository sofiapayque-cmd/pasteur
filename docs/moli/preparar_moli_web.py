"""Prepara una COPIA de moli.blend para la web (moli-web.blend + moli.glb).
No cambia colores, materiales ni formas de lo que ya existe:
- boca: una sola salida de material (con dos, el glTF la exportaba blanca);
- piernitas (opción B): dos trazos finos con el material de la boca, como las "patas" del Moli 2D;
- jerarquía: MOLI > Cuerpo (respira) > oxígeno, cara y hombros (de donde giran los hidrógenos); MOLI > caderas > piernas;
- se borran los materiales que no usa nadie.
"""
import bpy, sys
from mathutils import Vector
entrada, salida_blend, salida_glb = sys.argv[-3], sys.argv[-2], sys.argv[-1]
bpy.ops.wm.open_mainfile(filepath=entrada)
D = bpy.data; sc = bpy.context.scene
col = D.collections['Collection']

# 1 · boca: queda solo la salida conectada al Principled BSDF
boca = D.materials['05 | Boca · negro mate']
nt = boca.node_tree
for n in list(nt.nodes):
    if n.type == 'BSDF_DIFFUSE' or (n.type == 'OUTPUT_MATERIAL' and n.name != 'Material Output'):
        nt.nodes.remove(n)
nt.nodes['Material Output'].is_active_output = True
nt.nodes['Material Output'].target = 'ALL'  # estaba solo para EEVEE: el glTF no la veía
boca.diffuse_color = nt.nodes['Principled BSDF'].inputs['Base Color'].default_value[:]

def vacio(nombre, loc):
    e = D.objects.new(nombre, None); col.objects.link(e); e.empty_display_size = 0.25; e.location = loc
    return e
def colgar(ob, padre):
    bpy.context.view_layer.update()
    mw = ob.matrix_world.copy(); ob.parent = padre; ob.matrix_parent_inverse = padre.matrix_world.inverted(); ob.matrix_world = mw

O = lambda n: D.objects['MOLI | ' + n]
CENTRO = Vector((0, 0, 1.55))

# 2 · jerarquía
raiz = vacio('MOLI', Vector((0, 0, 0)))
cuerpo = vacio('MOLI | Cuerpo', CENTRO); colgar(cuerpo, raiz)
for n in ['Oxígeno (principal)', 'Ojo izquierdo', 'Ojo derecho', 'Mejilla izquierdo', 'Mejilla derecho', 'Sonrisa (curva editable)']:
    colgar(O(n), cuerpo)
for lado, nombre in [('izquierdo', 'Hidrógeno izquierdo'), ('derecho', 'Hidrógeno derecho')]:
    hombro = vacio('MOLI | Hombro ' + lado, CENTRO); colgar(hombro, cuerpo); colgar(O(nombre), hombro)

# 3 · piernitas: trazo fino (bisel 0,036) con el material de la boca, origen en la cadera
for lado, s in [('izquierda', -1), ('derecha', 1)]:
    cadera = vacio('MOLI | Cadera ' + lado, Vector((s * 0.22, -0.55, 0.62))); colgar(cadera, raiz)
    cu = D.curves.new('Pierna ' + lado, 'CURVE'); cu.dimensions = '3D'; cu.bevel_depth = 0.036; cu.bevel_resolution = 4; cu.use_fill_caps = True; cu.resolution_u = 12
    sp = cu.splines.new('POLY'); pts = [(0, 0, 0), (0, 0, -0.78), (s * 0.16, -0.06, -0.80)]
    sp.points.add(len(pts) - 1)
    for p, c in zip(sp.points, pts): p.co = (*c, 1)
    cu.materials.append(boca)
    pierna = D.objects.new('MOLI | Pierna ' + lado, cu); col.objects.link(pierna)
    pierna.parent = cadera; pierna.location = (0, 0, 0)

# 4 · materiales sin usar
for m in list(D.materials):
    if m.users == 0: D.materials.remove(m)
bpy.ops.outliner.orphans_purge(do_recursive=True) if hasattr(bpy.ops.outliner, 'orphans_purge') else None

bpy.ops.wm.save_as_mainfile(filepath=salida_blend, copy=True)

# 5 · GLB: solo Moli (sin cámara ni luces), +Y arriba
bpy.ops.object.select_all(action='DESELECT')
for o in D.objects:
    if o.name == 'MOLI' or o.name.startswith('MOLI | '): o.select_set(True)
print('glb', bpy.ops.export_scene.gltf(filepath=salida_glb, export_format='GLB', use_selection=True, export_apply=True, export_yup=True, export_extras=False))
print('materiales', [(m.name, m.users) for m in D.materials])
