"""Render de respaldo de Moli sentada (para cuando no hay WebGL o mientras carga el 3D)."""
import bpy, sys, math
from mathutils import Vector
bpy.ops.wm.open_mainfile(filepath=sys.argv[-2])
D = bpy.data; sc = bpy.context.scene
sc.render.film_transparent = True; sc.cycles.samples = 128; sc.cycles.use_denoising = True; sc.cycles.device = 'CPU'
sc.render.resolution_x = sc.render.resolution_y = 900
cam = D.objects['Cámara']; cam.data.type = 'ORTHO'; cam.data.ortho_scale = 6.4
obj = Vector((0, 0, 1.1)); t = math.radians(7)
cam.location = obj + Vector((0, -math.cos(t) * 10, math.sin(t) * 10)); cam.rotation_euler = (obj - cam.location).to_track_quat('-Z', 'Y').to_euler()
D.objects['MOLI'].rotation_euler = (0, 0, math.radians(3))  # casi de frente, como estadoSentada (moli.ts)
# sentada con las rodillas dobladas: igual que PIERNAS_SENTADA en src/components/rol/moli.ts
MUSLO_ADELANTE, APERTURA, RODILLAS, CIERRE = 35, 58, 35, 58
for lado, s in (('izquierda', -1), ('derecha', 1)):
    D.objects['MOLI | Cadera ' + lado].rotation_euler = (math.radians(-MUSLO_ADELANTE), math.radians(-s * APERTURA), 0)
    D.objects['MOLI | Rodilla ' + lado].rotation_euler = (math.radians(RODILLAS), math.radians(s * CIERRE), 0)
sc.render.filepath = sys.argv[-1]
bpy.ops.render.render(write_still=True)
