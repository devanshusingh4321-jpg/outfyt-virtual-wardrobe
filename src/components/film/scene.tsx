import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { LineSegments2 } from "three/examples/jsm/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/examples/jsm/lines/LineSegmentsGeometry.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { VignetteShader } from "three/examples/jsm/shaders/VignetteShader.js";
import {
  S,
  RAW,
  ROLE,
  gates,
  spine,
  spineLook,
  WEB,
  strandT,
  anchorOf,
  sagOf,
  strandAlpha,
  smoothstep,
  clamp01,
  bell,
  lerp,
  pullHue,
  HUE_SCARLET,
  HUE_COBALT,
} from "@/lib/film/core";
import plateUrl from "@/assets/figure-plate.png";

/* =================================================================== */
/* THE FIGURE — instanced bead cloud sampled from one masked plate     */
/* =================================================================== */

const FIGURE_HEIGHT = 14;
const FIGURE_CENTRE = new THREE.Vector3(0, 9, 0);
const MAX_BEADS = 40000;

type Sample = { pos: Float32Array; col: Float32Array; count: number };

function sampleplate(img: HTMLImageElement, target: number): Sample {
  const W = 220;
  const H = Math.round((img.height / img.width) * W);
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(img, 0, 0, W, H);
  const data = ctx.getImageData(0, 0, W, H).data;

  const hits: number[] = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      if (data[i + 3] > 140) hits.push(i);
    }
  }
  const count = Math.min(target, hits.length);
  const step = hits.length / count;

  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const scale = FIGURE_HEIGHT / H;
  const n = new THREE.Vector3();
  const light = new THREE.Vector3(0.45, 0.75, 0.55).normalize();
  const hsl = { h: 0, s: 0, l: 0 };
  const c3 = new THREE.Color();

  for (let k = 0; k < count; k++) {
    const i = hits[Math.floor(k * step)];
    const px = (i / 4) % W;
    const py = Math.floor(i / 4 / W);

    // local coords centred on the FIGURE'S OWN axis
    const lx = (px - W / 2) * scale;
    const ly = (H / 2 - py) * scale;
    const lz = (Math.random() - 0.5) * 1.5 * (1 - Math.abs(lx) / (W * scale * 0.5));

    pos[k * 3] = lx;
    pos[k * 3 + 1] = ly;
    pos[k * 3 + 2] = lz;

    // form normal from the figure's own axis, never the world origin
    n.set(lx, ly * 0.15, lz).normalize();
    const shade = 0.35 + 0.65 * Math.max(0, n.dot(light));

    c3.setRGB(data[i] / 255, data[i + 1] / 255, data[i + 2] / 255);
    c3.getHSL(hsl);
    if (hsl.s >= 0.12) {
      // remap hue to the nearer suit accent, shortest arc, 85% pull
      const dS = Math.abs(((hsl.h - HUE_SCARLET + 1.5) % 1) - 0.5);
      const dC = Math.abs(((hsl.h - HUE_COBALT + 1.5) % 1) - 0.5);
      const target = dS <= dC ? HUE_SCARLET : HUE_COBALT;
      c3.setHSL(pullHue(hsl.h, target, 0.85), Math.min(1, hsl.s * 1.15), hsl.l);
    }
    col[k * 3] = c3.r * shade;
    col[k * 3 + 1] = c3.g * shade;
    col[k * 3 + 2] = c3.b * shade;
  }
  return { pos, col, count };
}

function Figure() {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const group = useRef<THREE.Group>(null);
  const [sample, setSample] = useState<Sample | null>(null);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = plateUrl;
    let live = true;
    img.onload = () => {
      if (live) setSample(sampleplate(img, MAX_BEADS));
    };
    return () => {
      live = false;
    };
  }, []);

  // bake the shade into instanceColor ONCE
  useEffect(() => {
    const m = mesh.current;
    if (!m || !sample) return;
    const mat4 = new THREE.Matrix4();
    for (let i = 0; i < sample.count; i++) {
      mat4.makeTranslation(sample.pos[i * 3], sample.pos[i * 3 + 1], sample.pos[i * 3 + 2]);
      m.setMatrixAt(i, mat4);
    }
    m.count = sample.count;
    m.instanceMatrix.needsUpdate = true;
    m.instanceColor = new THREE.InstancedBufferAttribute(sample.col.slice(0, sample.count * 3), 3);
    m.instanceColor.needsUpdate = true;
    m.material.needsUpdate = true;
  }, [sample]);

  useFrame(() => {
    const g = group.current;
    const m = mesh.current;
    if (!g || !m) return;
    const k = gates(S.sp, S.p);
    const amp = S.reduced ? 0 : 1;

    // idle float + cursor tilt, with the compensating translation that
    // keeps the pivot at the figure's own centre
    const rx = amp * (S.my * 0.12 + Math.sin(S.t * 0.6) * 0.02);
    const ry = amp * (S.mx * 0.22 + Math.sin(S.t * 0.4) * 0.03);
    g.rotation.set(rx, ry, 0);
    g.position.copy(FIGURE_CENTRE);
    g.position.y += amp * Math.sin(S.t * 0.8) * 0.18;

    const mat = m.material as THREE.MeshBasicMaterial;
    mat.opacity = k.figure;
    m.visible = k.figure > 0.002;
    const s = lerp(0.86, 1, smoothstep(0, 0.14, S.sp));
    g.scale.setScalar(s);
  });

  return (
    <group ref={group}>
      <instancedMesh ref={mesh} args={[undefined, undefined, MAX_BEADS]} frustumCulled={false}>
        <sphereGeometry args={[0.05, 8, 6]} />
        <meshBasicMaterial vertexColors transparent toneMapped={false} />
      </instancedMesh>
    </group>
  );
}

/* =================================================================== */
/* THE LATTICE — wireframe cage, one scalar weaves and un-weaves it    */
/* =================================================================== */

const latticeVert = /* glsl */ `
  attribute vec3 aStart;
  attribute float aRand;
  uniform float uBuild;
  varying float vOn;
  void main() {
    float thresh = aRand * 0.7;
    float grow = clamp((uBuild - thresh) / 0.3, 0.0, 1.0);
    vOn = grow;
    vec3 p = mix(aStart, position, grow);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;
const latticeFrag = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vOn;
  void main() {
    gl_FragColor = vec4(uColor, uOpacity * vOn);
  }
`;

function Lattice() {
  const mat = useRef<THREE.ShaderMaterial>(null);

  const geo = useMemo(() => {
    const src = new THREE.BoxGeometry(9, 16.5, 9, 3, 6, 3);
    const wf = new THREE.WireframeGeometry(src);
    const pos = wf.getAttribute("position") as THREE.BufferAttribute;
    const n = pos.count; // non-indexed vertex PAIRS
    const aStart = new Float32Array(n * 3);
    const aRand = new Float32Array(n);
    for (let s = 0; s < n / 2; s++) {
      const r = Math.random(); // ONE shared random per segment
      const a = s * 2;
      const b = a + 1;
      const ax = pos.getX(a);
      const ay = pos.getY(a);
      const az = pos.getZ(a);
      for (const v of [a, b]) {
        aStart[v * 3] = ax;
        aStart[v * 3 + 1] = ay;
        aStart[v * 3 + 2] = az;
        aRand[v] = r;
      }
    }
    wf.setAttribute("aStart", new THREE.BufferAttribute(aStart, 3));
    wf.setAttribute("aRand", new THREE.BufferAttribute(aRand, 1));
    src.dispose();
    return wf;
  }, []);

  useFrame(() => {
    const m = mat.current;
    if (!m) return;
    const k = gates(S.sp, S.p);
    // one scalar weaves it in and un-weaves it out
    const build = smoothstep(0.05, 0.18, S.sp) * (1 - smoothstep(0.24, 0.34, S.sp));
    m.uniforms.uBuild.value = build;
    m.uniforms.uOpacity.value = k.lattice * 0.55;
  });

  return (
    <lineSegments geometry={geo} position={[0, 9, 0]} frustumCulled={false}>
      <shaderMaterial
        ref={mat}
        vertexShader={latticeVert}
        fragmentShader={latticeFrag}
        transparent
        depthWrite={false}
        uniforms={{
          uBuild: { value: 0 },
          uOpacity: { value: 0 },
          uColor: { value: new THREE.Color(RAW.scarlet500) },
        }}
      />
    </lineSegments>
  );
}

/* =================================================================== */
/* THE GRID ROOM — three nested shells, the far one COUNTER-rotates    */
/* =================================================================== */

function GridRoom() {
  const shells = [
    { r: 9, drift: 0.055 },
    { r: 13.95, drift: -0.03 },
    { r: 19.8, drift: 0.014 },
  ];
  const refs = useRef<(THREE.LineSegments | null)[]>([]);
  const mats = useRef<(THREE.LineBasicMaterial | null)[]>([]);
  const bar = useRef<THREE.Mesh>(null);

  const geos = useMemo(
    () =>
      shells.map((s) => {
        const g = new THREE.CylinderGeometry(s.r, s.r, 460, 24, 26, true);
        g.rotateX(Math.PI / 2); // axis runs down -Z, camera inside
        return new THREE.WireframeGeometry(g);
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useFrame(() => {
    const k = gates(S.sp, S.p);
    shells.forEach((s, i) => {
      const o = refs.current[i];
      const m = mats.current[i];
      if (!o || !m) return;
      o.rotation.z = S.sp * s.drift * 40;
      o.position.z = -150;
      m.opacity = 0.22 * k.room;
      o.visible = k.room > 0.002;
    });
    if (bar.current) {
      const bm = bar.current.material as THREE.MeshBasicMaterial;
      bm.opacity = 0.25 * k.room;
      bar.current.visible = k.room > 0.002;
    }
  });

  return (
    <group>
      {shells.map((s, i) => (
        <lineSegments
          key={s.r}
          geometry={geos[i]}
          ref={(o) => (refs.current[i] = o)}
          frustumCulled={false}
        >
          <lineBasicMaterial
            ref={(m) => (mats.current[i] = m)}
            color={ROLE.room}
            transparent
            opacity={0}
            depthWrite={false}
            toneMapped={false}
          />
        </lineSegments>
      ))}
      {/* no ground plane — where a floor would be, fog is. One horizon bar. */}
      <mesh ref={bar} position={[0, -2.4, -150]} frustumCulled={false}>
        <boxGeometry args={[220, 0.06, 0.06]} />
        <meshBasicMaterial color={ROLE.room} transparent opacity={0} toneMapped={false} />
      </mesh>
    </group>
  );
}

/* =================================================================== */
/* THE WEB — fat-line thwip strands off the same table as the swing    */
/* =================================================================== */

function Strands({ segs }: { segs: number }) {
  const objRef = useRef<LineSegments2 | null>(null);

  const { obj, posArr, colArr } = useMemo(() => {
    const total = WEB.length * segs;
    const geometry = new LineSegmentsGeometry();
    const positions = new Float32Array(total * 6);
    const colors = new Float32Array(total * 6);
    geometry.setPositions(positions);
    geometry.setColors(colors);
    const material = new LineMaterial({
      linewidth: 2.4, // WebGL ignores linewidth on LineBasicMaterial
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending, // per-strand fade lives in vertex colours
      toneMapped: false,
    });
    material.resolution.set(window.innerWidth, window.innerHeight);
    const o = new LineSegments2(geometry, material);
    o.frustumCulled = false;
    const start = geometry.getAttribute("instanceStart") as THREE.InterleavedBufferAttribute;
    const cstart = geometry.getAttribute("instanceColorStart") as THREE.InterleavedBufferAttribute;
    return {
      obj: o,
      posArr: start.data.array as Float32Array,
      colArr: cstart.data.array as Float32Array,
    };
  }, [segs]);

  const { size } = useThree();
  useEffect(() => {
    (obj.material as LineMaterial).resolution.set(size.width, size.height);
  }, [obj, size]);

  useFrame(() => {
    const k = gates(S.sp, S.p);
    const anchor = new THREE.Vector3();
    const origin = new THREE.Vector3();
    const bone = new THREE.Color(ROLE.strand);
    const impulse = new THREE.Color(ROLE.impulse);
    const c = new THREE.Color();
    let w = 0;
    let ci = 0;

    for (let e = 0; e < WEB.length; e++) {
      const entry = WEB[e];
      const t = strandT(entry, S.sp);
      anchorOf(entry, anchor);
      spine(entry.at + entry.span * 0.5, origin);
      origin.x += entry.side * 1.1;
      origin.y -= 0.6;

      const live = t >= 0 ? 1 : 0;
      // FIRE 0-0.12: free end runs out to the anchor
      const reach = t < 0 ? 0 : clamp01(t / 0.12);
      const sag = sagOf(t < 0 ? 0 : t);
      const wave = t > 0.55 ? Math.sin((t - 0.55) * 26) * smoothstep(0.55, 0.72, t) : 0;
      const alpha = (t < 0 ? 0 : strandAlpha(t)) * k.web * live;
      const fire = t < 0 ? 0 : bell(0, 0.16, t);

      for (let s = 0; s < segs; s++) {
        const u0 = s / segs;
        const u1 = (s + 1) / segs;
        for (let end = 0; end < 2; end++) {
          const u = Math.min(end === 0 ? u0 : u1, reach);
          const x = lerp(origin.x, anchor.x, u);
          const y =
            lerp(origin.y, anchor.y, u) -
            Math.sin(Math.PI * u) * sag +
            Math.sin(Math.PI * u * 3) * wave * 0.5;
          const z = lerp(origin.z, anchor.z, u);
          posArr[w++] = x;
          posArr[w++] = y;
          posArr[w++] = z;

          // bone at gain 1.25, deliberately OVER the bloom threshold.
          // scarlet MIXES at the firing edge instead of adding.
          const edge = clamp01(1 - Math.abs(u - reach) * 7) * fire;
          c.copy(bone).lerp(impulse, edge * 0.85);
          const g = 1.25 * alpha;
          colArr[ci++] = c.r * g;
          colArr[ci++] = c.g * g;
          colArr[ci++] = c.b * g;
        }
      }
    }

    const geo = obj.geometry as LineSegmentsGeometry;
    (geo.getAttribute("instanceStart") as THREE.InterleavedBufferAttribute).data.needsUpdate = true;
    (geo.getAttribute("instanceColorStart") as THREE.InterleavedBufferAttribute).data.needsUpdate =
      true;
    obj.visible = k.web > 0.002;
  });

  return <primitive object={obj} />;
}

/* =================================================================== */
/* THE CAMERA — keyframes on sp, swing off the web table               */
/* =================================================================== */

const _pos = new THREE.Vector3();
const _look = new THREE.Vector3();
const _axis = new THREE.Vector3();
const _up = new THREE.Vector3();
const _tmp = new THREE.Vector3();

function CameraRig() {
  const { camera } = useThree();

  useEffect(() => {
    camera.rotation.order = "YXZ"; // default XYZ leaks visible roll
  }, [camera]);

  useFrame(() => {
    const k = gates(S.sp, S.p);
    spine(S.sp, _pos);
    spineLook(S.sp, _look);

    // THE SWING: offset POSITION ONLY, never the look target
    let lateral = 0;
    let dip = 0;
    let bank = 0;
    const amp = S.reduced ? 0 : 1; // reduced motion keeps strands, zeroes swing
    for (const e of WEB) {
      const t = strandT(e, S.sp);
      if (t < 0) continue;
      const u = (t - 0.08) / (0.82 - 0.08); // overlapping windows -> S-weave
      if (u <= 0 || u >= 1) continue;
      const env = Math.sin(Math.PI * u); // exactly zero at both ends
      lateral += e.side * 3.2 * env;
      dip += -1.5 * env;
      bank += e.side * 0.15 * env;
    }
    lateral *= amp * k.swing;
    dip *= amp * k.swing;
    bank *= amp * k.swing;

    camera.position.set(_pos.x + lateral, _pos.y + dip, _pos.z);
    camera.up.set(0, 1, 0);
    camera.lookAt(_look);

    // bank by rotating the UP VECTOR about the view axis (Rodrigues)
    _axis.copy(_look).sub(camera.position);
    if (_axis.lengthSq() > 1e-6) {
      _axis.normalize();
      if (Math.abs(_axis.y) < 0.995 && Math.abs(bank) > 1e-5) {
        _up.set(0, 1, 0).applyAxisAngle(_axis, THREE.MathUtils.clamp(bank, -0.28, 0.28));
        camera.up.copy(_up);
        camera.lookAt(_look);
      }
    }

    // fog far closes for the wipe: the far end dissolves, no end wall
    const scene = camera.parent as THREE.Scene | null;
    const fog = (scene?.fog ?? null) as THREE.Fog | null;
    if (fog) {
      fog.near = 6;
      fog.far = lerp(300, 26, k.dissolve);
    }
  });

  return null;
}

/* =================================================================== */
/* THE POST CHAIN — bloom -> vignette -> tone map -> grain             */
/* =================================================================== */

const GrainShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uTime: { value: 0 },
    uAmount: { value: 0.075 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uAmount;
    varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)) + uTime) * 43758.5453); }
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      float n = hash(vUv * vec2(1024.0, 700.0)) - 0.5;
      gl_FragColor = vec4(c.rgb + n * uAmount, c.a);
    }
  `,
};

function PostChain() {
  const { gl, scene, camera, size } = useThree();
  const grain = useRef<ShaderPass | null>(null);

  const composer = useMemo(() => {
    const c = new EffectComposer(gl);
    c.addPass(new RenderPass(scene, camera));

    const bloom = new UnrealBloomPass(new THREE.Vector2(size.width, size.height), 0.55, 0.45, 1.15);
    // default smoothWidth 0.01 clips hard and hands the blur a cut-out
    (bloom as unknown as { highPassUniforms: Record<string, { value: number }> }).highPassUniforms[
      "smoothWidth"
    ].value = 0.35;
    c.addPass(bloom);

    const vig = new ShaderPass(VignetteShader);
    vig.uniforms.darkness.value = 1.0; // NOT above: ACES flips negatives positive
    vig.uniforms.offset.value = 1.3; // shape falloff here instead
    c.addPass(vig);

    c.addPass(new OutputPass()); // tone map

    const gp = new ShaderPass(GrainShader); // grain in DISPLAY space
    grain.current = gp;
    c.addPass(gp);
    return c;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl, scene, camera]);

  useEffect(() => {
    composer.setSize(size.width, size.height);
  }, [composer, size]);

  useFrame(({ clock }) => {
    if (grain.current) grain.current.uniforms.uTime.value = clock.elapsedTime;
    composer.render();
  }, 1);

  return null;
}

/* =================================================================== */

export default function Stage({ mobile }: { mobile: boolean }) {
  const { scene } = useThree();
  useEffect(() => {
    scene.fog = new THREE.Fog(new THREE.Color(RAW.ink950), 6, 300);
    scene.background = new THREE.Color(RAW.ink950);
  }, [scene]);

  useFrame(({ clock }) => {
    S.t = clock.elapsedTime;
    if (import.meta.env.DEV) {
      (window as unknown as Record<string, unknown>).__film = {
        p: S.p,
        sp: S.sp,
        gates: gates(S.sp, S.p),
      };
    }
  });

  return (
    <>
      <CameraRig />
      <Figure />
      <Lattice />
      <GridRoom />
      <Strands segs={mobile ? 12 : 28} />
      <PostChain />
    </>
  );
}
