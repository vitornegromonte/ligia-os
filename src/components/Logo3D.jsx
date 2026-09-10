import { useEffect, useRef, useState } from "react";

// Logo Ligia em 3D: SVG extrudado com material vidro (eco do glazzy da navbar).
// three.js é importado dinamicamente para não pesar o bundle inicial.
// Fallback: SVG chapado (loading, erro ou prefers-reduced-motion).

const SVG_URL = "/media/logo.svg";

export default function Logo3D({ height = "clamp(240px, 38vh, 400px)" }) {
  const mountRef = useRef(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let cancelled = false;
    let renderer = null;
    let raf = 0;
    const visible = { current: true };
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };

    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    async function init() {
      try {
        const THREE = await import("three");
        const { SVGLoader } = await import("three/examples/jsm/loaders/SVGLoader.js");
        const { RoomEnvironment } = await import("three/examples/jsm/environments/RoomEnvironment.js");
        if (cancelled || !mountRef.current) return;

        const res = await fetch(SVG_URL);
        if (!res.ok) throw new Error("logo fetch failed");
        const svgText = await res.text();
        if (cancelled) return;

        const width = mount.clientWidth || 480;
        const h = mount.clientHeight || 320;
        const isMobile = window.matchMedia("(max-width: 820px)").matches;

        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2));
        renderer.setSize(width, h);
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        mount.appendChild(renderer.domElement);

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(32, width / h, 0.1, 100);
        camera.position.set(0, 0, 6);

        const pmrem = new THREE.PMREMGenerator(renderer);
        scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

        const key = new THREE.DirectionalLight(0xfff0e6, 1.2);
        key.position.set(2, 3, 4);
        scene.add(key);
        const rim = new THREE.DirectionalLight(0xc8d8f0, 0.5);
        rim.position.set(-3, -1, -2);
        scene.add(rim);
        scene.add(new THREE.AmbientLight(0xffffff, 0.35));
        if ("environmentIntensity" in scene) scene.environmentIntensity = 0.8;

        // Liquid glass laranja Ligia — vertex-color gradient matching the 2D logo.
        const colorTop = new THREE.Color(0xff4b1f);
        const colorBot = new THREE.Color(0xff9068);
        const glassMat = new THREE.MeshPhysicalMaterial({
          metalness: 0,
          roughness: 0.2,
          transmission: 1,
          thickness: 1.0,
          ior: 1.5,
          transparent: true,
          attenuationColor: new THREE.Color(0xff6b3f),
          attenuationDistance: 1.0,
          clearcoat: 0.1,
          clearcoatRoughness: 0.2,
          envMapIntensity: 0.7,
          specularIntensity: 0.8,
          vertexColors: true,
          side: THREE.DoubleSide,
          depthWrite: false,
        });
        if ("dispersion" in glassMat) glassMat.dispersion = 0.5;

        // 1. Extruda todos os shapes SEM centralizar (preserva o encaixe).
        const loader = new SVGLoader();
        const svg = loader.parse(svgText);
        const geos = [];
        svg.paths.forEach((path) => {
          path.toShapes(true).forEach((shape) => {
            geos.push(
              new THREE.ExtrudeGeometry(shape, {
                depth: 18,
                bevelEnabled: true,
                bevelThickness: 3,
                bevelSize: 3,
                bevelSegments: 4,
                curveSegments: 24,
              })
            );
          });
        });
        if (geos.length === 0) throw new Error("no shapes");

        // 2. Centro COMBINADO de todas as geometrias.
        const box = new THREE.Box3();
        geos.forEach((g) => {
          g.computeBoundingBox();
          box.union(g.boundingBox);
        });
        const center = box.getCenter(new THREE.Vector3());
        const yRange = box.max.y - box.min.y || 1;

        // 3. Centraliza tudo pelo mesmo offset, faz o flip Y no bake
        // e pinta vertex colors com gradiente vertical (topo→base).
        const group = new THREE.Group();
        geos.forEach((geo) => {
          geo.translate(-center.x, -center.y, -center.z);
          geo.scale(1, -1, 1);
          const pos = geo.attributes.position;
          const colors = new Float32Array(pos.count * 3);
          for (let i = 0; i < pos.count; i++) {
            const y = pos.getY(i);
            const t = (y + yRange / 2) / yRange;
            const c = colorTop.clone().lerp(colorBot, t);
            colors[i * 3] = c.r;
            colors[i * 3 + 1] = c.g;
            colors[i * 3 + 2] = c.b;
          }
          geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
          group.add(new THREE.Mesh(geo, glassMat));
        });

        // 4. Normaliza: altura ≈ 3.0 unidades.
        const fit = new THREE.Box3().setFromObject(group);
        const size = fit.getSize(new THREE.Vector3());
        group.scale.setScalar(3.0 / Math.max(size.y, 0.001));
        scene.add(group);

        const observer = new IntersectionObserver(
          (entries) => { visible.current = entries[0]?.isIntersecting ?? true; },
          { threshold: 0 }
        );
        observer.observe(mount);

        const onMove = (e) => {
          const r = mount.getBoundingClientRect();
          mouse.tx = ((e.clientX - r.left) / Math.max(r.width, 1) - 0.5) * 2;
          mouse.ty = ((e.clientY - r.top) / Math.max(r.height, 1) - 0.5) * 2;
        };
        window.addEventListener("mousemove", onMove, { passive: true });

        const onResize = () => {
          const w = mount.clientWidth || 480;
          const hh = mount.clientHeight || 320;
          camera.aspect = w / hh;
          camera.updateProjectionMatrix();
          renderer.setSize(w, hh);
          if (reduceMotion) renderer.render(scene, camera);
        };
        window.addEventListener("resize", onResize, { passive: true });

        function disposeAll() {
          cancelAnimationFrame(raf);
          observer.disconnect();
          window.removeEventListener("mousemove", onMove);
          window.removeEventListener("resize", onResize);
          group.traverse((o) => o.geometry && o.geometry.dispose());
          glassMat.dispose();
          pmrem.dispose();
          renderer.dispose();
          renderer.domElement.remove();
        }

        const baseTilt = 0.12;
        const baseYaw = 0.45;
        if (reduceMotion) {
          group.rotation.set(baseTilt, baseYaw, 0);
          renderer.render(scene, camera);
          return disposeAll;
        }

        function draw() {
          raf = requestAnimationFrame(draw);
          if (!visible.current) return;
          mouse.x += (mouse.tx - mouse.x) * 0.03;
          mouse.y += (mouse.ty - mouse.y) * 0.03;
          group.rotation.y = baseYaw + mouse.x * 0.12;
          group.rotation.x = baseTilt + mouse.y * 0.08;
          renderer.render(scene, camera);
        }
        raf = requestAnimationFrame(draw);
        return disposeAll;
      } catch {
        if (!cancelled) setFailed(true);
        return undefined;
      }
    }

    let cleanup;
    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(() => { init().then((c) => { cleanup = c; }); }, { timeout: 900 });
      return () => { cancelled = true; window.cancelIdleCallback(id); cancelAnimationFrame(raf); if (typeof cleanup === "function") cleanup(); };
    }
    init().then((c) => { cleanup = c; });
    return () => { cancelled = true; cancelAnimationFrame(raf); if (typeof cleanup === "function") cleanup(); };
  }, []);

  if (failed) {
    return (
      <img
        src={SVG_URL} alt="Ligia" loading="eager" decoding="async"
        style={{ height, width: "auto", margin: "0 auto", display: "block" }}
      />
    );
  }
  return <div ref={mountRef} aria-hidden="true" style={{ width: "100%", height, cursor: "grab" }} />;
}
