import type {
  AiModelConfig,
  AuditLog,
  Book,
  BookTopic,
  Curriculum,
  CustomAiModel,
  Flashcard,
  ImportJob,
  Question,
  StudyTabType,
  Subject,
  SubscriptionPlan,
  Syllabus,
  TopicStudyTab,
} from "./types";

export const SEED_CURRICULUMS: Curriculum[] = [
  {
    id: "curr-academic",
    slug: "academic-hsc",
    name: "Academic & HSC Science",
    description: "Core Biology, Physics, and Chemistry textbooks with interactive 3D visualizations.",
    orderIndex: 1,
    isPublished: true,
  },
  {
    id: "curr-medical",
    slug: "medical-admission",
    name: "Medical Admission & BCS",
    description: "High-yield revision digests, clinical correlations, mnemonics, and timed MCQ banks.",
    orderIndex: 2,
    isPublished: true,
  },
  {
    id: "curr-ielts",
    slug: "ielts-academic",
    name: "IELTS Academic Mastery",
    description: "Band 8.5+ reading strategies, academic writing structures, and vocabulary banks.",
    orderIndex: 3,
    isPublished: true,
  },
];

export const SEED_BOOKS: Book[] = [
  {
    id: "book-bio-physiology",
    curriculumId: "curr-academic",
    title: "Human Physiology & Cell Biology",
    subtitle: "মানব শারীরতত্ত্ব ও কোষ জীববিজ্ঞান — Interactive 3D Edition",
    author: "Dr. Mahfuzur Rahman & Skyx Editorial",
    subject: "Biology",
    language: "bilingual",
    accessTier: "free",
    coverColor: "#4F46E5",
    description:
      "Comprehensive bilingual Biology textbook covering Human Cardiovascular Physiology, Cardiac Cycle, and Eukaryotic Cell Organelles with embedded Three.js 3D anatomical models.",
    totalTopics: 3,
    isPublished: true,
  },
  {
    id: "book-physics-modern",
    curriculumId: "curr-academic",
    title: "Modern Physics & Quantum Foundations",
    subtitle: "আধুনিক পদার্থবিজ্ঞান ও পরমাণুর গঠন — Visual Lab Edition",
    author: "Prof. Tanvir Ahmed",
    subject: "Physics",
    language: "bilingual",
    accessTier: "free",
    coverColor: "#0EA5E9",
    description:
      "Master Bohr's Atomic Model, quantum energy shells, photon transitions, and optical phenomena with 3D orbital visualization and mathematical problem breakdowns.",
    totalTopics: 2,
    isPublished: true,
  },
  {
    id: "book-chem-molecular",
    curriculumId: "curr-academic",
    title: "Chemical Bonding & 3D Molecular Geometry",
    subtitle: "রাসায়নিক বন্ধন ও অণুর ত্রিমাত্রিক গঠন",
    author: "Dr. Nusrat Jahan",
    subject: "Chemistry",
    language: "bilingual",
    accessTier: "pro",
    coverColor: "#7C3AED",
    description:
      "Explore VSEPR theory, hybridization, hydrogen bonding, and biological macromolecules like the DNA double helix in interactive 3D space.",
    totalTopics: 1,
    isPublished: true,
  },
  {
    id: "book-med-bcs",
    curriculumId: "curr-medical",
    title: "Medical Admission & BCS High-Yield Digest",
    subtitle: "মেডিকেল ভর্তি ও বিসিএস চূড়ান্ত প্রস্তুতি গাইড",
    author: "Skyx Medical & Civil Service Board",
    subject: "Medical & BCS",
    language: "bilingual",
    accessTier: "pro",
    coverColor: "#059669",
    description:
      "Rapid-revision capsules covering Human Hematology, Endocrine Hormones, and Bangladesh Constitutional Articles with exam-tested memory tricks.",
    totalTopics: 2,
    isPublished: true,
  },
  {
    id: "book-ielts-mastery",
    curriculumId: "curr-ielts",
    title: "IELTS Academic Reading & Writing Band 8.5+",
    subtitle: "Complete Strategy, Cohesion & High-Lexical Framework",
    author: "Claire Henderson, MA TESOL",
    subject: "IELTS Academic",
    language: "en",
    accessTier: "elite",
    coverColor: "#D97706",
    description:
      "Master True/False/Not Given logic, paragraph heading matching, and Band 9 Academic Writing Task 2 essay blueprints with examiner commentary.",
    totalTopics: 2,
    isPublished: true,
  },
];

export const SEED_TOPICS: BookTopic[] = [
  {
    id: "topic-bio-heart",
    bookId: "book-bio-physiology",
    chapterNumber: 1,
    chapterTitle: "Chapter 1: Human Circulatory System (রক্ত সংবহনতন্ত্র)",
    sectionTitle: "1.1 Cardiac Anatomy & Chambers",
    topicTitle: "Structure of the Human Heart & Double Circulation (মানব হৃৎপিণ্ডের গঠন)",
    orderIndex: 1,
    readingMinutes: 8,
    model3dKey: "human_heart",
    searchTokens: "heart atrium ventricle aorta valve cardiac cycle sa node blood circulation human biology হৃৎপিণ্ড অলিন্দ নিলয়",
    isPublished: true,
    contentMarkdown: `## মানব হৃৎপিণ্ডের গঠন ও দ্বৈত রক্ত সংবহন (Anatomy of the Human Heart)

The human heart (**মানব হৃৎপিণ্ড**) is a cone-shaped, hollow muscular organ situated in the thoracic cavity (*mediastinum*), tilted slightly toward the left. Enclosed within a protective double-layered fibro-serous sac called the **pericardium**, it pumps approximately **5 liters of blood per minute** at rest (cardiac output = stroke volume × heart rate).

### 1. The Heart Wall Layers (হৃৎপ্রাচীরের স্তরসমূহ)
The wall of the heart consists of three distinct histological layers:
- **Epicardium (এপিকার্ডিয়াম)**: The thin, outer protective visceral layer containing coronary blood vessels and adipose tissue.
- **Myocardium (মায়োকার্ডিয়াম)**: The thick, middle contractile layer composed of branching, striated, involuntary cardiac muscle fibers joined by *intercalated discs*. It is thickest in the **left ventricle** (~12–15 mm) because it must pump oxygenated blood against high systemic arterial resistance.
- **Endocardium (এন্ডোকার্ডিয়াম)**: The smooth inner endothelial lining that reduces friction as blood flows across the chambers and valves.

### 2. Four Chambers & One-Way Valves (চারটি প্রকোষ্ঠ ও কপাটিকা)
The heart is divided longitudinally by the *interatrial* and *interventricular septum* into a **right heart** (pulmonary circuit, deoxygenated blood) and a **left heart** (systemic circuit, oxygenated blood):

1. **Right Atrium (ডান অলিন্দ)**: Receives deoxygenated venous blood from the upper body via the **Superior Vena Cava** and lower body via the **Inferior Vena Cava**, plus cardiac venous blood via the *coronary sinus*.
2. **Right Ventricle (ডান নিলয়)**: Receives blood through the **Tricuspid Valve** (three cusps) and pumps it through the **Pulmonary Semilunar Valve** into the pulmonary trunk toward the lungs.
3. **Left Atrium (বাম অলিন্দ)**: Receives freshly oxygenated blood from the lungs through **four pulmonary veins**.
4. **Left Ventricle (বাম নিলয়)**: Receives blood through the **Bicuspid (Mitral) Valve** and ejects it through the **Aortic Semilunar Valve** into the **Aorta**, supplying the entire body.

> **Clinical Note (মেডিকেল ভর্তি টিপস):** The **"Lub"** ($S_1$) heart sound occurs when the AV valves (Tricuspid & Mitral) snap shut at the onset of ventricular systole. The **"Dub"** ($S_2$) sound occurs when the Semilunar valves (Aortic & Pulmonary) close at the beginning of ventricular diastole.

### 3. Myogenic Conduction & Cardiac Cycle (মায়োজেনিক নিয়ন্ত্রণ ও কার্ডিয়াক চক্র)
Because the heart generates its own electrical impulse without external nerve stimulation, it is called **myogenic**:
- **SA Node (Sinoatrial Node)**: Located in the upper right atrium — known as the **Natural Pacemaker** (fires 70–75 impulses/min).
- **AV Node (Atrioventricular Node)**: Introduces a critical **0.1-second delay** so the atria finish emptying before ventricles contract.
- **Bundle of His & Purkinje Fibers**: Rapidly conduct the depolarization wave upward from the apex through ventricular walls.
- **Total Cardiac Cycle Duration**: **0.8 seconds** (Atrial Systole: **0.1s**, Ventricular Systole: **0.3s**, Joint Diastole: **0.4s**).`,
  },
  {
    id: "topic-bio-cardiac-regulation",
    bookId: "book-bio-physiology",
    chapterNumber: 1,
    chapterTitle: "Chapter 1: Human Circulatory System (রক্ত সংবহনতন্ত্র)",
    sectionTitle: "1.2 Blood Pressure & Baroreceptors",
    topicTitle: "Blood Pressure Regulation & ECG Waveforms (রক্তচাপ ও ইসিজি)",
    orderIndex: 2,
    readingMinutes: 6,
    model3dKey: "human_heart",
    searchTokens: "blood pressure systolic diastolic ecg p wave qrs complex t wave baroreceptor hypertension রক্তচাপ ইসিজি",
    isPublished: true,
    contentMarkdown: `## Blood Pressure & Electrocardiogram (রক্তচাপ নিয়ন্ত্রণ ও ECG)

Arterial blood pressure is the lateral force exerted by circulating blood upon the walls of systemic arteries. In a healthy resting young adult, normal blood pressure is **120/80 mmHg**, where **120 mmHg** represents *systolic pressure* (peak ventricular ejection) and **80 mmHg** represents *diastolic pressure* (arterial recoil during ventricular relaxation).

### Pulse Pressure & Mean Arterial Pressure (MAP)
- **Pulse Pressure** = Systolic Pressure − Diastolic Pressure = $120 - 80 = 40\text{ mmHg}$.
- **Baroreceptors** located in the **carotid sinus** and **aortic arch** detect arterial stretch and signal the *medulla oblongata* via the glossopharyngeal (CN IX) and vagus (CN X) nerves to maintain homeostasis.

### Reading an Electrocardiogram (ECG)
An ECG records the summed electrical activity of the heart over time:
- **P Wave**: Represents **Atrial Depolarization** (triggers atrial contraction).
- **QRS Complex**: Represents rapid **Ventricular Depolarization** (masks atrial repolarization).
- **T Wave**: Represents **Ventricular Repolarization** (ventricular recovery).
- **PR Interval** (0.12–0.20 sec): Reflects AV nodal conduction delay; prolongation indicates first-degree heart block.`,
  },
  {
    id: "topic-bio-cell",
    bookId: "book-bio-physiology",
    chapterNumber: 2,
    chapterTitle: "Chapter 2: Eukaryotic Cell & Organelles (প্রকৃতকোষ ও অঙ্গাণু)",
    sectionTitle: "2.1 Cellular Ultrastructure",
    topicTitle: "Mitochondria, Nucleus & Endomembrane System (মাইটোকন্ড্রিয়া ও নিউক্লিয়াস)",
    orderIndex: 3,
    readingMinutes: 7,
    model3dKey: "eukaryotic_cell",
    searchTokens: "cell mitochondria nucleus cristae atp ribosome golgi endoplasmic reticulum কোষ মাইটোকন্ড্রিয়া নিউক্লিয়াস",
    isPublished: true,
    contentMarkdown: `## প্রকৃতকোষের অঙ্গাণু ও কার্যাবলি (Eukaryotic Cell Ultrastructure)

A eukaryotic cell (**প্রকৃতকোষ**) is compartmentalized into membrane-bound organelles, enabling specialized biochemical reactions to proceed simultaneously without interference.

### 1. The Nucleus (নিউক্লিয়াস — কোষের প্রাণকেন্দ্র)
Discovered by **Robert Brown (1831)**, the nucleus houses chromosomal DNA wrapped around histone proteins (chromatin). Its double-layered **nuclear envelope** is perforated by *nuclear pore complexes* that regulate RNA and ribosomal subunit export. Inside sits the dense **nucleolus**, the dedicated site of **rRNA synthesis and ribosome assembly**.

### 2. Mitochondria (মাইটোকন্ড্রিয়া — কোষের পাওয়ারহাউস)
First observed by Kölliker and named by **Carl Benda (1898)**, mitochondria generate over 90% of cellular **ATP** via oxidative phosphorylation:
- **Outer Membrane**: Smooth and permeable to small ions via *porin* channels.
- **Inner Membrane**: Folded inward into finger-like projections called **cristae**, drastically expanding surface area for the Electron Transport Chain (ETC) and ATP Synthase ($F_0-F_1$ oxysomes).
- **Matrix**: Contains Krebs cycle enzymes, **70S ribosomes**, and circular double-stranded **mtDNA** (supporting the *Endosymbiotic Theory*).

### 3. Endomembrane System (ER & Golgi Apparatus)
- **Rough Endoplasmic Reticulum (RER)**: Studded with 80S ribosomes; synthesizes and folds secretory and membrane proteins.
- **Golgi Apparatus (গলজি বডি)**: Acts as the cell's *post office*—modifies proteins (glycosylation), packages enzymes into **lysosomes**, and forms the acrosome of sperm.`,
  },
  {
    id: "topic-phys-bohr",
    bookId: "book-physics-modern",
    chapterNumber: 1,
    chapterTitle: "Chapter 1: Atomic Structure & Quantum Transitions (পরমাণুর গঠন)",
    sectionTitle: "1.1 Bohr Model & Spectral Lines",
    topicTitle: "Bohr's Postulates, Energy Quantization & Hydrogen Spectrum (বোর পরমাণু মডেল)",
    orderIndex: 1,
    readingMinutes: 7,
    model3dKey: "atomic_structure",
    searchTokens: "bohr atom quantum orbital angular momentum planck photon hydrogen spectrum lyman balmer physics বোর পরমাণু",
    isPublished: true,
    contentMarkdown: `## বোর পরমাণু মডেল ও শক্তি স্তর (Bohr's Atomic Model & Quantization)

In **1913**, Niels Bohr resolved the instability paradox of Rutherford's nuclear atom by merging classical circular mechanics with **Max Planck's quantum hypothesis**.

### Bohr's Three Core Postulates
1. **Stationary Orbits (স্থির কক্ষপথ)**: Electrons revolve around the positively charged nucleus only in specific allowed circular orbits without radiating electromagnetic energy.
2. **Quantization of Angular Momentum**: Only orbits whose angular momentum $L$ is an integral multiple of $\\frac{h}{2\\pi}$ are permitted:
   $$L = mvr = \\frac{nh}{2\\pi} \\quad (n = 1, 2, 3, \\dots)$$
3. **Quantum Jumps & Photon Emission**: An electron emits or absorbs a discrete photon of frequency $\\nu$ only when transitioning between energy levels $E_i$ and $E_f$:
   $$\\Delta E = E_2 - E_1 = h\\nu = \\frac{hc}{\\lambda}$$

### Essential Hydrogen Formulas (পরীক্ষার জন্য জরুরি সূত্র)
- **Radius of the $n$-th Orbit**: $r_n = 0.529 \\times n^2\\text{ Å}$ (For $n=1$, Bohr radius $a_0 = 0.529\\text{ Å}$).
- **Energy of the $n$-th Orbit**: $E_n = -\\frac{13.6}{n^2}\\text{ eV}$. Thus $E_1 = -13.6\\text{ eV}$, $E_2 = -3.4\\text{ eV}$, and $E_3 = -1.51\\text{ eV}$.
- **Hydrogen Spectral Series**:
  - **Lyman Series** ($n_1 = 1$): Ultraviolet (UV) region.
  - **Balmer Series** ($n_1 = 2$): **Visible light** region (the only series seen by the human eye!).
  - **Paschen Series** ($n_1 = 3$): Infrared (IR) region.`,
  },
  {
    id: "topic-phys-photoelectric",
    bookId: "book-physics-modern",
    chapterNumber: 1,
    chapterTitle: "Chapter 1: Atomic Structure & Quantum Transitions (পরমাণুর গঠন)",
    sectionTitle: "1.2 Wave-Particle Duality",
    topicTitle: "Photoelectric Effect & Einstein's Equation (ফটোতড়িৎ ক্রিয়া)",
    orderIndex: 2,
    readingMinutes: 5,
    model3dKey: "atomic_structure",
    searchTokens: "photoelectric effect einstein work function threshold frequency stopping potential photon ফটোতড়িৎ ক্রিয়া",
    isPublished: true,
    contentMarkdown: `## ফটোতড়িৎ ক্রিয়া ও আইনস্টাইনের সমীকরণ (Photoelectric Effect)

When electromagnetic radiation above a metal's **threshold frequency** ($f_0$) strikes a clean metallic surface, electrons (*photoelectrons*) are ejected instantaneously. Classical wave theory failed to explain why low-frequency light never ejects electrons regardless of intensity.

### Einstein's Quantum Explanation (1905)
Light travels in discrete energy packets called **photons** ($E = hf$). A single photon transfers all of its energy to a single electron:
$$hf = \\phi_0 + K_{\\max} = hf_0 + \\frac{1}{2}mv_{\\max}^2$$
- **Work Function ($\\phi_0$)**: Minimum energy required to liberate an electron from the metal surface.
- **Key Experimental Facts**:
  - Increasing **light intensity** increases the *number* of emitted electrons (photoelectric current), **not** their maximum kinetic energy.
  - Increasing **light frequency** increases the **maximum kinetic energy ($K_{\\max}$)** and the required *stopping potential ($V_0$)*.`,
  },
  {
    id: "topic-chem-vsepr",
    bookId: "book-chem-molecular",
    chapterNumber: 1,
    chapterTitle: "Chapter 1: Molecular Geometry & Biomolecules (অণুর ত্রিমাত্রিক গঠন)",
    sectionTitle: "1.1 VSEPR & DNA Double Helix",
    topicTitle: "Hybridization, Bond Angles & DNA Double Helix Geometry (সংকরণ ও ডিএনএ গঠন)",
    orderIndex: 1,
    readingMinutes: 7,
    model3dKey: "molecular_geometry",
    searchTokens: "vsepr hybridization sp3 methane water bond angle hydrogen bond dna double helix base pairs chemistry সংকরণ",
    isPublished: true,
    contentMarkdown: `## সংকরণ, VSEPR তত্ত্ব ও DNA-র দ্বি-সর্পিল গঠন (Molecular Geometry & DNA)

The three-dimensional shape of a molecule governs its polarity, boiling point, biological receptor binding, and chemical reactivity. According to **VSEPR Theory** (*Valence Shell Electron Pair Repulsion*), electron domains arrange themselves as far apart as possible to minimize electrostatic repulsion, following the repulsion hierarchy:

$$\\text{Lone Pair–Lone Pair} > \\text{Lone Pair–Bond Pair} > \\text{Bond Pair–Bond Pair}$$

### Classic $sp^3$ Hybridization Comparison (হাই-ইল্ড তুলনা)
- **Methane ($CH_4$)**: 4 bonding pairs, 0 lone pairs → **Tetrahedral**, exact bond angle **109.5°**.
- **Ammonia ($NH_3$)**: 3 bonding pairs, 1 lone pair → **Trigonal Pyramidal**, compressed to **107°**.
- **Water ($H_2O$)**: 2 bonding pairs, 2 lone pairs → **Bent / V-shaped**, compressed to **104.5°**.

### 3D Architecture of the DNA Double Helix (Watson & Crick Model)
DNA showcases macromolecular geometry held together by **hydrogen bonding**:
- Two antiparallel sugar-phosphate backbones ($5' \\to 3'$ and $3' \\to 5'$) wind around a common axis with a diameter of **2.0 nm** and one complete helical turn every **3.4 nm (10 base pairs)**.
- **Chargaff's Complementary Base Pairing**:
  - **Adenine (A) = Thymine (T)**: Connected by **2 Hydrogen bonds**.
  - **Guanine (G) ≡ Cytosine (C)**: Connected by **3 Hydrogen bonds** (higher GC content increases DNA melting temperature $T_m$).`,
  },
  {
    id: "topic-med-blood",
    bookId: "book-med-bcs",
    chapterNumber: 1,
    chapterTitle: "Chapter 1: Medical High-Yield Rapid Revision",
    sectionTitle: "1.1 Hematology & Coagulation",
    topicTitle: "Blood Components, Clotting Cascade & Universal Donors (রক্ত ও রক্ততঞ্চন)",
    orderIndex: 1,
    readingMinutes: 6,
    model3dKey: "human_heart",
    searchTokens: "blood rbc wbc platelet hemoglobin clotting fibrin heparin medical admission রক্ত কণিকা হিমোগ্লোবিন",
    isPublished: true,
    contentMarkdown: `## রক্ত, রক্তকণিকা ও রক্ততঞ্চন — মেডিকেল চূড়ান্ত রিভিশন

Human blood is a specialized liquid connective tissue with a slightly alkaline pH of **7.35–7.45** (average **7.4**), constituting ~7–8% of total body weight (~5–6 liters in an adult).

### 1. Composition Breakdown
- **Plasma (রক্তরস — 55%)**: 90–92% water, 8–10% dissolved solids (plasma proteins: *Albumin* maintains osmotic pressure, *Globulin* provides immunity, *Fibrinogen & Prothrombin* drive clotting).
- **Formed Elements (রক্তকণিকা — 45%)**:
  - **RBC (Erythrocytes)**: Biconcave, enucleated in mammals, lifespan **120 days**, destroyed in spleen (*graveyard of RBCs*). Count: 4.5–5.5 million/mm³.
  - **WBC (Leukocytes)**: Nucleated defense cells. Normal count: **4,000–11,000/mm³**. *Neutrophils* (60–70%, first-line phagocytes) and *Lymphocytes* (20–30%, adaptive immunity).
  - **Platelets (Thrombocytes)**: Cell fragments from megakaryocytes; lifespan **5–9 days**; normal count **1.5–4.0 lakh/mm³**.

### 2. Blood Coagulation Essentials (রক্ততঞ্চন)
Four core factors drive the final common clotting pathway: **Fibrinogen (I)**, **Prothrombin (II)**, **Thromboplastin (III)**, and **Calcium ions ($Ca^{2+}$, IV)**.
- **Heparin** (secreted by basophils & mast cells) prevents blood from clotting inside intact vessels.
- **Universal Donor**: **O Negative ($O^-$)** (no A, B, or Rh surface antigens). **Universal Recipient**: **AB Positive ($AB^+$)** (no anti-A, anti-B, or anti-Rh antibodies).`,
  },
  {
    id: "topic-bcs-constitution",
    bookId: "book-med-bcs",
    chapterNumber: 2,
    chapterTitle: "Chapter 2: BCS Bangladesh Affairs Capsule",
    sectionTitle: "2.1 Constitution of Bangladesh",
    topicTitle: "Key Articles of the Constitution of Bangladesh (বাংলাদেশের সংবিধান)",
    orderIndex: 2,
    readingMinutes: 5,
    model3dKey: "",
    searchTokens: "bcs bangladesh constitution articles fundamental rights 1972 parliament সংবিধান মৌলিক অধিকার বিসিএস",
    isPublished: true,
    contentMarkdown: `## বাংলাদেশের সংবিধান — বিসিএস প্রিলিমিনারি হাই-ইল্ড অনুচ্ছেদ

The Constitution of the People's Republic of Bangladesh was adopted by the Constituent Assembly on **4 November 1972** and came into force on **16 December 1972** (Victory Day). It contains **11 Parts (ভাগ)**, **153 Articles (অনুচ্ছেদ)**, and **7 Schedules (তফসিল)**.

### Must-Remember Articles for BCS Exams
- **Article 1**: Bangladesh is a unitary, independent, sovereign Republic.
- **Article 3**: The state language of the Republic is **Bangla**.
- **Article 7**: Supremacy of the Constitution — all powers in the Republic belong to the people.
- **Article 8**: Four Fundamental Principles of State Policy (*Nationalism, Socialism, Democracy, Secularism*).
- **Part III (Articles 26–47A)**: **Fundamental Rights (মৌলিক অধিকার)** — enforceable by the High Court Division under **Article 102**.
  - **Article 27**: Equality before law.
  - **Article 28**: Discrimination on grounds of religion, race, caste, sex, or place of birth prohibited.
  - **Article 32**: Protection of right to life and personal liberty.
  - **Article 39**: Freedom of thought, conscience, speech, and the press.
- **Article 77**: Provision for the **Ombudsman (ন্যায়পাল)**.`,
  },
  {
    id: "topic-ielts-tfng",
    bookId: "book-ielts-mastery",
    chapterNumber: 1,
    chapterTitle: "Chapter 1: IELTS Academic Reading Precision",
    sectionTitle: "1.1 Eliminating Logic Traps",
    topicTitle: "Mastering True / False / Not Given & Qualifying Words",
    orderIndex: 1,
    readingMinutes: 6,
    model3dKey: "",
    searchTokens: "ielts academic reading true false not given qualifiers paraphrase band 9 strategy",
    isPublished: true,
    contentMarkdown: `## Mastering True / False / Not Given in IELTS Academic Reading

**True / False / Not Given (TFNG)** questions are among the highest-impact score differentiators between Band 6.5 and Band 8.5. The secret is distinguishing **direct contradiction (FALSE)** from **missing information (NOT GIVEN)**.

### The Three-Step Verification Protocol
1. **Locate via Anchor Nouns**: Scan the passage for unchangeable anchors (dates, proper names, numbers, technical nouns). Remember: TFNG answers always appear **in sequential order** in the passage.
2. **Isolate Qualifying Words**: Watch closely for extreme or limiting modifiers such as *only, solely, always, never, majority, primarily, more than, first*. A single qualifier often flips a statement from TRUE to FALSE.
3. **Apply the Contradiction Test**:
   - **TRUE**: The passage expresses the exact same meaning using synonyms or paraphrased grammar.
   - **FALSE**: The passage explicitly states the *opposite* or gives incompatible facts (e.g., passage says *"some researchers"*, statement says *"all researchers"*).
   - **NOT GIVEN**: You cannot prove it true *and* you cannot prove it false without making an outside assumption. Never use background knowledge!

### Worked Mini-Example
- *Passage*: "Urban vertical farms reduce water usage by up to 95% compared with open-field agriculture, though their high electricity demand remains a major barrier to profitability."
- *Statement A*: "Vertical farms consume significantly less water than conventional outdoor farming." → **TRUE** (*paraphrase of 95% reduction*).
- *Statement B*: "Vertical farms are currently more profitable than traditional farms." → **FALSE** (*contradicts 'major barrier to profitability'*).
- *Statement C*: "Most vertical farms in Europe rely on solar energy." → **NOT GIVEN** (*Europe and solar power are never mentioned*).`,
  },
  {
    id: "topic-ielts-task2",
    bookId: "book-ielts-mastery",
    chapterNumber: 2,
    chapterTitle: "Chapter 2: IELTS Academic Writing Task 2",
    sectionTitle: "2.1 Band 8.5 Essay Blueprint",
    topicTitle: "Cohesive Paragraph Architecture & Academic Lexical Resource",
    orderIndex: 2,
    readingMinutes: 6,
    model3dKey: "",
    searchTokens: "ielts writing task 2 essay band 9 cohesion coherence thesis statement lexical resource",
    isPublished: true,
    contentMarkdown: `## Band 8.5+ IELTS Writing Task 2 Architecture

Examiners grade Task 2 across four equally weighted criteria (25% each): **Task Response**, **Coherence & Cohesion**, **Lexical Resource**, and **Grammatical Range & Accuracy**.

### The 4-Paragraph High-Scoring Structure (270–310 words)
1. **Introduction (2–3 sentences)**: Paraphrase the prompt naturally without robotic templates, then state a crystal-clear **Thesis Position** addressing *all* parts of the question.
2. **Body Paragraph 1 (PEEL Framework)**:
   - **Point**: One clear central topic sentence.
   - **Explain**: Unpack the cause-and-effect logic (*why* or *how* it works).
   - **Example**: Concrete, realistic evidence (avoid fake "87.4% university survey" fabrications).
   - **Link**: Tie the insight back to your thesis.
3. **Body Paragraph 2 (PEEL Framework)**: Present the second core argument (or balanced counter-perspective + refutation for Discussion/Agree-Disagree essays).
4. **Conclusion (2 sentences)**: Synthesize your two main points in fresh vocabulary and restate your overall verdict. Never introduce brand-new arguments here.

### Natural Cohesion Upgrades (Avoid Overused Clichés)
- Replace *"First of all / Secondly / Last but not least"* with seamless referencing: *"A primary catalyst behind this shift is..."*, *"Beyond financial constraints, this policy also..."*, *"Consequently, such measures..."*.`,
  },
];

export const SEED_STUDY_TAB_TYPES: StudyTabType[] = [
  {
    id: "tab-reading",
    key: "reading",
    label: "Reading",
    promptTemplate: "",
    orderIndex: 1,
    isSystem: true,
    isPublished: true,
  },
  {
    id: "tab-summary",
    key: "summary",
    label: "Summary",
    promptTemplate:
      "Summarize this topic clearly with structured headings so no critical exam fact or mechanism is missed.",
    orderIndex: 2,
    isSystem: true,
    isPublished: true,
  },
  {
    id: "tab-ultra-short",
    key: "ultra_short",
    label: "Ultra Short",
    promptTemplate: "Create a 30-second ultra-short revision capsule with 6 razor-sharp bullet points.",
    orderIndex: 3,
    isSystem: true,
    isPublished: true,
  },
  {
    id: "tab-key-points",
    key: "key_points",
    label: "Key Points",
    promptTemplate: "Extract 8-10 numbered high-yield exam key points with bolded terms and numbers.",
    orderIndex: 4,
    isSystem: true,
    isPublished: true,
  },
  {
    id: "tab-memorize",
    key: "memorize",
    label: "Memorize",
    promptTemplate: "Create catchy mnemonics, Bangla-English memory hooks, and exam trap alerts.",
    orderIndex: 5,
    isSystem: true,
    isPublished: true,
  },
  {
    id: "tab-3d",
    key: "diagram_3d",
    label: "3D Diagram",
    promptTemplate: "",
    orderIndex: 6,
    isSystem: true,
    isPublished: true,
  },
  {
    id: "tab-qa",
    key: "qa",
    label: "Q&A",
    promptTemplate: "Generate 6 concise, textbook-accurate Viva / Short Q&A pairs.",
    orderIndex: 7,
    isSystem: true,
    isPublished: true,
  },
  {
    id: "tab-exam",
    key: "exam",
    label: "Exam",
    promptTemplate: "",
    orderIndex: 8,
    isSystem: true,
    isPublished: true,
  },
];

export const SEED_TOPIC_STUDY_TABS: TopicStudyTab[] = [
  {
    id: "tst-heart-summary",
    bookId: "book-bio-physiology",
    topicId: "topic-bio-heart",
    tabKey: "summary",
    generatedByModel: "gemini-4-hydrogen",
    isPublished: true,
    contentMarkdown: `### Executive Summary — Human Heart (হৃৎপিণ্ডের সারসংক্ষেপ)

- **Location & Protection**: Hollow muscular organ in the mediastinum, wrapped in a double-walled **pericardium**, pumping ~5 L/min.
- **3 Wall Layers**: Outer *Epicardium*, thick contractile *Myocardium* (thickest in Left Ventricle for systemic pressure), smooth inner *Endocardium*.
- **Double Circulation**:
  - **Right Side (Deoxygenated)**: Vena Cava → Right Atrium → *Tricuspid Valve* → Right Ventricle → *Pulmonary Valve* → Lungs.
  - **Left Side (Oxygenated)**: 4 Pulmonary Veins → Left Atrium → *Bicuspid/Mitral Valve* → Left Ventricle → *Aortic Valve* → Aorta → Body.
- **Electrical Conduction**: Myogenic pathway: **SA Node (Pacemaker)** → **AV Node (0.1s delay)** → **Bundle of His** → **Purkinje Fibers**.
- **Cardiac Cycle (0.8s)**: Atrial Systole (**0.1s**) + Ventricular Systole (**0.3s**) + Joint Diastole (**0.4s**).`,
  },
  {
    id: "tst-heart-ultrashort",
    bookId: "book-bio-physiology",
    topicId: "topic-bio-heart",
    tabKey: "ultra_short",
    generatedByModel: "gemini-3.1-flash-lite",
    isPublished: true,
    contentMarkdown: `### 30-Second Revision Capsule (একনজরে হৃৎপিণ্ড)

- **Wall**: Epicardium → **Myocardium** (thickest in LV) → Endocardium.
- **Right Valve**: **Tricuspid** (3 cusps) · **Left Valve**: **Bicuspid / Mitral** (2 cusps).
- **Heart Sounds**: **Lub ($S_1$)** = AV valves close · **Dub ($S_2$)** = Semilunar valves close.
- **Pacemaker**: **SA Node** (70–75 bpm) in upper Right Atrium.
- **Cycle Time**: **0.8 sec** (**0.1s** AS + **0.3s** VS + **0.4s** Joint Diastole).
- **Cardiac Output**: ~5 Liters/min (SV ≈ 70 mL × HR ≈ 72 bpm).`,
  },
  {
    id: "tst-heart-keypoints",
    bookId: "book-bio-physiology",
    topicId: "topic-bio-heart",
    tabKey: "key_points",
    generatedByModel: "gemini-4-hydrogen",
    isPublished: true,
    contentMarkdown: `### High-Yield Exam Key Points

1. **Thickest Chamber Wall**: The **Left Ventricle** has the thickest myocardium (3× thicker than the right ventricle) to drive high-pressure systemic circulation.
2. **Only Vein Carrying Oxygenated Blood**: The **4 Pulmonary Veins** bring oxygenated blood from the lungs to the Left Atrium.
3. **Only Artery Carrying Deoxygenated Blood**: The **Pulmonary Artery** carries deoxygenated blood from the Right Ventricle to the lungs.
4. **Natural Pacemaker**: The **SA Node** initiates every heartbeat autonomously (myogenic control).
5. **AV Nodal Delay (0.1s)**: Ensures complete ventricular filling before ventricular contraction begins.
6. **Lub vs. Dub**: Closure of AV valves causes **Lub**; closure of Semilunar valves causes **Dub**.
7. **Coronary Sinus**: Empties deoxygenated blood from the heart muscle itself directly into the **Right Atrium**.`,
  },
  {
    id: "tst-heart-memorize",
    bookId: "book-bio-physiology",
    topicId: "topic-bio-heart",
    tabKey: "memorize",
    generatedByModel: "gemini-4-hydrogen",
    isPublished: true,
    contentMarkdown: `### Memorization Tricks & Mnemonics (মনে রাখার সহজ কৌশল)

#### 1. Valve Side Trick: **"Try Before You Buy"**
- **Tri**cuspid = **Right** side (you *try* on the right first!)
- **Bi**cuspid (Mitral) = **Left** side (*Buy* on the left!)
- বাংলা ছন্দ: **"ডানে ত্রি-পত্র (Tricuspid), বামে দ্বি-পত্র (Bicuspid)"**।

#### 2. Blood Flow Sequence: **"TP My Assets"** (Valves in Order)
- **T**ricuspid → **P**ulmonary → **M**itral (Bicuspid) → **A**ortic.

#### 3. Conduction Pathway: **"SA → AV → His → Purkinje"**
- মনে রাখুন: **"সাহাবুদ্দিন (SA) আসলেন (AV), হিসাব (His) পুরো (Purkinje) করলেন"**।

#### 4. Cardiac Cycle Time: **"1 – 3 – 4 = 8"**
- **0.1s** (Atrial Systole) + **0.3s** (Ventricular Systole) + **0.4s** (Joint Diastole) = **0.8s**!`,
  },
  {
    id: "tst-heart-qa",
    bookId: "book-bio-physiology",
    topicId: "topic-bio-heart",
    tabKey: "qa",
    generatedByModel: "gemini-4-hydrogen",
    isPublished: true,
    contentMarkdown: `### Viva & Short Q&A

**Q1. Why is the human heart called myogenic?**
Because the rhythmic contraction impulse originates inside specialized cardiac muscle tissue (the SA Node) itself rather than requiring external brain/nerve impulses.

**Q2. Why is the wall of the left ventricle much thicker than the right ventricle?**
The right ventricle only pumps blood a short distance to the adjacent lungs (low pressure), whereas the left ventricle must generate high pressure to pump blood throughout the entire systemic circulation.

**Q3. What causes the "Lub" and "Dub" heart sounds?**
"Lub" ($S_1$) is produced by the closure of the Tricuspid and Bicuspid (AV) valves at ventricular systole onset; "Dub" ($S_2$) is produced by the closure of the Aortic and Pulmonary semilunar valves at diastole onset.

**Q4. What is the physiological role of the 0.1-second delay at the AV Node?**
It allows both atria to finish contracting and push the final volume of blood into the ventricles before ventricular contraction begins.`,
  },
  {
    id: "tst-bohr-summary",
    bookId: "book-physics-modern",
    topicId: "topic-phys-bohr",
    tabKey: "summary",
    generatedByModel: "gemini-4-hydrogen",
    isPublished: true,
    contentMarkdown: `### Summary — Bohr's Atomic Model

- Electrons occupy discrete **stationary orbits** with quantized angular momentum $L = nh / 2\\pi$.
- Photons are emitted or absorbed only during jumps between orbits: $\\Delta E = h\\nu = hc/\\lambda$.
- For Hydrogen: $r_n = 0.529 n^2\\text{ Å}$ and $E_n = -13.6 / n^2\\text{ eV}$.
- **Lyman** ($n_1=1$) is UV, **Balmer** ($n_1=2$) is **Visible**, and **Paschen** ($n_1=3$) is Infrared.`,
  },
  {
    id: "tst-bohr-memorize",
    bookId: "book-physics-modern",
    topicId: "topic-phys-bohr",
    tabKey: "memorize",
    generatedByModel: "gemini-4-hydrogen",
    isPublished: true,
    contentMarkdown: `### Memorization Trick — Hydrogen Spectral Series

**"Lazy Boys Play Billiards Promptly"**
1. **L**yman ($n_1 = 1$) → Ultraviolet
2. **B**almer ($n_1 = 2$) → **Visible** (*"Balmer = Bright / দেখা যায়"*)
3. **P**aschen ($n_1 = 3$) → Infrared
4. **B**rackett ($n_1 = 4$) → Far Infrared
5. **P**fund ($n_1 = 5$) → Far Infrared`,
  },
  {
    id: "tst-ielts-summary",
    bookId: "book-ielts-mastery",
    topicId: "topic-ielts-tfng",
    tabKey: "summary",
    generatedByModel: "gemini-4-hydrogen",
    isPublished: true,
    contentMarkdown: `### Summary — True / False / Not Given Protocol

- **Order Guarantee**: Answers follow the exact order of the text.
- **TRUE**: Complete semantic match (usually paraphrased).
- **FALSE**: Explicit textual contradiction (often triggered by extreme qualifiers like *always, only, never*).
- **NOT GIVEN**: Missing link — cannot be confirmed OR disproved from the passage alone.`,
  },
];

export const SEED_QUESTIONS: Question[] = [
  {
    id: "q-bio-1",
    bookId: "book-bio-physiology",
    topicId: "topic-bio-heart",
    chapterTitle: "Chapter 1: Human Circulatory System (রক্ত সংবহনতন্ত্র)",
    stem: "Which structure is known as the natural pacemaker of the human heart (মানব হৃৎপিণ্ডের প্রাকৃতিক পেসমেকার কোনটি)?",
    options: ["AV Node", "SA Node (Sinoatrial Node)", "Bundle of His", "Purkinje Fibers"],
    correctIndex: 1,
    explanation:
      "The Sinoatrial (SA) Node located in the upper right atrium spontaneously initiates 70–75 electrical impulses per minute, setting the heart's natural rhythm.",
    difficulty: "easy",
    isPublished: true,
  },
  {
    id: "q-bio-2",
    bookId: "book-bio-physiology",
    topicId: "topic-bio-heart",
    chapterTitle: "Chapter 1: Human Circulatory System (রক্ত সংবহনতন্ত্র)",
    stem: "Which valve guards the opening between the Left Atrium and the Left Ventricle?",
    options: ["Tricuspid Valve", "Pulmonary Semilunar Valve", "Bicuspid (Mitral) Valve", "Aortic Semilunar Valve"],
    correctIndex: 2,
    explanation:
      "The Bicuspid (Mitral) Valve sits between the left atrium and left ventricle ('Try on the Right, Buy on the Left').",
    difficulty: "easy",
    isPublished: true,
  },
  {
    id: "q-bio-3",
    bookId: "book-bio-physiology",
    topicId: "topic-bio-heart",
    chapterTitle: "Chapter 1: Human Circulatory System (রক্ত সংবহনতন্ত্র)",
    stem: "What is the exact duration of one complete human cardiac cycle at a normal heart rate of 75 bpm?",
    options: ["0.4 seconds", "0.6 seconds", "0.8 seconds", "1.2 seconds"],
    correctIndex: 2,
    explanation:
      "60 seconds / 75 beats = 0.8 seconds per cardiac cycle (Atrial Systole 0.1s + Ventricular Systole 0.3s + Joint Diastole 0.4s).",
    difficulty: "medium",
    isPublished: true,
  },
  {
    id: "q-bio-4",
    bookId: "book-bio-physiology",
    topicId: "topic-bio-heart",
    chapterTitle: "Chapter 1: Human Circulatory System (রক্ত সংবহনতন্ত্র)",
    stem: "The first heart sound ('Lub' / S1) is primarily produced by the sudden closure of which valves?",
    options: [
      "Aortic and Pulmonary semilunar valves",
      "Tricuspid and Bicuspid (AV) valves",
      "Coronary sinus valve only",
      "Inferior vena cava valve",
    ],
    correctIndex: 1,
    explanation:
      "S1 ('Lub') occurs at the onset of ventricular systole when rising ventricular pressure snaps the Tricuspid and Mitral (AV) valves shut.",
    difficulty: "medium",
    isPublished: true,
  },
  {
    id: "q-bio-5",
    bookId: "book-bio-physiology",
    topicId: "topic-bio-cardiac-regulation",
    chapterTitle: "Chapter 1: Human Circulatory System (রক্ত সংবহনতন্ত্র)",
    stem: "In a standard Electrocardiogram (ECG), what electrical event does the QRS complex represent?",
    options: [
      "Atrial depolarization",
      "Ventricular depolarization",
      "Ventricular repolarization",
      "SA nodal resting phase",
    ],
    correctIndex: 1,
    explanation:
      "The QRS complex corresponds to the rapid spread of electrical depolarization through both ventricles immediately prior to mechanical ventricular contraction.",
    difficulty: "medium",
    isPublished: true,
  },
  {
    id: "q-bio-6",
    bookId: "book-bio-physiology",
    topicId: "topic-bio-cell",
    chapterTitle: "Chapter 2: Eukaryotic Cell & Organelles (প্রকৃতকোষ ও অঙ্গাণু)",
    stem: "What are the inward finger-like folds of the inner mitochondrial membrane called?",
    options: ["Cisternae", "Thylakoids", "Cristae", "Microvilli"],
    correctIndex: 2,
    explanation:
      "Cristae dramatically increase the inner mitochondrial surface area to house the Electron Transport Chain and ATP Synthase complexes.",
    difficulty: "easy",
    isPublished: true,
  },
  {
    id: "q-bio-7",
    bookId: "book-bio-physiology",
    topicId: "topic-bio-cell",
    chapterTitle: "Chapter 2: Eukaryotic Cell & Organelles (প্রকৃতকোষ ও অঙ্গাণু)",
    stem: "Which organelle contains its own circular DNA and 70S ribosomes, supporting the Endosymbiotic Theory?",
    options: ["Golgi Apparatus", "Lysosome", "Mitochondrion", "Smooth ER"],
    correctIndex: 2,
    explanation:
      "Mitochondria possess circular double-stranded mtDNA and prokaryote-like 70S ribosomes inside their matrix.",
    difficulty: "medium",
    isPublished: true,
  },
  {
    id: "q-phys-1",
    bookId: "book-physics-modern",
    topicId: "topic-phys-bohr",
    chapterTitle: "Chapter 1: Atomic Structure & Quantum Transitions (পরমাণুর গঠন)",
    stem: "Which spectral series of the Hydrogen atom falls within the Visible Light region?",
    options: ["Lyman Series", "Balmer Series", "Paschen Series", "Brackett Series"],
    correctIndex: 1,
    explanation:
      "Transitions ending at n₁ = 2 form the Balmer Series, emitting wavelengths between ~410 nm and 656 nm in the visible spectrum.",
    difficulty: "easy",
    isPublished: true,
  },
  {
    id: "q-phys-2",
    bookId: "book-physics-modern",
    topicId: "topic-phys-bohr",
    chapterTitle: "Chapter 1: Atomic Structure & Quantum Transitions (পরমাণুর গঠন)",
    stem: "According to Bohr's model, what is the energy of an electron in the second orbit (n = 2) of a Hydrogen atom?",
    options: ["-13.6 eV", "-6.8 eV", "-3.4 eV", "-1.51 eV"],
    correctIndex: 2,
    explanation: "Using Eₙ = -13.6 / n² eV, for n = 2 we get E₂ = -13.6 / 4 = -3.4 eV.",
    difficulty: "medium",
    isPublished: true,
  },
  {
    id: "q-phys-3",
    bookId: "book-physics-modern",
    topicId: "topic-phys-photoelectric",
    chapterTitle: "Chapter 1: Atomic Structure & Quantum Transitions (পরমাণুর গঠন)",
    stem: "In the photoelectric effect, increasing the intensity of incident light (above threshold frequency) directly increases:",
    options: [
      "The maximum kinetic energy of each photoelectron",
      "The metal's work function",
      "The number of emitted photoelectrons per second (current)",
      "The stopping potential",
    ],
    correctIndex: 2,
    explanation:
      "Higher intensity means more photons striking per second, ejecting more electrons (higher current), while kinetic energy depends solely on photon frequency.",
    difficulty: "medium",
    isPublished: true,
  },
  {
    id: "q-chem-1",
    bookId: "book-chem-molecular",
    topicId: "topic-chem-vsepr",
    chapterTitle: "Chapter 1: Molecular Geometry & Biomolecules (অণুর ত্রিমাত্রিক গঠন)",
    stem: "Why is the H–O–H bond angle in water (104.5°) smaller than the ideal tetrahedral angle of methane (109.5°)?",
    options: [
      "Oxygen uses sp² hybridization",
      "Two lone pairs on Oxygen exert stronger repulsion than bonding pairs",
      "Hydrogen atoms attract each other covalently",
      "Water has zero dipole moment",
    ],
    correctIndex: 1,
    explanation:
      "Oxygen in H₂O is sp³ hybridized with 2 lone pairs. Because Lone Pair–Lone Pair repulsion > Bond Pair–Bond Pair repulsion, the O–H bonds are compressed to 104.5°.",
    difficulty: "medium",
    isPublished: true,
  },
  {
    id: "q-chem-2",
    bookId: "book-chem-molecular",
    topicId: "topic-chem-vsepr",
    chapterTitle: "Chapter 1: Molecular Geometry & Biomolecules (অণুর ত্রিমাত্রিক গঠন)",
    stem: "How many hydrogen bonds join a Guanine (G) and Cytosine (C) base pair in double-stranded DNA?",
    options: ["1 Hydrogen bond", "2 Hydrogen bonds", "3 Hydrogen bonds", "4 Hydrogen bonds"],
    correctIndex: 2,
    explanation:
      "G≡C pairs share 3 hydrogen bonds (giving GC-rich DNA greater thermal stability), whereas A=T pairs share 2 hydrogen bonds.",
    difficulty: "easy",
    isPublished: true,
  },
  {
    id: "q-med-1",
    bookId: "book-med-bcs",
    topicId: "topic-med-blood",
    chapterTitle: "Chapter 1: Medical High-Yield Rapid Revision",
    stem: "Which substance prevents blood from coagulating inside intact human blood vessels?",
    options: ["Fibrinogen", "Thromboplastin", "Heparin", "Prothrombin"],
    correctIndex: 2,
    explanation:
      "Heparin is a natural anticoagulant secreted by basophils and mast cells that inhibits thrombin formation inside healthy vessels.",
    difficulty: "easy",
    isPublished: true,
  },
  {
    id: "q-med-2",
    bookId: "book-med-bcs",
    topicId: "topic-bcs-constitution",
    chapterTitle: "Chapter 2: BCS Bangladesh Affairs Capsule",
    stem: "Under which Article of the Constitution of Bangladesh are Fundamental Rights enforced by the High Court Division?",
    options: ["Article 27", "Article 39", "Article 77", "Article 102"],
    correctIndex: 3,
    explanation:
      "Article 102 empowers the High Court Division to issue writ orders enforcing Fundamental Rights guaranteed in Part III (Articles 26–47A).",
    difficulty: "medium",
    isPublished: true,
  },
  {
    id: "q-ielts-1",
    bookId: "book-ielts-mastery",
    topicId: "topic-ielts-tfng",
    chapterTitle: "Chapter 1: IELTS Academic Reading Precision",
    stem: "When should you select NOT GIVEN instead of FALSE in an IELTS Academic Reading task?",
    options: [
      "When the statement uses a synonym instead of the exact word from the text",
      "When the passage explicitly states the opposite of the statement",
      "When the passage neither confirms nor contradicts the claim",
      "Whenever the statement contains a number or date",
    ],
    correctIndex: 2,
    explanation:
      "FALSE requires a direct contradiction in the passage; NOT GIVEN applies when the required information is simply absent and cannot be verified either way.",
    difficulty: "easy",
    isPublished: true,
  },
  {
    id: "q-ielts-2",
    bookId: "book-ielts-mastery",
    topicId: "topic-ielts-task2",
    chapterTitle: "Chapter 2: IELTS Academic Writing Task 2",
    stem: "Which element should NEVER be introduced for the first time in the Conclusion of an IELTS Task 2 essay?",
    options: [
      "A paraphrased thesis verdict",
      "A brief synthesis of main body points",
      "A brand-new supporting argument",
      "Cohesive concluding phrasing",
    ],
    correctIndex: 2,
    explanation:
      "Introducing a brand-new argument in the conclusion leaves it undeveloped and lowers Coherence & Cohesion and Task Response scores.",
    difficulty: "easy",
    isPublished: true,
  },
];

export const SEED_SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: "plan-free",
    name: "Free Explorer",
    tagline: "For independent students getting started with smart digital reading",
    priceMonthly: 0,
    currency: "USD",
    allowedTiers: ["free"],
    dailyAiLimit: 15,
    has3dLab: true,
    hasVoiceTutor: false,
    orderIndex: 1,
    isPublished: true,
  },
  {
    id: "plan-pro",
    name: "Scholar Pro",
    tagline: "For HSC, Medical Admission & BCS aspirants seeking full AI & Exam tools",
    priceMonthly: 12,
    currency: "USD",
    allowedTiers: ["free", "pro"],
    dailyAiLimit: 150,
    has3dLab: true,
    hasVoiceTutor: true,
    orderIndex: 2,
    isPublished: true,
  },
  {
    id: "plan-elite",
    name: "Academic & IELTS Elite",
    tagline: "Unlimited access across all books, 3D labs, IELTS mastery & live AI voice",
    priceMonthly: 24,
    currency: "USD",
    allowedTiers: ["free", "pro", "elite"],
    dailyAiLimit: 1000,
    has3dLab: true,
    hasVoiceTutor: true,
    orderIndex: 3,
    isPublished: true,
  },
];

export const SEED_CUSTOM_AI_MODELS: CustomAiModel[] = [
  {
    id: "mdl-gemini-4-hydrogen",
    modelId: "gemini-4-hydrogen",
    displayName: "Gemini 4 Hydrogen",
    category: "text",
    tier: "free",
    notes: "Balanced flagship model for bilingual chat, study tabs, MCQs, and web search grounding.",
    isEnabled: true,
  },
  {
    id: "mdl-gemini-3-1-flash-lite",
    modelId: "gemini-3.1-flash-lite",
    displayName: "Gemini 3.1 Flash Lite",
    category: "text",
    tier: "free",
    notes: "Ultra-fast low-latency model for quick hints, summaries, and lightweight chat.",
    isEnabled: true,
  },
  {
    id: "mdl-gemini-3-8-live",
    modelId: "gemini-3.8-live",
    displayName: "Gemini 3.8 Live (Voice & Screen)",
    category: "live",
    tier: "free",
    voiceName: "Zephyr",
    notes: "Real-time bidirectional voice + screen share tutoring over WebSocket.",
    isEnabled: true,
  },
  {
    id: "mdl-gemini-3-8-live-ext",
    modelId: "gemini-3.8-live-extended-thinking",
    displayName: "Gemini 3.8 Live Extended Thinking",
    category: "live",
    tier: "standard",
    voiceName: "Zephyr",
    notes: "Live voice + vision with extended reasoning for tough STEM & medical questions.",
    isEnabled: true,
  },
  {
    id: "mdl-gemini-3-8-flash-lite-tts",
    modelId: "gemini-3.8-flash-lite-tts",
    displayName: "Gemini 3.8 Flash Lite TTS",
    category: "tts",
    tier: "free",
    notes: "Fast, natural read-aloud narration for chapters and topics.",
    isEnabled: true,
  },
  {
    id: "mdl-gemini-3-8-flash-tts",
    modelId: "gemini-3.8-flash-tts",
    displayName: "Gemini 3.8 Flash TTS",
    category: "tts",
    tier: "standard",
    notes: "Rich studio-grade single and multi-speaker study podcast synthesis.",
    isEnabled: true,
  },
  {
    id: "mdl-gemini-3-5-transcribe",
    modelId: "gemini-3.5-transcribe",
    displayName: "Gemini 3.5 Transcribe",
    category: "transcribe",
    tier: "free",
    notes: "Accurate bilingual English + Bangla speech-to-text transcription.",
    isEnabled: true,
  },
];

export const SEED_AI_MODEL_CONFIGS: AiModelConfig[] = [
  {
    id: "cfg-tutor-chat",
    taskName: "Floating AI Tutor Chat & Page Assistant",
    primaryModel: "gemini-4-hydrogen",
    fallbackModel: "gemini-3.1-flash-lite",
    priority: 0,
    isEnabled: true,
    usageCount: 215,
  },
  {
    id: "cfg-voice-live",
    taskName: "Real-Time Live Conversation (Voice & Screen Share)",
    primaryModel: "gemini-3.8-live",
    fallbackModel: "gemini-3.8-live-extended-thinking",
    voiceName: "Zephyr",
    priority: 1,
    isEnabled: true,
    usageCount: 64,
  },
  {
    id: "cfg-summary",
    taskName: "Summary, Key Points & Study Tabs",
    primaryModel: "gemini-4-hydrogen",
    fallbackModel: "gemini-3.1-flash-lite",
    priority: 2,
    isEnabled: true,
    usageCount: 142,
  },
  {
    id: "cfg-ultrashort",
    taskName: "Ultra-Short & Low-Latency Quick Hints",
    primaryModel: "gemini-3.1-flash-lite",
    fallbackModel: "gemini-4-hydrogen",
    priority: 3,
    isEnabled: true,
    usageCount: 318,
  },
  {
    id: "cfg-questions",
    taskName: "Question Bank & Exam Generator",
    primaryModel: "gemini-4-hydrogen",
    fallbackModel: "gemini-3.1-flash-lite",
    priority: 4,
    isEnabled: true,
    usageCount: 96,
  },
  {
    id: "cfg-splitter",
    taskName: "AI Book Chapter & Topic Auto-Splitter",
    primaryModel: "gemini-4-hydrogen",
    fallbackModel: "gemini-3.1-flash-lite",
    priority: 5,
    isEnabled: true,
    usageCount: 24,
  },
  {
    id: "cfg-tts",
    taskName: "Audio Read-Aloud & Study Podcast (TTS)",
    primaryModel: "gemini-3.8-flash-lite-tts",
    fallbackModel: "gemini-3.8-flash-tts",
    priority: 6,
    isEnabled: true,
    usageCount: 51,
  },
  {
    id: "cfg-transcribe",
    taskName: "Microphone Voice Note Transcription",
    primaryModel: "gemini-3.5-transcribe",
    fallbackModel: "gemini-4-hydrogen",
    priority: 7,
    isEnabled: true,
    usageCount: 39,
  },
  {
    id: "cfg-grounding",
    taskName: "Live Web Fact-Check (Search Grounding)",
    primaryModel: "gemini-4-hydrogen",
    fallbackModel: "gemini-3.1-flash-lite",
    priority: 8,
    isEnabled: true,
    usageCount: 83,
  },
];

export const SEED_SUBJECTS: Subject[] = [
  {
    id: "subj-bio",
    curriculumId: "curr-academic",
    code: "BIO-101",
    name: "Biology (জীববিজ্ঞান)",
    language: "bilingual",
    description: "Human Physiology, Cell Biology, Genetics, and Molecular Mechanisms.",
    orderIndex: 1,
    isPublished: true,
  },
  {
    id: "subj-phys",
    curriculumId: "curr-academic",
    code: "PHY-201",
    name: "Modern Physics (আধুনিক পদার্থবিজ্ঞান)",
    language: "bilingual",
    description: "Atomic Models, Quantum Mechanics, Nuclear Physics, and Relativity.",
    orderIndex: 2,
    isPublished: true,
  },
  {
    id: "subj-chem",
    curriculumId: "curr-academic",
    code: "CHM-102",
    name: "Chemistry (রসায়ন)",
    language: "bilingual",
    description: "Chemical Bonding, VSEPR Molecular Geometry, and Organic Pathways.",
    orderIndex: 3,
    isPublished: true,
  },
  {
    id: "subj-med-bcs",
    curriculumId: "curr-medical",
    code: "MED-BCS",
    name: "Medical Admission & BCS Digest",
    language: "bilingual",
    description: "High-yield clinical correlations, general science, and timed competitive MCQ drills.",
    orderIndex: 4,
    isPublished: true,
  },
  {
    id: "subj-ielts",
    curriculumId: "curr-ielts",
    code: "IELTS-AC",
    name: "IELTS Academic Reading & Writing",
    language: "en",
    description: "Band 8+ reading protocols, TFNG strategies, and structured essay rubrics.",
    orderIndex: 5,
    isPublished: true,
  },
];

export const SEED_SYLLABI: Syllabus[] = [
  {
    id: "syl-hsc-bio-2026",
    curriculumId: "curr-academic",
    subjectId: "subj-bio",
    title: "HSC & Medical Biology Core Syllabus",
    examTarget: "HSC Board + MBBS Admission",
    academicYear: "2026-2027",
    chaptersSummary: "Circulatory System, Cardiac Cycle & ECG, Eukaryotic Cell Organelles, Enzymology.",
    isPublished: true,
  },
  {
    id: "syl-hsc-phys-2026",
    curriculumId: "curr-academic",
    subjectId: "subj-phys",
    title: "Modern Physics & Quantum Foundations",
    examTarget: "HSC + BUET / Engineering Admission",
    academicYear: "2026-2027",
    chaptersSummary: "Bohr Postulates, Hydrogen Spectral Series, Photoelectric Effect, Nuclear Decay.",
    isPublished: true,
  },
  {
    id: "syl-bcs-47",
    curriculumId: "curr-medical",
    subjectId: "subj-med-bcs",
    title: "47th BCS Preliminary & Medical Rapid Revision",
    examTarget: "BCS Preliminary & MBBS",
    academicYear: "2026-2027",
    chaptersSummary: "Daily Science, Human Anatomy High-Yield Traps, Analytical Ability, Bangladesh Affairs.",
    isPublished: true,
  },
];

export const SEED_IMPORT_JOBS: ImportJob[] = [
  {
    id: "job-bio-physiology",
    bookId: "book-bio-physiology",
    bookTitle: "Human Physiology & Cell Biology",
    sourceFileName: "hsc_biology_cardiovascular_bilingual.md",
    sourceType: "markdown",
    status: "published",
    progressPercent: 100,
    topicsDetected: 3,
    ocrConfidence: 99,
    notes: "Structured into Chapter -> Section -> Topic with 3D Heart & Cell models linked.",
    createdBy: "zayed.islam1998@gmail.com",
  },
  {
    id: "job-physics-quantum",
    bookId: "book-physics-modern",
    bookTitle: "Modern Physics & Quantum Foundations",
    sourceFileName: "modern_physics_bohr_quantum.txt",
    sourceType: "text",
    status: "admin_review",
    progressPercent: 85,
    topicsDetected: 2,
    ocrConfidence: 97,
    notes: "AI auto-split completed; awaiting final formula review in Book Editor.",
    createdBy: "zayed.islam1998@gmail.com",
  },
];

export const SEED_AUDIT_LOGS: AuditLog[] = [
  {
    id: "audit-seed-1",
    actorUid: "system-bootstrap",
    actorEmail: "zayed.islam1998@gmail.com",
    action: "CATALOG_PUBLISHED",
    resourceType: "book",
    resourceId: "book-bio-physiology",
    summary: "Published starter bilingual textbook Human Physiology & Cell Biology with 3D links.",
  },
  {
    id: "audit-seed-2",
    actorUid: "system-bootstrap",
    actorEmail: "zayed.islam1998@gmail.com",
    action: "API_VALIDATION_ENABLED",
    resourceType: "system",
    resourceId: "api-schemas",
    summary: "Enabled Zod request validation across all 6 /api/ai/* routes and /api/health probe.",
  },
];

export const SEED_FLASHCARDS: Flashcard[] = [
  {
    id: "fc-seed-1",
    userId: "guest-preview",
    bookId: "book-bio-physiology",
    topicId: "topic-bio-heart",
    bookTitle: "Human Physiology & Cell Biology",
    topicTitle: "Structure of the Human Heart & Double Circulation (মানব হৃৎপিণ্ডের গঠন)",
    front: "What is the natural pacemaker of the human heart, and how many impulses/min does it fire?",
    back: "SA Node (Sinoatrial Node) in the upper right atrium — spontaneously fires 70–75 impulses/min.",
    intervalDays: 1,
    easeFactor: 2.5,
    repetitions: 0,
    nextReviewAt: Date.now() - 3600_000,
  },
  {
    id: "fc-seed-2",
    userId: "guest-preview",
    bookId: "book-bio-physiology",
    topicId: "topic-bio-heart",
    bookTitle: "Human Physiology & Cell Biology",
    topicTitle: "Structure of the Human Heart & Double Circulation (মানব হৃৎপিণ্ডের গঠন)",
    front: "Which valves close to produce the S1 ('Lub') and S2 ('Dub') heart sounds?",
    back: "S1 ('Lub') = Tricuspid & Bicuspid (AV) valves closing at ventricular systole; S2 ('Dub') = Aortic & Pulmonary semilunar valves closing at ventricular diastole.",
    intervalDays: 1,
    easeFactor: 2.5,
    repetitions: 0,
    nextReviewAt: Date.now() - 1800_000,
  },
  {
    id: "fc-seed-3",
    userId: "guest-preview",
    bookId: "book-physics-modern",
    topicId: "topic-phys-bohr",
    bookTitle: "Modern Physics & Quantum Foundations",
    topicTitle: "Bohr's Postulates, Energy Quantization & Hydrogen Spectrum (বোর পরমাণু মডেল)",
    front: "Which Hydrogen spectral series falls in the Visible Light region and what is its lower level n₁?",
    back: "Balmer Series (n₁ = 2), emitting visible wavelengths between ~410 nm and 656 nm.",
    intervalDays: 2,
    easeFactor: 2.6,
    repetitions: 1,
    nextReviewAt: Date.now() - 600_000,
  },
];

