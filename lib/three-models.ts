import * as THREE from "three";
import type { Model3DKey } from "./types";

export interface DiagramPartSpec {
  id: string;
  name: string;
  banglaName: string;
  category: string;
  colorHex: string;
  description: string;
  examTip: string;
}

export interface Model3DCatalogItem {
  key: Exclude<Model3DKey, "">;
  title: string;
  banglaTitle: string;
  subject: string;
  summary: string;
  cameraPosition: [number, number, number];
  parts: DiagramPartSpec[];
}

export interface Built3DModel {
  root: THREE.Group;
  selectableParts: THREE.Object3D[];
  partBasePositions: Map<THREE.Object3D, THREE.Vector3>;
  partExplodeVectors: Map<THREE.Object3D, THREE.Vector3>;
  animate: (elapsed: number, dt: number, isPlaying: boolean) => void;
  dispose: () => void;
}

export const MODEL_3D_CATALOG: Model3DCatalogItem[] = [
  {
    key: "human_heart",
    title: "Human Heart Anatomy",
    banglaTitle: "মানব হৃৎপিণ্ডের ত্রিমাত্রিক গঠন",
    subject: "Biology",
    summary: "Four-chambered myogenic pump with Aortic Arch, Vena Cava, Pulmonary Trunk, and Coronary vessels.",
    cameraPosition: [0, 1.3, 6.2],
    parts: [
      {
        id: "left_ventricle",
        name: "Left Ventricle",
        banglaName: "বাম নিলয়",
        category: "Systemic Pump",
        colorHex: "#C83246",
        description: "Thickest myocardium (~12–15 mm). Pumps oxygenated blood into the Aorta for systemic circulation.",
        examTip: "3x thicker than Right Ventricle; guarded by the Bicuspid (Mitral) valve.",
      },
      {
        id: "right_ventricle",
        name: "Right Ventricle",
        banglaName: "ডান নিলয়",
        category: "Pulmonary Pump",
        colorHex: "#A12B4A",
        description: "Crescent-shaped lower chamber pumping deoxygenated blood into the pulmonary artery toward the lungs.",
        examTip: "Receives venous blood via the Tricuspid valve.",
      },
      {
        id: "left_atrium",
        name: "Left Atrium",
        banglaName: "বাম অলিন্দ",
        category: "Receiving Chamber",
        colorHex: "#DC4D5B",
        description: "Upper-left chamber receiving freshly oxygenated blood from the lungs through four pulmonary veins.",
        examTip: "Only upper chamber receiving oxygenated blood.",
      },
      {
        id: "right_atrium",
        name: "Right Atrium & SA Node",
        banglaName: "ডান অলিন্দ ও এসএ নোড",
        category: "Pacemaker Chamber",
        colorHex: "#8C325B",
        description: "Receives deoxygenated blood from the Superior & Inferior Vena Cava and houses the SA Node pacemaker.",
        examTip: "SA Node fires 70–75 impulses/min — the heart's natural pacemaker.",
      },
      {
        id: "aortic_arch",
        name: "Aorta & Aortic Arch",
        banglaName: "মহাধমনী (অ্যাওর্টা)",
        category: "Main Artery",
        colorHex: "#E11D48",
        description: "Largest elastic artery distributing high-pressure oxygenated blood to the head, arms, and body.",
        examTip: "Contains baroreceptors that sense blood pressure changes.",
      },
      {
        id: "pulmonary_trunk",
        name: "Pulmonary Artery Trunk",
        banglaName: "ফুসফুসীয় ধমনী",
        category: "Pulmonary Vessel",
        colorHex: "#3B82F6",
        description: "Bifurcating vessel carrying deoxygenated blood from the Right Ventricle to left and right lungs.",
        examTip: "Classic exam favorite: the ONLY artery carrying deoxygenated blood.",
      },
      {
        id: "vena_cava",
        name: "Superior & Inferior Vena Cava",
        banglaName: "ঊর্ধ্ব ও নিম্ন মহাশিরা",
        category: "Great Veins",
        colorHex: "#2563EB",
        description: "Great systemic veins returning deoxygenated blood from upper and lower body into the Right Atrium.",
        examTip: "Lacks valves at the junction with the Right Atrium.",
      },
    ],
  },
  {
    key: "eukaryotic_cell",
    title: "Eukaryotic Animal Cell",
    banglaTitle: "প্রকৃত প্রাণীকোষ ও অঙ্গাণু",
    subject: "Biology",
    summary: "Cutaway eukaryotic cell showcasing double-membrane Nucleus, Mitochondria, Golgi Apparatus, ER, and Ribosomes.",
    cameraPosition: [0, 2.4, 6.4],
    parts: [
      {
        id: "plasma_membrane",
        name: "Plasma Membrane & Cytoplasm",
        banglaName: "কোষঝিল্লি ও সাইটোপ্লাজম",
        category: "Boundary",
        colorHex: "#38BDF8",
        description: "Selectively permeable phospholipid bilayer enclosing the aqueous cytosol and organelles.",
        examTip: "Described by Singer & Nicolson's Fluid Mosaic Model (1972).",
      },
      {
        id: "nucleus",
        name: "Nucleus & Nucleolus",
        banglaName: "নিউক্লিয়াস ও নিউক্লিওলাস",
        category: "Genetic Core",
        colorHex: "#7C3AED",
        description: "Double-membrane genetic control center storing chromatin DNA; inner nucleolus assembles ribosomes.",
        examTip: "Discovered by Robert Brown in 1831.",
      },
      {
        id: "mitochondria",
        name: "Mitochondria (Cristae)",
        banglaName: "মাইটোকন্ড্রিয়া",
        category: "ATP Powerhouse",
        colorHex: "#F97316",
        description: "Double-membrane energy generators with folded inner cristae driving Krebs cycle and ATP synthesis.",
        examTip: "Contains circular mtDNA and 70S ribosomes (Endosymbiotic origin).",
      },
      {
        id: "golgi_apparatus",
        name: "Golgi Apparatus",
        banglaName: "গলজি বডি",
        category: "Sorting & Packaging",
        colorHex: "#10B981",
        description: "Stacked membrane cisternae that modify, sort, and package proteins into secretory vesicles and lysosomes.",
        examTip: "Forms the acrosome of sperm and acts as the cell's 'Post Office'.",
      },
      {
        id: "rough_er",
        name: "Rough ER & Ribosomes",
        banglaName: "অমসৃণ এন্ডোপ্লাজমিক রেটিকুলাম",
        category: "Protein Synthesis",
        colorHex: "#EC4899",
        description: "Folded membrane network studded with 80S ribosomes for synthesizing and folding export proteins.",
        examTip: "Continuous with the outer nuclear envelope.",
      },
    ],
  },
  {
    key: "atomic_structure",
    title: "Bohr & Quantum Atomic Model",
    banglaTitle: "বোর পরমাণু মডেল ও শক্তিস্তর",
    subject: "Physics",
    summary: "Nucleon-clustered Nucleus with quantized K, L, M orbital shells and animated electron transitions.",
    cameraPosition: [0, 1.8, 6.8],
    parts: [
      {
        id: "atomic_nucleus",
        name: "Proton–Neutron Nucleus",
        banglaName: "পরমাণুর নিউক্লিয়াস",
        category: "Core",
        colorHex: "#EF4444",
        description: "Dense central core containing positively charged protons and neutral neutrons bound by strong nuclear force.",
        examTip: "Radius is ~10⁻¹⁵ m, yet holds >99.9% of the atom's total mass.",
      },
      {
        id: "shell_k",
        name: "K-Shell (n = 1 Ground State)",
        banglaName: "K-শক্তিস্তর (n = 1)",
        category: "Innermost Orbit",
        colorHex: "#38BDF8",
        description: "Lowest energy orbit (E₁ = -13.6 eV in Hydrogen, radius 0.529 Å). Drops here emit UV Lyman photons.",
        examTip: "Maximum capacity 2n² = 2 electrons.",
      },
      {
        id: "shell_l",
        name: "L-Shell (n = 2 Excited State)",
        banglaName: "L-শক্তিস্তর (n = 2)",
        category: "Balmer Level",
        colorHex: "#818CF8",
        description: "Second stationary shell (E₂ = -3.4 eV). Electron transitions ending at n = 2 emit visible Balmer light.",
        examTip: "Maximum capacity 2n² = 8 electrons.",
      },
      {
        id: "shell_m",
        name: "M-Shell (n = 3 Outer Orbit)",
        banglaName: "M-শক্তিস্তর (n = 3)",
        category: "Paschen Level",
        colorHex: "#34D399",
        description: "Third quantized orbital (E₃ = -1.51 eV). Jumps from n=3 → n=2 produce the bright red H-alpha line (656 nm).",
        examTip: "Angular momentum L = 3h / 2π.",
      },
    ],
  },
  {
    key: "molecular_geometry",
    title: "DNA Double Helix & Molecular Bonds",
    banglaTitle: "ডিএনএ দ্বি-সর্পিল ও রাসায়নিক বন্ধন",
    subject: "Chemistry",
    summary: "Antiparallel sugar-phosphate helical backbones joined by complementary A=T and G≡C hydrogen-bonded base pairs.",
    cameraPosition: [0, 0.8, 6.8],
    parts: [
      {
        id: "backbone_53",
        name: "5' → 3' Sugar-Phosphate Backbone",
        banglaName: "সুগার-ফসফেট ব্যাকবোন (৫' → ৩')",
        category: "Structural Strand",
        colorHex: "#6366F1",
        description: "Alternating deoxyribose sugars and phosphate groups linked by strong covalent phosphodiester bonds.",
        examTip: "Negatively charged phosphate groups sit on the exterior of the helix.",
      },
      {
        id: "backbone_35",
        name: "3' → 5' Antiparallel Backbone",
        banglaName: "বিপরীতমুখী ব্যাকবোন (৩' → ৫')",
        category: "Complementary Strand",
        colorHex: "#0EA5E9",
        description: "Runs antiparallel to the primary strand, maintaining a constant helical diameter of 2.0 nm.",
        examTip: "One full 360° turn spans 3.4 nm (10 base pairs).",
      },
      {
        id: "at_pairs",
        name: "Adenine = Thymine Pairs",
        banglaName: "অ্যাডেনিন = থাইমিন (২ হাইড্রোজেন বন্ধন)",
        category: "Base Pair",
        colorHex: "#F59E0B",
        description: "Purine Adenine pairs strictly with Pyrimidine Thymine via two directional hydrogen bonds.",
        examTip: "Chargaff's Rule: [A] = [T] in double-stranded DNA.",
      },
      {
        id: "gc_pairs",
        name: "Guanine ≡ Cytosine Pairs",
        banglaName: "গুয়ানিন ≡ সাইটোসিন (৩ হাইড্রোজেন বন্ধন)",
        category: "High-Stability Pair",
        colorHex: "#10B981",
        description: "Purine Guanine pairs with Pyrimidine Cytosine via three hydrogen bonds, increasing thermal stability.",
        examTip: "Higher GC percentage = higher DNA melting temperature (Tm).",
      },
    ],
  },
];

function createOrganicTexture(baseHex: string, veinHex: string): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = baseHex;
    ctx.fillRect(0, 0, 256, 256);

    // Subtle organic fiber striations
    for (let i = 0; i < 140; i++) {
      ctx.strokeStyle = i % 3 === 0 ? veinHex : "rgba(255,255,255,0.06)";
      ctx.lineWidth = i % 5 === 0 ? 1.5 : 0.8;
      ctx.beginPath();
      const y = (i / 140) * 256;
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(85, y + Math.sin(i * 0.4) * 14, 170, y - Math.cos(i * 0.3) * 14, 256, y);
      ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function registerPart(
  mesh: THREE.Object3D,
  partId: string,
  explodeVec: THREE.Vector3,
  selectableParts: THREE.Object3D[],
  baseMap: Map<THREE.Object3D, THREE.Vector3>,
  explodeMap: Map<THREE.Object3D, THREE.Vector3>
) {
  mesh.userData.partId = partId;
  mesh.traverse((child) => {
    child.userData.partId = partId;
    if ((child as THREE.Mesh).isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  selectableParts.push(mesh);
  baseMap.set(mesh, mesh.position.clone());
  explodeMap.set(mesh, explodeVec);
}

export function buildProceduralModel(
  modelKey: Exclude<Model3DKey, "">,
  isSoftwareGl: boolean
): Built3DModel {
  const root = new THREE.Group();
  const selectableParts: THREE.Object3D[] = [];
  const partBasePositions = new Map<THREE.Object3D, THREE.Vector3>();
  const partExplodeVectors = new Map<THREE.Object3D, THREE.Vector3>();
  const disposables: { dispose: () => void }[] = [];

  const track = <T extends { dispose: () => void }>(item: T): T => {
    disposables.push(item);
    return item;
  };

  let animateFn: (elapsed: number, dt: number, isPlaying: boolean) => void = () => {};

  if (modelKey === "human_heart") {
    const muscleTex = track(createOrganicTexture("#b8293d", "rgba(70,12,24,0.35)"));
    const rightTex = track(createOrganicTexture("#8f2441", "rgba(45,10,25,0.35)"));

    // 1. Left Ventricle (LatheGeometry sculpted apex)
    const lvPoints = [
      new THREE.Vector2(0.01, -1.55),
      new THREE.Vector2(0.45, -1.2),
      new THREE.Vector2(0.82, -0.55),
      new THREE.Vector2(0.88, 0.15),
      new THREE.Vector2(0.68, 0.7),
      new THREE.Vector2(0.01, 0.85),
    ];
    const lvGeo = track(new THREE.LatheGeometry(lvPoints, 32));
    const lvMat = track(
      new THREE.MeshPhysicalMaterial({
        map: muscleTex,
        color: 0xd4384e,
        roughness: 0.36,
        metalness: 0.05,
        clearcoat: 0.45,
        clearcoatRoughness: 0.3,
      })
    );
    const leftVentricle = new THREE.Mesh(lvGeo, lvMat);
    leftVentricle.position.set(0.38, -0.15, 0.08);
    leftVentricle.rotation.z = 0.24;
    root.add(leftVentricle);
    registerPart(leftVentricle, "left_ventricle", new THREE.Vector3(0.85, -0.45, 0.35), selectableParts, partBasePositions, partExplodeVectors);

    // 2. Right Ventricle
    const rvPoints = [
      new THREE.Vector2(0.01, -1.25),
      new THREE.Vector2(0.55, -0.85),
      new THREE.Vector2(0.76, -0.15),
      new THREE.Vector2(0.68, 0.55),
      new THREE.Vector2(0.01, 0.75),
    ];
    const rvGeo = track(new THREE.LatheGeometry(rvPoints, 28));
    const rvMat = track(
      new THREE.MeshPhysicalMaterial({
        map: rightTex,
        color: 0xa12848,
        roughness: 0.48,
        metalness: 0.04,
        clearcoat: 0.25,
      })
    );
    const rightVentricle = new THREE.Mesh(rvGeo, rvMat);
    rightVentricle.position.set(-0.36, -0.18, 0.25);
    rightVentricle.rotation.z = -0.18;
    root.add(rightVentricle);
    registerPart(rightVentricle, "right_ventricle", new THREE.Vector3(-0.85, -0.35, 0.45), selectableParts, partBasePositions, partExplodeVectors);

    // 3. Left Atrium + Pulmonary Vein stubs
    const laGroup = new THREE.Group();
    const laGeo = track(new THREE.SphereGeometry(0.58, 28, 24));
    const laMat = track(
      new THREE.MeshPhysicalMaterial({
        color: 0xe04f5f,
        roughness: 0.34,
        metalness: 0.06,
        clearcoat: 0.5,
      })
    );
    const laBody = new THREE.Mesh(laGeo, laMat);
    laBody.scale.set(1.1, 0.88, 0.92);
    laGroup.add(laBody);
    const pvGeo = track(new THREE.CylinderGeometry(0.12, 0.13, 0.75, 16));
    const pv1 = new THREE.Mesh(pvGeo, laMat);
    pv1.position.set(0.62, 0.12, -0.12);
    pv1.rotation.z = -1.25;
    const pv2 = new THREE.Mesh(pvGeo, laMat);
    pv2.position.set(0.6, -0.16, -0.15);
    pv2.rotation.z = -1.45;
    laGroup.add(pv1, pv2);
    laGroup.position.set(0.58, 0.76, -0.25);
    root.add(laGroup);
    registerPart(laGroup, "left_atrium", new THREE.Vector3(0.95, 0.65, -0.5), selectableParts, partBasePositions, partExplodeVectors);

    // 4. Right Atrium + SA Node golden marker
    const raGroup = new THREE.Group();
    const raGeo = track(new THREE.SphereGeometry(0.6, 28, 24));
    const raMat = track(
      new THREE.MeshPhysicalMaterial({
        color: 0x8a2f5b,
        roughness: 0.52,
        metalness: 0.05,
      })
    );
    const raBody = new THREE.Mesh(raGeo, raMat);
    raBody.scale.set(1.0, 1.05, 0.95);
    const saGeo = track(new THREE.SphereGeometry(0.14, 18, 18));
    const saMat = track(
      new THREE.MeshStandardMaterial({
        color: 0xfacc15,
        emissive: 0xd97706,
        emissiveIntensity: 0.75,
        roughness: 0.25,
        metalness: 0.3,
      })
    );
    const saNode = new THREE.Mesh(saGeo, saMat);
    saNode.position.set(-0.32, 0.42, 0.36);
    raGroup.add(raBody, saNode);
    raGroup.position.set(-0.68, 0.72, 0.02);
    root.add(raGroup);
    registerPart(raGroup, "right_atrium", new THREE.Vector3(-1.05, 0.65, 0.15), selectableParts, partBasePositions, partExplodeVectors);

    // 5. Aortic Arch (TubeGeometry + 3 superior branches)
    const aortaGroup = new THREE.Group();
    const aortaCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.08, 0.55, 0.05),
      new THREE.Vector3(0.15, 1.35, 0.12),
      new THREE.Vector3(-0.08, 1.85, -0.02),
      new THREE.Vector3(-0.42, 1.72, -0.35),
      new THREE.Vector3(-0.4, 0.95, -0.62),
      new THREE.Vector3(-0.28, -0.9, -0.68),
    ]);
    const aortaGeo = track(new THREE.TubeGeometry(aortaCurve, 44, 0.24, 20, false));
    const aortaMat = track(
      new THREE.MeshPhysicalMaterial({
        color: 0xe11d48,
        roughness: 0.28,
        metalness: 0.08,
        clearcoat: 0.65,
      })
    );
    aortaGroup.add(new THREE.Mesh(aortaGeo, aortaMat));
    const branchGeo = track(new THREE.CylinderGeometry(0.07, 0.085, 0.55, 14));
    [
      { x: 0.06, z: 0.04, rot: -0.15 },
      { x: -0.12, z: -0.05, rot: 0.05 },
      { x: -0.28, z: -0.18, rot: 0.2 },
    ].forEach((b) => {
      const mesh = new THREE.Mesh(branchGeo, aortaMat);
      mesh.position.set(b.x, 2.08, b.z);
      mesh.rotation.z = b.rot;
      aortaGroup.add(mesh);
    });
    root.add(aortaGroup);
    registerPart(aortaGroup, "aortic_arch", new THREE.Vector3(0.25, 1.15, -0.35), selectableParts, partBasePositions, partExplodeVectors);

    // 6. Pulmonary Trunk (Blue TubeGeometry)
    const pulmGroup = new THREE.Group();
    const pulmCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.25, 0.35, 0.45),
      new THREE.Vector3(-0.18, 1.05, 0.52),
      new THREE.Vector3(0.08, 1.28, 0.35),
      new THREE.Vector3(0.68, 1.22, 0.12),
    ]);
    const pulmGeo = track(new THREE.TubeGeometry(pulmCurve, 32, 0.19, 18, false));
    const pulmMat = track(
      new THREE.MeshPhysicalMaterial({
        color: 0x3b82f6,
        roughness: 0.32,
        metalness: 0.08,
        clearcoat: 0.5,
      })
    );
    pulmGroup.add(new THREE.Mesh(pulmGeo, pulmMat));
    const leftBranchCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.08, 1.18, 0.45),
      new THREE.Vector3(-0.65, 1.24, 0.22),
      new THREE.Vector3(-1.05, 1.18, 0.05),
    ]);
    const pulmBranchGeo = track(new THREE.TubeGeometry(leftBranchCurve, 20, 0.14, 16, false));
    pulmGroup.add(new THREE.Mesh(pulmBranchGeo, pulmMat));
    root.add(pulmGroup);
    registerPart(pulmGroup, "pulmonary_trunk", new THREE.Vector3(0.0, 0.85, 0.95), selectableParts, partBasePositions, partExplodeVectors);

    // 7. Superior & Inferior Vena Cava
    const vcGroup = new THREE.Group();
    const vcMat = track(
      new THREE.MeshPhysicalMaterial({
        color: 0x2563eb,
        roughness: 0.38,
        metalness: 0.06,
        clearcoat: 0.35,
      })
    );
    const svcGeo = track(new THREE.CylinderGeometry(0.19, 0.21, 1.25, 20));
    const svc = new THREE.Mesh(svcGeo, vcMat);
    svc.position.set(-0.88, 1.48, -0.08);
    const ivcGeo = track(new THREE.CylinderGeometry(0.2, 0.19, 1.2, 20));
    const ivc = new THREE.Mesh(ivcGeo, vcMat);
    ivc.position.set(-0.85, -0.45, -0.25);
    vcGroup.add(svc, ivc);
    root.add(vcGroup);
    registerPart(vcGroup, "vena_cava", new THREE.Vector3(-1.15, 0.3, -0.45), selectableParts, partBasePositions, partExplodeVectors);

    // Subtle Coronary Artery Accent (decorative detail on LV)
    const coroCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.05, 0.52, 0.58),
      new THREE.Vector3(0.18, 0.05, 0.82),
      new THREE.Vector3(0.32, -0.58, 0.72),
      new THREE.Vector3(0.42, -1.12, 0.38),
    ]);
    const coroGeo = track(new THREE.TubeGeometry(coroCurve, 24, 0.035, 10, false));
    const coroMesh = new THREE.Mesh(coroGeo, aortaMat);
    leftVentricle.add(coroMesh);

    root.position.y = 0.25;

    // Physiological heartbeat lub-dub animation
    animateFn = (elapsed, _dt, isPlaying) => {
      if (!isPlaying) return;
      const cycle = (elapsed * 1.15) % 1.0;
      const lub = Math.exp(-Math.pow((cycle - 0.15) / 0.055, 2)) * 0.045;
      const dub = Math.exp(-Math.pow((cycle - 0.34) / 0.045, 2)) * 0.026;
      const pulse = 1 + lub + dub;
      leftVentricle.scale.setScalar(pulse);
      rightVentricle.scale.setScalar(pulse);
      saMat.emissiveIntensity = 0.5 + Math.exp(-Math.pow((cycle - 0.08) / 0.05, 2)) * 1.2;
    };
  } else if (modelKey === "eukaryotic_cell") {
    // 1. Cutaway Plasma Membrane (Hemisphere bowl + translucent upper dome)
    const memGroup = new THREE.Group();
    const bowlGeo = track(new THREE.SphereGeometry(2.1, 40, 24, 0, Math.PI * 2, Math.PI * 0.42, Math.PI * 0.58));
    const bowlMat = track(
      new THREE.MeshPhysicalMaterial({
        color: 0x0ea5e9,
        roughness: 0.35,
        metalness: 0.05,
        side: THREE.DoubleSide,
        clearcoat: 0.4,
      })
    );
    const bowl = new THREE.Mesh(bowlGeo, bowlMat);
    const rimGeo = track(new THREE.TorusGeometry(2.04, 0.09, 16, 64));
    const rimMat = track(new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.3, metalness: 0.15 }));
    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.5;

    const cytosolGeo = track(new THREE.CircleGeometry(2.0, 48));
    const cytosolMat = track(
      new THREE.MeshPhysicalMaterial({
        color: 0xe0f2fe,
        roughness: 0.2,
        transparent: true,
        opacity: isSoftwareGl ? 0.35 : 0.48,
        depthWrite: false,
      })
    );
    const cytosol = new THREE.Mesh(cytosolGeo, cytosolMat);
    cytosol.rotation.x = -Math.PI / 2;
    cytosol.position.y = 0.48;
    memGroup.add(bowl, rim, cytosol);
    root.add(memGroup);
    registerPart(memGroup, "plasma_membrane", new THREE.Vector3(0, -0.85, 0), selectableParts, partBasePositions, partExplodeVectors);

    // 2. Nucleus & Nucleolus
    const nucGroup = new THREE.Group();
    const nucGeo = track(new THREE.SphereGeometry(0.76, 32, 24, 0, Math.PI * 1.55));
    const nucMat = track(
      new THREE.MeshPhysicalMaterial({
        color: 0x7c3aed,
        roughness: 0.32,
        metalness: 0.1,
        side: THREE.DoubleSide,
        clearcoat: 0.45,
      })
    );
    const nucShell = new THREE.Mesh(nucGeo, nucMat);
    const nucleolusGeo = track(new THREE.SphereGeometry(0.32, 24, 24));
    const nucleolusMat = track(
      new THREE.MeshStandardMaterial({
        color: 0xc084fc,
        emissive: 0x581c87,
        emissiveIntensity: 0.35,
        roughness: 0.25,
        metalness: 0.2,
      })
    );
    nucGroup.add(nucShell, new THREE.Mesh(nucleolusGeo, nucleolusMat));
    nucGroup.position.set(0, 0.65, -0.15);
    root.add(nucGroup);
    registerPart(nucGroup, "nucleus", new THREE.Vector3(0, 1.15, -0.25), selectableParts, partBasePositions, partExplodeVectors);

    // 3. Mitochondria (3 bean-shaped organelles with cristae ridges)
    const mitoGroup = new THREE.Group();
    const mitoMat = track(
      new THREE.MeshPhysicalMaterial({
        color: 0xf97316,
        roughness: 0.42,
        metalness: 0.05,
        clearcoat: 0.3,
      })
    );
    const cristaeMat = track(new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.5 }));
    const mitoBodyGeo = track(new THREE.CapsuleGeometry(0.22, 0.46, 12, 20));
    const cristaGeo = track(new THREE.TorusGeometry(0.16, 0.03, 8, 18));

    [
      { pos: [1.15, 0.58, 0.42], rot: [0.3, 0.5, 1.2] },
      { pos: [-1.18, 0.52, -0.55], rot: [-0.2, 1.1, 1.4] },
      { pos: [0.32, 0.42, 1.28], rot: [0.4, -0.4, 1.1] },
    ].forEach((m) => {
      const unit = new THREE.Group();
      unit.add(new THREE.Mesh(mitoBodyGeo, mitoMat));
      for (let k = -1; k <= 1; k++) {
        const ring = new THREE.Mesh(cristaGeo, cristaeMat);
        ring.position.y = k * 0.14;
        ring.rotation.x = Math.PI / 2;
        unit.add(ring);
      }
      unit.position.set(m.pos[0], m.pos[1], m.pos[2]);
      unit.rotation.set(m.rot[0], m.rot[1], m.rot[2]);
      mitoGroup.add(unit);
    });
    root.add(mitoGroup);
    registerPart(mitoGroup, "mitochondria", new THREE.Vector3(0.95, 0.65, 0.85), selectableParts, partBasePositions, partExplodeVectors);

    // 4. Golgi Apparatus (stacked crescent sacs)
    const golgiGroup = new THREE.Group();
    const golgiMat = track(
      new THREE.MeshPhysicalMaterial({
        color: 0x10b981,
        roughness: 0.36,
        metalness: 0.08,
        clearcoat: 0.35,
      })
    );
    for (let i = 0; i < 4; i++) {
      const arcGeo = track(new THREE.TorusGeometry(0.45 + i * 0.12, 0.055, 12, 24, Math.PI * 0.85));
      const sac = new THREE.Mesh(arcGeo, golgiMat);
      sac.rotation.x = Math.PI / 2;
      sac.position.y = i * 0.04;
      golgiGroup.add(sac);
    }
    golgiGroup.position.set(-0.98, 0.62, 0.68);
    golgiGroup.rotation.y = 0.6;
    root.add(golgiGroup);
    registerPart(golgiGroup, "golgi_apparatus", new THREE.Vector3(-1.05, 0.72, 0.85), selectableParts, partBasePositions, partExplodeVectors);

    // 5. Rough ER + Instanced Ribosomes (36 ribosomes via InstancedMesh!)
    const erGroup = new THREE.Group();
    const erMat = track(new THREE.MeshPhysicalMaterial({ color: 0xec4899, roughness: 0.48, metalness: 0.05 }));
    for (let i = 0; i < 3; i++) {
      const erCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.6 + i * 0.18, 0.48, -0.85),
        new THREE.Vector3(0.95 + i * 0.18, 0.62, -0.35),
        new THREE.Vector3(0.75 + i * 0.18, 0.52, 0.15),
      ]);
      const erGeo = track(new THREE.TubeGeometry(erCurve, 20, 0.055, 10, false));
      erGroup.add(new THREE.Mesh(erGeo, erMat));
    }
    const riboGeo = track(new THREE.SphereGeometry(0.045, 10, 10));
    const riboMat = track(new THREE.MeshStandardMaterial({ color: 0xfde047, roughness: 0.35 }));
    const riboCount = 36;
    const riboInst = new THREE.InstancedMesh(riboGeo, riboMat, riboCount);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < riboCount; i++) {
      const a = (i / riboCount) * Math.PI * 2;
      const r = 0.88 + (i % 3) * 0.25;
      dummy.position.set(Math.cos(a) * r, 0.56 + ((i % 4) - 1.5) * 0.06, Math.sin(a) * r);
      dummy.scale.setScalar(0.85 + (i % 3) * 0.15);
      dummy.updateMatrix();
      riboInst.setMatrixAt(i, dummy.matrix);
    }
    riboInst.computeBoundingSphere();
    erGroup.add(riboInst);
    root.add(erGroup);
    registerPart(erGroup, "rough_er", new THREE.Vector3(0.95, 0.8, -0.85), selectableParts, partBasePositions, partExplodeVectors);

    animateFn = (elapsed, _dt, isPlaying) => {
      if (!isPlaying) return;
      nucGroup.rotation.y = elapsed * 0.22;
      mitoGroup.children.forEach((m, idx) => {
        m.position.y = 0.52 + Math.sin(elapsed * 1.4 + idx * 2) * 0.04;
      });
    };
  } else if (modelKey === "atomic_structure") {
    // 1. Proton-Neutron Nucleus Cluster (InstancedMesh + Core)
    const nucGroup = new THREE.Group();
    const nucleonGeo = track(new THREE.SphereGeometry(0.22, 18, 18));
    const protonMat = track(new THREE.MeshPhysicalMaterial({ color: 0xef4444, roughness: 0.22, metalness: 0.35, clearcoat: 0.6 }));
    const neutronMat = track(new THREE.MeshPhysicalMaterial({ color: 0x94a3b8, roughness: 0.4, metalness: 0.45 }));

    const offsets: [number, number, number, boolean][] = [
      [0, 0, 0, true],
      [0.24, 0.12, 0.1, false],
      [-0.22, 0.14, 0.14, true],
      [0.12, -0.22, 0.16, false],
      [-0.14, -0.18, -0.2, true],
      [0.18, 0.18, -0.2, false],
      [-0.2, -0.05, 0.22, false],
      [0.02, 0.26, 0.02, true],
      [0.05, -0.24, -0.12, true],
      [-0.08, 0.06, -0.26, false],
      [0.26, -0.08, -0.04, true],
      [-0.26, 0.04, -0.02, false],
    ];
    offsets.forEach(([x, y, z, isProton]) => {
      const m = new THREE.Mesh(nucleonGeo, isProton ? protonMat : neutronMat);
      m.position.set(x, y, z);
      nucGroup.add(m);
    });
    root.add(nucGroup);
    registerPart(nucGroup, "atomic_nucleus", new THREE.Vector3(0, 0, 0), selectableParts, partBasePositions, partExplodeVectors);

    const electronGeo = track(new THREE.SphereGeometry(0.11, 16, 16));
    const makeShell = (
      partId: string,
      radius: number,
      colorHex: number,
      rotEuler: [number, number, number],
      electronCount: number,
      explodeVec: THREE.Vector3
    ) => {
      const group = new THREE.Group();
      const ringGeo = track(new THREE.TorusGeometry(radius, 0.032, 16, 80));
      const ringMat = track(
        new THREE.MeshPhysicalMaterial({
          color: colorHex,
          emissive: colorHex,
          emissiveIntensity: 0.22,
          roughness: 0.2,
          metalness: 0.7,
        })
      );
      group.add(new THREE.Mesh(ringGeo, ringMat));
      const eMat = track(
        new THREE.MeshStandardMaterial({
          color: 0xffffff,
          emissive: colorHex,
          emissiveIntensity: 1.1,
          roughness: 0.15,
          metalness: 0.2,
        })
      );
      const electrons: THREE.Mesh[] = [];
      for (let i = 0; i < electronCount; i++) {
        const angle = (i / electronCount) * Math.PI * 2;
        const e = new THREE.Mesh(electronGeo, eMat);
        e.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
        e.userData.baseAngle = angle;
        e.userData.radius = radius;
        group.add(e);
        electrons.push(e);
      }
      group.rotation.set(rotEuler[0], rotEuler[1], rotEuler[2]);
      root.add(group);
      registerPart(group, partId, explodeVec, selectableParts, partBasePositions, partExplodeVectors);
      return { group, electrons };
    };

    const shellK = makeShell("shell_k", 1.25, 0x38bdf8, [0.45, 0.2, 0.1], 2, new THREE.Vector3(0, 0.65, 0.55));
    const shellL = makeShell("shell_l", 2.05, 0x818cf8, [1.15, -0.45, 0.3], 4, new THREE.Vector3(0.75, 0.2, -0.55));
    const shellM = makeShell("shell_m", 2.75, 0x34d399, [-0.65, 0.55, -0.25], 6, new THREE.Vector3(-0.75, -0.35, 0.5));

    animateFn = (elapsed, _dt, isPlaying) => {
      if (!isPlaying) return;
      nucGroup.rotation.y = elapsed * 0.4;
      nucGroup.rotation.x = elapsed * 0.25;
      const updateElectrons = (arr: THREE.Mesh[], speed: number) => {
        for (const e of arr) {
          const a = (e.userData.baseAngle as number) + elapsed * speed;
          const r = e.userData.radius as number;
          e.position.set(Math.cos(a) * r, Math.sin(a) * r, 0);
        }
      };
      updateElectrons(shellK.electrons, 2.2);
      updateElectrons(shellL.electrons, 1.35);
      updateElectrons(shellM.electrons, 0.85);
    };
  } else {
    // molecular_geometry: DNA Double Helix
    const helixHeight = 4.6;
    const radius = 1.05;
    const turns = 1.65;
    const strand1Pts: THREE.Vector3[] = [];
    const strand2Pts: THREE.Vector3[] = [];
    const steps = 48;

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const y = (t - 0.5) * helixHeight;
      const angle = t * Math.PI * 2 * turns;
      strand1Pts.push(new THREE.Vector3(Math.cos(angle) * radius, y, Math.sin(angle) * radius));
      strand2Pts.push(new THREE.Vector3(Math.cos(angle + Math.PI) * radius, y, Math.sin(angle + Math.PI) * radius));
    }

    const s1Geo = track(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(strand1Pts), 64, 0.11, 16, false));
    const s1Mat = track(new THREE.MeshPhysicalMaterial({ color: 0x6366f1, roughness: 0.24, metalness: 0.25, clearcoat: 0.6 }));
    const strand1 = new THREE.Mesh(s1Geo, s1Mat);
    root.add(strand1);
    registerPart(strand1, "backbone_53", new THREE.Vector3(0.95, 0, 0.45), selectableParts, partBasePositions, partExplodeVectors);

    const s2Geo = track(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(strand2Pts), 64, 0.11, 16, false));
    const s2Mat = track(new THREE.MeshPhysicalMaterial({ color: 0x0ea5e9, roughness: 0.28, metalness: 0.25, clearcoat: 0.6 }));
    const strand2 = new THREE.Mesh(s2Geo, s2Mat);
    root.add(strand2);
    registerPart(strand2, "backbone_35", new THREE.Vector3(-0.95, 0, -0.45), selectableParts, partBasePositions, partExplodeVectors);

    const atGroup = new THREE.Group();
    const gcGroup = new THREE.Group();
    const rungGeo = track(new THREE.CylinderGeometry(0.065, 0.065, radius * 1.9, 14));
    const nodeGeo = track(new THREE.SphereGeometry(0.11, 14, 14));
    const atMat = track(new THREE.MeshPhysicalMaterial({ color: 0xf59e0b, roughness: 0.35, metalness: 0.15 }));
    const gcMat = track(new THREE.MeshPhysicalMaterial({ color: 0x10b981, roughness: 0.35, metalness: 0.15 }));

    const basePairs = 14;
    for (let i = 0; i < basePairs; i++) {
      const t = (i + 0.5) / basePairs;
      const y = (t - 0.5) * helixHeight;
      const angle = t * Math.PI * 2 * turns;
      const isGC = i % 2 === 0;
      const mat = isGC ? gcMat : atMat;
      const rung = new THREE.Mesh(rungGeo, mat);
      rung.position.set(0, y, 0);
      rung.rotation.z = Math.PI / 2;
      rung.rotation.y = -angle;

      const capA = new THREE.Mesh(nodeGeo, mat);
      capA.position.set(Math.cos(angle) * (radius * 0.45), y, Math.sin(angle) * (radius * 0.45));
      const capB = new THREE.Mesh(nodeGeo, mat);
      capB.position.set(-Math.cos(angle) * (radius * 0.45), y, -Math.sin(angle) * (radius * 0.45));

      if (isGC) {
        gcGroup.add(rung, capA, capB);
      } else {
        atGroup.add(rung, capA, capB);
      }
    }

    root.add(atGroup, gcGroup);
    registerPart(atGroup, "at_pairs", new THREE.Vector3(0, 0.55, 0.75), selectableParts, partBasePositions, partExplodeVectors);
    registerPart(gcGroup, "gc_pairs", new THREE.Vector3(0, -0.55, -0.75), selectableParts, partBasePositions, partExplodeVectors);

    animateFn = (elapsed, _dt, isPlaying) => {
      if (!isPlaying) return;
      root.rotation.y = elapsed * 0.35;
    };
  }

  return {
    root,
    selectableParts,
    partBasePositions,
    partExplodeVectors,
    animate: animateFn,
    dispose: () => {
      for (const d of disposables) {
        d.dispose();
      }
    },
  };
}
