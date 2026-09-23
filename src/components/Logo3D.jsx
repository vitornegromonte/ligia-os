import { useEffect, useRef, useState } from "react";

// Logo Ligia em 3D: modelo .glb autoral (substitui o antigo SVG extrudado).
// three.js é importado dinamicamente para não pesar o bundle inicial.
// Fallback: SVG chapado (loading, erro ou prefers-reduced-motion).

const SVG_URL = "/media/logo.svg";
const GLB_URL = "/media/models/logo.glb";

export default function Logo3D({ height = "clamp(240px, 38vh, 400px)", offsetX = 0 }) {
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
        const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
        const { RoomEnvironment } = await import("three/examples/jsm/environments/RoomEnvironment.js");
        if (cancelled || !mountRef.current) return;

        const loader = new GLTFLoader();
        const gltf = await loader.loadAsync(GLB_URL);
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

        // Modelo autoral (.glb): usa os materiais/texturas embutidos no arquivo.
        const aligned = new THREE.Group();
        aligned.add(gltf.scene);
        let meshNode = null;
        aligned.traverse((o) => {
          if (o.isMesh) {
            o.material.envMapIntensity = 0.9;
            o.material.side = THREE.DoubleSide;
            if (!meshNode) meshNode = o;
          }
        });

        // `centered` absorve só a translação de centralização (em unidades
        // não escaladas); `group` é o que gira com o mouse. Assim o pivô de
        // rotação fica exatamente no centro visual do modelo, não em algum
        // ponto deslocado — girar não faz o modelo "orbitar" fora do lugar.
        const centered = new THREE.Group();
        centered.add(aligned);

        const group = new THREE.Group();
        group.add(centered);
        scene.add(group);

        // Anula a orientação de exportação do node (o Blender/exporter pode
        // ter salvo o modelo de lado); realinha para frente = +Z, cima = +Y.
        if (meshNode) {
          group.updateMatrixWorld(true);
          const worldQuat = new THREE.Quaternion();
          meshNode.getWorldQuaternion(worldQuat);
          aligned.quaternion.copy(worldQuat).invert();
        }

        // Centraliza pela bounding box e normaliza: altura ≈ 3.0 unidades.
        group.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(aligned);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        centered.position.copy(center).multiplyScalar(-1);

        const scaleFactor = 3.0 / Math.max(size.y, 0.001);
        group.scale.setScalar(scaleFactor);
        group.position.set(offsetX, 0, 0);

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
          group.traverse((o) => {
            if (!o.isMesh) return;
            o.geometry?.dispose();
            const mats = Array.isArray(o.material) ? o.material : [o.material];
            mats.forEach((m) => {
              Object.values(m).forEach((v) => v?.isTexture && v.dispose());
              m.dispose();
            });
          });
          pmrem.dispose();
          renderer.dispose();
          renderer.domElement.remove();
        }

        const baseTilt = 0.12;
        const baseYaw = Math.PI;
        if (reduceMotion) {
          group.rotation.set(baseTilt, baseYaw, 0);
          renderer.render(scene, camera);
          return disposeAll;
        }

        function draw(now) {
          raf = requestAnimationFrame(draw);
          if (!visible.current) return;
          mouse.x += (mouse.tx - mouse.x) * 0.03;
          mouse.y += (mouse.ty - mouse.y) * 0.03;
          group.rotation.y = baseYaw + mouse.x * 0.12;
          group.rotation.x = baseTilt + mouse.y * 0.08;
          // Respiração da luz, fora de fase com a rede (0.0004 vs 0.00021)
          key.intensity = 1.0 + Math.sin((now || 0) * 0.0004) * 0.15;
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
