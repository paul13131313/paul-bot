"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { works, type Work } from "./works-data";
import DetailPanel from "./DetailPanel";

type SceneState = "overview" | "focused" | "detail";
type OgpMap = Record<string, string>;

/* ────────────────────────────────
   Grid Sphere: 縦横が揃う球面グリッド配置
   ──────────────────────────────── */
const SPHERE_RADIUS = 8;

function gridSphere(
  count: number,
  radius: number,
): THREE.Vector3[] {
  // 行数・列数を計算（カードのアスペクト比1.6:1を考慮）
  const aspect = 1.6;
  const rows = Math.round(Math.sqrt(count / aspect));
  const cols = Math.ceil(count / rows);

  const points: THREE.Vector3[] = [];

  // 極を避けて均等に緯度を分割
  for (let row = 0; row < rows; row++) {
    // phi: 上端15°〜下端165° の範囲（極を避ける）
    const phi = ((row + 0.5) / rows) * Math.PI * 0.85 + Math.PI * 0.075;

    // この行に何個置くか
    const itemsInRow = row < rows - 1
      ? cols
      : count - cols * (rows - 1); // 最終行は余り

    for (let col = 0; col < itemsInRow; col++) {
      // theta: 均等に経度を分割（行ごとに半コマずらしてレンガ配置）
      const offset = (row % 2) * (Math.PI / cols);
      const theta = (col / cols) * Math.PI * 2 + offset;

      points.push(
        new THREE.Vector3(
          radius * Math.sin(phi) * Math.cos(theta),
          radius * Math.cos(phi),
          radius * Math.sin(phi) * Math.sin(theta),
        ),
      );
    }
  }

  return points;
}

/* ────────────────────────────────
   セマンティックソート: 似た作品を隣接させる
   ──────────────────────────────── */
function sortWorksSemantically(workList: Work[]): Work[] {
  const ORDER: Record<string, number> = {
    "ai-works": 0,
    "ai-practice": 1,
    client: 2,
  };
  return [...workList].sort((a, b) => {
    const oa = ORDER[a.source] ?? 9;
    const ob = ORDER[b.source] ?? 9;
    if (oa !== ob) return oa - ob;
    return a.category.localeCompare(b.category);
  });
}

/* ────────────────────────────────
   フォーカス時: 周囲カードの球面グリッド整列
   ──────────────────────────────── */
function computeFocusedPositions(
  cards: CardData[],
  selectedIdx: number,
): THREE.Vector3[] {
  const result = cards.map((c) => c.originalPos.clone());
  const selected = cards[selectedIdx];
  const center = selected.originalPos.clone().normalize();

  // 選択カードの周囲カードを距離順にソート
  const indexed = cards.map((c, i) => ({
    i,
    dist: c.originalPos.distanceTo(selected.originalPos),
  }));
  indexed.sort((a, b) => a.dist - b.dist);

  // 近い20枚をグリッド配置（5x4）
  const nearby = indexed.slice(1, 21); // 0は自分

  // 球面上のローカル座標系を構築
  const up = new THREE.Vector3(0, 1, 0);
  const right = new THREE.Vector3().crossVectors(up, center).normalize();
  if (right.length() < 0.01) {
    right.set(1, 0, 0);
  }
  const localUp = new THREE.Vector3().crossVectors(center, right).normalize();

  const cols = 5;
  const spacingH = 1.9; // カード幅1.6 + 余白
  const spacingV = 1.3; // カード高1.0 + 余白

  nearby.forEach((item, idx) => {
    const col = (idx % cols) - Math.floor(cols / 2);
    const row = Math.floor(idx / cols) - 1; // -1, 0, 1, 2 → 選択カードの上下

    // 球面上の角度オフセット
    const angleH = (col * spacingH) / SPHERE_RADIUS;
    const angleV = (row * spacingV) / SPHERE_RADIUS;

    // 球面上の新位置を計算
    const pos = center
      .clone()
      .applyAxisAngle(localUp, angleH)
      .applyAxisAngle(right, angleV)
      .multiplyScalar(SPHERE_RADIUS);

    result[item.i] = pos;
  });

  return result;
}

/* ────────────────────────────────
   カラーマップ
   ──────────────────────────────── */
/* 統一カラー: 白系の淡い発光 */
const CARD_EMISSIVE = "#334455";

/* ────────────────────────────────
   フォールバックテクスチャ
   ──────────────────────────────── */
function createFallbackTexture(title: string, color: string): THREE.Texture {
  const canvas = document.createElement("canvas");
  canvas.width = 320;
  canvas.height = 200;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createLinearGradient(0, 0, 320, 200);
  gradient.addColorStop(0, "#0a0a0a");
  gradient.addColorStop(1, "#1a1a2e");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 320, 200);
  ctx.beginPath();
  ctx.arc(160, 90, 50, 0, Math.PI * 2);
  ctx.fillStyle = color + "30";
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 18px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const lines = title.length > 15
    ? [title.slice(0, 15), title.slice(15, 30)]
    : [title];
  lines.forEach((line, i) => {
    ctx.fillText(line, 160, 85 + i * 22);
  });
  return new THREE.CanvasTexture(canvas);
}

/* ────────────────────────────────
   星空
   ──────────────────────────────── */
function createStars(scene: THREE.Scene) {
  const geo = new THREE.BufferGeometry();
  const count = 3000;
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const r = 50 + Math.random() * 50;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    pos[i * 3 + 2] = r * Math.cos(phi);
  }
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  scene.add(
    new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.12,
        transparent: true,
        opacity: 0.5,
        sizeAttenuation: true,
      }),
    ),
  );
}

/* ────────────────────────────────
   カードデータ
   ──────────────────────────────── */
type CardData = {
  mesh: THREE.Mesh;
  work: Work;
  index: number;
  originalPos: THREE.Vector3;
  targetPos: THREE.Vector3;
  floatOffset: number;
  emissiveColor: THREE.Color;
};

/* ────────────────────────────────
   メインコンポーネント
   ──────────────────────────────── */
export default function PortfolioScene() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [ogpMap, setOgpMap] = useState<OgpMap>({});
  const [loaded, setLoaded] = useState(false);
  const [sceneState, setSceneState] = useState<SceneState>("overview");
  const [selectedWorkId, setSelectedWorkId] = useState<string | null>(null);
  const [cameraPos, setCameraPos] = useState({ x: 0, y: 0, z: 25 });

  // Three.js refs
  const cardsRef = useRef<CardData[]>([]);
  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());
  const hoveredCardRef = useRef<string | null>(null);
  const animFrameRef = useRef(0);

  // State refs for animation loop
  const sceneStateRef = useRef(sceneState);
  const selectedWorkIdRef = useRef(selectedWorkId);
  useEffect(() => {
    sceneStateRef.current = sceneState;
  }, [sceneState]);
  useEffect(() => {
    selectedWorkIdRef.current = selectedWorkId;
  }, [selectedWorkId]);

  // Camera animation targets
  const cameraTargetPos = useRef(new THREE.Vector3(0, 0, 35));
  const cameraLookTarget = useRef(new THREE.Vector3(0, 0, 0));

  // ソート済みワーク
  const sortedWorks = useRef(sortWorksSemantically(works));

  /* データ読み込み */
  useEffect(() => {
    fetch("/portfolio-ogp.json")
      .then((r) => r.json())
      .then((ogp) => {
        setOgpMap(ogp);
        setLoaded(true);
      });
  }, []);

  /* Three.jsシーン構築 */
  useEffect(() => {
    if (!loaded || !containerRef.current) return;
    const container = containerRef.current;
    const workList = sortedWorks.current;

    // レスポンシブ: モバイルかどうか
    const isMobile = container.clientWidth < 768;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    // Camera — モバイルは近めに配置
    const initialZ = isMobile ? 18 : 25;
    const camera = new THREE.PerspectiveCamera(
      isMobile ? 70 : 60,
      container.clientWidth / container.clientHeight,
      0.1,
      300,
    );
    camera.position.set(0, 0, initialZ);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.minDistance = isMobile ? 6 : 10;
    controls.maxDistance = isMobile ? 35 : 50;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.15;
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controlsRef.current = controls;

    // Lights — OGP画像の元の発色を活かす
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const pl1 = new THREE.PointLight(0xffffff, 0.7);
    pl1.position.set(20, 20, 20);
    scene.add(pl1);
    const pl2 = new THREE.PointLight(0x445566, 0.3);
    pl2.position.set(-20, -20, -20);
    scene.add(pl2);

    // Stars
    createStars(scene);

    // Fibonacci Sphere positions
    const spherePoints = gridSphere(workList.length, SPHERE_RADIUS);

    // Cards
    const loader = new THREE.TextureLoader();
    const cards: CardData[] = [];

    workList.forEach((work, i) => {
      const pos = spherePoints[i];
      const imgPath = ogpMap[work.id];
      const emissiveColor = new THREE.Color(CARD_EMISSIVE);

      function buildCard(texture: THREE.Texture) {
        const cardW = isMobile ? 2.0 : 1.6;
        const cardH = isMobile ? 1.25 : 1.0;
        const geo = new THREE.PlaneGeometry(cardW, cardH);
        const mat = new THREE.MeshStandardMaterial({
          map: texture,
          emissive: emissiveColor,
          emissiveIntensity: 0.08,
          side: THREE.DoubleSide,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(pos);
        mesh.userData = { workId: work.id, cardIndex: i };
        scene.add(mesh);

        cards.push({
          mesh,
          work,
          index: i,
          originalPos: pos.clone(),
          targetPos: pos.clone(),
          floatOffset: Math.random() * Math.PI * 2,
          emissiveColor,
        });
      }

      if (imgPath) {
        loader.load(imgPath, buildCard, undefined, () => {
          buildCard(createFallbackTexture(work.title, CARD_EMISSIVE));
        });
      } else {
        buildCard(createFallbackTexture(work.title, CARD_EMISSIVE));
      }
    });
    cardsRef.current = cards;

    // Animation loop
    const clock = new THREE.Clock();

    let frameCount = 0;
    function animate() {
      animFrameRef.current = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();
      const state = sceneStateRef.current;
      const selectedId = selectedWorkIdRef.current;

      // カメラ座標をReact stateに反映（6フレームごと）
      frameCount++;
      if (frameCount % 6 === 0) {
        setCameraPos({
          x: parseFloat(camera.position.x.toFixed(2)),
          y: parseFloat(camera.position.y.toFixed(2)),
          z: parseFloat(camera.position.z.toFixed(2)),
        });
      }

      // Controls
      if (state === "overview") {
        controls.enabled = true;
        controls.autoRotate = true;
      } else {
        controls.enabled = false;
        controls.autoRotate = false;
      }
      controls.update();

      // Camera lerp (focused/detail)
      if (state !== "overview") {
        camera.position.lerp(cameraTargetPos.current, 0.04);
        const lookAt = new THREE.Vector3();
        lookAt.lerpVectors(
          camera.getWorldDirection(new THREE.Vector3())
            .multiplyScalar(100)
            .add(camera.position),
          cameraLookTarget.current,
          0.06,
        );
        camera.lookAt(cameraLookTarget.current);
      }

      // Cards
      for (const card of cards) {
        // Smooth move to target
        card.mesh.position.lerp(card.targetPos, 0.06);

        // Float
        card.mesh.position.y +=
          Math.sin(elapsed * 0.25 + card.floatOffset) * 0.02;

        // Billboard
        card.mesh.lookAt(camera.position);

        // Scale & emissive
        const isSelected = card.work.id === selectedId;
        const isHovered = card.work.id === hoveredCardRef.current;
        const targetScale = isSelected ? 1.6 : isHovered ? 1.2 : 1;
        card.mesh.scale.lerp(
          new THREE.Vector3(targetScale, targetScale, targetScale),
          0.08,
        );

        // 選択カードを最前面に描画（他カードに遮られない）
        card.mesh.renderOrder = isSelected ? 999 : 0;
        const mat = card.mesh.material as THREE.MeshStandardMaterial;
        mat.depthTest = !isSelected;

        const targetIntensity = isSelected ? 0.25 : isHovered ? 0.15 : 0.08;
        mat.emissiveIntensity +=
          (targetIntensity - mat.emissiveIntensity) * 0.1;
      }

      renderer.render(scene, camera);
    }
    animate();

    // Resize
    function onResize() {
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    }
    window.addEventListener("resize", onResize);

    // Pointer move
    function onPointerMove(e: PointerEvent) {
      const rect = renderer.domElement.getBoundingClientRect();
      mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycasterRef.current.setFromCamera(mouseRef.current, camera);
      const intersects = raycasterRef.current.intersectObjects(
        cards.map((c) => c.mesh),
      );
      if (intersects.length > 0) {
        hoveredCardRef.current = intersects[0].object.userData.workId;
        renderer.domElement.style.cursor = "pointer";
      } else {
        hoveredCardRef.current = null;
        renderer.domElement.style.cursor = "auto";
      }
    }
    renderer.domElement.addEventListener("pointermove", onPointerMove);

    // Click（ドラッグと区別: mousedown〜mouseup間の移動が5px以内のみクリック扱い）
    let pointerDownPos = { x: 0, y: 0 };
    function onPointerDown(e: PointerEvent) {
      pointerDownPos = { x: e.clientX, y: e.clientY };
    }
    function onPointerUp(e: PointerEvent) {
      const dx = e.clientX - pointerDownPos.x;
      const dy = e.clientY - pointerDownPos.y;
      if (dx * dx + dy * dy > 25) return; // 5px以上動いたらドラッグ

      const rect = renderer.domElement.getBoundingClientRect();
      mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycasterRef.current.setFromCamera(mouseRef.current, camera);
      const intersects = raycasterRef.current.intersectObjects(
        cards.map((c) => c.mesh),
      );
      if (intersects.length > 0) {
        const workId = intersects[0].object.userData.workId as string;
        window.dispatchEvent(
          new CustomEvent("portfolio-card-click", { detail: { workId } }),
        );
      } else {
        window.dispatchEvent(new CustomEvent("portfolio-bg-click"));
      }
    }
    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointerup", onPointerUp);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener("resize", onResize);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [loaded, ogpMap]);

  /* カメラ & カード位置 更新 */
  useEffect(() => {
    const cards = cardsRef.current;
    if (!cards.length) return;

    if (sceneState === "overview") {
      // 元のFibonacci配置に戻す
      for (const card of cards) {
        card.targetPos.copy(card.originalPos);
      }
      const overviewZ = window.innerWidth < 768 ? 22 : 35;
      cameraTargetPos.current.set(0, 0, overviewZ);
      cameraLookTarget.current.set(0, 0, 0);
    } else if (selectedWorkId) {
      const selectedIdx = cards.findIndex(
        (c) => c.work.id === selectedWorkId,
      );
      if (selectedIdx < 0) return;
      const selected = cards[selectedIdx];

      // カメラ: 選択カードの法線方向に引く（球の外側）
      const normal = selected.originalPos.clone().normalize();
      const camPos = selected.originalPos
        .clone()
        .add(normal.clone().multiplyScalar(window.innerWidth < 768 ? 5 : 8));
      cameraTargetPos.current.copy(camPos);
      cameraLookTarget.current.copy(selected.originalPos);

      // 周囲カードをグリッド整列
      const focused = computeFocusedPositions(cards, selectedIdx);
      for (let i = 0; i < cards.length; i++) {
        cards[i].targetPos.copy(focused[i]);
      }
    }
  }, [sceneState, selectedWorkId]);

  /* イベントリスナー */
  useEffect(() => {
    function handleCardClick(e: Event) {
      const workId = (e as CustomEvent).detail.workId as string;
      if (sceneState === "overview") {
        setSelectedWorkId(workId);
        setSceneState("focused");
      } else if (sceneState === "focused" && selectedWorkId === workId) {
        setSceneState("detail");
      } else if (sceneState === "focused") {
        setSelectedWorkId(workId);
      }
    }
    function handleBgClick() {
      if (sceneState === "focused") {
        setSceneState("overview");
        setSelectedWorkId(null);
      }
    }
    window.addEventListener("portfolio-card-click", handleCardClick);
    window.addEventListener("portfolio-bg-click", handleBgClick);
    return () => {
      window.removeEventListener("portfolio-card-click", handleCardClick);
      window.removeEventListener("portfolio-bg-click", handleBgClick);
    };
  }, [sceneState, selectedWorkId]);

  /* キーボード */
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (sceneState === "detail") {
          setSceneState("focused");
        } else if (sceneState === "focused") {
          setSceneState("overview");
          setSelectedWorkId(null);
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [sceneState]);

  const selectedWork = selectedWorkId
    ? works.find((w) => w.id === selectedWorkId) || null
    : null;

  if (!loaded) {
    return (
      <div className="flex h-dvh items-center justify-center bg-black text-zinc-500">
        Loading 3D Portfolio...
      </div>
    );
  }

  return (
    <div className="relative h-dvh w-full bg-black">
      <div
        ref={containerRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
        }}
      />

      {/* 戻るリンク */}
      <a
        href="/"
        className="fixed left-4 top-4 z-40 rounded-full border border-white/10 bg-black/40 px-4 py-2 text-sm text-zinc-400 backdrop-blur-md transition-colors hover:text-white"
      >
        ← PAUL bot
      </a>

      {/* タイトル */}
      <div className="fixed left-1/2 top-4 z-40 -translate-x-1/2">
        <h1 className="text-sm font-bold tracking-widest text-zinc-500">
          PORTFOLIO
        </h1>
      </div>

      {/* 3D座標表示 */}
      <div className="fixed right-5 bottom-8 z-40 select-none font-mono text-[10px] leading-relaxed tracking-wider text-zinc-600">
        <div className="space-y-0.5 text-right">
          <div>
            <span className="text-zinc-500">X</span>{" "}
            <span className="tabular-nums">{cameraPos.x >= 0 ? "+" : ""}{cameraPos.x.toFixed(2)}</span>
          </div>
          <div>
            <span className="text-zinc-500">Y</span>{" "}
            <span className="tabular-nums">{cameraPos.y >= 0 ? "+" : ""}{cameraPos.y.toFixed(2)}</span>
          </div>
          <div>
            <span className="text-zinc-500">Z</span>{" "}
            <span className="tabular-nums">{cameraPos.z >= 0 ? "+" : ""}{cameraPos.z.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* ヒント */}
      {sceneState === "overview" && (
        <div className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2 text-center">
          <p className="text-xs text-zinc-600">
            <span className="hidden sm:inline">Drag to rotate / Scroll to zoom / Click a card</span>
            <span className="sm:hidden">Swipe to rotate / Pinch to zoom / Tap a card</span>
          </p>
        </div>
      )}

      {/* 詳細パネル */}
      {sceneState === "detail" && selectedWork && (
        <DetailPanel
          work={selectedWork}
          imageUrl={ogpMap[selectedWork.id] || ""}
          onClose={() => setSceneState("focused")}
        />
      )}
    </div>
  );
}
