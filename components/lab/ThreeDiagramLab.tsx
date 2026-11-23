"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import {
  ChevronDown,
  ChevronUp,
  Layers,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  X,
} from "lucide-react";
import {
  buildProceduralModel,
  MODEL_3D_CATALOG,
  type Built3DModel,
  type DiagramPartSpec,
} from "@/lib/three-models";
import type { Model3DKey } from "@/lib/types";

interface ThreeDiagramLabProps {
  modelKey: Exclude<Model3DKey, "">;
  onModelChange?: (key: Exclude<Model3DKey, "">) => void;
  onAskAiPart?: (partName: string, modelTitle: string) => void;
  embedded?: boolean;
}

const _tmpVec = new THREE.Vector3();

function detectSoftwareGl(): boolean {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
    if (!gl) return true;
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export default function ThreeDiagramLab({
  modelKey,
  onModelChange,
  onAskAiPart,
  embedded = false,
}: ThreeDiagramLabProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [explodeFactor, setExplodeFactor] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [autoRotate, setAutoRotate] = useState(false);
  const [dockOpen, setDockOpen] = useState(true);
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);
  const [isolatedPartId, setIsolatedPartId] = useState<string | null>(null);

  // Refs synced to WebGL render loop so UI state never tears down the canvas
  const explodeTargetRef = useRef(0);
  const explodeCurrentRef = useRef(0);
  const isPlayingRef = useRef(true);
  const autoRotateRef = useRef(false);
  const selectedPartRef = useRef<string | null>(null);
  const isolatedPartRef = useRef<string | null>(null);
  const resetCameraRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    explodeTargetRef.current = explodeFactor;
  }, [explodeFactor]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    autoRotateRef.current = autoRotate;
  }, [autoRotate]);

  useEffect(() => {
    selectedPartRef.current = selectedPartId;
  }, [selectedPartId]);

  useEffect(() => {
    isolatedPartRef.current = isolatedPartId;
  }, [isolatedPartId]);

  const catalogItem = useMemo(
    () => MODEL_3D_CATALOG.find((m) => m.key === modelKey) || MODEL_3D_CATALOG[0],
    [modelKey]
  );

  const selectedPartSpec: DiagramPartSpec | null = useMemo(
    () => catalogItem.parts.find((p) => p.id === selectedPartId) || null,
    [catalogItem, selectedPartId]
  );

  // Reset inspection state when switching models
  const [prevModelKey, setPrevModelKey] = useState(modelKey);
  if (modelKey !== prevModelKey) {
    setPrevModelKey(modelKey);
    setSelectedPartId(null);
    setIsolatedPartId(null);
    setExplodeFactor(0);
  }

  useEffect(() => {
    explodeCurrentRef.current = 0;
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareGl();
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 520;

    const scene = new THREE.Scene();
    const bgHex = 0x0b1120;
    scene.background = new THREE.Color(bgHex);
    scene.fog = new THREE.FogExp2(bgHex, 0.045);

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(...catalogItem.cameraPosition);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: "high-performance",
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    // Mandatory studio environment reflection
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTarget = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envTarget.texture;
    pmrem.dispose();

    // Balanced warm/cool 3-point lighting rig
    const hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x1e293b, 0.9);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff4e6, 2.2);
    keyLight.position.set(5.5, 7.5, 6);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.left = -4.5;
    keyLight.shadow.camera.right = 4.5;
    keyLight.shadow.camera.top = 4.5;
    keyLight.shadow.camera.bottom = -4.5;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x818cf8, 1.15);
    rimLight.position.set(-6, 3.5, -5);
    scene.add(rimLight);

    // Subtle procedural radial contact shadow disc for grounding
    const shadowCanvas = document.createElement("canvas");
    shadowCanvas.width = 256;
    shadowCanvas.height = 256;
    const sctx = shadowCanvas.getContext("2d");
    if (sctx) {
      const grad = sctx.createRadialGradient(128, 128, 8, 128, 128, 124);
      grad.addColorStop(0, "rgba(0,0,0,0.65)");
      grad.addColorStop(0.55, "rgba(0,0,0,0.22)");
      grad.addColorStop(1, "rgba(0,0,0,0)");
      sctx.fillStyle = grad;
      sctx.fillRect(0, 0, 256, 256);
    }
    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    const shadowPlaneGeo = new THREE.PlaneGeometry(6.8, 6.8);
    const shadowPlaneMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.72,
    });
    const shadowPlane = new THREE.Mesh(shadowPlaneGeo, shadowPlaneMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = -2.45;
    scene.add(shadowPlane);

    // Build procedural composite model
    const built: Built3DModel = buildProceduralModel(modelKey, isSoftwareGl);
    scene.add(built.root);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.minDistance = 2.6;
    controls.maxDistance = 12.5;
    controls.target.set(0, 0.1, 0);
    controls.update();

    resetCameraRef.current = () => {
      camera.position.set(...catalogItem.cameraPosition);
      controls.target.set(0, 0.1, 0);
      controls.update();
    };

    // Raycasting for click part inspection
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let pointerDownX = 0;
    let pointerDownY = 0;

    const onPointerDown = (e: PointerEvent) => {
      pointerDownX = e.clientX;
      pointerDownY = e.clientY;
    };

    const onPointerUp = (e: PointerEvent) => {
      const moved = Math.hypot(e.clientX - pointerDownX, e.clientY - pointerDownY);
      if (moved > 6) return; // Ignore orbit drag
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(built.selectableParts, true);
      if (hits.length > 0) {
        const partId = hits[0].object.userData.partId as string | undefined;
        if (partId) {
          setSelectedPartId(partId);
        }
      }
    };

    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointerup", onPointerUp);

    // Resize observer
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        const h = entry.contentRect.height;
        if (w > 0 && h > 0) {
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        }
      }
    });
    resizeObserver.observe(container);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    let frameId = 0;
    let disposed = false;
    const clock = new THREE.Clock();

    const afterDraw = (cb: () => void) => {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0) : null;
      gl.flush();
      const poll = () => {
        if (disposed) return;
        if (!sync) {
          frameId = window.setTimeout(cb, 80);
          return;
        }
        const state = gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    };

    const tick = () => {
      if (disposed) return;
      const dt = Math.min(clock.getDelta(), 0.05);
      const elapsed = clock.getElapsedTime();

      // Exponentially damped exploded view
      const alpha = 1 - Math.exp(-8 * dt);
      explodeCurrentRef.current += (explodeTargetRef.current - explodeCurrentRef.current) * alpha;
      const ex = explodeCurrentRef.current;

      for (const part of built.selectableParts) {
        const base = built.partBasePositions.get(part);
        const vec = built.partExplodeVectors.get(part);
        if (base && vec) {
          _tmpVec.copy(base).addScaledVector(vec, ex);
          part.position.copy(_tmpVec);
        }

        // Layer isolation & subtle selection highlight
        const pId = part.userData.partId as string;
        const iso = isolatedPartRef.current;
        part.visible = !iso || iso === pId;

        const isSel = selectedPartRef.current === pId;
        part.traverse((child) => {
          const mesh = child as THREE.Mesh;
          if (mesh.isMesh && mesh.material && "emissiveIntensity" in mesh.material) {
            const mat = mesh.material as THREE.MeshStandardMaterial;
            if (mat.userData.origEmissive === undefined) {
              mat.userData.origEmissive = mat.emissive.getHex();
              mat.userData.origIntensity = mat.emissiveIntensity;
            }
            if (isSel) {
              mat.emissive.setHex(0x6366f1);
              mat.emissiveIntensity = 0.55;
            } else {
              mat.emissive.setHex(mat.userData.origEmissive as number);
              mat.emissiveIntensity = mat.userData.origIntensity as number;
            }
          }
        });
      }

      built.animate(elapsed, dt, isPlayingRef.current);

      controls.autoRotate = !isSoftwareGl && autoRotateRef.current;
      controls.autoRotateSpeed = 1.6;
      controls.update();

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      controls.dispose();
      built.dispose();
      shadowPlaneGeo.dispose();
      shadowPlaneMat.dispose();
      shadowTex.dispose();
      envTarget.dispose();
      renderer.dispose();
    };
  }, [modelKey, catalogItem]);

  return (
    <div
      className={`relative w-full overflow-hidden bg-[#0B1120] select-none ${
        embedded ? "h-[540px] rounded-2xl border border-slate-800" : "h-[calc(100vh-76px)] rounded-2xl border border-slate-800"
      }`}
    >
      {/* Dedicated isolated WebGL canvas container */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Minimal Top-Left Spec Badge (solid/rgba surface — no backdrop-filter over WebGL) */}
      <div className="absolute top-4 left-4 z-10 max-w-md bg-[rgba(11,17,32,0.88)] border border-slate-700/80 rounded-xl px-4 py-2.5 text-slate-100">
        <div className="flex items-center gap-2 text-xs text-indigo-300 font-medium">
          <span>3D Interactive Lab</span>
          <span aria-hidden="true">·</span>
          <span>{catalogItem.subject}</span>
        </div>
        <h3 className="text-sm font-semibold text-white mt-0.5">{catalogItem.title}</h3>
        <p className="text-xs text-slate-400 mt-0.5">{catalogItem.banglaTitle} — Click any structure to inspect</p>
      </div>

      {/* Selected Part Compact Inspector Toast (Top-Center/Top-Right only when user clicks a part) */}
      {selectedPartSpec && (
        <div className="absolute top-4 right-4 z-10 w-80 max-w-[calc(100vw-2rem)] bg-[rgba(15,23,42,0.95)] border border-indigo-500/50 rounded-xl p-4 text-slate-100 shadow-2xl">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-[11px] font-medium text-indigo-300">{selectedPartSpec.category}</div>
              <h4 className="text-sm font-semibold text-white mt-0.5">{selectedPartSpec.name}</h4>
              <div className="text-xs text-slate-400">{selectedPartSpec.banglaName}</div>
            </div>
            <button
              onClick={() => {
                setSelectedPartId(null);
                setIsolatedPartId(null);
              }}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label="Close part inspector"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-slate-300 mt-2.5 leading-relaxed">{selectedPartSpec.description}</p>
          <div className="mt-2.5 pt-2.5 border-t border-slate-800 text-xs text-amber-300 leading-relaxed">
            <span className="font-semibold">Exam Key:</span> {selectedPartSpec.examTip}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={() =>
                setIsolatedPartId((prev) => (prev === selectedPartSpec.id ? null : selectedPartSpec.id))
              }
              className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                isolatedPartId === selectedPartSpec.id
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-800 text-slate-200 hover:bg-slate-700"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              {isolatedPartId === selectedPartSpec.id ? "Show All Parts" : "Isolate Part"}
            </button>
            {onAskAiPart && (
              <button
                onClick={() => onAskAiPart(selectedPartSpec.name, catalogItem.title)}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-500 transition-colors whitespace-nowrap"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Ask AI Tutor
              </button>
            )}
          </div>
        </div>
      )}

      {/* Unified Collapsible Bottom Control Dock (Zero Viewport Occlusion) */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 w-[min(920px,94%)] flex flex-col items-center">
        <button
          onClick={() => setDockOpen((v) => !v)}
          className="mb-1.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-t-lg bg-[rgba(15,23,42,0.92)] border border-slate-700/80 text-xs font-medium text-slate-300 hover:text-white transition-colors"
        >
          {dockOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          {dockOpen ? "Hide Controls" : "Show Controls"}
        </button>

        {dockOpen && (
          <div className="w-full bg-[rgba(15,23,42,0.94)] border border-slate-700/80 rounded-2xl px-4 py-3 text-slate-100 shadow-2xl space-y-2.5">
            {/* Row 1: Model Switcher + Exploded Slider + Playback */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              {onModelChange && (
                <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
                  {MODEL_3D_CATALOG.map((m) => (
                    <button
                      key={m.key}
                      onClick={() => onModelChange(m.key)}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                        m.key === modelKey
                          ? "bg-indigo-600 text-white"
                          : "text-slate-400 hover:text-slate-100"
                      }`}
                    >
                      {m.key === "human_heart"
                        ? "Heart"
                        : m.key === "eukaryotic_cell"
                          ? "Cell"
                          : m.key === "atomic_structure"
                            ? "Atom"
                            : "DNA Helix"}
                    </button>
                  ))}
                </div>
              )}

              {/* Exploded View Slider */}
              <div className="flex items-center gap-2.5 min-w-[200px] flex-1 max-w-xs">
                <span className="text-xs text-slate-300 font-medium whitespace-nowrap">
                  Explode: <span className="font-mono tabular-nums text-indigo-300">{Math.round(explodeFactor * 100)}%</span>
                </span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.02}
                  value={explodeFactor}
                  onChange={(e) => setExplodeFactor(parseFloat(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer"
                  aria-label="Exploded view separation"
                />
              </div>

              {/* Controls */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setIsPlaying((p) => !p)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-100 transition-colors whitespace-nowrap"
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  {isPlaying ? "Pause" : "Animate"}
                </button>
                <button
                  onClick={() => setAutoRotate((r) => !r)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                    autoRotate
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  Orbit
                </button>
                <button
                  onClick={() => {
                    setExplodeFactor(0);
                    setIsolatedPartId(null);
                    setSelectedPartId(null);
                    resetCameraRef.current?.();
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors whitespace-nowrap"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset
                </button>
              </div>
            </div>

            {/* Row 2: Quick Part Jump Buttons */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
              <span className="text-[11px] text-slate-400 mr-1 whitespace-nowrap">Parts:</span>
              {catalogItem.parts.map((part) => (
                <button
                  key={part.id}
                  onClick={() => setSelectedPartId(part.id)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
                    selectedPartId === part.id
                      ? "bg-indigo-600/30 border-indigo-400 text-white"
                      : "bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-600"
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-xs shrink-0"
                    style={{ backgroundColor: part.colorHex }}
                  />
                  {part.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
