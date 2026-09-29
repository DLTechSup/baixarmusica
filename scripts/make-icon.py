from PIL import Image, ImageDraw
S = 2048
grad = Image.new('RGB', (S, S))
px = grad.load()
a, b = (255, 95, 143), (139, 92, 246)
for y in range(S):
    for x in range(S):
        t = (x + y) / (2 * S)
        px[x, y] = tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))
mask = Image.new('L', (S, S), 0)
m = S * 0.06
ImageDraw.Draw(mask).rounded_rectangle([m, m, S - m, S - m], radius=S * 0.22, fill=255)
img = Image.new('RGBA', (S, S), (0, 0, 0, 0))
img.paste(grad, (0, 0), mask)
d = ImageDraw.Draw(img)
k = S / 32  # coordenadas do SVG do logo (viewBox 32)
w = int(2.4 * k)
d.line([(13 * k, 20.3 * k), (13 * k, 10.5 * k), (22 * k, 8.5 * k), (22 * k, 18.3 * k)], fill='white', width=w, joint='curve')
for cx, cy in [(13, 10.5), (22, 8.5)]:
    d.ellipse([cx * k - w / 2, cy * k - w / 2, cx * k + w / 2, cy * k + w / 2], fill='white')
for cx, cy in [(11, 21.5), (20, 19.5)]:
    r = 2.9 * k
    d.ellipse([cx * k - r, cy * k - r, cx * k + r, cy * k + r], fill='white')
img = img.resize((1024, 1024), Image.LANCZOS)
img.save('build/icon.png')
img.resize((256, 256), Image.LANCZOS).save('build/icon.ico', sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
