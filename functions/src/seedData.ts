export type SeedQ = [subject: string, topic: string, difficulty: string, q: string, a: string, b: string, c: string, d: string, ans: "A" | "B" | "C" | "D", expl: string];

export const ACHIEVEMENTS = [
  { id: "first_exam", name: "First Exam", description: "Complete your first exam", icon: "🏆", requirement: "first_exam" },
  { id: "exams_10", name: "10 Exams Completed", description: "Complete 10 exams", icon: "⚡", requirement: "exams_10" },
  { id: "accuracy_90", name: "90% Accuracy", description: "Score 90%+ accuracy in an exam (min. 10 answered)", icon: "🎯", requirement: "accuracy_90" },
  { id: "streak_7", name: "7 Day Streak", description: "Complete exams for 7 consecutive days", icon: "🔥", requirement: "streak_7" },
  { id: "questions_500", name: "500 Questions Solved", description: "Answer 500 questions", icon: "📚", requirement: "questions_500" }
];

export const BASE_QUESTIONS: SeedQ[] = [
  ["Physics", "Mechanics", "Easy", "The SI unit of force is", "Joule", "Newton", "Watt", "Pascal", "B", "Force = mass x acceleration, measured in newtons (kg·m/s²)."],
  ["Physics", "Mechanics", "Medium", "A 2 kg body accelerates at 3 m/s². The net force on it is", "1.5 N", "5 N", "6 N", "9 N", "C", "F = ma = 2 x 3 = 6 N."],
  ["Physics", "Waves", "Medium", "The speed of light in vacuum is approximately", "3 x 10^6 m/s", "3 x 10^8 m/s", "3 x 10^10 m/s", "3 x 10^5 m/s", "B", "c ≈ 3 x 10^8 m/s."],
  ["Physics", "Electricity", "Medium", "According to Ohm's law, V equals", "I/R", "IR", "I²R", "R/I", "B", "Ohm's law: V = IR."],
  ["Physics", "Optics", "Medium", "The image formed by a plane mirror is", "real and inverted", "virtual and erect", "real and erect", "virtual and inverted", "B", "A plane mirror forms a virtual, erect, laterally inverted image of the same size."],
  ["Physics", "Mechanics", "Hard", "A ball is thrown straight up at 20 m/s (g = 10 m/s²). The maximum height reached is", "10 m", "20 m", "30 m", "40 m", "B", "h = v²/2g = 400/20 = 20 m."],
  ["Chemistry", "Atomic Structure", "Easy", "The atomic number of carbon is", "4", "6", "8", "12", "B", "Carbon has 6 protons."],
  ["Chemistry", "Periodic Table", "Easy", "Which of the following is a noble gas?", "Oxygen", "Nitrogen", "Argon", "Chlorine", "C", "Argon is in group 18."],
  ["Chemistry", "Acids and Bases", "Medium", "The pH of a neutral solution at 25°C is", "0", "7", "14", "1", "B", "Neutral water has pH 7 at 25°C."],
  ["Chemistry", "Organic", "Medium", "The general formula of alkanes is", "CnH2n", "CnH2n+2", "CnH2n-2", "CnHn", "B", "Alkanes are saturated: CnH2n+2."],
  ["Chemistry", "Bonding", "Medium", "Sodium chloride is an example of", "a covalent compound", "an ionic compound", "a metallic bond", "a hydrogen bond", "B", "Na transfers an electron to Cl, forming an ionic bond."],
  ["Chemistry", "Mole Concept", "Hard", "How many moles are in 36 g of water? (H = 1, O = 16)", "1", "2", "3", "4", "B", "Molar mass 18 g/mol; 36/18 = 2 mol."],
  ["Higher Mathematics", "Calculus", "Easy", "The derivative of x² is", "x", "2x", "x²", "2", "B", "d/dx(xⁿ) = n·xⁿ⁻¹, so 2x."],
  ["Higher Mathematics", "Calculus", "Medium", "∫ 2x dx =", "x + C", "x² + C", "2x² + C", "x²/2 + C", "B", "The integral of 2x is x² + C."],
  ["Higher Mathematics", "Algebra", "Easy", "The roots of x² − 5x + 6 = 0 are", "1 and 6", "2 and 3", "−2 and −3", "−1 and 6", "B", "(x−2)(x−3) = 0."],
  ["Higher Mathematics", "Trigonometry", "Medium", "sin²θ + cos²θ =", "0", "1", "2", "sin 2θ", "B", "Fundamental Pythagorean identity."],
  ["Higher Mathematics", "Calculus", "Medium", "d/dx (sin x) =", "cos x", "−cos x", "−sin x", "tan x", "A", "The derivative of sin x is cos x."],
  ["Higher Mathematics", "Algebra", "Hard", "The sum of the first 10 natural numbers is", "45", "50", "55", "60", "C", "n(n+1)/2 = 10·11/2 = 55."],
  ["Biology", "Cell Biology", "Easy", "The powerhouse of the cell is the", "Nucleus", "Mitochondrion", "Ribosome", "Golgi body", "B", "Mitochondria produce most of the cell's ATP."],
  ["Biology", "Genetics", "Medium", "DNA stands for", "Deoxyribonucleic acid", "Diribonucleic acid", "Deoxyribose nucleic amine", "Dinucleic acid", "A", "DNA = deoxyribonucleic acid."],
  ["Biology", "Botany", "Easy", "Photosynthesis mainly takes place in the", "Root", "Stem", "Leaf", "Flower", "C", "Leaves contain the most chloroplasts."],
  ["Biology", "Human Physiology", "Medium", "Which blood cells carry oxygen?", "White blood cells", "Red blood cells", "Platelets", "Plasma", "B", "Haemoglobin in RBCs binds oxygen."],
  ["Biology", "Genetics", "Medium", "The father of genetics is", "Darwin", "Mendel", "Lamarck", "Watson", "B", "Gregor Mendel studied inheritance in pea plants."],
  ["Biology", "Human Physiology", "Hard", "Insulin is secreted by the", "Liver", "Pancreas", "Kidney", "Thyroid", "B", "Beta cells of the islets of Langerhans in the pancreas."],
  ["English", "Grammar", "Easy", "Choose the correct sentence: She ___ to school every day.", "go", "goes", "going", "gone", "B", "Third person singular takes -es."],
  ["English", "Vocabulary", "Medium", "Choose the synonym of 'rapid'.", "slow", "quick", "weak", "quiet", "B", "Rapid means quick."],
  ["English", "Vocabulary", "Medium", "Choose the antonym of 'ancient'.", "old", "modern", "historic", "past", "B", "Ancient is the opposite of modern."],
  ["English", "Grammar", "Medium", "He has been living here ___ 2015.", "for", "since", "from", "during", "B", "'Since' is used with a point in time."],
  ["English", "Grammar", "Hard", "Neither of the boys ___ present.", "were", "are", "was", "have been", "C", "'Neither' takes a singular verb."],
  ["English", "Vocabulary", "Easy", "The plural of 'child' is", "childs", "childes", "children", "childrens", "C", "Irregular plural."],
  ["General Knowledge", "Bangladesh", "Easy", "The capital of Bangladesh is", "Chattogram", "Dhaka", "Sylhet", "Khulna", "B", "Dhaka is the capital."],
  ["General Knowledge", "History", "Medium", "Victory Day of Bangladesh is observed on", "26 March", "16 December", "21 February", "17 April", "B", "Victory Day is 16 December."],
  ["General Knowledge", "Geography", "Medium", "The world's largest mangrove forest is the", "Sundarbans", "Daintree", "Tongass", "Everglades", "A", "The Sundarbans spans Bangladesh and India."],
  ["General Knowledge", "World", "Medium", "The largest planet in the solar system is", "Earth", "Saturn", "Jupiter", "Neptune", "C", "Jupiter is the largest."],
  ["General Knowledge", "Bangladesh", "Medium", "The national flower of Bangladesh is", "Rose", "Shapla (water lily)", "Marigold", "Jasmine", "B", "Shapla is the national flower."],
  ["General Knowledge", "History", "Hard", "International Mother Language Day is observed on", "21 February", "26 March", "16 December", "14 April", "A", "Declared by UNESCO in 1999, rooted in the 1952 Language Movement."]
];

export interface SeedExam { id: string; title: string; description: string; category: string; subject: string; durationMinutes: number; negativeMark: number; passingScore: number; difficulty: string; isPremium: boolean; subjects: string[]; inBank: boolean }

export const SEED_EXAMS: SeedExam[] = [
  { id: "gst-science-mock-1", title: "GST Science Mock Test", description: "Full-length mock covering all six GST admission subjects.", category: "Admission", subject: "Physics • Chemistry • Math • Biology • English • GK", durationMinutes: 60, negativeMark: 0.25, passingScore: 40, difficulty: "Medium", isPremium: false, subjects: ["Physics", "Chemistry", "Higher Mathematics", "Biology", "English", "General Knowledge"], inBank: true },
  { id: "physics-chapter-test", title: "Physics Chapter Test", description: "Mechanics, waves, electricity and optics.", category: "Chapter Test", subject: "Physics", durationMinutes: 15, negativeMark: 0.25, passingScore: 40, difficulty: "Easy", isPremium: false, subjects: ["Physics"], inBank: false },
  { id: "chemistry-quick-test", title: "Chemistry Quick Test", description: "Atomic structure, acids, organic and mole concept.", category: "Chapter Test", subject: "Chemistry", durationMinutes: 10, negativeMark: 0.25, passingScore: 40, difficulty: "Medium", isPremium: false, subjects: ["Chemistry"], inBank: false },
  { id: "higher-math-practice", title: "Higher Math Practice Set", description: "Calculus, algebra and trigonometry essentials.", category: "Practice Set", subject: "Higher Mathematics", durationMinutes: 15, negativeMark: 0.25, passingScore: 40, difficulty: "Medium", isPremium: false, subjects: ["Higher Mathematics"], inBank: false },
  { id: "biology-mock", title: "Biology Mock Test", description: "Cell biology, genetics, botany and physiology.", category: "Mock Test", subject: "Biology", durationMinutes: 15, negativeMark: 0.25, passingScore: 40, difficulty: "Easy", isPremium: false, subjects: ["Biology"], inBank: false },
  { id: "english-gk-mock", title: "English & GK Mock", description: "Grammar, vocabulary and general knowledge.", category: "Mock Test", subject: "English • GK", durationMinutes: 20, negativeMark: 0.25, passingScore: 40, difficulty: "Easy", isPremium: false, subjects: ["English", "General Knowledge"], inBank: false },
  { id: "medical-warmup", title: "Medical Admission Warm-up", description: "Physics, Chemistry and Biology — tougher set.", category: "Admission", subject: "Physics • Chemistry • Biology", durationMinutes: 30, negativeMark: 0.25, passingScore: 50, difficulty: "Hard", isPremium: true, subjects: ["Physics", "Chemistry", "Biology"], inBank: false }
];
