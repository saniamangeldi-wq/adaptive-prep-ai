
-- Math topics table (mirrors verbal_topics)
CREATE TABLE public.math_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  category text NOT NULL,
  description text,
  target_skill text,
  order_index integer NOT NULL DEFAULT 0,
  estimated_minutes integer DEFAULT 15,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_math_topics_order ON public.math_topics(order_index);
ALTER TABLE public.math_topics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view published math topics" ON public.math_topics
  FOR SELECT TO authenticated USING (is_published = true);

-- Math lessons table (mirrors verbal_lessons)
CREATE TABLE public.math_lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id uuid NOT NULL REFERENCES public.math_topics(id) ON DELETE CASCADE,
  learning_style text NOT NULL CHECK (learning_style IN ('visual','auditory','kinesthetic','reading_writing')),
  title text NOT NULL,
  hook text,
  sections jsonb NOT NULL DEFAULT '[]'::jsonb,
  checkpoint_questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  summary text,
  estimated_minutes integer DEFAULT 15,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (topic_id, learning_style)
);
CREATE INDEX idx_math_lessons_topic ON public.math_lessons(topic_id);
ALTER TABLE public.math_lessons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view published math lessons" ON public.math_lessons
  FOR SELECT TO authenticated USING (is_published = true);

-- Progress tracking
CREATE TABLE public.math_topic_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  topic_id uuid NOT NULL REFERENCES public.math_topics(id) ON DELETE CASCADE,
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, topic_id)
);
ALTER TABLE public.math_topic_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own math progress" ON public.math_topic_progress
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own math progress" ON public.math_topic_progress
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own math progress" ON public.math_topic_progress
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Seed 22 SAT Math topics
INSERT INTO public.math_topics (slug, title, category, description, target_skill, order_index, estimated_minutes) VALUES
('linear-equations-one-variable','Linear Equations in One Variable','Algebra','Solve linear equations with rational coefficients, parentheses, and fractions.','Solve ax+b=c quickly and accurately',1,15),
('linear-functions','Linear Functions','Algebra','Slope, intercepts, equations of lines, and interpreting linear models.','Build and interpret y=mx+b',2,15),
('linear-equations-two-variables','Linear Equations in Two Variables','Algebra','Equations of lines, point-slope, and parallel/perpendicular relationships.','Translate between forms',3,15),
('systems-linear-equations','Systems of Linear Equations','Algebra','Substitution, elimination, and special cases (no/infinite solutions).','Solve 2x2 systems fast',4,15),
('linear-inequalities','Linear Inequalities','Algebra','One- and two-variable inequalities and their graphs.','Translate constraints to inequalities',5,15),
('equivalent-expressions','Equivalent Expressions','Advanced Math','Factor, expand, and simplify polynomial and rational expressions.','Recognize equivalent forms',6,15),
('quadratic-equations','Quadratic Equations','Advanced Math','Factoring, quadratic formula, completing the square, and the discriminant.','Solve any quadratic',7,15),
('quadratic-functions','Quadratic Functions & Parabolas','Advanced Math','Vertex, axis of symmetry, intercepts, and transformations.','Read parabolas instantly',8,15),
('exponential-functions','Exponential Functions & Growth','Advanced Math','Exponential growth/decay, compound interest, and rewriting exponents.','Model growth and decay',9,15),
('polynomial-equations','Polynomial & Higher-Order Equations','Advanced Math','Factor polynomials, find zeros, and analyze end behavior.','Factor and find roots',10,15),
('rational-radical-equations','Rational & Radical Equations','Advanced Math','Solve equations with fractions, square roots, and check extraneous solutions.','Avoid extraneous traps',11,15),
('nonlinear-systems','Nonlinear Systems','Advanced Math','Solve systems with one linear and one quadratic/exponential equation.','Substitute and solve',12,15),
('ratios-rates-proportions','Ratios, Rates & Proportions','Problem-Solving & Data Analysis','Set up proportions, work with rates, and convert units.','Cross-multiply with confidence',13,15),
('percentages','Percentages & Percent Change','Problem-Solving & Data Analysis','Percent of, percent change, markups, discounts, and reverse percentages.','Solve any percent question',14,15),
('units-conversion','Units & Unit Conversion','Problem-Solving & Data Analysis','Convert between units using dimensional analysis.','Cancel units cleanly',15,15),
('data-interpretation','Data Interpretation: Tables, Graphs & Charts','Problem-Solving & Data Analysis','Read tables, bar graphs, scatterplots, and two-way tables accurately.','Extract data without errors',16,15),
('statistics-center-spread','Statistics: Mean, Median, Mode & Spread','Problem-Solving & Data Analysis','Compute and compare measures of center and how outliers shift them.','Predict outlier effects',17,15),
('probability-and-relative-frequency','Probability & Relative Frequency','Problem-Solving & Data Analysis','Simple, conditional, and compound probability from tables and contexts.','Set up P(A) correctly',18,15),
('inferences-from-samples','Sampling, Margin of Error & Inference','Problem-Solving & Data Analysis','Random sampling, generalizing results, and interpreting margin of error.','Reason about samples',19,15),
('lines-angles-triangles','Lines, Angles & Triangles','Geometry & Trigonometry','Angle relationships, triangle properties, and similarity/congruence.','Spot key angle rules',20,15),
('right-triangles-trig','Right Triangles & Trigonometry','Geometry & Trigonometry','Pythagorean theorem, special right triangles, sine/cosine/tangent.','Use SOH-CAH-TOA fluently',21,15),
('circles','Circles: Area, Arc & Equation','Geometry & Trigonometry','Area, circumference, arc length, sector area, and equation of a circle.','Apply circle formulas',22,15);
