import { useEffect, useRef, useState } from "react";

// Logo Ligia em 3D: modelo .glb autoral (substitui o antigo SVG extrudado).
// three.js é importado dinamicamente para não pesar o bundle inicial.
// Fallback: SVG chapado (loading, erro ou prefers-reduced-motion).

const SVG_URL = "/media/logo.svg";
const GLB_URL = "/media/models/logo.glb";

// ─────────────────────────────────────────────────────────────────
// Bloom (pós-processamento) — halo sutil, tipo Apple product page,
// não bloom de videogame. Só o que for bem brilhante no framebuffer
// (as faixas aditivas das linhas de borda) deve "vazar"; o resto da
// cena (luz ambiente, modelo normal) fica bem abaixo do threshold e
// não borra. Mexa aqui pra recalibrar.
// ─────────────────────────────────────────────────────────────────
const BLOOM_STRENGTH = 0.35;  // intensidade geral do halo
const BLOOM_RADIUS = 0.3;     // o quanto o brilho se espalha ao redor
const BLOOM_THRESHOLD = 0.82; // (0–1, espaço linear) alto de propósito: só as faixas
                               // aditivas das linhas de borda (bem mais brilhantes que
                               // o mesh normalmente iluminado) devem passar disso.

// Sombra/escurecimento de contato abaixo do modelo — só pra dar peso e
// ancorar no espaço, não é uma sombra realista de estúdio. Também é um
// sprite billboard (achatado), não uma plane deitada: a câmera está
// quase de frente (y=0), então uma plane horizontal "de chão" ficaria
// vista de canto, quase invisível — o sprite achatado lê como sombra
// em qualquer ângulo de câmera.
const CONTACT_SHADOW_OPACITY = 0.3;
const CONTACT_SHADOW_SIZE_FACTOR = 0.9;   // largura do sprite, como múltiplo da altura renderizada do modelo
const CONTACT_SHADOW_SQUASH = 0.4;        // achatamento vertical (elipse, não círculo)
const CONTACT_SHADOW_Y_FACTOR = -0.58;    // deslocamento vertical abaixo do centro, também
                                           // como múltiplo da altura renderizada do modelo
const CONTACT_SHADOW_COLOR = "rgba(8, 6, 5,";  // dessaturado/escuro; alpha completado no gradiente

// Gera uma textura de gradiente radial (canvas 2D) — usada na sombra
// de contato. `stops` é uma lista de [offset 0..1, corCSS], igual ao
// createRadialGradient nativo.
function makeRadialTexture(THREE, stops, size = 256) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  stops.forEach(([offset, color]) => grad.addColorStop(offset, color));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export default function Logo3D({
  height = "clamp(240px, 38vh, 400px)", // tamanho do fallback (<img>) e do canvas quando fill=false
  fill = false,        // true = o canvas ocupa 100% do elemento pai (position:absolute, inset:0),
                        // pensado pra viver no MESMO container full-bleed do fundo da Hero em vez
                        // de numa caixinha própria — assim não sobra um "quadrado" visível: o
                        // canvas passa a ser do tamanho da própria Hero, igual o NeuralHero.
  anchorX = 0.5,        // posição horizontal do modelo, fração do canvas (0 = esquerda, 1 = direita)
  anchorY = 0.5,        // posição vertical do modelo, fração do canvas (0 = topo, 1 = base)
  heightFraction = 0.42,// altura do modelo, como fração da altura visível da câmera naquele ponto
                        // (substitui um tamanho fixo em unidades — assim ele fica proporcional
                        // não importa o tamanho real do canvas em pixels)
  // Em telas estreitas (retrato) o layout empilha texto+modelo na vertical;
  // usar os mesmos anchor/heightFraction do desktop faria o modelo cobrir o
  // texto. Esses três só valem quando o aspect ratio do canvas fica abaixo
  // de MOBILE_ASPECT_THRESHOLD (ver mais abaixo).
  mobileHeightFraction = 0.19,
  mobileAnchorX = 0.5,
  mobileAnchorY = 0.97,
  lineColorTop = "#ff5928",    // cor das linhas no topo do modelo
  lineColorBottom = "#ff7950", // cor das linhas na base do modelo (degradê vertical)
  modelOpacity = 0,            // opacidade do mesh sólido (0 = só as linhas de borda aparecem)
}) {
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
        const { EffectComposer } = await import("three/examples/jsm/postprocessing/EffectComposer.js");
        const { RenderPass } = await import("three/examples/jsm/postprocessing/RenderPass.js");
        const { UnrealBloomPass } = await import("three/examples/jsm/postprocessing/UnrealBloomPass.js");
        const { OutputPass } = await import("three/examples/jsm/postprocessing/OutputPass.js");
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

        // ─── Post-processing: RenderPass → Bloom → OutputPass ───
        // OutputPass no final aplica o toneMapping/colorSpace do renderer
        // (ACESFilmicToneMapping já setado acima) — sem ele a imagem final
        // do composer sai "crua", sem a mesma curva de cor do render direto.
        const composer = new EffectComposer(renderer);
        composer.addPass(new RenderPass(scene, camera));
        const bloomPass = new UnrealBloomPass(
          new THREE.Vector2(width, h),
          BLOOM_STRENGTH,
          BLOOM_RADIUS,
          BLOOM_THRESHOLD
        );
        composer.addPass(bloomPass);
        const outputPass = new OutputPass();
        composer.addPass(outputPass);

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
            const mats = Array.isArray(o.material) ? o.material : [o.material];
            mats.forEach((m) => {
              m.envMapIntensity = 0.9;
              m.side = THREE.DoubleSide;
              // Mesh sólido "apagado": só as linhas de borda ficam visíveis.
              // depthWrite off enquanto transparente evita que a superfície
              // invisível ainda assim esconda as arestas atrás dela.
              m.transparent = true;
              m.opacity = modelOpacity;
              m.depthWrite = modelOpacity >= 0.99;
            });
            if (!meshNode) meshNode = o;
          }
        });

        // ───────────────────────────────────────────────────────────
        // Linhas de borda "scan" — contorno do modelo com faixas de luz
        // que percorrem as arestas e desaparecem (looping contínuo).
        // ───────────────────────────────────────────────────────────
        let edgeLines = null;
        let lineMaterial = null;
        if (meshNode) {
          // EdgesGeometry extrai só as arestas "duras" do mesh (onde as
          // normais das faces vizinhas divergem) — dá o contorno/wireframe
          // do objeto, não uma malha de triângulos cheia.
          const edgesGeometry = new THREE.EdgesGeometry(meshNode.geometry, 1);
          const edgePos = edgesGeometry.attributes.position;
          const aPathT = new Float32Array(edgePos.count);
          let edgeMinY = Infinity, edgeMaxY = -Infinity;
          for (let i = 0; i < edgePos.count; i++) {
            const y = edgePos.getY(i);
            if (y < edgeMinY) edgeMinY = y;
            if (y > edgeMaxY) edgeMaxY = y;
          }
          const edgeYRange = Math.max(edgeMaxY - edgeMinY, 0.0001);
          for (let i = 0; i < edgePos.count; i++) {
            // Posição normalizada (0..1) ao longo da altura do modelo — é o
            // "trajeto" que a faixa de luz percorre (mesmo eixo do scan das
            // partículas, pra manter a mesma linguagem visual).
            aPathT[i] = (edgePos.getY(i) - edgeMinY) / edgeYRange;
          }
          edgesGeometry.setAttribute("aPathT", new THREE.BufferAttribute(aPathT, 1));

          lineMaterial = new THREE.ShaderMaterial({
            uniforms: {
              uTime: { value: 0 },
              uColorTop: { value: new THREE.Color(lineColorTop) },
              uColorBottom: { value: new THREE.Color(lineColorBottom) },
              uSpeed: { value: 0.18 },   // velocidade da faixa (voltas/seg no trajeto normalizado)
              uWidth: { value: 0.06 },   // largura da faixa (fração do trajeto 0..1)
              uReduceMotion: { value: reduceMotion ? 1 : 0 },
            },
            vertexShader: `
              attribute float aPathT; // posição normalizada (0..1) da aresta no "trajeto" de scan
              varying float vPathT;
              void main() {
                vPathT = aPathT;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
              }
            `,
            fragmentShader: `
              uniform vec3 uColorTop;
              uniform vec3 uColorBottom;
              uniform float uTime;
              uniform float uSpeed;
              uniform float uWidth;
              uniform float uReduceMotion;

              varying float vPathT;

              void main() {
                // Degradê vertical: vPathT já é a altura normalizada (0 = base,
                // 1 = topo), então basta interpolar entre as duas cores por ela
                // — mesmo efeito do gradiente linear do logo original.
                vec3 color = mix(uColorBottom, uColorTop, vPathT);

                // Contorno sempre visível, bem discreto — a "base" do wireframe.
                float baseAlpha = 0.10;

                float bandAlpha = 0.0;
                if (uReduceMotion < 0.5) {
                  // Faixa de luz viajando ao longo do trajeto normalizado
                  // (vPathT), com wrap via fract() pra fazer um loop contínuo:
                  // ela "passa" pela aresta e "apaga" (smoothstep = fade macio
                  // nas duas pontas da faixa), reaparecendo do outro lado.
                  float cycle1 = fract(uTime * uSpeed);
                  float d1 = abs(fract(vPathT - cycle1 + 0.5) - 0.5);
                  float band1 = smoothstep(uWidth, 0.0, d1);

                  // Segunda faixa, sentido oposto e mais fraca — dá mais vida
                  // sem virar bagunça visual.
                  float cycle2 = fract(uTime * uSpeed * -0.7 + 0.5);
                  float d2 = abs(fract(vPathT - cycle2 + 0.5) - 0.5);
                  float band2 = smoothstep(uWidth * 0.7, 0.0, d2) * 0.7;

                  bandAlpha = band1 + band2;
                }

                gl_FragColor = vec4(color, baseAlpha + bandAlpha);
              }
            `,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
          });

          edgeLines = new THREE.LineSegments(edgesGeometry, lineMaterial);
          // Filho do mesh: herda a transform local automaticamente (as
          // arestas vêm da mesma geometria local do próprio mesh).
          meshNode.add(edgeLines);
        }

        // ───────────────────────────────────────────────────────────
        // Sombra/escurecimento de contato abaixo do modelo. Vai direto
        // em `scene` (não em `group`) de propósito: não deve girar
        // junto com o modelo, só ele gira — fica fixa, ancorando o
        // objeto no espaço.
        //
        // (O halo/glow ao redor do modelo NÃO é uma camada separada —
        // é só o bloom reagindo à luz das próprias linhas de borda.
        // Uma camada extra de glow "ambiente" foi tentada e removida:
        // como ela mora dentro do canvas WebGL e não tem como se fundir
        // perfeitamente com o fundo da página fora dele, sempre sobrava
        // um corte visível na borda do canvas.)
        // ───────────────────────────────────────────────────────────
        const shadowTexture = makeRadialTexture(THREE, [
          [0, `${CONTACT_SHADOW_COLOR} 0.9)`],
          [0.6, `${CONTACT_SHADOW_COLOR} 0.35)`],
          [1, `${CONTACT_SHADOW_COLOR} 0)`],
        ]);
        const contactShadow = new THREE.Sprite(new THREE.SpriteMaterial({
          map: shadowTexture,
          transparent: true,
          depthWrite: false,
          opacity: CONTACT_SHADOW_OPACITY,
        }));
        // Escala/posição reais são setadas em applyPlacement() mais abaixo,
        // proporcionais ao tamanho renderizado do modelo.
        contactShadow.renderOrder = -1;
        scene.add(contactShadow);

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

        // Centraliza pela bounding box (unidades "cruas", pré-escala).
        group.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(aligned);
        const center = box.getCenter(new THREE.Vector3());
        const rawHeight = box.getSize(new THREE.Vector3()).y;
        centered.position.copy(center).multiplyScalar(-1);

        // baseTilt/baseYaw viram `let`: a câmera é fixa e olha reto pro -Z,
        // mas o modelo pode ficar fora do eixo dela (anchorX/Y ≠ 0.5) —
        // sem compensar, ele fica com uma cara meio "de perfil" na posição
        // de repouso (perspectiva oblíqua natural de mirar um objeto fora
        // do centro sem apontar a câmera pra ele). Corrigido em
        // applyPlacement() abaixo, contra-rotacionando pelo mesmo ângulo
        // que o offset do objeto cria — assim ele fica de frente pro
        // usuário quando o mouse está no centro, não importa o anchor.
        let baseTilt = 0.12;
        let baseYaw = Math.PI;

        // Escala e posição do modelo (+ sombra de contato) em função do
        // frustum da câmera nesse instante — não em unidades fixas. Assim
        // funciona igual não importa o tamanho/proporção real do canvas em
        // pixels (crucial agora que `fill` deixa o canvas do tamanho da
        // Hero inteira, que muda bastante de aspect ratio entre telas).
        function applyPlacement() {
          // Abaixo desse aspect ratio o canvas está mais alto que largo
          // (retrato/mobile) — usa a colocação alternativa pra não cobrir
          // o texto, que nesse ponto já ocupa a largura toda (grid empilha).
          const isNarrow = camera.aspect < 0.85;
          const effHeightFraction = isNarrow ? mobileHeightFraction : heightFraction;
          const effAnchorX = isNarrow ? mobileAnchorX : anchorX;
          const effAnchorY = isNarrow ? mobileAnchorY : anchorY;

          const dist = camera.position.z;
          const vFovRad = (camera.fov * Math.PI) / 180;
          const visibleHeight = 2 * Math.tan(vFovRad / 2) * dist;
          const visibleWidth = visibleHeight * camera.aspect;
          const targetHeight = effHeightFraction * visibleHeight;

          const scaleFactor = targetHeight / Math.max(rawHeight, 0.001);
          group.scale.setScalar(scaleFactor);
          group.position.x = (effAnchorX - 0.5) * visibleWidth;
          group.position.y = (0.5 - effAnchorY) * visibleHeight;

          // Contra-rotação: o ângulo que a câmera "vê" o objeto fora do seu
          // eixo central, pra ele ficar de frente na posição de repouso em
          // vez de meio de perfil (ver comentário acima de onde baseTilt/
          // baseYaw são declarados).
          baseYaw = Math.PI - Math.atan2(group.position.x, dist);
          baseTilt = 0.12 + Math.atan2(-group.position.y, dist);

          // Sombra de contato: tamanho e posição acompanham o tamanho
          // renderizado do modelo (não um valor absoluto fixo), senão ela
          // fica desproporcional quando heightFraction muda.
          const shadowW = targetHeight * CONTACT_SHADOW_SIZE_FACTOR;
          contactShadow.scale.set(shadowW, shadowW * CONTACT_SHADOW_SQUASH, 1);
          contactShadow.position.set(
            group.position.x,
            group.position.y + CONTACT_SHADOW_Y_FACTOR * targetHeight,
            0.4
          );
        }
        applyPlacement();

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
          applyPlacement(); // aspect mudou → recalcula escala/posição do modelo e da sombra
          renderer.setSize(w, hh);
          composer.setSize(w, hh); // propaga pro RenderPass/UnrealBloomPass/OutputPass
          if (reduceMotion) composer.render();
        };
        window.addEventListener("resize", onResize, { passive: true });

        function disposeAll() {
          cancelAnimationFrame(raf);
          observer.disconnect();
          window.removeEventListener("mousemove", onMove);
          window.removeEventListener("resize", onResize);
          group.traverse((o) => {
            if (!o.geometry || !o.material) return;
            o.geometry.dispose();
            const mats = Array.isArray(o.material) ? o.material : [o.material];
            mats.forEach((m) => {
              Object.values(m).forEach((v) => v?.isTexture && v.dispose());
              m.dispose();
            });
          });
          contactShadow.material.map?.dispose();
          contactShadow.material.dispose();
          bloomPass.dispose();
          outputPass.dispose();
          composer.dispose();
          pmrem.dispose();
          renderer.dispose();
          renderer.domElement.remove();
        }

        if (reduceMotion) {
          group.rotation.set(baseTilt, baseYaw, 0);
          composer.render();
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

          if (lineMaterial) lineMaterial.uniforms.uTime.value = now * 0.001;

          composer.render(); // no lugar de renderer.render(scene, camera) — passa pelo bloom
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
    return fill ? (
      <img
        src={SVG_URL} alt="Ligia" loading="eager" decoding="async"
        style={{
          position: "absolute", height: "clamp(200px, 30vh, 340px)", width: "auto",
          left: `${anchorX * 100}%`, top: `${anchorY * 100}%`, transform: "translate(-50%, -50%)",
        }}
      />
    ) : (
      <img
        src={SVG_URL} alt="Ligia" loading="eager" decoding="async"
        style={{ height, width: "auto", margin: "0 auto", display: "block" }}
      />
    );
  }
  return (
    <div
      ref={mountRef}
      aria-hidden="true"
      style={fill ? { position: "absolute", inset: 0, cursor: "grab" } : { width: "100%", height, cursor: "grab" }}
    />
  );
}
