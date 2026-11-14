"""Prepara una COPIA de moli.blend para la web (moli-web.blend + moli.glb).
No cambia colores, materiales ni formas de lo que ya existe:
- boca: una sola salida de material (con dos, el glTF la exportaba blanca);
- piernitas (opción B): trazos finos con el material de la boca, como las "patas" del Moli 2D,
  con rodilla (muslo + pantorrilla), para que pueda sentarse con las piernas dobladas;
- jerarquía: MOLI > Cuerpo (respira) > oxígeno, cara y hombros (de donde giran los hidrógenos);
  MOLI > Cadera > muslo y Rodilla > articulación y pantorrilla;
- se borran los materiales que no usa nadie.
"""
import bpy, bmesh, sys
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

# 3 · piernitas con rodilla: trazo fino (bisel 0,036) con el material de la boca.
#     Muslo desde la cadera; en la rodilla, una esferita del mismo grosor (para que doblada quede redonda)
#     y la pantorrilla con el pie. Cada articulación es un Empty: Cadera (gira el muslo) y Rodilla (gira la pantorrilla).
MUSLO, PANTORRILLA, GROSOR = 0.40, 0.42, 0.036

def trazo(nombre, puntos, padre):
    cu = D.curves.new(nombre, 'CURVE'); cu.dimensions = '3D'; cu.bevel_depth = GROSOR; cu.bevel_resolution = 4; cu.use_fill_caps = True; cu.resolution_u = 12
    sp = cu.splines.new('POLY'); sp.points.add(len(puntos) - 1)
    for p, c in zip(sp.points, puntos): p.co = (*c, 1)
    cu.materials.append(boca)
    ob = D.objects.new('MOLI | ' + nombre, cu); col.objects.link(ob)
    ob.parent = padre; ob.location = (0, 0, 0)
    return ob

for lado, s in [('izquierda', -1), ('derecha', 1)]:
    cadera = vacio('MOLI | Cadera ' + lado, Vector((s * 0.22, -0.55, 0.62))); colgar(cadera, raiz)
    trazo('Muslo ' + lado, [(0, 0, 0), (0, 0, -MUSLO)], cadera)
    rodilla = D.objects.new('MOLI | Rodilla ' + lado, None); col.objects.link(rodilla); rodilla.empty_display_size = 0.15
    rodilla.parent = cadera; rodilla.location = (0, 0, -MUSLO)
    malla = D.meshes.new('Rodilla ' + lado)
    bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=16, v_segments=10, radius=GROSOR); bm.to_mesh(malla); bm.free()
    for poli in malla.polygons: poli.use_smooth = True
    malla.materials.append(boca)
    articulacion = D.objects.new('MOLI | Articulación ' + lado, malla); col.objects.link(articulacion)
    articulacion.parent = rodilla; articulacion.location = (0, 0, 0)
    trazo('Pantorrilla ' + lado, [(0, 0, 0), (0, 0, -PANTORRILLA), (s * 0.16, -0.06, -(PANTORRILLA + 0.02))], rodilla)

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
