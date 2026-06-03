WALLPAPER — generate it with the Demo 2 grid-export tool (do NOT screenshot).

The warped-grid background in Demo 2 is a Three.js shader, not an image asset. To get a
pixel-faithful PNG, a throwaway generator page was built that reuses Demo 2's REAL
config.js constants and the SAME shader, rendered flat (orthographic) at 2× resolution.

TO PRODUCE wallpaper.png:
  1. In the Demo 2 project, serve over HTTP:   python3 -m http.server 8000
  2. Open:  http://localhost:8000/grid-export.html
  3. Click "Download wallpaper.png"  →  saves a 6880×2880 PNG.
  4. Drop it here as:  assets/wallpaper.png
  5. (Optional) delete grid-export.html from the Demo 2 project — it's throwaway.

base.css already references it:
  #wallpaper { background: url('../assets/wallpaper.png') center / cover no-repeat; }

Notes:
  • The generator bakes the STEADY-STATE look: u_warpStrength = WARP_STRENGTH (1.33) and
    u_reveal = 1.0 (doors fully open). Demo 2 animates 0 → that at load; we want the
    settled frame.
  • Background color 0x0d1b3e (deep navy) is baked in, matching Demo 2's u_bgColor.
  • Rendered orthographically (flat), which is correct for a flat DOM background — Demo 2's
    tiny perspective foreshortening at z≈0 is intentionally dropped.

Until the PNG exists, #wallpaper falls back to flat dark navy (#0a0e1a) and the demo
still runs — it just won't have the grid behind it.
