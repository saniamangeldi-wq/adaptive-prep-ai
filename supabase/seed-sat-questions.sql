-- Seed file: Sample pregenerated SAT questions
-- Purpose: Populate sat_questions table with initial practice items
-- Run this in Supabase SQL Editor after the migration

-- Question 1: Math - Algebra (Difficulty 2)
INSERT INTO sat_questions (
  schema_version, section, format, domain, skill, difficulty, difficulty_method, difficulty_confidence,
  context, stem, choices_json, correct_answer, explanation,
  source, generator_model, generator_provider, generated_at, prompt_version,
  validation_status, validation_json, copyright_status, active
) VALUES (
  '1.0', 'Math', 'multiple_choice', 'Algebra', 'Linear equations', 2, 'editorial', 0.9,
  'If 3x - 7 = 14, what is the value of x?',
  'If 3x - 7 = 14, what is the value of x?',
  '[{"id": "A", "text": "5"}, {"id": "B", "text": "6"}, {"id": "C", "text": "7"}, {"id": "D", "text": "8"}]',
  'C',
  'Add 7 to both sides: 3x = 21. Divide by 3: x = 7. Choice C is correct.',
  'pregenerated', NULL, NULL, NULL, NULL,
  'passed', '{"passed": true, "checked_at": "2026-08-06T19:40:00Z"}', 'original', true
);

-- Question 2: Math - Advanced Math (Difficulty 3)
INSERT INTO sat_questions (
  schema_version, section, format, domain, skill, difficulty, difficulty_method, difficulty_confidence,
  context, stem, choices_json, correct_answer, explanation,
  source, generator_model, generator_provider, generated_at, prompt_version,
  validation_status, validation_json, copyright_status, active
) VALUES (
  '1.0', 'Math', 'multiple_choice', 'Advanced Math', 'Quadratic equations', 3, 'editorial', 0.85,
  NULL,
  'What are the solutions to the equation x^2 - 5x + 6 = 0?',
  '[{"id": "A", "text": "x = 1 and x = 6"}, {"id": "B", "text": "x = 2 and x = 3"}, {"id": "C", "text": "x = -2 and x = -3"}, {"id": "D", "text": "x = 1 and x = -6"}]',
  'B',
  'Factor the quadratic: (x - 2)(x - 3) = 0. Solutions are x = 2 and x = 3. Choice B is correct.',
  'pregenerated', NULL, NULL, NULL, NULL,
  'passed', '{"passed": true, "checked_at": "2026-08-06T19:40:00Z"}', 'original', true
);

-- Question 3: Math - Problem-Solving and Data Analysis (Difficulty 2)
INSERT INTO sat_questions (
  schema_version, section, format, domain, skill, difficulty, difficulty_method, difficulty_confidence,
  context, stem, choices_json, correct_answer, explanation,
  source, generator_model, generator_provider, generated_at, prompt_version,
  validation_status, validation_json, copyright_status, active
) VALUES (
  '1.0', 'Math', 'multiple_choice', 'Problem-Solving and Data Analysis', 'Percentages', 2, 'editorial', 0.88,
  'A shirt originally costs $40. It is on sale for 25% off.',
  'A shirt originally costs $40. It is on sale for 25% off. What is the sale price?',
  '[{"id": "A", "text": "$10"}, {"id": "B", "text": "$25"}, {"id": "C", "text": "$30"}, {"id": "D", "text": "$35"}]',
  'C',
  '25% of $40 is $10. Subtract the discount: $40 - $10 = $30. Choice C is correct.',
  'pregenerated', NULL, NULL, NULL, NULL,
  'passed', '{"passed": true, "checked_at": "2026-08-06T19:40:00Z"}', 'original', true
);

-- Question 4: Reading-Writing - Craft and Structure (Difficulty 3)
INSERT INTO sat_questions (
  schema_version, section, format, domain, skill, difficulty, difficulty_method, difficulty_confidence,
  context, stem, choices_json, correct_answer, explanation,
  source, generator_model, generator_provider, generated_at, prompt_version,
  validation_status, validation_json, copyright_status, active
) VALUES (
  '1.0', 'Reading-Writing', 'multiple_choice', 'Craft and Structure', 'Text structure and purpose', 3, 'editorial', 0.82,
  'The author begins the passage by describing a childhood memory of watching a meteor shower. This technique primarily serves to:',
  'The author begins the passage by describing a childhood memory of watching a meteor shower. This technique primarily serves to:',
  '[{"id": "A", "text": "Establish a personal connection to the topic"}, {"id": "B", "text": "Provide scientific evidence about meteors"}, {"id": "C", "text": "Introduce the main argument of the passage"}, {"id": "D", "text": "Contrast past and present astronomical knowledge"}]',
  'A',
  'Beginning with a personal anecdote creates an emotional hook and establishes the author''s personal connection to the topic, making choice A correct. The memory itself is not scientific evidence (B), doesn''t state an argument (C), and there''s no contrast with present knowledge (D).',
  'pregenerated', NULL, NULL, NULL, NULL,
  'passed', '{"passed": true, "checked_at": "2026-08-06T19:40:00Z"}', 'original', true
);

-- Question 5: Reading-Writing - Information and Ideas (Difficulty 2)
INSERT INTO sat_questions (
  schema_version, section, format, domain, skill, difficulty, difficulty_method, difficulty_confidence,
  context, stem, choices_json, correct_answer, explanation,
  source, generator_model, generator_provider, generated_at, prompt_version,
  validation_status, validation_json, copyright_status, active
) VALUES (
  '1.0', 'Reading-Writing', 'multiple_choice', 'Information and Ideas', 'Central ideas and themes', 2, 'editorial', 0.87,
  'Bees play a crucial role in pollinating crops worldwide. Without bees, many fruits, vegetables, and nuts would be impossible to grow on a large scale. Farmers often rent beehives to ensure their crops are properly pollinated.',
  'Which choice best states the main idea of the text?',
  '[{"id": "A", "text": "Bees are important for agriculture because they pollinate crops."}, {"id": "B", "text": "Farmers should stop renting beehives because they are expensive."}, {"id": "C", "text": "Fruits and vegetables are becoming harder to grow."}, {"id": "D", "text": "Bees are in danger of extinction due to pesticide use."}]',
  'A',
  'The passage focuses on bees'' role in pollinating crops and their importance to agriculture, making choice A correct. The other choices introduce ideas not discussed in the text.',
  'pregenerated', NULL, NULL, NULL, NULL,
  'passed', '{"passed": true, "checked_at": "2026-08-06T19:40:00Z"}', 'original', true
);

-- Question 6: Math - Geometry and Trigonometry (Difficulty 3)
INSERT INTO sat_questions (
  schema_version, section, format, domain, skill, difficulty, difficulty_method, difficulty_confidence,
  context, stem, choices_json, correct_answer, explanation,
  source, generator_model, generator_provider, generated_at, prompt_version,
  validation_status, validation_json, copyright_status, active
) VALUES (
  '1.0', 'Math', 'multiple_choice', 'Geometry and Trigonometry', 'Area and volume', 3, 'editorial', 0.84,
  'A rectangular box has dimensions 4 inches by 6 inches by 8 inches.',
  'A rectangular box has dimensions 4 inches by 6 inches by 8 inches. What is the volume of the box in cubic inches?',
  '[{"id": "A", "text": "48"}, {"id": "B", "text": "96"}, {"id": "C", "text": "192"}, {"id": "D", "text": "288"}]',
  'C',
  'Volume of a rectangular box = length × width × height = 4 × 6 × 8 = 192 cubic inches. Choice C is correct.',
  'pregenerated', NULL, NULL, NULL, NULL,
  'passed', '{"passed": true, "checked_at": "2026-08-06T19:40:00Z"}', 'original', true
);

-- Question 7: Reading-Writing - Standard English Conventions (Difficulty 2)
INSERT INTO sat_questions (
  schema_version, section, format, domain, skill, difficulty, difficulty_method, difficulty_confidence,
  context, stem, choices_json, correct_answer, explanation,
  source, generator_model, generator_provider, generated_at, prompt_version,
  validation_status, validation_json, copyright_status, active
) VALUES (
  '1.0', 'Reading-Writing', 'multiple_choice', 'Standard English Conventions', 'Verb tense', 2, 'editorial', 0.89,
  'The scientist ___ her findings at the conference last week.',
  'The scientist ___ her findings at the conference last week.',
  '[{"id": "A", "text": "present"}, {"id": "B", "text": "presents"}, {"id": "C", "text": "presented"}, {"id": "D", "text": "will present"}]',
  'C',
  'The phrase "last week" indicates past tense, so "presented" is correct. Choice C is correct.',
  'pregenerated', NULL, NULL, NULL, NULL,
  'passed', '{"passed": true, "checked_at": "2026-08-06T19:40:00Z"}', 'original', true
);

-- Question 8: Math - Algebra (Difficulty 4)
INSERT INTO sat_questions (
  schema_version, section, format, domain, skill, difficulty, difficulty_method, difficulty_confidence,
  context, stem, choices_json, correct_answer, explanation,
  source, generator_model, generator_provider, generated_at, prompt_version,
  validation_status, validation_json, copyright_status, active
) VALUES (
  '1.0', 'Math', 'multiple_choice', 'Algebra', 'Systems of equations', 4, 'editorial', 0.80,
  NULL,
  'If 2x + y = 10 and x - y = 2, what is the value of x?',
  '[{"id": "A", "text": "2"}, {"id": "B", "text": "3"}, {"id": "C", "text": "4"}, {"id": "D", "text": "5"}]',
  'C',
  'Add the two equations: (2x + y) + (x - y) = 10 + 2 → 3x = 12 → x = 4. Choice C is correct.',
  'pregenerated', NULL, NULL, NULL, NULL,
  'passed', '{"passed": true, "checked_at": "2026-08-06T19:40:00Z"}', 'original', true
);

-- Question 9: Reading-Writing - Expression of Ideas (Difficulty 3)
INSERT INTO sat_questions (
  schema_version, section, format, domain, skill, difficulty, difficulty_method, difficulty_confidence,
  context, stem, choices_json, correct_answer, explanation,
  source, generator_model, generator_provider, generated_at, prompt_version,
  validation_status, validation_json, copyright_status, active
) VALUES (
  '1.0', 'Reading-Writing', 'multiple_choice', 'Expression of Ideas', 'Rhetorical synthesis', 3, 'editorial', 0.83,
  'Notes: \n- Solar panels convert sunlight into electricity.\n- They are becoming more affordable for homeowners.\n- Installation costs have decreased by 40% in the last decade.\n- Many governments offer tax incentives for solar panel installation.',
  'Which choice best uses the notes to explain why solar panels are increasingly popular?',
  '[{"id": "A", "text": "Solar panels are popular because they convert sunlight into electricity efficiently."}, {"id": "B", "text": "Solar panels are increasingly popular due to lower costs and government incentives."}, {"id": "C", "text": "Installation costs for solar panels have decreased significantly."}, {"id": "D", "text": "Governments want homeowners to install solar panels."}]',
  'B',
  'Choice B synthesizes the key points from the notes: decreasing costs (including the 40% drop) and government tax incentives both contribute to increased popularity. Choice A mentions only the function, C mentions only one factor, and D is too vague.',
  'pregenerated', NULL, NULL, NULL, NULL,
  'passed', '{"passed": true, "checked_at": "2026-08-06T19:40:00Z"}', 'original', true
);

-- Question 10: Math - Problem-Solving and Data Analysis (Difficulty 4)
INSERT INTO sat_questions (
  schema_version, section, format, domain, skill, difficulty, difficulty_method, difficulty_confidence,
  context, stem, choices_json, correct_answer, explanation,
  source, generator_model, generator_provider, generated_at, prompt_version,
  validation_status, validation_json, copyright_status, active
) VALUES (
  '1.0', 'Math', 'multiple_choice', 'Problem-Solving and Data Analysis', 'Ratios and proportions', 4, 'editorial', 0.81,
  'A recipe calls for flour and sugar in a ratio of 5:3.',
  'A recipe calls for flour and sugar in a ratio of 5:3. If a baker uses 15 cups of flour, how many cups of sugar are needed?',
  '[{"id": "A", "text": "6"}, {"id": "B", "text": "9"}, {"id": "C", "text": "10"}, {"id": "D", "text": "12"}]',
  'B',
  'Set up the proportion: 5/3 = 15/x. Cross multiply: 5x = 45. Solve: x = 9 cups of sugar. Choice B is correct.',
  'pregenerated', NULL, NULL, NULL, NULL,
  'passed', '{"passed": true, "checked_at": "2026-08-06T19:40:00Z"}', 'original', true
);
