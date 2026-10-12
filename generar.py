# Genera los íconos de la app (una casa con un calendario). Uso: python generar.py
from pathlib import Path
from PIL import Image, ImageDraw

AQUI = Path(__file__).parent
FONDO = (15, 118, 110)
BLANCO = (255, 255, 255)

def icono(tam, margen):
    img = Image.new('RGB', (tam, tam), FONDO)
    d = ImageDraw.Draw(img)
    u = (tam - 2 * margen) / 100  # unidad sobre una grilla de 100
    p = lambda x, y: (margen + x * u, margen + y * u)
    d.polygon([p(50, 12), p(90, 46), p(80, 46), p(80, 88), p(20, 88), p(20, 46), p(10, 46)], fill=BLANCO)
    # calendario dentro de la casa
    d.rectangle([p(32, 52), p(68, 80)], fill=FONDO)
    d.rectangle([p(32, 52), p(68, 59)], fill=(94, 234, 212))
    for fila in range(2):
        for col in range(3):
            x, y = 37 + col * 10, 63 + fila * 8
            d.rectangle([p(x, y), p(x + 5, y + 4)], fill=BLANCO)
    return img

icono(192, 18).save(AQUI / 'icon-192.png')
icono(512, 48).save(AQUI / 'icon-512.png')
icono(512, 110).save(AQUI / 'icon-maskable-512.png')
print('ok')
