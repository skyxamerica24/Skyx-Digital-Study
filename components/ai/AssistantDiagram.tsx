"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { DiagramSpec } from "@/lib/assistant/artifacts";

export default function AssistantDiagram({spec}: {spec:DiagramSpec}) {
  const container = useRef<HTMLDivElement>(null);
  const meshes = useRef(new Map<string,THREE.Mesh>());
  const [selected,setSelected] = useState("");
  const [error,setError] = useState(false);
  useEffect(() => {
    const host=container.current;
    if (!host) return;
    setSelected("");
    let renderer: THREE.WebGLRenderer;
    try { renderer=new THREE.WebGLRenderer({antialias:true}); }
    catch { setError(true); return; }
    setError(false);
    const scene=new THREE.Scene();
    scene.background=new THREE.Color("#eff6ff");
    const camera=new THREE.PerspectiveCamera(45,1,0.03,200);
    host.appendChild(renderer.domElement);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1,1.5));
    const controls=new OrbitControls(camera,renderer.domElement);
    scene.add(new THREE.HemisphereLight("#ffffff","#7185a0",2.6));
    const light=new THREE.DirectionalLight("#ffffff",2);
    light.position.set(4,6,5);
    scene.add(light);
    const objects=meshes.current;
    const group=new THREE.Group();
    scene.add(group);
    for (const part of spec.parts) {
      const s=part.size;
      const geometries = {
        sphere: () => new THREE.SphereGeometry(s/2,20,14),
        box: () => new THREE.BoxGeometry(s,s,s),
        cylinder: () => new THREE.CylinderGeometry(s/2,s/2,s,20),
        cone: () => new THREE.ConeGeometry(s/2,s,20),
        torus: () => new THREE.TorusGeometry(s/2,s/7,10,30),
      };
      const mesh=new THREE.Mesh(geometries[part.shape](),new THREE.MeshStandardMaterial({color:part.color}));
      mesh.position.set(...part.position);
      if (part.rotation) mesh.rotation.set(...part.rotation);
      group.add(mesh);
      objects.set(part.id,mesh);
    }
    for (const edge of spec.connections) {
      const from=objects.get(edge.from)!.position;
      const to=objects.get(edge.to)!.position;
      const geometry=new THREE.BufferGeometry().setFromPoints([from,to]);
      group.add(new THREE.Line(geometry,new THREE.LineBasicMaterial({color:edge.color})));
    }
    const bounds=new THREE.Box3().setFromObject(group);
    const center=bounds.getCenter(new THREE.Vector3());
    const radius=Math.max(0.3,bounds.getSize(new THREE.Vector3()).length()/2);
    camera.position.copy(center).add(new THREE.Vector3(1,0.65,1.3).normalize().multiplyScalar(radius*3.8));
    controls.target.copy(center);
    controls.update();
    const render=()=>renderer.render(scene,camera);
    function resize() {
      if (!host) return;
      const width=Math.max(1,host.clientWidth);
      const height=Math.max(1,host.clientHeight);
      camera.aspect=width/height;
      camera.updateProjectionMatrix();
      renderer.setSize(width,height);
      render();
    }
    controls.addEventListener("change",render);
    const observer=new ResizeObserver(resize);
    observer.observe(host);
    resize();
    // Render only when inputs change. A static card needs no animation loop.
    host.addEventListener("skyx-diagram-render",render);
    return () => {
      host.removeEventListener("skyx-diagram-render",render);
      observer.disconnect();
      controls.dispose();
      group.traverse(object => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
          object.geometry.dispose();
          (object.material as THREE.Material).dispose();
        }
      });
      objects.clear();
      renderer.dispose();
      renderer.domElement.remove();
    };
  },[spec]);

  function highlight(id:string) {
    setSelected(id);
    for (const [part,mesh] of meshes.current) mesh.scale.setScalar(part===id?1.15:1);
    container.current?.dispatchEvent(new Event("skyx-diagram-render"));
  }
  return <div className="space-y-2">
    <div ref={container} className="h-64 w-full overflow-hidden rounded-lg" aria-label="Interactive 3D diagram" />
    {error && <p role="status">3D rendering is unavailable on this device.</p>}
    <div className="flex flex-wrap gap-1">{spec.parts.map(part => (
      <button key={part.id} type="button" aria-pressed={selected===part.id}
        onClick={()=>highlight(part.id)} className="rounded border px-2 py-1 text-xs aria-pressed:bg-indigo-100">{part.label}</button>
    ))}</div>
  </div>;
}
