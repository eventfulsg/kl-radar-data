import sys, os
from playwright.sync_api import sync_playwright

BASE = os.path.dirname(os.path.abspath(__file__))

def main():
    page_file = sys.argv[1]                     # e.g. slide1.html
    mode = sys.argv[2]                          # 'still' or 'video'
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path='/opt/pw-browsers/chromium')
        pg = b.new_page(viewport={'width':1080,'height':1350}, device_scale_factor=1)
        pg.goto('file://' + os.path.join(BASE, page_file))
        pg.wait_for_timeout(400)
        if mode == 'still':
            t = float(sys.argv[3]) if len(sys.argv) > 3 else 0.0
            out = sys.argv[4] if len(sys.argv) > 4 else 'still.png'
            if pg.evaluate("typeof window.seek === 'function'"):
                pg.evaluate(f"window.seek({t})")
            pg.screenshot(path=os.path.join(BASE, out))
            print('wrote', out)
        else:
            fps = 30; dur = 5.0
            n = int(fps*dur)
            outdir = os.path.join(BASE, 'vframes')
            os.makedirs(outdir, exist_ok=True)
            for i in range(n):
                pg.evaluate(f"window.seek({i/fps})")
                pg.screenshot(path=os.path.join(outdir, f'f_{i:04d}.png'))
                if i % 30 == 0: print('frame', i)
            print('done', n, 'frames')
        b.close()

if __name__ == '__main__':
    main()
