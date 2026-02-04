// Comprehensive SAT Flashcard Data

export interface Flashcard {
  id: string;
  front: string;
  back: string;
}

export interface FlashcardDeck {
  id: string;
  title: string;
  description: string;
  category: "math" | "vocabulary" | "grammar" | "custom";
  cards: Flashcard[];
  source: "premade" | "manual" | "ai_generated";
  createdAt: Date;
}

// ============ MATH FORMULAS DECK ============
const mathFormulasCards: Flashcard[] = [
  { id: "math-1", front: "Quadratic Formula", back: "x = (-b ± √(b²-4ac)) / 2a\n\nUsed to find the roots of ax² + bx + c = 0" },
  { id: "math-2", front: "Area of a Circle", back: "A = πr²\n\nWhere r is the radius" },
  { id: "math-3", front: "Circumference of a Circle", back: "C = 2πr or C = πd\n\nWhere r is radius and d is diameter" },
  { id: "math-4", front: "Pythagorean Theorem", back: "a² + b² = c²\n\nFor right triangles, where c is the hypotenuse" },
  { id: "math-5", front: "Slope Formula", back: "m = (y₂ - y₁) / (x₂ - x₁)\n\nRise over run between two points" },
  { id: "math-6", front: "Distance Formula", back: "d = √[(x₂-x₁)² + (y₂-y₁)²]\n\nDerived from Pythagorean theorem" },
  { id: "math-7", front: "Midpoint Formula", back: "M = ((x₁+x₂)/2, (y₁+y₂)/2)\n\nFinds the point exactly between two points" },
  { id: "math-8", front: "Slope-Intercept Form", back: "y = mx + b\n\nm = slope, b = y-intercept" },
  { id: "math-9", front: "Point-Slope Form", back: "y - y₁ = m(x - x₁)\n\nUseful when you know a point and slope" },
  { id: "math-10", front: "Standard Form of a Line", back: "Ax + By = C\n\nWhere A, B, C are integers and A ≥ 0" },
  { id: "math-11", front: "Area of a Triangle", back: "A = ½bh\n\nWhere b is base and h is height" },
  { id: "math-12", front: "Area of a Rectangle", back: "A = lw\n\nLength × Width" },
  { id: "math-13", front: "Area of a Trapezoid", back: "A = ½(b₁ + b₂)h\n\nHalf the sum of bases times height" },
  { id: "math-14", front: "Volume of a Rectangular Prism", back: "V = lwh\n\nLength × Width × Height" },
  { id: "math-15", front: "Volume of a Cylinder", back: "V = πr²h\n\nBase area times height" },
  { id: "math-16", front: "Volume of a Cone", back: "V = ⅓πr²h\n\nOne-third of cylinder volume" },
  { id: "math-17", front: "Volume of a Sphere", back: "V = (4/3)πr³\n\nFour-thirds pi r cubed" },
  { id: "math-18", front: "Surface Area of a Sphere", back: "SA = 4πr²\n\nFour times pi r squared" },
  { id: "math-19", front: "Special Right Triangle: 45-45-90", back: "Sides are in ratio 1:1:√2\n\nLegs are equal, hypotenuse = leg × √2" },
  { id: "math-20", front: "Special Right Triangle: 30-60-90", back: "Sides are in ratio 1:√3:2\n\nShortest side opposite 30°, longest opposite 90°" },
  { id: "math-21", front: "Sum of Interior Angles of Polygon", back: "(n-2) × 180°\n\nWhere n is the number of sides" },
  { id: "math-22", front: "Each Interior Angle of Regular Polygon", back: "[(n-2) × 180°] / n\n\nTotal sum divided by number of sides" },
  { id: "math-23", front: "Arc Length", back: "s = rθ (radians) or s = (θ/360°) × 2πr\n\nPortion of circumference" },
  { id: "math-24", front: "Sector Area", back: "A = ½r²θ (radians) or A = (θ/360°) × πr²\n\nPortion of circle area" },
  { id: "math-25", front: "Simple Interest", back: "I = Prt\n\nPrincipal × rate × time" },
  { id: "math-26", front: "Compound Interest", back: "A = P(1 + r/n)^(nt)\n\nP = principal, r = rate, n = compounds per year, t = years" },
  { id: "math-27", front: "Exponential Growth/Decay", back: "y = a(1 ± r)^t or y = ae^(kt)\n\nPositive r for growth, negative for decay" },
  { id: "math-28", front: "Arithmetic Sequence Formula", back: "aₙ = a₁ + (n-1)d\n\nd = common difference" },
  { id: "math-29", front: "Geometric Sequence Formula", back: "aₙ = a₁ × r^(n-1)\n\nr = common ratio" },
  { id: "math-30", front: "Sum of Arithmetic Sequence", back: "Sₙ = n(a₁ + aₙ)/2 or Sₙ = n[2a₁ + (n-1)d]/2\n\nSum of first n terms" },
];

// ============ ALGEBRA CONCEPTS DECK ============
const algebraConceptsCards: Flashcard[] = [
  { id: "alg-1", front: "FOIL Method", back: "First, Outer, Inner, Last\n\n(a+b)(c+d) = ac + ad + bc + bd" },
  { id: "alg-2", front: "Difference of Squares", back: "a² - b² = (a+b)(a-b)\n\nFactoring pattern" },
  { id: "alg-3", front: "Perfect Square Trinomial", back: "a² + 2ab + b² = (a+b)²\na² - 2ab + b² = (a-b)²" },
  { id: "alg-4", front: "Zero Product Property", back: "If ab = 0, then a = 0 or b = 0\n\nUsed to solve factored equations" },
  { id: "alg-5", front: "Discriminant", back: "D = b² - 4ac\n\nD > 0: two real solutions\nD = 0: one real solution\nD < 0: no real solutions" },
  { id: "alg-6", front: "Absolute Value Definition", back: "|x| = x if x ≥ 0\n|x| = -x if x < 0\n\nDistance from zero" },
  { id: "alg-7", front: "Properties of Exponents: Product Rule", back: "a^m × a^n = a^(m+n)\n\nAdd exponents when multiplying same base" },
  { id: "alg-8", front: "Properties of Exponents: Quotient Rule", back: "a^m ÷ a^n = a^(m-n)\n\nSubtract exponents when dividing same base" },
  { id: "alg-9", front: "Properties of Exponents: Power Rule", back: "(a^m)^n = a^(mn)\n\nMultiply exponents when raising power to power" },
  { id: "alg-10", front: "Negative Exponent", back: "a^(-n) = 1/a^n\n\nFlip to make positive" },
  { id: "alg-11", front: "Zero Exponent", back: "a^0 = 1 (when a ≠ 0)\n\nAnything to the zero power is 1" },
  { id: "alg-12", front: "Fractional Exponent", back: "a^(m/n) = ⁿ√(a^m) = (ⁿ√a)^m\n\nDenominator is root, numerator is power" },
  { id: "alg-13", front: "Logarithm Definition", back: "log_b(x) = y means b^y = x\n\nLogarithm is the inverse of exponential" },
  { id: "alg-14", front: "Logarithm Product Rule", back: "log(ab) = log(a) + log(b)\n\nLog of product = sum of logs" },
  { id: "alg-15", front: "Logarithm Quotient Rule", back: "log(a/b) = log(a) - log(b)\n\nLog of quotient = difference of logs" },
  { id: "alg-16", front: "Logarithm Power Rule", back: "log(a^n) = n × log(a)\n\nExponent comes out front" },
  { id: "alg-17", front: "Change of Base Formula", back: "log_b(x) = log(x)/log(b) = ln(x)/ln(b)\n\nConvert to any base" },
  { id: "alg-18", front: "Function Notation", back: "f(x) means 'function of x'\n\nReplace x with input to find output" },
  { id: "alg-19", front: "Domain", back: "All possible input values (x-values)\n\nWhat can you plug in?" },
  { id: "alg-20", front: "Range", back: "All possible output values (y-values)\n\nWhat can you get out?" },
  { id: "alg-21", front: "Vertex Form of Parabola", back: "y = a(x-h)² + k\n\nVertex at (h, k)" },
  { id: "alg-22", front: "Standard Form of Parabola", back: "y = ax² + bx + c\n\nVertex x-coordinate: x = -b/(2a)" },
  { id: "alg-23", front: "Completing the Square", back: "x² + bx + (b/2)² = (x + b/2)²\n\nAdd (half of b)² to both sides" },
  { id: "alg-24", front: "Systems of Equations: Substitution", back: "1. Solve one equation for one variable\n2. Substitute into other equation\n3. Solve and back-substitute" },
  { id: "alg-25", front: "Systems of Equations: Elimination", back: "1. Multiply equations to get opposite coefficients\n2. Add equations to eliminate variable\n3. Solve and back-substitute" },
];

// ============ GEOMETRY CONCEPTS DECK ============
const geometryConceptsCards: Flashcard[] = [
  { id: "geo-1", front: "Complementary Angles", back: "Two angles that sum to 90°\n\nThey 'complete' a right angle" },
  { id: "geo-2", front: "Supplementary Angles", back: "Two angles that sum to 180°\n\nThey form a straight line" },
  { id: "geo-3", front: "Vertical Angles", back: "Opposite angles formed by two intersecting lines\n\nAlways equal" },
  { id: "geo-4", front: "Corresponding Angles", back: "Same position at each intersection when parallel lines cut by transversal\n\nEqual when lines parallel" },
  { id: "geo-5", front: "Alternate Interior Angles", back: "On opposite sides of transversal, between parallel lines\n\nEqual when lines parallel" },
  { id: "geo-6", front: "Alternate Exterior Angles", back: "On opposite sides of transversal, outside parallel lines\n\nEqual when lines parallel" },
  { id: "geo-7", front: "Same-Side Interior Angles", back: "On same side of transversal, between parallel lines\n\nSupplementary (sum to 180°)" },
  { id: "geo-8", front: "Triangle Angle Sum", back: "All angles in a triangle sum to 180°" },
  { id: "geo-9", front: "Exterior Angle Theorem", back: "Exterior angle = sum of two remote interior angles\n\nFor triangles" },
  { id: "geo-10", front: "Triangle Inequality Theorem", back: "Sum of any two sides > third side\n\nDetermines if triangle can exist" },
  { id: "geo-11", front: "Isosceles Triangle Property", back: "Two equal sides → two equal base angles\n\nAnd vice versa" },
  { id: "geo-12", front: "Equilateral Triangle Property", back: "All sides equal → all angles = 60°" },
  { id: "geo-13", front: "Similar Triangles", back: "Same shape, different size\n\nCorresponding angles equal, sides proportional" },
  { id: "geo-14", front: "Congruent Triangles", back: "Same shape AND size\n\nAll corresponding parts equal" },
  { id: "geo-15", front: "SSS Congruence", back: "Side-Side-Side\n\nIf all three sides match, triangles congruent" },
  { id: "geo-16", front: "SAS Congruence", back: "Side-Angle-Side\n\nTwo sides and included angle match" },
  { id: "geo-17", front: "ASA Congruence", back: "Angle-Side-Angle\n\nTwo angles and included side match" },
  { id: "geo-18", front: "AAS Congruence", back: "Angle-Angle-Side\n\nTwo angles and non-included side match" },
  { id: "geo-19", front: "AA Similarity", back: "Angle-Angle\n\nIf two angles match, triangles are similar" },
  { id: "geo-20", front: "Parallel Lines in Triangle", back: "Line parallel to base creates similar triangle\n\nSides proportional" },
  { id: "geo-21", front: "Median of Triangle", back: "Segment from vertex to midpoint of opposite side\n\nAll three meet at centroid" },
  { id: "geo-22", front: "Altitude of Triangle", back: "Perpendicular from vertex to opposite side\n\nHeight for area calculation" },
  { id: "geo-23", front: "Centroid", back: "Point where medians meet\n\nCenter of mass, divides medians 2:1" },
  { id: "geo-24", front: "Inscribed Angle Theorem", back: "Inscribed angle = ½ central angle\n\nWhen both subtend same arc" },
  { id: "geo-25", front: "Tangent to Circle", back: "Perpendicular to radius at point of tangency\n\nTouches circle at exactly one point" },
];

// ============ SAT VOCABULARY DECK 1: CRITICAL WORDS ============
const vocabCriticalCards: Flashcard[] = [
  { id: "vocab-1", front: "Aberrant", back: "(adj.) Departing from the norm; unusual\n\nSynonyms: abnormal, atypical, deviant" },
  { id: "vocab-2", front: "Abstruse", back: "(adj.) Difficult to understand; obscure\n\nSynonyms: arcane, esoteric, recondite" },
  { id: "vocab-3", front: "Acumen", back: "(n.) Keen insight; shrewdness\n\nSynonyms: astuteness, discernment, sagacity" },
  { id: "vocab-4", front: "Admonish", back: "(v.) To warn or reprimand firmly\n\nSynonyms: caution, rebuke, reprove" },
  { id: "vocab-5", front: "Aesthetic", back: "(adj.) Relating to beauty or good taste\n\nSynonyms: artistic, tasteful, elegant" },
  { id: "vocab-6", front: "Alacrity", back: "(n.) Eager willingness; cheerful readiness\n\nSynonyms: enthusiasm, eagerness, zeal" },
  { id: "vocab-7", front: "Ambiguous", back: "(adj.) Having multiple meanings; unclear\n\nSynonyms: equivocal, vague, ambivalent" },
  { id: "vocab-8", front: "Ameliorate", back: "(v.) To make better; improve\n\nSynonyms: enhance, alleviate, mitigate" },
  { id: "vocab-9", front: "Anachronism", back: "(n.) Something out of its proper time\n\nExample: A cell phone in a medieval movie" },
  { id: "vocab-10", front: "Anomaly", back: "(n.) Something that deviates from the norm\n\nSynonyms: irregularity, aberration, exception" },
  { id: "vocab-11", front: "Antipathy", back: "(n.) Strong dislike or hostility\n\nSynonyms: aversion, animosity, antagonism" },
  { id: "vocab-12", front: "Apathy", back: "(n.) Lack of interest or concern\n\nSynonyms: indifference, unconcern, lethargy" },
  { id: "vocab-13", front: "Arduous", back: "(adj.) Requiring great effort; difficult\n\nSynonyms: strenuous, laborious, grueling" },
  { id: "vocab-14", front: "Articulate", back: "(adj./v.) Speaking clearly and effectively\n\nSynonyms: eloquent, fluent, expressive" },
  { id: "vocab-15", front: "Astute", back: "(adj.) Shrewdly perceptive\n\nSynonyms: keen, sharp, discerning" },
  { id: "vocab-16", front: "Audacious", back: "(adj.) Bold, daring, fearless\n\nSynonyms: intrepid, brazen, courageous" },
  { id: "vocab-17", front: "Austere", back: "(adj.) Severely simple; strict\n\nSynonyms: stern, spartan, ascetic" },
  { id: "vocab-18", front: "Benevolent", back: "(adj.) Kind, generous, charitable\n\nSynonyms: compassionate, altruistic, philanthropic" },
  { id: "vocab-19", front: "Brevity", back: "(n.) Conciseness; shortness of time\n\nSynonyms: terseness, succinctness, briefness" },
  { id: "vocab-20", front: "Cacophony", back: "(n.) Harsh, discordant sounds\n\nOpposite: euphony (pleasant sounds)" },
  { id: "vocab-21", front: "Candor", back: "(n.) Honest, sincere expression\n\nSynonyms: frankness, openness, forthrightness" },
  { id: "vocab-22", front: "Capricious", back: "(adj.) Unpredictable, fickle\n\nSynonyms: erratic, mercurial, whimsical" },
  { id: "vocab-23", front: "Caustic", back: "(adj.) Biting, corrosive (literally or figuratively)\n\nSynonyms: scathing, acerbic, mordant" },
  { id: "vocab-24", front: "Circumspect", back: "(adj.) Cautious, prudent\n\nSynonyms: wary, vigilant, discreet" },
  { id: "vocab-25", front: "Coalesce", back: "(v.) To come together; merge\n\nSynonyms: unite, fuse, consolidate" },
];

// ============ SAT VOCABULARY DECK 2: ADVANCED WORDS ============
const vocabAdvancedCards: Flashcard[] = [
  { id: "vocab-26", front: "Cogent", back: "(adj.) Convincing, compelling\n\nSynonyms: persuasive, forceful, valid" },
  { id: "vocab-27", front: "Commensurate", back: "(adj.) Proportional, corresponding in size\n\nExample: Salary commensurate with experience" },
  { id: "vocab-28", front: "Conundrum", back: "(n.) A puzzling problem or question\n\nSynonyms: enigma, dilemma, riddle" },
  { id: "vocab-29", front: "Corroborate", back: "(v.) To confirm or support with evidence\n\nSynonyms: verify, substantiate, validate" },
  { id: "vocab-30", front: "Cursory", back: "(adj.) Hasty, superficial\n\nSynonyms: perfunctory, quick, casual" },
  { id: "vocab-31", front: "Deference", back: "(n.) Respectful submission\n\nSynonyms: respect, regard, courtesy" },
  { id: "vocab-32", front: "Delineate", back: "(v.) To describe precisely; outline\n\nSynonyms: depict, portray, define" },
  { id: "vocab-33", front: "Denigrate", back: "(v.) To criticize unfairly; disparage\n\nSynonyms: belittle, defame, malign" },
  { id: "vocab-34", front: "Derivative", back: "(adj.) Unoriginal, borrowed from another source\n\nOpposite: innovative, original" },
  { id: "vocab-35", front: "Desiccate", back: "(v.) To dry out completely\n\nSynonyms: dehydrate, parch" },
  { id: "vocab-36", front: "Didactic", back: "(adj.) Intended to teach; instructive\n\nSynonyms: educational, pedagogical, moralistic" },
  { id: "vocab-37", front: "Diffident", back: "(adj.) Lacking self-confidence; shy\n\nSynonyms: timid, modest, unassuming" },
  { id: "vocab-38", front: "Digress", back: "(v.) To stray from the main topic\n\nSynonyms: deviate, diverge, wander" },
  { id: "vocab-39", front: "Dissonance", back: "(n.) Lack of harmony; disagreement\n\nOpposite: consonance, harmony" },
  { id: "vocab-40", front: "Dogmatic", back: "(adj.) Asserting opinions as facts; inflexible\n\nSynonyms: doctrinaire, rigid, authoritarian" },
  { id: "vocab-41", front: "Ebullient", back: "(adj.) Enthusiastic, overflowing with excitement\n\nSynonyms: exuberant, effervescent, vivacious" },
  { id: "vocab-42", front: "Eclectic", back: "(adj.) Drawing from various sources\n\nSynonyms: diverse, varied, heterogeneous" },
  { id: "vocab-43", front: "Efficacy", back: "(n.) Effectiveness; ability to produce results\n\nSynonyms: potency, effectiveness, efficiency" },
  { id: "vocab-44", front: "Egregious", back: "(adj.) Outstandingly bad; shocking\n\nSynonyms: flagrant, blatant, atrocious" },
  { id: "vocab-45", front: "Elicit", back: "(v.) To draw out or evoke\n\nDon't confuse with 'illicit' (illegal)" },
  { id: "vocab-46", front: "Elucidate", back: "(v.) To make clear; explain\n\nSynonyms: clarify, illuminate, explicate" },
  { id: "vocab-47", front: "Empirical", back: "(adj.) Based on observation or experience\n\nSynonyms: experimental, practical, observed" },
  { id: "vocab-48", front: "Enigmatic", back: "(adj.) Mysterious, puzzling\n\nSynonyms: cryptic, inscrutable, arcane" },
  { id: "vocab-49", front: "Ephemeral", back: "(adj.) Lasting only a short time\n\nSynonyms: transient, fleeting, evanescent" },
  { id: "vocab-50", front: "Equivocal", back: "(adj.) Ambiguous, intentionally vague\n\nSynonyms: evasive, noncommittal, unclear" },
];

// ============ SAT VOCABULARY DECK 3: POWER WORDS ============
const vocabPowerCards: Flashcard[] = [
  { id: "vocab-51", front: "Esoteric", back: "(adj.) Understood by only a few; obscure\n\nSynonyms: arcane, abstruse, recondite" },
  { id: "vocab-52", front: "Exacerbate", back: "(v.) To make worse\n\nSynonyms: aggravate, intensify, worsen" },
  { id: "vocab-53", front: "Exculpate", back: "(v.) To clear from blame\n\nSynonyms: exonerate, vindicate, absolve" },
  { id: "vocab-54", front: "Exemplary", back: "(adj.) Serving as a model; commendable\n\nSynonyms: ideal, praiseworthy, admirable" },
  { id: "vocab-55", front: "Expedite", back: "(v.) To speed up; facilitate\n\nSynonyms: accelerate, hasten, quicken" },
  { id: "vocab-56", front: "Extenuating", back: "(adj.) Lessening seriousness by providing excuse\n\nExample: Extenuating circumstances" },
  { id: "vocab-57", front: "Extraneous", back: "(adj.) Irrelevant; not essential\n\nSynonyms: superfluous, unnecessary, unrelated" },
  { id: "vocab-58", front: "Facilitate", back: "(v.) To make easier\n\nSynonyms: assist, enable, expedite" },
  { id: "vocab-59", front: "Fallacious", back: "(adj.) Based on false reasoning\n\nSynonyms: erroneous, misleading, deceptive" },
  { id: "vocab-60", front: "Fastidious", back: "(adj.) Very attentive to detail; hard to please\n\nSynonyms: meticulous, fussy, particular" },
  { id: "vocab-61", front: "Fervent", back: "(adj.) Intensely passionate\n\nSynonyms: ardent, zealous, enthusiastic" },
  { id: "vocab-62", front: "Fortuitous", back: "(adj.) Happening by chance; lucky\n\nSynonyms: accidental, serendipitous, providential" },
  { id: "vocab-63", front: "Frugal", back: "(adj.) Economical; thrifty\n\nSynonyms: sparing, prudent, parsimonious" },
  { id: "vocab-64", front: "Gregarious", back: "(adj.) Sociable; enjoying company\n\nSynonyms: outgoing, convivial, affable" },
  { id: "vocab-65", front: "Hackneyed", back: "(adj.) Overused; lacking originality\n\nSynonyms: clichéd, trite, banal" },
  { id: "vocab-66", front: "Hubris", back: "(n.) Excessive pride or arrogance\n\nOften leads to downfall in literature" },
  { id: "vocab-67", front: "Iconoclast", back: "(n.) One who attacks cherished beliefs\n\nSynonyms: rebel, nonconformist, dissenter" },
  { id: "vocab-68", front: "Impetuous", back: "(adj.) Acting without thinking; rash\n\nSynonyms: impulsive, hasty, spontaneous" },
  { id: "vocab-69", front: "Implicit", back: "(adj.) Implied but not directly stated\n\nOpposite: explicit (directly stated)" },
  { id: "vocab-70", front: "Incessant", back: "(adj.) Never stopping; continuous\n\nSynonyms: constant, perpetual, unrelenting" },
  { id: "vocab-71", front: "Incongruous", back: "(adj.) Out of place; inconsistent\n\nSynonyms: incompatible, inappropriate, discordant" },
  { id: "vocab-72", front: "Indifferent", back: "(adj.) Having no interest or concern\n\nSynonyms: apathetic, unconcerned, dispassionate" },
  { id: "vocab-73", front: "Indigenous", back: "(adj.) Native to a region\n\nSynonyms: native, aboriginal, endemic" },
  { id: "vocab-74", front: "Infer", back: "(v.) To conclude from evidence\n\nDon't confuse with 'imply' (to suggest)" },
  { id: "vocab-75", front: "Innate", back: "(adj.) Inborn; natural\n\nSynonyms: inherent, intrinsic, instinctive" },
];

// ============ GRAMMAR RULES DECK 1: PUNCTUATION ============
const grammarPunctuationCards: Flashcard[] = [
  { id: "gram-1", front: "When to use a semicolon", back: "1. Connect two independent clauses without a conjunction\n2. Separate items in a list when items contain commas\n\nExample: I love Paris; it's a beautiful city." },
  { id: "gram-2", front: "When to use a colon", back: "1. Introduce a list, quote, or explanation\n2. After an independent clause\n\nExample: She had one goal: to win." },
  { id: "gram-3", front: "Comma with coordinating conjunctions", back: "Use comma BEFORE FANBOYS (for, and, nor, but, or, yet, so) when joining independent clauses\n\nExample: I ran, but I missed the bus." },
  { id: "gram-4", front: "Comma after introductory elements", back: "Use comma after introductory words, phrases, or clauses\n\nExample: However, I disagree.\nAfter the meeting, we left." },
  { id: "gram-5", front: "Oxford Comma", back: "Comma before 'and' in a list of 3+ items\n\nWith: apples, oranges, and bananas\nWithout: apples, oranges and bananas" },
  { id: "gram-6", front: "Comma with nonessential clauses", back: "Use commas around information that can be removed\n\nExample: My brother, who lives in NYC, visited me.\n(You could remove 'who lives in NYC')" },
  { id: "gram-7", front: "No comma with essential clauses", back: "Don't use commas around information needed to identify\n\nExample: Students who study hard succeed.\n(Can't remove 'who study hard')" },
  { id: "gram-8", front: "Apostrophe for possession", back: "Singular: Add 's (the dog's bone)\nPlural ending in s: Add ' (the dogs' bones)\nPlural not ending in s: Add 's (the children's toys)" },
  { id: "gram-9", front: "It's vs Its", back: "It's = it is or it has (contraction)\nIts = possessive (no apostrophe!)\n\nExample: It's lost its way." },
  { id: "gram-10", front: "Dash vs Hyphen", back: "Hyphen (-): Joins words (well-known)\nEm dash (—): Emphasizes or sets off info\nEn dash (–): Ranges (1990–2000)" },
  { id: "gram-11", front: "Quotation marks with other punctuation", back: "Periods and commas: INSIDE quotes\nColons and semicolons: OUTSIDE quotes\nQuestion/exclamation: Depends on meaning" },
  { id: "gram-12", front: "Comma splice error", back: "Incorrectly joining two independent clauses with just a comma\n\nWrong: I ran, I won.\nRight: I ran, and I won. / I ran; I won." },
  { id: "gram-13", front: "Run-on sentence", back: "Two independent clauses with no punctuation\n\nWrong: I ran I won.\nRight: I ran. I won. / I ran, and I won." },
  { id: "gram-14", front: "Sentence fragment", back: "Incomplete sentence missing subject, verb, or complete thought\n\nFragment: Running to the store.\nComplete: I was running to the store." },
  { id: "gram-15", front: "Parentheses usage", back: "Enclose supplementary information\n\nPunctuation goes OUTSIDE unless entire sentence is in parentheses\n\nExample: He finally arrived (two hours late)." },
];

// ============ GRAMMAR RULES DECK 2: AGREEMENT ============
const grammarAgreementCards: Flashcard[] = [
  { id: "gram-16", front: "Subject-Verb Agreement: Basic Rule", back: "Singular subjects take singular verbs\nPlural subjects take plural verbs\n\nThe dog runs. The dogs run." },
  { id: "gram-17", front: "Subject-Verb with intervening phrases", back: "Ignore phrases between subject and verb\n\nThe box of chocolates IS (not are) on the table.\n(Subject is 'box' not 'chocolates')" },
  { id: "gram-18", front: "Compound subjects with 'and'", back: "Usually take plural verb\n\nThe cat and dog ARE friends.\n\nException: When considered one unit (peanut butter and jelly IS)" },
  { id: "gram-19", front: "Compound subjects with 'or/nor'", back: "Verb agrees with CLOSER subject\n\nEither the dogs or the cat IS here.\nEither the cat or the dogs ARE here." },
  { id: "gram-20", front: "Indefinite pronouns: Always singular", back: "Each, every, either, neither, one, everyone, everybody, anyone, anybody, someone, somebody, no one, nobody\n\nEveryone IS here." },
  { id: "gram-21", front: "Indefinite pronouns: Always plural", back: "Both, few, many, several\n\nMany WERE called." },
  { id: "gram-22", front: "Indefinite pronouns: Singular or plural", back: "All, any, most, none, some\n\nDepends on what they refer to:\nMost of the cake IS gone. (singular)\nMost of the cookies ARE gone. (plural)" },
  { id: "gram-23", front: "Collective nouns", back: "Usually singular when acting as a unit\n\nThe team IS winning.\n\nPlural when members act individually:\nThe team ARE arguing among themselves." },
  { id: "gram-24", front: "Pronoun-antecedent agreement", back: "Pronouns must match their antecedent in number and gender\n\nEach student must bring HIS OR HER book.\n(Not 'their' in formal writing)" },
  { id: "gram-25", front: "Ambiguous pronoun reference", back: "Pronouns must clearly refer to one antecedent\n\nUnclear: John told Mike that he won.\nClear: John told Mike, 'You won.'" },
  { id: "gram-26", front: "Relative pronouns: Who vs Whom", back: "Who = subject (he/she)\nWhom = object (him/her)\n\nTrick: Rephrase the clause.\nWho called? (He called) ✓\nWhom did you call? (You called him) ✓" },
  { id: "gram-27", front: "That vs Which", back: "That: Essential clauses (no comma)\nWhich: Nonessential clauses (with commas)\n\nThe book that I read...\nThe book, which was red,..." },
  { id: "gram-28", front: "Who vs That", back: "Who: Refers to people\nThat: Refers to things (or people in some cases)\n\nThe woman who called...\nThe book that I read..." },
  { id: "gram-29", front: "Inverted sentences", back: "Subject comes after verb\n\nThere ARE many reasons.\nHere IS the answer.\n(Find the true subject)" },
  { id: "gram-30", front: "Titles and names: Agreement", back: "Titles of works and company names are singular\n\nThe New York Times IS a newspaper.\nApple IS a tech company." },
];

// ============ GRAMMAR RULES DECK 3: MODIFIERS & PARALLELISM ============
const grammarModifiersCards: Flashcard[] = [
  { id: "gram-31", front: "Dangling modifier", back: "Modifier doesn't logically modify anything in sentence\n\nWrong: Walking to school, the rain started.\nRight: Walking to school, I got caught in the rain." },
  { id: "gram-32", front: "Misplaced modifier", back: "Modifier is too far from what it modifies\n\nWrong: She served cake to the guests on paper plates.\nRight: She served cake on paper plates to the guests." },
  { id: "gram-33", front: "Squinting modifier", back: "Modifier could apply to either word\n\nUnclear: Reading quickly improves comprehension.\nClear: Quick reading improves comprehension. OR Reading improves comprehension quickly." },
  { id: "gram-34", front: "Parallelism: Basic rule", back: "Items in a list or comparison must have same grammatical form\n\nWrong: I like running, to swim, and biking.\nRight: I like running, swimming, and biking." },
  { id: "gram-35", front: "Parallelism with correlative conjunctions", back: "Both...and, either...or, neither...nor, not only...but also\n\nMust have parallel structure after each part\n\nWrong: Both studying hard and to sleep well help.\nRight: Both studying hard and sleeping well help." },
  { id: "gram-36", front: "Parallelism in comparisons", back: "Compare like things with like things\n\nWrong: Her essay is better than her sister.\nRight: Her essay is better than her sister's." },
  { id: "gram-37", front: "Split infinitive", back: "Adverb between 'to' and verb\n\nSplit: To boldly go\nNot split: To go boldly\n\n(Often acceptable in modern usage)" },
  { id: "gram-38", front: "Only - placement", back: "'Only' should be placed directly before the word it modifies\n\nI only ate pizza. (nothing else with pizza)\nI ate only pizza. (nothing but pizza)\nOnly I ate pizza. (no one else did)" },
  { id: "gram-39", front: "Adjective vs Adverb", back: "Adjectives modify nouns\nAdverbs modify verbs, adjectives, other adverbs\n\nShe is quick. (adj)\nShe runs quickly. (adv)" },
  { id: "gram-40", front: "Comparative vs Superlative", back: "Comparative: Comparing 2 things (-er, more)\nSuperlative: Comparing 3+ things (-est, most)\n\nTaller (2) vs Tallest (3+)\nMore beautiful vs Most beautiful" },
  { id: "gram-41", front: "Double negatives", back: "Avoid using two negatives\n\nWrong: I don't have no money.\nRight: I don't have any money. / I have no money." },
  { id: "gram-42", front: "Less vs Fewer", back: "Fewer: Countable items (fewer books)\nLess: Uncountable amounts (less water)\n\nException: Less than (numbers), less time" },
  { id: "gram-43", front: "Between vs Among", back: "Between: Two items\nAmong: Three or more items\n\nBetween you and me\nAmong the group members" },
  { id: "gram-44", front: "Good vs Well", back: "Good: Adjective (describes nouns)\nWell: Adverb (describes verbs)\n\nI feel good. (emotion)\nI play well. (skill)\nI don't feel well. (health - exception)" },
  { id: "gram-45", front: "Bad vs Badly", back: "Bad: Adjective\nBadly: Adverb\n\nI feel bad. (emotion - correct)\nI feel badly. (implies touch is impaired)" },
];

// ============ GRAMMAR RULES DECK 4: VERBS & TENSES ============
const grammarVerbsCards: Flashcard[] = [
  { id: "gram-46", front: "Simple present tense", back: "Habitual actions or general truths\n\nI walk to school every day.\nWater boils at 100°C." },
  { id: "gram-47", front: "Present progressive tense", back: "Action happening right now\n\nI am walking to school.\n(am/is/are + -ing)" },
  { id: "gram-48", front: "Simple past tense", back: "Completed action in the past\n\nI walked to school yesterday.\n(Regular: add -ed)" },
  { id: "gram-49", front: "Past progressive tense", back: "Ongoing action in the past\n\nI was walking when it rained.\n(was/were + -ing)" },
  { id: "gram-50", front: "Present perfect tense", back: "Action started in past, continues to present\n\nI have walked here many times.\n(have/has + past participle)" },
  { id: "gram-51", front: "Past perfect tense", back: "Action completed before another past action\n\nI had walked home before it rained.\n(had + past participle)" },
  { id: "gram-52", front: "Future tense", back: "Action that will happen\n\nI will walk tomorrow.\nI am going to walk tomorrow." },
  { id: "gram-53", front: "Subjunctive mood", back: "Wishes, demands, suggestions, hypotheticals\n\nI wish I WERE taller. (not 'was')\nHe demands that she BE there. (not 'is')" },
  { id: "gram-54", front: "Conditional sentences (Type 1)", back: "Real possibility in future\n\nIf it rains, I will stay home.\n(If + present, will + base verb)" },
  { id: "gram-55", front: "Conditional sentences (Type 2)", back: "Hypothetical present/future\n\nIf I won the lottery, I would travel.\n(If + past, would + base verb)" },
  { id: "gram-56", front: "Conditional sentences (Type 3)", back: "Hypothetical past (impossible)\n\nIf I had studied, I would have passed.\n(If + past perfect, would have + past participle)" },
  { id: "gram-57", front: "Active vs Passive voice", back: "Active: Subject does action (I wrote the essay)\nPassive: Subject receives action (The essay was written by me)\n\nPrefer active in most cases" },
  { id: "gram-58", front: "When to use passive voice", back: "1. Actor unknown: The window was broken.\n2. Actor unimportant: The law was passed.\n3. Emphasize action: Mistakes were made." },
  { id: "gram-59", front: "Verb tense consistency", back: "Keep same tense within a passage\n\nWrong: He runs to the store and bought milk.\nRight: He ran to the store and bought milk." },
  { id: "gram-60", front: "Irregular past participles", back: "Common ones to memorize:\nbegin/began/begun, drink/drank/drunk,\nswim/swam/swum, ring/rang/rung,\nwrite/wrote/written, speak/spoke/spoken" },
];

// ============ COMPILE ALL DECKS ============
export const premadeDecks: FlashcardDeck[] = [
  {
    id: "deck-math-formulas",
    title: "SAT Math Formulas",
    description: "30 essential formulas for algebra, geometry, and more",
    category: "math",
    cards: mathFormulasCards,
    source: "premade",
    createdAt: new Date("2024-01-01"),
  },
  {
    id: "deck-algebra-concepts",
    title: "Algebra Concepts",
    description: "25 key algebra concepts including exponents, logs, and functions",
    category: "math",
    cards: algebraConceptsCards,
    source: "premade",
    createdAt: new Date("2024-01-01"),
  },
  {
    id: "deck-geometry-concepts",
    title: "Geometry Concepts",
    description: "25 geometry theorems, properties, and concepts",
    category: "math",
    cards: geometryConceptsCards,
    source: "premade",
    createdAt: new Date("2024-01-01"),
  },
  {
    id: "deck-vocab-critical",
    title: "SAT Vocabulary: Critical Words",
    description: "25 essential SAT vocabulary words A-C",
    category: "vocabulary",
    cards: vocabCriticalCards,
    source: "premade",
    createdAt: new Date("2024-01-01"),
  },
  {
    id: "deck-vocab-advanced",
    title: "SAT Vocabulary: Advanced Words",
    description: "25 advanced SAT vocabulary words C-E",
    category: "vocabulary",
    cards: vocabAdvancedCards,
    source: "premade",
    createdAt: new Date("2024-01-01"),
  },
  {
    id: "deck-vocab-power",
    title: "SAT Vocabulary: Power Words",
    description: "25 high-impact SAT vocabulary words E-I",
    category: "vocabulary",
    cards: vocabPowerCards,
    source: "premade",
    createdAt: new Date("2024-01-01"),
  },
  {
    id: "deck-grammar-punctuation",
    title: "Grammar: Punctuation Rules",
    description: "15 essential punctuation rules for the SAT",
    category: "grammar",
    cards: grammarPunctuationCards,
    source: "premade",
    createdAt: new Date("2024-01-01"),
  },
  {
    id: "deck-grammar-agreement",
    title: "Grammar: Agreement Rules",
    description: "15 subject-verb and pronoun agreement rules",
    category: "grammar",
    cards: grammarAgreementCards,
    source: "premade",
    createdAt: new Date("2024-01-01"),
  },
  {
    id: "deck-grammar-modifiers",
    title: "Grammar: Modifiers & Parallelism",
    description: "15 rules for modifiers, parallelism, and word usage",
    category: "grammar",
    cards: grammarModifiersCards,
    source: "premade",
    createdAt: new Date("2024-01-01"),
  },
  {
    id: "deck-grammar-verbs",
    title: "Grammar: Verbs & Tenses",
    description: "15 verb tense and mood rules",
    category: "grammar",
    cards: grammarVerbsCards,
    source: "premade",
    createdAt: new Date("2024-01-01"),
  },
];

// Helper to get total card count
export const getTotalPremadeCards = (): number => {
  return premadeDecks.reduce((total, deck) => total + deck.cards.length, 0);
};

// Get decks by category
export const getDecksByCategory = (category: FlashcardDeck["category"]): FlashcardDeck[] => {
  return premadeDecks.filter(deck => deck.category === category);
};
