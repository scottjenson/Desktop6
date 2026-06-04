/* Background grid — a direct port of Demo 2's (Desktop5's) UX Tension Grid shader.
   Demo 2 renders this as a Three.js ShaderMaterial on a full-desktop plane; Demo 3
   used to bake it to an 8 MB PNG, which caused a heavy reswap when tabbing between
   the demos. Here we run the SAME fragment shader on a plain WebGL full-screen quad,
   drawn once (static), so the background is pixel-faithful with ~no asset weight.

   The grid is drawn into a 3440×1440 (×supersample) canvas that CSS-scales with the
   stage, matching how the PNG was captured and displayed. Resting uniform values are
   the post-reveal state (warpStrength = WARP_STRENGTH, reveal = 1.0), because Demo 3
   opens after Demo 2 has already revealed the grid. */

// IIFE so these constants don't collide with stage.js's globals (plain <script> tags
// share one global scope).
(function () {

// ── Config (copied verbatim from Desktop5 js/config.js) ──
const DESKTOP_W = 3440, DESKTOP_H = 1440;
const RENDER_SUPERSAMPLE = 2;
const WARP_DEADZONE = 0.5;
const WARP_POWER = 3.0;
const WARP_STRENGTH = 1.33;
const GRID_CELL_PX = 86;
const GRID_LINE_CORE_PX = 1.5;
const GRID_LINE_GLOW_PX = 6.0;
const GRID_GLOW_STRENGTH = 0.5;
const GRID_EDGE_FADE_START = 0.65;
const GRID_INTENSITY = 0.5;

// sRGB → linear (matches THREE.Color, which linearizes hex literals before passing
// them to the shader). Without this our raw sRGB values render too bright/desaturated.
function srgbToLinear(c) {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}
function hexColor(hex) {
  return [
    srgbToLinear(((hex >> 16) & 255) / 255),
    srgbToLinear(((hex >> 8) & 255) / 255),
    srgbToLinear((hex & 255) / 255),
  ];
}

// Full-screen quad in clip space; vUv spans 0..1 across the canvas.
const VERT = `
  attribute vec2 a_pos;
  varying vec2 vUv;
  void main() {
    vUv = a_pos * 0.5 + 0.5;
    gl_Position = vec4(a_pos, 0.0, 1.0);
  }
`;

// Fragment shader — copied from Desktop5 js/main.js (_fragSrc), unchanged except for
// the GLSL ES 1.0 derivatives extension pragma that Three.js injected automatically.
const FRAG = `#extension GL_OES_standard_derivatives : enable
precision highp float;

  uniform float u_freqX;
  uniform float u_freqY;
  uniform float u_deadZone;
  uniform float u_warpPower;
  uniform float u_warpStrength;
  uniform float u_coreWidth;
  uniform float u_glowWidth;
  uniform float u_glowStrength;
  uniform float u_edgeFadeStart;
  uniform float u_gridIntensity;
  uniform float u_reveal;
  uniform vec3  u_bgColor;
  uniform vec3  u_doorColor;
  uniform vec3  u_lineColor;
  uniform vec3  u_glowColor;
  varying vec2 vUv;

  void main() {
    float centerX = (vUv.x - 0.5) * 2.0;
    float centerY = (vUv.y - 0.5) * 2.0;

    float flankDist = max(0.0, abs(centerX) - u_deadZone) / (1.0 - u_deadZone);

    float warp = pow(flankDist, u_warpPower) * u_warpStrength;
    float gridXcoord = centerX + sign(centerX) * warp;

    float innerDeriv = 1.0 / (1.0 - u_deadZone);
    float derivative = u_warpPower * pow(flankDist, max(0.0, u_warpPower - 1.0)) * u_warpStrength * innerDeriv;
    float localScale = 1.0 / (1.0 + derivative);

    float gridYcoord = centerY / localScale;

    vec2 gridUv = vec2(gridXcoord * u_freqX, gridYcoord * u_freqY) * 0.5;

    vec2 gridDist = abs(fract(gridUv - 0.5) - 0.5) / fwidth(gridUv);
    float line = min(gridDist.x, gridDist.y);

    float core = 1.0 - smoothstep(0.0, u_coreWidth, line);
    float glow = exp(-line / u_glowWidth) * u_glowStrength;

    float density = length(fwidth(gridUv));
    core *= 1.0 - smoothstep(0.35, 0.7, density);

    float edgeFade = 1.0 - smoothstep(u_edgeFadeStart, 1.0, abs(centerX));
    core *= edgeFade;
    glow *= edgeFade;

    vec3 col = u_bgColor;
    col += u_glowColor * glow * u_gridIntensity;
    col = mix(col, u_lineColor, core * u_gridIntensity);

    float doorT = step(u_reveal, abs(centerX));
    vec3 finalCol = mix(clamp(col, 0.0, 1.0), u_doorColor, doorT);

    gl_FragColor = vec4(finalCol, 1.0);
  }
`;

function compile(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    throw new Error('Grid shader compile error: ' + gl.getShaderInfoLog(sh));
  }
  return sh;
}

function drawGrid(canvas) {
  const gl = canvas.getContext('webgl', { antialias: true, preserveDrawingBuffer: false });
  if (!gl) { console.warn('grid-bg: WebGL unavailable, falling back to bg color'); return; }
  gl.getExtension('OES_standard_derivatives');

  canvas.width  = DESKTOP_W * RENDER_SUPERSAMPLE;
  canvas.height = DESKTOP_H * RENDER_SUPERSAMPLE;
  gl.viewport(0, 0, canvas.width, canvas.height);

  const prog = gl.createProgram();
  gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    throw new Error('Grid program link error: ' + gl.getProgramInfoLog(prog));
  }
  gl.useProgram(prog);

  // Full-screen quad (two triangles)
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -1,  1, -1,  -1, 1,
    -1,  1,  1, -1,   1, 1,
  ]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'a_pos');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  // Uniforms — resting (post-reveal) values
  const set1f = (name, v) => gl.uniform1f(gl.getUniformLocation(prog, name), v);
  const set3f = (name, c) => gl.uniform3f(gl.getUniformLocation(prog, name), c[0], c[1], c[2]);
  set1f('u_freqX', DESKTOP_W / GRID_CELL_PX);
  set1f('u_freqY', DESKTOP_H / GRID_CELL_PX);
  set1f('u_deadZone', WARP_DEADZONE);
  set1f('u_warpPower', WARP_POWER);
  set1f('u_warpStrength', WARP_STRENGTH);   // resting (revealed) value
  set1f('u_coreWidth', GRID_LINE_CORE_PX);
  set1f('u_glowWidth', GRID_LINE_GLOW_PX);
  set1f('u_glowStrength', GRID_GLOW_STRENGTH);
  set1f('u_edgeFadeStart', GRID_EDGE_FADE_START);
  set1f('u_gridIntensity', GRID_INTENSITY);
  set1f('u_reveal', 1.0);                   // doors fully open
  set3f('u_bgColor',   hexColor(0x0d1b3e));
  set3f('u_doorColor', hexColor(0xaaaadd));
  set3f('u_lineColor', hexColor(0xe6eeff));
  set3f('u_glowColor', hexColor(0x0a84ff));

  gl.drawArrays(gl.TRIANGLES, 0, 6);
}

const canvas = document.getElementById('grid-bg');
if (canvas) {
  try { drawGrid(canvas); }
  catch (e) { console.error('grid-bg failed:', e); }
}

})();
