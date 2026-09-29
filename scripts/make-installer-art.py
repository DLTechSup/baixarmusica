# Gera as imagens do instalador do Windows (NSIS) com a marca Sonora / DLTechSup.
# Uso: python scripts/make-installer-art.py   (requer Pillow e node_modules instalado)
from PIL import Image, ImageDraw, ImageFont

FONT = 'node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2'
PINK, VIOLET, BG = (255, 95, 143), (139, 92, 246), (11, 11, 18)
K = 4  # desenha em 4x e reduz, para suavizar


def font(size, weight):
    f = ImageFont.truetype(FONT, size * K)
    f.set_variation_by_axes([weight])
    return f


def background(w, h):
    img = Image.new('RGB', (w * K, h * K), BG)
    glow = Image.new('RGB', img.size, BG)
    px = glow.load()
    W, H = img.size
    for y in range(H):
        for x in range(W):
            # brilho rosa no topo-esquerda e violeta embaixo-direita
            a = max(0.0, 1 - (((x / W) ** 2 + (y / H) ** 2) ** 0.5) / 0.9) * 0.45
            b = max(0.0, 1 - ((((1 - x / W)) ** 2 + ((1 - y / H)) ** 2) ** 0.5) / 0.9) * 0.4
            px[x, y] = tuple(int(BG[i] + (PINK[i] - BG[i]) * a + (VIOLET[i] - BG[i]) * b) for i in range(3))
    return glow


def gradient_text(img, xy, text, f, anchor='la'):
    mask = Image.new('L', img.size, 0)
    ImageDraw.Draw(mask).text(xy, text, font=f, fill=255, anchor=anchor)
    box = mask.getbbox()
    grad = Image.new('RGB', img.size)
    g = ImageDraw.Draw(grad)
    x0, x1 = box[0], max(box[2], box[0] + 1)
    for x in range(img.size[0]):
        t = min(1, max(0, (x - x0) / (x1 - x0)))
        g.line([(x, 0), (x, img.size[1])], fill=tuple(int(PINK[i] + (VIOLET[i] - PINK[i]) * t) for i in range(3)))
    img.paste(grad, (0, 0), mask)


def sidebar(path):
    w, h = 164, 314
    img = background(w, h)
    d = ImageDraw.Draw(img)
    icon = Image.open('build/icon.png').convert('RGBA').resize((64 * K, 64 * K), Image.LANCZOS)
    img.paste(icon, ((w * K - icon.width) // 2, 56 * K), icon)
    gradient_text(img, (w * K // 2, 142 * K), 'Sonora', font(30, 800), anchor='ma')
    d.text((w * K // 2, 184 * K), 'Suas músicas em MP3', font=font(11, 500), fill=(200, 200, 215), anchor='ma')
    d.line([(52 * K, 262 * K), (112 * K, 262 * K)], fill=(60, 60, 78), width=K)
    d.text((w * K // 2, 272 * K), 'desenvolvido por', font=font(9, 500), fill=(150, 150, 168), anchor='ma')
    d.text((w * K // 2, 286 * K), 'DLTechSup', font=font(13, 700), fill=(242, 242, 247), anchor='ma')
    img.resize((w, h), Image.LANCZOS).save(path)


def header(path):
    w, h = 150, 57
    img = Image.new('RGB', (w * K, h * K), (255, 255, 255))
    d = ImageDraw.Draw(img)
    icon = Image.open('build/icon.png').convert('RGBA').resize((34 * K, 34 * K), Image.LANCZOS)
    img.paste(icon, (8 * K, 11 * K), icon)
    gradient_text(img, (50 * K, 12 * K), 'Sonora', font(17, 800))
    d.text((50 * K, 35 * K), 'por DLTechSup', font=font(9, 600), fill=(110, 110, 130))
    img.resize((w, h), Image.LANCZOS).save(path)


sidebar('build/installerSidebar.bmp')
sidebar('build/uninstallerSidebar.bmp')
header('build/installerHeader.bmp')
