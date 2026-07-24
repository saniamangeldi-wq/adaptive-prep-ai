export type VAKStyle = "visual" | "auditory" | "kinesthetic";

export interface VAKQuestion {
  id: number;
  question: string;
  options: [
    { style: "visual"; text: string },
    { style: "auditory"; text: string },
    { style: "kinesthetic"; text: string }
  ];
}

// Assessment lengths — user can pick Quick or Full when retaking.
export const VAK_LENGTHS = {
  quick: 10,
  full: 25,
} as const;

export type VAKLength = keyof typeof VAK_LENGTHS;

export function getQuestionCountForLength(length: VAKLength): number {
  return VAK_LENGTHS[length];
}

// Kept for backwards compatibility (tier-based length). New flows use length instead.
export const VAK_TIER_QUESTIONS = {
  free: 10,
  pro: 10,
  elite: 10,
} as const;

export function getQuestionCountForTier(tier: string): number {
  switch (tier) {
    case "tier_3": return VAK_TIER_QUESTIONS.elite;
    case "tier_2": return VAK_TIER_QUESTIONS.pro;
    default: return VAK_TIER_QUESTIONS.free;
  }
}

export function getEstimatedMinutes(questionCount: number): number {
  return Math.ceil(questionCount * 0.4); // ~24 seconds per question
}

export function getRetakeDays(tier: string): number {
  return 7; // All tiers: 1 week cooldown
}

/**
 * Pick a randomized subset of VAK questions.
 * Called once per assessment so users don't see the same 10 every week.
 */
export function pickRandomQuestionIds(count: number): number[] {
  const all = VAK_QUESTIONS.map((q) => q.id);
  // Fisher-Yates
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  return all.slice(0, Math.min(count, all.length)).sort((a, b) => a - b);
}

// ─── Elite sub-type indicator questions ─────────────────────
// Expanded across the full 50-question pool so subtype detection still
// works when the assessment uses a randomized subset.

// Visual: Spatial (mental imagery / maps / picture in head)
export const SPATIAL_VISUAL_QS = [2, 4, 6, 13, 18, 34, 41, 47, 49];

// Auditory: Expressive (talking / repeating out loud / verbalizing)
export const EXPRESSIVE_AUDITORY_QS = [2, 10, 12, 17, 22, 26, 29, 32, 39, 43, 46];

// Kinesthetic: Physical (whole-body movement / walking / exercise)
export const PHYSICAL_KINESTHETIC_QS = [4, 10, 12, 20, 25, 29, 43, 47];

export const VAK_QUESTIONS: VAKQuestion[] = [
  // ==================== FREE TIER: Q1–Q15 ====================
  {
    id: 1,
    question: "When learning something new, you prefer to:",
    options: [
      { style: "visual", text: "Watch a demonstration or look at diagrams" },
      { style: "auditory", text: "Listen to someone explain it step by step" },
      { style: "kinesthetic", text: "Try it yourself through hands-on practice" },
    ],
  },
  {
    id: 2,
    question: "When you forget the steps to solve a math problem, you:",
    options: [
      { style: "visual", text: "Picture the steps visually in your head" },
      { style: "auditory", text: "Repeat the steps out loud to yourself" },
      { style: "kinesthetic", text: "Write them down and practice again" },
    ],
  },
  {
    id: 3,
    question: "When studying for a test, you prefer:",
    options: [
      { style: "visual", text: "Color-coded notes, charts, and mind maps" },
      { style: "auditory", text: "Reading notes aloud or listening to recordings" },
      { style: "kinesthetic", text: "Practicing problems repeatedly with your hands" },
    ],
  },
  {
    id: 4,
    question: "When you get lost in a new place, you:",
    options: [
      { style: "visual", text: "Look at a map or picture the route in your head" },
      { style: "auditory", text: "Ask someone for spoken directions" },
      { style: "kinesthetic", text: "Walk around and figure it out by exploring" },
    ],
  },
  {
    id: 5,
    question: "When someone explains a new concept, you remember it best if they:",
    options: [
      { style: "visual", text: "Draw it out or show a visual example" },
      { style: "auditory", text: "Explain it verbally in simple words" },
      { style: "kinesthetic", text: "Let you try a practice example immediately" },
    ],
  },
  {
    id: 6,
    question: "When reading an SAT passage, you tend to:",
    options: [
      { style: "visual", text: "Visualize the scene or situation described" },
      { style: "auditory", text: "Hear the narrator's voice in your head as you read" },
      { style: "kinesthetic", text: "Feel like you physically experience the story" },
    ],
  },
  {
    id: 7,
    question: "To remember a new vocabulary word, you prefer:",
    options: [
      { style: "visual", text: "A colorful flashcard with the word and an image" },
      { style: "auditory", text: "Hearing the word used in a sentence out loud" },
      { style: "kinesthetic", text: "Writing the word multiple times and using it yourself" },
    ],
  },
  {
    id: 8,
    question: "When taking notes in class, you prefer:",
    options: [
      { style: "visual", text: "Drawing diagrams, arrows, and visual summaries" },
      { style: "auditory", text: "Writing down exactly what the teacher says" },
      { style: "kinesthetic", text: "Jotting down only key words and filling gaps later" },
    ],
  },
  {
    id: 9,
    question: "When you get a wrong answer on a practice test, you prefer:",
    options: [
      { style: "visual", text: "Seeing a visual step-by-step solution with highlights" },
      { style: "auditory", text: "Hearing or reading an explanation of why it's wrong" },
      { style: "kinesthetic", text: "Immediately trying a similar problem to fix the mistake" },
    ],
  },
  {
    id: 10,
    question: "When you are bored during studying, you:",
    options: [
      { style: "visual", text: "Start doodling or drawing diagrams" },
      { style: "auditory", text: "Hum, talk to yourself, or listen to music" },
      { style: "kinesthetic", text: "Tap your pen, move around, or take a physical break" },
    ],
  },
  {
    id: 11,
    question: "When cooking or following instructions, you prefer:",
    options: [
      { style: "visual", text: "Following a written recipe with pictures" },
      { style: "auditory", text: "Having someone explain the steps to you" },
      { style: "kinesthetic", text: "Experimenting and figuring it out as you go" },
    ],
  },
  {
    id: 12,
    question: "When you are stressed about an exam, you:",
    options: [
      { style: "visual", text: "Make a visual study plan or checklist you can see" },
      { style: "auditory", text: "Talk through your worries out loud or call someone" },
      { style: "kinesthetic", text: "Go for a walk, exercise, or do something physical" },
    ],
  },
  {
    id: 13,
    question: "When you remember a past event, you mostly recall:",
    options: [
      { style: "visual", text: "What everything looked like (faces, colors, places)" },
      { style: "auditory", text: "What was said and the sounds around you" },
      { style: "kinesthetic", text: "How you felt physically and what you did" },
    ],
  },
  {
    id: 14,
    question: "When learning a new sport or physical skill, you:",
    options: [
      { style: "visual", text: "Watch videos or demonstrations first" },
      { style: "auditory", text: "Listen carefully to instructions before trying" },
      { style: "kinesthetic", text: "Jump in and learn by doing it yourself" },
    ],
  },
  {
    id: 15,
    question: "When choosing how to present your work, you prefer:",
    options: [
      { style: "visual", text: "A poster, infographic, or visual presentation" },
      { style: "auditory", text: "Speaking to the class or recording a verbal explanation" },
      { style: "kinesthetic", text: "A hands-on demonstration or physical model" },
    ],
  },

  // ==================== PRO TIER: Q16–Q30 ====================
  {
    id: 16,
    question: "When you are happy, you express it by:",
    options: [
      { style: "visual", text: "Smiling and showing it on your face" },
      { style: "auditory", text: "Saying it out loud or laughing" },
      { style: "kinesthetic", text: "Hugging or doing something celebratory physically" },
    ],
  },
  {
    id: 17,
    question: "When solving a complex SAT math problem, you:",
    options: [
      { style: "visual", text: "Draw a diagram or chart to organize information" },
      { style: "auditory", text: "Talk yourself through each step quietly" },
      { style: "kinesthetic", text: "Work through each step physically on paper immediately" },
    ],
  },
  {
    id: 18,
    question: "When you imagine your future, you:",
    options: [
      { style: "visual", text: "See a clear picture of where you'll be" },
      { style: "auditory", text: "Hear yourself talking about it or imagine the sounds" },
      { style: "kinesthetic", text: "Feel the emotions and sensations of being there" },
    ],
  },
  {
    id: 19,
    question: "When something is explained confusingly, you:",
    options: [
      { style: "visual", text: "Ask for a diagram or written summary" },
      { style: "auditory", text: "Ask them to explain it again in different words" },
      { style: "kinesthetic", text: "Ask to try an example yourself immediately" },
    ],
  },
  {
    id: 20,
    question: "When waiting in a line, you:",
    options: [
      { style: "visual", text: "Look around and observe your surroundings" },
      { style: "auditory", text: "Listen to music, podcasts, or talk to someone" },
      { style: "kinesthetic", text: "Shift weight, move around, or fidget" },
    ],
  },
  {
    id: 21,
    question: "When you are good at a subject, it is usually because:",
    options: [
      { style: "visual", text: "You can clearly picture how concepts connect" },
      { style: "auditory", text: "You understood the teacher's verbal explanations" },
      { style: "kinesthetic", text: "You practiced it so many times it became natural" },
    ],
  },
  {
    id: 22,
    question: "When writing an essay, you prefer to:",
    options: [
      { style: "visual", text: "Create a visual outline or mind map first" },
      { style: "auditory", text: "Talk through your ideas out loud before writing" },
      { style: "kinesthetic", text: "Just start writing and organize as you go" },
    ],
  },
  {
    id: 23,
    question: "When you meet someone new, you remember:",
    options: [
      { style: "visual", text: "What they looked like and what they were wearing" },
      { style: "auditory", text: "Their voice, name, and what they talked about" },
      { style: "kinesthetic", text: "Your overall feeling about them and their energy" },
    ],
  },
  {
    id: 24,
    question: "When using a new app or platform, you:",
    options: [
      { style: "visual", text: "Look for a visual tour or screenshots guide" },
      { style: "auditory", text: "Watch a tutorial video or listen to instructions" },
      { style: "kinesthetic", text: "Click around and explore it yourself immediately" },
    ],
  },
  {
    id: 25,
    question: "When you are trying to focus, you work best:",
    options: [
      { style: "visual", text: "In a clean, organized, visually calm space" },
      { style: "auditory", text: "With background music or complete silence" },
      { style: "kinesthetic", text: "With ability to move, shift positions, or take short breaks" },
    ],
  },
  {
    id: 26,
    question: "When memorizing SAT formulas, you prefer:",
    options: [
      { style: "visual", text: "Writing them on a visual formula sheet with color coding" },
      { style: "auditory", text: "Repeating them out loud until they stick" },
      { style: "kinesthetic", text: "Applying them immediately in practice problems" },
    ],
  },
  {
    id: 27,
    question: "After completing a task, you feel satisfied when:",
    options: [
      { style: "visual", text: "You can see the finished result clearly" },
      { style: "auditory", text: "Someone confirms verbally that you did well" },
      { style: "kinesthetic", text: "You feel the physical accomplishment of being done" },
    ],
  },
  {
    id: 28,
    question: "When revising for an exam, your notes look like:",
    options: [
      { style: "visual", text: "Diagrams, charts, highlighted text, and colors" },
      { style: "auditory", text: "Bullet points and full sentences you can read aloud" },
      { style: "kinesthetic", text: "Summarized key points and practice questions" },
    ],
  },
  {
    id: 29,
    question: "When you are anxious, you calm down by:",
    options: [
      { style: "visual", text: "Organizing your space or making a visual plan" },
      { style: "auditory", text: "Talking to someone or listening to calming audio" },
      { style: "kinesthetic", text: "Exercising, deep breathing, or physical activity" },
    ],
  },
  {
    id: 30,
    question: "Your ideal SAT prep session looks like:",
    options: [
      { style: "visual", text: "Reviewing visual flashcards and annotated passages" },
      { style: "auditory", text: "Listening to explanations and discussing strategies" },
      { style: "kinesthetic", text: "Solving practice problems back to back with short breaks" },
    ],
  },

  // ==================== ELITE TIER: Q31–Q50 ====================
  {
    id: 31,
    question: "When you read a book, you prefer:",
    options: [
      { style: "visual", text: "Books with illustrations, diagrams, or infographics" },
      { style: "auditory", text: "Audiobooks or reading aloud to yourself" },
      { style: "kinesthetic", text: "Interactive workbooks where you write and engage" },
    ],
  },
  {
    id: 32,
    question: "When planning a project, you start by:",
    options: [
      { style: "visual", text: "Drawing a visual roadmap or flowchart" },
      { style: "auditory", text: "Talking through the plan with someone" },
      { style: "kinesthetic", text: "Diving straight in and adjusting as you go" },
    ],
  },
  {
    id: 33,
    question: "When you learn a new language, you:",
    options: [
      { style: "visual", text: "Study written words, grammar charts, and visual cues" },
      { style: "auditory", text: "Focus on pronunciation, listening, and conversation" },
      { style: "kinesthetic", text: "Practice by using the language in real situations" },
    ],
  },
  {
    id: 34,
    question: "When debugging a problem (in life or work), you:",
    options: [
      { style: "visual", text: "Map it out visually to see where it breaks" },
      { style: "auditory", text: "Talk through the logic step by step" },
      { style: "kinesthetic", text: "Try different solutions until one works" },
    ],
  },
  {
    id: 35,
    question: "When you are in a meeting or class, you:",
    options: [
      { style: "visual", text: "Take visual notes, draw diagrams, doodle ideas" },
      { style: "auditory", text: "Listen carefully and remember what was said" },
      { style: "kinesthetic", text: "Stay engaged by participating or taking action notes" },
    ],
  },
  {
    id: 36,
    question: "When you receive feedback, you prefer it:",
    options: [
      { style: "visual", text: "Written with examples you can re-read" },
      { style: "auditory", text: "Spoken so you can ask follow-up questions" },
      { style: "kinesthetic", text: "Shown through demonstration of what to improve" },
    ],
  },
  {
    id: 37,
    question: "When packing for a trip, you:",
    options: [
      { style: "visual", text: "Make a written checklist with categories" },
      { style: "auditory", text: "Mentally go through the trip and say items aloud" },
      { style: "kinesthetic", text: "Lay everything out physically and pack by feel" },
    ],
  },
  {
    id: 38,
    question: "When choosing a restaurant, you:",
    options: [
      { style: "visual", text: "Look at photos of the food online first" },
      { style: "auditory", text: "Ask friends for recommendations and descriptions" },
      { style: "kinesthetic", text: "Walk in somewhere that feels right intuitively" },
    ],
  },
  {
    id: 39,
    question: "When you finish studying a topic, you feel confident when:",
    options: [
      { style: "visual", text: "Your notes look organized and complete visually" },
      { style: "auditory", text: "You can explain it clearly out loud to someone" },
      { style: "kinesthetic", text: "You practiced enough problems to feel natural" },
    ],
  },
  {
    id: 40,
    question: "When learning to use a new tool or software, you:",
    options: [
      { style: "visual", text: "Follow a visual step-by-step guide with screenshots" },
      { style: "auditory", text: "Watch a walkthrough video with narration" },
      { style: "kinesthetic", text: "Experiment with it directly and learn from errors" },
    ],
  },
  {
    id: 41,
    question: "When you imagine a perfect study space, it has:",
    options: [
      { style: "visual", text: "Clean walls, organized materials, good lighting" },
      { style: "auditory", text: "Quiet background music or complete silence" },
      { style: "kinesthetic", text: "Space to move, stand, or shift positions freely" },
    ],
  },
  {
    id: 42,
    question: "When solving a reading comprehension question, you:",
    options: [
      { style: "visual", text: "Re-read and highlight the key parts of the passage" },
      { style: "auditory", text: "Read the question aloud and listen for the answer" },
      { style: "kinesthetic", text: "Go back and physically underline, circle, and annotate" },
    ],
  },
  {
    id: 43,
    question: "When you feel stuck on a hard question, you:",
    options: [
      { style: "visual", text: "Look at it from a different visual angle or redraw it" },
      { style: "auditory", text: "Quietly talk yourself through it step by step" },
      { style: "kinesthetic", text: "Take a short break, move around, then try again" },
    ],
  },
  {
    id: 44,
    question: "When learning about history, you prefer:",
    options: [
      { style: "visual", text: "Timelines, maps, and visual summaries" },
      { style: "auditory", text: "Stories, lectures, and discussions about events" },
      { style: "kinesthetic", text: "Role-playing scenarios or hands-on simulations" },
    ],
  },
  {
    id: 45,
    question: "When you are proud of your work, you like to:",
    options: [
      { style: "visual", text: "Display it somewhere visible or take a photo" },
      { style: "auditory", text: "Tell someone about it and hear their reaction" },
      { style: "kinesthetic", text: "Celebrate with a physical reward or activity" },
    ],
  },
  {
    id: 46,
    question: "When you study grammar rules, you prefer:",
    options: [
      { style: "visual", text: "Color-coded charts showing patterns and exceptions" },
      { style: "auditory", text: "Hearing examples read aloud and repeating them" },
      { style: "kinesthetic", text: "Writing your own sentences applying each rule" },
    ],
  },
  {
    id: 47,
    question: "When preparing for an important event, you:",
    options: [
      { style: "visual", text: "Visualize exactly how it will go, step by step" },
      { style: "auditory", text: "Talk through it with someone to feel ready" },
      { style: "kinesthetic", text: "Do a physical rehearsal or practice run" },
    ],
  },
  {
    id: 48,
    question: "When something is difficult to understand, you give up:",
    options: [
      { style: "visual", text: "When you cannot find a clear visual explanation" },
      { style: "auditory", text: "When no one can explain it in words you understand" },
      { style: "kinesthetic", text: "When you have tried it hands-on many times and failed" },
    ],
  },
  {
    id: 49,
    question: "When you think about your best learning experience, it was:",
    options: [
      { style: "visual", text: "When you could see everything clearly laid out" },
      { style: "auditory", text: "When someone explained it perfectly in words" },
      { style: "kinesthetic", text: "When you learned by doing it yourself in real life" },
    ],
  },
  {
    id: 50,
    question: "If you could design your perfect SAT prep platform, it would have:",
    options: [
      { style: "visual", text: "Beautiful visuals, charts, diagrams, and color-coded content" },
      { style: "auditory", text: "Audio explanations, verbal walkthroughs, and discussion features" },
      { style: "kinesthetic", text: "Interactive exercises, hands-on practice, and physical engagement tools" },
    ],
  },
  {
    id: 51,
    question: 'When your teacher introduces a new topic, you learn fastest by:',
    options: [
      { style: "visual", text: 'Seeing a diagram or slide breakdown' },
      { style: "auditory", text: 'Hearing the verbal walkthrough' },
      { style: "kinesthetic", text: 'Trying a quick hands-on example' },
    ],
  },
  {
    id: 52,
    question: 'When reviewing an SAT vocab list, you remember words best when you:',
    options: [
      { style: "visual", text: 'See them written with a small icon' },
      { style: "auditory", text: 'Say them out loud in a sentence' },
      { style: "kinesthetic", text: 'Write them repeatedly by hand' },
    ],
  },
  {
    id: 53,
    question: 'When your friend describes a movie plot, you:',
    options: [
      { style: "visual", text: 'Picture the scenes in your head' },
      { style: "auditory", text: 'Focus on the dialogue and voices' },
      { style: "kinesthetic", text: 'Imagine how the action would feel' },
    ],
  },
  {
    id: 54,
    question: 'When learning a new dance move, you:',
    options: [
      { style: "visual", text: 'Watch it performed several times' },
      { style: "auditory", text: 'Listen to counting or rhythm cues' },
      { style: "kinesthetic", text: 'Try the steps immediately' },
    ],
  },
  {
    id: 55,
    question: 'When solving a geometry problem, you first:',
    options: [
      { style: "visual", text: 'Sketch the figure carefully' },
      { style: "auditory", text: 'Read the problem out loud to yourself' },
      { style: "kinesthetic", text: 'Manipulate values on scratch paper' },
    ],
  },
  {
    id: 56,
    question: 'When you need to remember a phone number, you:',
    options: [
      { style: "visual", text: 'Picture the digits visually' },
      { style: "auditory", text: 'Repeat it out loud until it sticks' },
      { style: "kinesthetic", text: 'Type or write it down a few times' },
    ],
  },
  {
    id: 57,
    question: 'When you attend a lecture, you get the most from:',
    options: [
      { style: "visual", text: 'The slides and visuals shown' },
      { style: "auditory", text: "The professor's spoken explanations" },
      { style: "kinesthetic", text: 'The interactive activities or demos' },
    ],
  },
  {
    id: 58,
    question: 'When shopping for something new, you like to:',
    options: [
      { style: "visual", text: 'Look through photos and reviews with images' },
      { style: "auditory", text: 'Ask a salesperson to explain features' },
      { style: "kinesthetic", text: 'Handle and test the product yourself' },
    ],
  },
  {
    id: 59,
    question: 'When you daydream, it is usually in the form of:',
    options: [
      { style: "visual", text: 'Vivid images or scenes' },
      { style: "auditory", text: 'Conversations or inner dialogue' },
      { style: "kinesthetic", text: 'Physical sensations of doing something' },
    ],
  },
  {
    id: 60,
    question: 'When someone gives you directions, you prefer:',
    options: [
      { style: "visual", text: 'A map or drawn route' },
      { style: "auditory", text: 'Spoken turn-by-turn directions' },
      { style: "kinesthetic", text: 'Being walked or driven there once' },
    ],
  },
  {
    id: 61,
    question: "When you're stuck on an SAT reading question, you:",
    options: [
      { style: "visual", text: 'Highlight and re-scan key sentences' },
      { style: "auditory", text: 'Read the question aloud in a whisper' },
      { style: "kinesthetic", text: 'Underline and annotate physically' },
    ],
  },
  {
    id: 62,
    question: 'When learning a magic trick or puzzle, you:',
    options: [
      { style: "visual", text: 'Watch it done slowly a few times' },
      { style: "auditory", text: 'Listen to the explanation of the method' },
      { style: "kinesthetic", text: 'Try it yourself right away' },
    ],
  },
  {
    id: 63,
    question: 'When you want to relax, you:',
    options: [
      { style: "visual", text: 'Watch something visual like a movie or nature' },
      { style: "auditory", text: 'Listen to music or a podcast' },
      { style: "kinesthetic", text: 'Go for a walk or move your body' },
    ],
  },
  {
    id: 64,
    question: 'When you enter a new room, you first notice:',
    options: [
      { style: "visual", text: 'The colors, layout, and decor' },
      { style: "auditory", text: 'The sounds and voices around you' },
      { style: "kinesthetic", text: 'How comfortable it physically feels' },
    ],
  },
  {
    id: 65,
    question: "When you're memorizing SAT grammar rules, you:",
    options: [
      { style: "visual", text: 'Use a color-coded chart' },
      { style: "auditory", text: 'Say the rule out loud with an example' },
      { style: "kinesthetic", text: 'Write example sentences for each rule' },
    ],
  },
  {
    id: 66,
    question: 'When someone tells a joke, you appreciate:',
    options: [
      { style: "visual", text: 'The visual imagery or gestures' },
      { style: "auditory", text: 'The wordplay and tone of voice' },
      { style: "kinesthetic", text: 'The physical timing or reactions' },
    ],
  },
  {
    id: 67,
    question: "When you're working through a science problem, you:",
    options: [
      { style: "visual", text: 'Draw the process or setup' },
      { style: "auditory", text: 'Verbally reason through cause and effect' },
      { style: "kinesthetic", text: 'Simulate it with objects or motion' },
    ],
  },
  {
    id: 68,
    question: 'When you cannot fall asleep, your mind is usually:',
    options: [
      { style: "visual", text: 'Playing images or memories' },
      { style: "auditory", text: 'Replaying conversations or songs' },
      { style: "kinesthetic", text: 'Restless and wanting to move' },
    ],
  },
  {
    id: 69,
    question: 'When you use a new appliance, you:',
    options: [
      { style: "visual", text: 'Study the diagram in the manual' },
      { style: "auditory", text: 'Have someone explain how it works' },
      { style: "kinesthetic", text: 'Press buttons and figure it out' },
    ],
  },
  {
    id: 70,
    question: 'When taking an SAT practice test, breaks work best if you:',
    options: [
      { style: "visual", text: 'Look away and rest your eyes on something calm' },
      { style: "auditory", text: 'Listen to quiet music for a minute' },
      { style: "kinesthetic", text: 'Stand up and stretch' },
    ],
  },
  {
    id: 71,
    question: 'When learning about a scientific concept, you understand best via:',
    options: [
      { style: "visual", text: 'An animation or labeled diagram' },
      { style: "auditory", text: 'A clear verbal explanation' },
      { style: "kinesthetic", text: 'A physical experiment' },
    ],
  },
  {
    id: 72,
    question: 'When you argue a point, you tend to:',
    options: [
      { style: "visual", text: 'Sketch or point to visuals for support' },
      { style: "auditory", text: 'Speak clearly and use tone for emphasis' },
      { style: "kinesthetic", text: 'Use gestures and body language' },
    ],
  },
  {
    id: 73,
    question: "When you're distracted while studying, it's usually because of:",
    options: [
      { style: "visual", text: 'Visual clutter around you' },
      { style: "auditory", text: 'Background noise or conversations' },
      { style: "kinesthetic", text: 'The urge to move or fidget' },
    ],
  },
  {
    id: 74,
    question: 'When practicing SAT math word problems, you:',
    options: [
      { style: "visual", text: 'Draw a picture of the situation' },
      { style: "auditory", text: 'Read the wording aloud slowly' },
      { style: "kinesthetic", text: 'Assign values and try numbers physically' },
    ],
  },
  {
    id: 75,
    question: 'When choosing a study playlist, you prefer:',
    options: [
      { style: "visual", text: 'None — you like a quiet visual space' },
      { style: "auditory", text: 'Instrumental or lyric music' },
      { style: "kinesthetic", text: 'Something with a beat you can tap to' },
    ],
  },
  {
    id: 76,
    question: 'When you make a mistake, you learn best by:',
    options: [
      { style: "visual", text: 'Seeing a written correction with steps' },
      { style: "auditory", text: 'Hearing an explanation of the error' },
      { style: "kinesthetic", text: 'Redoing the task yourself' },
    ],
  },
  {
    id: 77,
    question: 'When explaining something to a friend, you:',
    options: [
      { style: "visual", text: 'Draw or point to visuals' },
      { style: "auditory", text: 'Use words and analogies' },
      { style: "kinesthetic", text: 'Show them by doing it together' },
    ],
  },
  {
    id: 78,
    question: 'When you recall a lesson from months ago, you remember:',
    options: [
      { style: "visual", text: 'Images from the slides or board' },
      { style: "auditory", text: "The teacher's voice and phrases" },
      { style: "kinesthetic", text: 'What you were doing at your desk' },
    ],
  },
  {
    id: 79,
    question: 'When you want to master a new skill, you commit to:',
    options: [
      { style: "visual", text: 'Studying visuals and examples repeatedly' },
      { style: "auditory", text: 'Listening to expert explanations' },
      { style: "kinesthetic", text: "Practicing daily until it's muscle memory" },
    ],
  },
  {
    id: 80,
    question: "When you're bored in class, you:",
    options: [
      { style: "visual", text: 'Doodle or design in your notebook' },
      { style: "auditory", text: 'Whisper or hum to yourself' },
      { style: "kinesthetic", text: 'Fidget, bounce your leg, or shift position' },
    ],
  },
  {
    id: 81,
    question: 'When choosing a workout, you enjoy:',
    options: [
      { style: "visual", text: 'Following an on-screen visual class' },
      { style: "auditory", text: 'Listening to an audio-guided workout' },
      { style: "kinesthetic", text: 'Freestyling based on how your body feels' },
    ],
  },
  {
    id: 82,
    question: "When you're planning your week, you use:",
    options: [
      { style: "visual", text: 'A visual calendar or planner' },
      { style: "auditory", text: 'A voice reminder or told plan' },
      { style: "kinesthetic", text: 'A quick mental to-do you act on' },
    ],
  },
  {
    id: 83,
    question: "When you're stressed before a test, you:",
    options: [
      { style: "visual", text: 'Review your visual summary sheet' },
      { style: "auditory", text: 'Talk it out with a friend or parent' },
      { style: "kinesthetic", text: 'Do a short physical warm-up' },
    ],
  },
  {
    id: 84,
    question: 'When you meet a study group, you contribute best by:',
    options: [
      { style: "visual", text: 'Sharing diagrams or summaries' },
      { style: "auditory", text: 'Explaining concepts out loud' },
      { style: "kinesthetic", text: 'Guiding through practice problems' },
    ],
  },
  {
    id: 85,
    question: 'When learning a new song, you:',
    options: [
      { style: "visual", text: 'Read the lyrics on screen' },
      { style: "auditory", text: 'Listen and sing along' },
      { style: "kinesthetic", text: 'Move or dance while learning' },
    ],
  },
  {
    id: 86,
    question: 'When your notes get messy, you:',
    options: [
      { style: "visual", text: 'Rewrite them visually and neatly' },
      { style: "auditory", text: 'Read them aloud to reorganize mentally' },
      { style: "kinesthetic", text: 'Rewrite by hand from scratch' },
    ],
  },
  {
    id: 87,
    question: 'When you want to remember a formula, you:',
    options: [
      { style: "visual", text: 'Post it visually where you can see it' },
      { style: "auditory", text: 'Chant it a few times daily' },
      { style: "kinesthetic", text: 'Apply it in problems right away' },
    ],
  },
  {
    id: 88,
    question: 'When following news, you prefer:',
    options: [
      { style: "visual", text: 'Infographics and visual articles' },
      { style: "auditory", text: 'Podcasts or radio news' },
      { style: "kinesthetic", text: 'Interactive apps you can navigate' },
    ],
  },
  {
    id: 89,
    question: 'When you try to focus, background elements that help most are:',
    options: [
      { style: "visual", text: 'A tidy, uncluttered desk' },
      { style: "auditory", text: 'Steady ambient sound' },
      { style: "kinesthetic", text: 'The ability to move freely' },
    ],
  },
  {
    id: 90,
    question: 'When learning a new concept in class, you retain more when:',
    options: [
      { style: "visual", text: 'The teacher writes on the board' },
      { style: "auditory", text: 'The teacher speaks with clear examples' },
      { style: "kinesthetic", text: 'The class does a group activity' },
    ],
  },
  {
    id: 91,
    question: 'When reading a difficult passage, you:',
    options: [
      { style: "visual", text: 'Break it into visual chunks' },
      { style: "auditory", text: 'Read it aloud slowly' },
      { style: "kinesthetic", text: 'Annotate as you go' },
    ],
  },
  {
    id: 92,
    question: 'When you first meet a new subject, your instinct is to:',
    options: [
      { style: "visual", text: 'Look up diagrams online' },
      { style: "auditory", text: 'Watch a lecture or podcast' },
      { style: "kinesthetic", text: 'Attempt a beginner exercise' },
    ],
  },
  {
    id: 93,
    question: 'When you finish a hard task, you feel most accomplished if:',
    options: [
      { style: "visual", text: 'You can see the tidy end result' },
      { style: "auditory", text: 'Someone tells you good job' },
      { style: "kinesthetic", text: 'You physically feel the effort paid off' },
    ],
  },
  {
    id: 94,
    question: 'When memorizing SAT reading strategies, you:',
    options: [
      { style: "visual", text: 'Make a poster of steps' },
      { style: "auditory", text: 'Repeat the steps out loud' },
      { style: "kinesthetic", text: 'Practice them on real passages' },
    ],
  },
  {
    id: 95,
    question: 'When learning to type or use a keyboard shortcut, you:',
    options: [
      { style: "visual", text: 'Look at a cheat sheet diagram' },
      { style: "auditory", text: 'Say the keys aloud as you press' },
      { style: "kinesthetic", text: 'Practice until fingers remember' },
    ],
  },
  {
    id: 96,
    question: 'When you must give a presentation, you prepare by:',
    options: [
      { style: "visual", text: 'Designing polished slides' },
      { style: "auditory", text: 'Practicing your speech aloud' },
      { style: "kinesthetic", text: 'Rehearsing your movement and gestures' },
    ],
  },
  {
    id: 97,
    question: 'When receiving a tutorial, you learn most from:',
    options: [
      { style: "visual", text: 'The screenshots or diagrams' },
      { style: "auditory", text: "The narrator's voice" },
      { style: "kinesthetic", text: 'Trying the steps yourself as you go' },
    ],
  },
  {
    id: 98,
    question: 'When you plan an essay, you first:',
    options: [
      { style: "visual", text: 'Outline visually with bubbles or bullets' },
      { style: "auditory", text: 'Talk through your thesis aloud' },
      { style: "kinesthetic", text: 'Free-write to see where you go' },
    ],
  },
  {
    id: 99,
    question: 'When you take an SAT diagnostic, you review best by:',
    options: [
      { style: "visual", text: 'Reading a color-coded score report' },
      { style: "auditory", text: 'Hearing an audio review of errors' },
      { style: "kinesthetic", text: 'Redoing the missed problems' },
    ],
  },
  {
    id: 100,
    question: "When you want to remember a person's name, you:",
    options: [
      { style: "visual", text: 'Picture their face with the name' },
      { style: "auditory", text: 'Say it aloud a few times when meeting' },
      { style: "kinesthetic", text: 'Write it down or use it in conversation' },
    ],
  },
  {
    id: 101,
    question: 'During a essay planning, you understand more when you:',
    options: [
      { style: "visual", text: 'See it laid out with diagrams or highlights' },
      { style: "auditory", text: 'Listen to a spoken explanation' },
      { style: "kinesthetic", text: 'Try it hands-on right away' },
    ],
  },
  {
    id: 102,
    question: 'During a SAT prep session, you retain material when you:',
    options: [
      { style: "visual", text: 'Use color-coded notes and charts' },
      { style: "auditory", text: 'Play an audio recap while reviewing' },
      { style: "kinesthetic", text: 'Learn through trial and error' },
    ],
  },
  {
    id: 103,
    question: 'During a biology chapter, you focus best when you:',
    options: [
      { style: "visual", text: 'Rely on written outlines and pictures' },
      { style: "auditory", text: 'Repeat key ideas aloud to yourself' },
      { style: "kinesthetic", text: 'Simulate the situation actively' },
    ],
  },
  {
    id: 104,
    question: 'During a quiz retake, you understand more when you:',
    options: [
      { style: "visual", text: 'Watch a short video walkthrough' },
      { style: "auditory", text: 'Use call-and-response practice' },
      { style: "kinesthetic", text: 'Rewrite and rework each step by hand' },
    ],
  },
  {
    id: 105,
    question: 'During a team project, you focus best when you:',
    options: [
      { style: "visual", text: 'Look at annotated examples' },
      { style: "auditory", text: 'Talk through the steps quietly' },
      { style: "kinesthetic", text: 'Build or manipulate something related' },
    ],
  },
  {
    id: 106,
    question: 'During a scholarship essay, you stay engaged when you:',
    options: [
      { style: "visual", text: 'Take screenshots and organize them' },
      { style: "auditory", text: 'Discuss it out loud with a partner' },
      { style: "kinesthetic", text: 'Practice by doing, not just reading' },
    ],
  },
  {
    id: 107,
    question: 'During a note-taking session, you prefer to:',
    options: [
      { style: "visual", text: 'Study a visual summary before starting' },
      { style: "auditory", text: 'Explain it to someone verbally' },
      { style: "kinesthetic", text: 'Move between tasks with short breaks' },
    ],
  },
  {
    id: 108,
    question: 'During a weekly recap, you stay engaged when you:',
    options: [
      { style: "visual", text: 'Create a visual mind map' },
      { style: "auditory", text: 'Hear it summarized in your own words' },
      { style: "kinesthetic", text: 'Work through problems physically' },
    ],
  },
  {
    id: 109,
    question: 'During a reading comprehension drill, you understand more when you:',
    options: [
      { style: "visual", text: 'See it laid out with diagrams or highlights' },
      { style: "auditory", text: 'Listen to a spoken explanation' },
      { style: "kinesthetic", text: 'Try it hands-on right away' },
    ],
  },
  {
    id: 110,
    question: 'During a language learning, you retain material when you:',
    options: [
      { style: "visual", text: 'Use color-coded notes and charts' },
      { style: "auditory", text: 'Play an audio recap while reviewing' },
      { style: "kinesthetic", text: 'Learn through trial and error' },
    ],
  },
  {
    id: 111,
    question: 'During a note-taking session, you focus best when you:',
    options: [
      { style: "visual", text: 'Rely on written outlines and pictures' },
      { style: "auditory", text: 'Repeat key ideas aloud to yourself' },
      { style: "kinesthetic", text: 'Simulate the situation actively' },
    ],
  },
  {
    id: 112,
    question: 'During a science lab, you focus best when you:',
    options: [
      { style: "visual", text: 'Watch a short video walkthrough' },
      { style: "auditory", text: 'Use call-and-response practice' },
      { style: "kinesthetic", text: 'Rewrite and rework each step by hand' },
    ],
  },
  {
    id: 113,
    question: 'During a algebra practice, you focus best when you:',
    options: [
      { style: "visual", text: 'Look at annotated examples' },
      { style: "auditory", text: 'Talk through the steps quietly' },
      { style: "kinesthetic", text: 'Build or manipulate something related' },
    ],
  },
  {
    id: 114,
    question: 'During a music practice, you stay engaged when you:',
    options: [
      { style: "visual", text: 'Take screenshots and organize them' },
      { style: "auditory", text: 'Discuss it out loud with a partner' },
      { style: "kinesthetic", text: 'Practice by doing, not just reading' },
    ],
  },
  {
    id: 115,
    question: 'During a art project, you prefer to:',
    options: [
      { style: "visual", text: 'Study a visual summary before starting' },
      { style: "auditory", text: 'Explain it to someone verbally' },
      { style: "kinesthetic", text: 'Move between tasks with short breaks' },
    ],
  },
  {
    id: 116,
    question: 'During a SAT prep session, you understand more when you:',
    options: [
      { style: "visual", text: 'Create a visual mind map' },
      { style: "auditory", text: 'Hear it summarized in your own words' },
      { style: "kinesthetic", text: 'Work through problems physically' },
    ],
  },
  {
    id: 117,
    question: 'During a book club meeting, you retain material when you:',
    options: [
      { style: "visual", text: 'See it laid out with diagrams or highlights' },
      { style: "auditory", text: 'Listen to a spoken explanation' },
      { style: "kinesthetic", text: 'Try it hands-on right away' },
    ],
  },
  {
    id: 118,
    question: 'During a interview prep, you prefer to:',
    options: [
      { style: "visual", text: 'Use color-coded notes and charts' },
      { style: "auditory", text: 'Play an audio recap while reviewing' },
      { style: "kinesthetic", text: 'Learn through trial and error' },
    ],
  },
  {
    id: 119,
    question: 'During a essay planning, you retain material when you:',
    options: [
      { style: "visual", text: 'Rely on written outlines and pictures' },
      { style: "auditory", text: 'Repeat key ideas aloud to yourself' },
      { style: "kinesthetic", text: 'Simulate the situation actively' },
    ],
  },
  {
    id: 120,
    question: 'During a field trip, you focus best when you:',
    options: [
      { style: "visual", text: 'Watch a short video walkthrough' },
      { style: "auditory", text: 'Use call-and-response practice' },
      { style: "kinesthetic", text: 'Rewrite and rework each step by hand' },
    ],
  },
  {
    id: 121,
    question: 'During a debate prep, you retain material when you:',
    options: [
      { style: "visual", text: 'Look at annotated examples' },
      { style: "auditory", text: 'Talk through the steps quietly' },
      { style: "kinesthetic", text: 'Build or manipulate something related' },
    ],
  },
  {
    id: 122,
    question: 'During a essay planning, you prefer to:',
    options: [
      { style: "visual", text: 'Take screenshots and organize them' },
      { style: "auditory", text: 'Discuss it out loud with a partner' },
      { style: "kinesthetic", text: 'Practice by doing, not just reading' },
    ],
  },
  {
    id: 123,
    question: 'During a review of past mistakes, you understand more when you:',
    options: [
      { style: "visual", text: 'Study a visual summary before starting' },
      { style: "auditory", text: 'Explain it to someone verbally' },
      { style: "kinesthetic", text: 'Move between tasks with short breaks' },
    ],
  },
  {
    id: 124,
    question: 'During a SAT prep session, you focus best when you:',
    options: [
      { style: "visual", text: 'Create a visual mind map' },
      { style: "auditory", text: 'Hear it summarized in your own words' },
      { style: "kinesthetic", text: 'Work through problems physically' },
    ],
  },
  {
    id: 125,
    question: 'During a geometry review, you understand more when you:',
    options: [
      { style: "visual", text: 'See it laid out with diagrams or highlights' },
      { style: "auditory", text: 'Listen to a spoken explanation' },
      { style: "kinesthetic", text: 'Try it hands-on right away' },
    ],
  },
  {
    id: 126,
    question: 'During a music practice, you focus best when you:',
    options: [
      { style: "visual", text: 'Use color-coded notes and charts' },
      { style: "auditory", text: 'Play an audio recap while reviewing' },
      { style: "kinesthetic", text: 'Learn through trial and error' },
    ],
  },
  {
    id: 127,
    question: 'During a geometry review, you stay engaged when you:',
    options: [
      { style: "visual", text: 'Rely on written outlines and pictures' },
      { style: "auditory", text: 'Repeat key ideas aloud to yourself' },
      { style: "kinesthetic", text: 'Simulate the situation actively' },
    ],
  },
  {
    id: 128,
    question: 'During a presentation prep, you prefer to:',
    options: [
      { style: "visual", text: 'Watch a short video walkthrough' },
      { style: "auditory", text: 'Use call-and-response practice' },
      { style: "kinesthetic", text: 'Rewrite and rework each step by hand' },
    ],
  },
  {
    id: 129,
    question: 'During a field trip, you understand more when you:',
    options: [
      { style: "visual", text: 'Look at annotated examples' },
      { style: "auditory", text: 'Talk through the steps quietly' },
      { style: "kinesthetic", text: 'Build or manipulate something related' },
    ],
  },
  {
    id: 130,
    question: 'During a weekly recap, you understand more when you:',
    options: [
      { style: "visual", text: 'Take screenshots and organize them' },
      { style: "auditory", text: 'Discuss it out loud with a partner' },
      { style: "kinesthetic", text: 'Practice by doing, not just reading' },
    ],
  },
  {
    id: 131,
    question: 'During a debate prep, you understand more when you:',
    options: [
      { style: "visual", text: 'Study a visual summary before starting' },
      { style: "auditory", text: 'Explain it to someone verbally' },
      { style: "kinesthetic", text: 'Move between tasks with short breaks' },
    ],
  },
  {
    id: 132,
    question: 'During a podcast learning, you focus best when you:',
    options: [
      { style: "visual", text: 'Create a visual mind map' },
      { style: "auditory", text: 'Hear it summarized in your own words' },
      { style: "kinesthetic", text: 'Work through problems physically' },
    ],
  },
  {
    id: 133,
    question: 'During a midterm cramming, you prefer to:',
    options: [
      { style: "visual", text: 'See it laid out with diagrams or highlights' },
      { style: "auditory", text: 'Listen to a spoken explanation' },
      { style: "kinesthetic", text: 'Try it hands-on right away' },
    ],
  },
  {
    id: 134,
    question: 'During a podcast learning, you prefer to:',
    options: [
      { style: "visual", text: 'Use color-coded notes and charts' },
      { style: "auditory", text: 'Play an audio recap while reviewing' },
      { style: "kinesthetic", text: 'Learn through trial and error' },
    ],
  },
  {
    id: 135,
    question: 'During a documentary watching, you stay engaged when you:',
    options: [
      { style: "visual", text: 'Rely on written outlines and pictures' },
      { style: "auditory", text: 'Repeat key ideas aloud to yourself' },
      { style: "kinesthetic", text: 'Simulate the situation actively' },
    ],
  },
  {
    id: 136,
    question: 'During a midterm cramming, you stay engaged when you:',
    options: [
      { style: "visual", text: 'Watch a short video walkthrough' },
      { style: "auditory", text: 'Use call-and-response practice' },
      { style: "kinesthetic", text: 'Rewrite and rework each step by hand' },
    ],
  },
  {
    id: 137,
    question: 'During a online course lecture, you retain material when you:',
    options: [
      { style: "visual", text: 'Look at annotated examples' },
      { style: "auditory", text: 'Talk through the steps quietly' },
      { style: "kinesthetic", text: 'Build or manipulate something related' },
    ],
  },
  {
    id: 138,
    question: 'During a museum visit, you retain material when you:',
    options: [
      { style: "visual", text: 'Take screenshots and organize them' },
      { style: "auditory", text: 'Discuss it out loud with a partner' },
      { style: "kinesthetic", text: 'Practice by doing, not just reading' },
    ],
  },
  {
    id: 139,
    question: 'During a coding practice, you stay engaged when you:',
    options: [
      { style: "visual", text: 'Study a visual summary before starting' },
      { style: "auditory", text: 'Explain it to someone verbally' },
      { style: "kinesthetic", text: 'Move between tasks with short breaks' },
    ],
  },
  {
    id: 140,
    question: 'During a chemistry chapter, you stay engaged when you:',
    options: [
      { style: "visual", text: 'Create a visual mind map' },
      { style: "auditory", text: 'Hear it summarized in your own words' },
      { style: "kinesthetic", text: 'Work through problems physically' },
    ],
  },
  {
    id: 141,
    question: 'During a statistics chapter, you stay engaged when you:',
    options: [
      { style: "visual", text: 'See it laid out with diagrams or highlights' },
      { style: "auditory", text: 'Listen to a spoken explanation' },
      { style: "kinesthetic", text: 'Try it hands-on right away' },
    ],
  },
  {
    id: 142,
    question: 'During a online course lecture, you understand more when you:',
    options: [
      { style: "visual", text: 'Use color-coded notes and charts' },
      { style: "auditory", text: 'Play an audio recap while reviewing' },
      { style: "kinesthetic", text: 'Learn through trial and error' },
    ],
  },
  {
    id: 143,
    question: 'During a SAT prep session, you prefer to:',
    options: [
      { style: "visual", text: 'Rely on written outlines and pictures' },
      { style: "auditory", text: 'Repeat key ideas aloud to yourself' },
      { style: "kinesthetic", text: 'Simulate the situation actively' },
    ],
  },
  {
    id: 144,
    question: 'During a final exam review, you retain material when you:',
    options: [
      { style: "visual", text: 'Watch a short video walkthrough' },
      { style: "auditory", text: 'Use call-and-response practice' },
      { style: "kinesthetic", text: 'Rewrite and rework each step by hand' },
    ],
  },
  {
    id: 145,
    question: 'During a biology chapter, you stay engaged when you:',
    options: [
      { style: "visual", text: 'Look at annotated examples' },
      { style: "auditory", text: 'Talk through the steps quietly' },
      { style: "kinesthetic", text: 'Build or manipulate something related' },
    ],
  },
  {
    id: 146,
    question: 'During a music practice, you retain material when you:',
    options: [
      { style: "visual", text: 'Take screenshots and organize them' },
      { style: "auditory", text: 'Discuss it out loud with a partner' },
      { style: "kinesthetic", text: 'Practice by doing, not just reading' },
    ],
  },
  {
    id: 147,
    question: 'During a team project, you understand more when you:',
    options: [
      { style: "visual", text: 'Study a visual summary before starting' },
      { style: "auditory", text: 'Explain it to someone verbally' },
      { style: "kinesthetic", text: 'Move between tasks with short breaks' },
    ],
  },
  {
    id: 148,
    question: 'During a evening review, you focus best when you:',
    options: [
      { style: "visual", text: 'Create a visual mind map' },
      { style: "auditory", text: 'Hear it summarized in your own words' },
      { style: "kinesthetic", text: 'Work through problems physically' },
    ],
  },
  {
    id: 149,
    question: 'During a debate prep, you stay engaged when you:',
    options: [
      { style: "visual", text: 'See it laid out with diagrams or highlights' },
      { style: "auditory", text: 'Listen to a spoken explanation' },
      { style: "kinesthetic", text: 'Try it hands-on right away' },
    ],
  },
  {
    id: 150,
    question: 'During a debate prep, you prefer to:',
    options: [
      { style: "visual", text: 'Use color-coded notes and charts' },
      { style: "auditory", text: 'Play an audio recap while reviewing' },
      { style: "kinesthetic", text: 'Learn through trial and error' },
    ],
  },
  {
    id: 151,
    question: 'During a note-taking session, you understand more when you:',
    options: [
      { style: "visual", text: 'Rely on written outlines and pictures' },
      { style: "auditory", text: 'Repeat key ideas aloud to yourself' },
      { style: "kinesthetic", text: 'Simulate the situation actively' },
    ],
  },
  {
    id: 152,
    question: 'During a quiz retake, you retain material when you:',
    options: [
      { style: "visual", text: 'Watch a short video walkthrough' },
      { style: "auditory", text: 'Use call-and-response practice' },
      { style: "kinesthetic", text: 'Rewrite and rework each step by hand' },
    ],
  },
  {
    id: 153,
    question: 'During a scholarship essay, you understand more when you:',
    options: [
      { style: "visual", text: 'Look at annotated examples' },
      { style: "auditory", text: 'Talk through the steps quietly' },
      { style: "kinesthetic", text: 'Build or manipulate something related' },
    ],
  },
  {
    id: 154,
    question: 'During a documentary watching, you prefer to:',
    options: [
      { style: "visual", text: 'Take screenshots and organize them' },
      { style: "auditory", text: 'Discuss it out loud with a partner' },
      { style: "kinesthetic", text: 'Practice by doing, not just reading' },
    ],
  },
  {
    id: 155,
    question: 'During a evening review, you stay engaged when you:',
    options: [
      { style: "visual", text: 'Study a visual summary before starting' },
      { style: "auditory", text: 'Explain it to someone verbally' },
      { style: "kinesthetic", text: 'Move between tasks with short breaks' },
    ],
  },
  {
    id: 156,
    question: 'During a art project, you retain material when you:',
    options: [
      { style: "visual", text: 'Create a visual mind map' },
      { style: "auditory", text: 'Hear it summarized in your own words' },
      { style: "kinesthetic", text: 'Work through problems physically' },
    ],
  },
  {
    id: 157,
    question: 'During a podcast learning, you stay engaged when you:',
    options: [
      { style: "visual", text: 'See it laid out with diagrams or highlights' },
      { style: "auditory", text: 'Listen to a spoken explanation' },
      { style: "kinesthetic", text: 'Try it hands-on right away' },
    ],
  },
  {
    id: 158,
    question: 'During a music practice, you understand more when you:',
    options: [
      { style: "visual", text: 'Use color-coded notes and charts' },
      { style: "auditory", text: 'Play an audio recap while reviewing' },
      { style: "kinesthetic", text: 'Learn through trial and error' },
    ],
  },
  {
    id: 159,
    question: 'During a psychology chapter, you prefer to:',
    options: [
      { style: "visual", text: 'Rely on written outlines and pictures' },
      { style: "auditory", text: 'Repeat key ideas aloud to yourself' },
      { style: "kinesthetic", text: 'Simulate the situation actively' },
    ],
  },
  {
    id: 160,
    question: 'During a college research, you understand more when you:',
    options: [
      { style: "visual", text: 'Watch a short video walkthrough' },
      { style: "auditory", text: 'Use call-and-response practice' },
      { style: "kinesthetic", text: 'Rewrite and rework each step by hand' },
    ],
  },
  {
    id: 161,
    question: 'During a flashcard drill, you understand more when you:',
    options: [
      { style: "visual", text: 'Look at annotated examples' },
      { style: "auditory", text: 'Talk through the steps quietly' },
      { style: "kinesthetic", text: 'Build or manipulate something related' },
    ],
  },
  {
    id: 162,
    question: 'During a book club meeting, you prefer to:',
    options: [
      { style: "visual", text: 'Take screenshots and organize them' },
      { style: "auditory", text: 'Discuss it out loud with a partner' },
      { style: "kinesthetic", text: 'Practice by doing, not just reading' },
    ],
  },
  {
    id: 163,
    question: 'During a quiz retake, you prefer to:',
    options: [
      { style: "visual", text: 'Study a visual summary before starting' },
      { style: "auditory", text: 'Explain it to someone verbally' },
      { style: "kinesthetic", text: 'Move between tasks with short breaks' },
    ],
  },
  {
    id: 164,
    question: 'During a statistics chapter, you prefer to:',
    options: [
      { style: "visual", text: 'Create a visual mind map' },
      { style: "auditory", text: 'Hear it summarized in your own words' },
      { style: "kinesthetic", text: 'Work through problems physically' },
    ],
  },
  {
    id: 165,
    question: 'During a history revision, you focus best when you:',
    options: [
      { style: "visual", text: 'See it laid out with diagrams or highlights' },
      { style: "auditory", text: 'Listen to a spoken explanation' },
      { style: "kinesthetic", text: 'Try it hands-on right away' },
    ],
  },
  {
    id: 166,
    question: 'During a book club meeting, you focus best when you:',
    options: [
      { style: "visual", text: 'Use color-coded notes and charts' },
      { style: "auditory", text: 'Play an audio recap while reviewing' },
      { style: "kinesthetic", text: 'Learn through trial and error' },
    ],
  },
  {
    id: 167,
    question: 'During a weekly recap, you prefer to:',
    options: [
      { style: "visual", text: 'Rely on written outlines and pictures' },
      { style: "auditory", text: 'Repeat key ideas aloud to yourself' },
      { style: "kinesthetic", text: 'Simulate the situation actively' },
    ],
  },
  {
    id: 168,
    question: 'During a reading comprehension drill, you prefer to:',
    options: [
      { style: "visual", text: 'Watch a short video walkthrough' },
      { style: "auditory", text: 'Use call-and-response practice' },
      { style: "kinesthetic", text: 'Rewrite and rework each step by hand' },
    ],
  },
  {
    id: 169,
    question: 'During a scholarship essay, you prefer to:',
    options: [
      { style: "visual", text: 'Look at annotated examples' },
      { style: "auditory", text: 'Talk through the steps quietly' },
      { style: "kinesthetic", text: 'Build or manipulate something related' },
    ],
  },
  {
    id: 170,
    question: 'During a coding practice, you prefer to:',
    options: [
      { style: "visual", text: 'Take screenshots and organize them' },
      { style: "auditory", text: 'Discuss it out loud with a partner' },
      { style: "kinesthetic", text: 'Practice by doing, not just reading' },
    ],
  },
  {
    id: 171,
    question: 'During a history revision, you prefer to:',
    options: [
      { style: "visual", text: 'Study a visual summary before starting' },
      { style: "auditory", text: 'Explain it to someone verbally' },
      { style: "kinesthetic", text: 'Move between tasks with short breaks' },
    ],
  },
  {
    id: 172,
    question: 'During a online course lecture, you prefer to:',
    options: [
      { style: "visual", text: 'Create a visual mind map' },
      { style: "auditory", text: 'Hear it summarized in your own words' },
      { style: "kinesthetic", text: 'Work through problems physically' },
    ],
  },
  {
    id: 173,
    question: 'During a morning study routine, you prefer to:',
    options: [
      { style: "visual", text: 'See it laid out with diagrams or highlights' },
      { style: "auditory", text: 'Listen to a spoken explanation' },
      { style: "kinesthetic", text: 'Try it hands-on right away' },
    ],
  },
  {
    id: 174,
    question: 'During a team project, you retain material when you:',
    options: [
      { style: "visual", text: 'Use color-coded notes and charts' },
      { style: "auditory", text: 'Play an audio recap while reviewing' },
      { style: "kinesthetic", text: 'Learn through trial and error' },
    ],
  },
  {
    id: 175,
    question: 'During a essay planning, you stay engaged when you:',
    options: [
      { style: "visual", text: 'Rely on written outlines and pictures' },
      { style: "auditory", text: 'Repeat key ideas aloud to yourself' },
      { style: "kinesthetic", text: 'Simulate the situation actively' },
    ],
  },
  {
    id: 176,
    question: 'During a final exam review, you prefer to:',
    options: [
      { style: "visual", text: 'Watch a short video walkthrough' },
      { style: "auditory", text: 'Use call-and-response practice' },
      { style: "kinesthetic", text: 'Rewrite and rework each step by hand' },
    ],
  },
  {
    id: 177,
    question: 'During a college research, you retain material when you:',
    options: [
      { style: "visual", text: 'Look at annotated examples' },
      { style: "auditory", text: 'Talk through the steps quietly' },
      { style: "kinesthetic", text: 'Build or manipulate something related' },
    ],
  },
  {
    id: 178,
    question: 'During a documentary watching, you retain material when you:',
    options: [
      { style: "visual", text: 'Take screenshots and organize them' },
      { style: "auditory", text: 'Discuss it out loud with a partner' },
      { style: "kinesthetic", text: 'Practice by doing, not just reading' },
    ],
  },
  {
    id: 179,
    question: 'During a presentation prep, you understand more when you:',
    options: [
      { style: "visual", text: 'Study a visual summary before starting' },
      { style: "auditory", text: 'Explain it to someone verbally' },
      { style: "kinesthetic", text: 'Move between tasks with short breaks' },
    ],
  },
  {
    id: 180,
    question: 'During a chemistry chapter, you prefer to:',
    options: [
      { style: "visual", text: 'Create a visual mind map' },
      { style: "auditory", text: 'Hear it summarized in your own words' },
      { style: "kinesthetic", text: 'Work through problems physically' },
    ],
  },
  {
    id: 181,
    question: 'During a psychology chapter, you retain material when you:',
    options: [
      { style: "visual", text: 'See it laid out with diagrams or highlights' },
      { style: "auditory", text: 'Listen to a spoken explanation' },
      { style: "kinesthetic", text: 'Try it hands-on right away' },
    ],
  },
  {
    id: 182,
    question: 'During a SAT prep session, you stay engaged when you:',
    options: [
      { style: "visual", text: 'Use color-coded notes and charts' },
      { style: "auditory", text: 'Play an audio recap while reviewing' },
      { style: "kinesthetic", text: 'Learn through trial and error' },
    ],
  },
  {
    id: 183,
    question: 'During a interview prep, you focus best when you:',
    options: [
      { style: "visual", text: 'Rely on written outlines and pictures' },
      { style: "auditory", text: 'Repeat key ideas aloud to yourself' },
      { style: "kinesthetic", text: 'Simulate the situation actively' },
    ],
  },
  {
    id: 184,
    question: 'During a chemistry chapter, you retain material when you:',
    options: [
      { style: "visual", text: 'Watch a short video walkthrough' },
      { style: "auditory", text: 'Use call-and-response practice' },
      { style: "kinesthetic", text: 'Rewrite and rework each step by hand' },
    ],
  },
  {
    id: 185,
    question: 'During a note-taking session, you retain material when you:',
    options: [
      { style: "visual", text: 'Look at annotated examples' },
      { style: "auditory", text: 'Talk through the steps quietly' },
      { style: "kinesthetic", text: 'Build or manipulate something related' },
    ],
  },
  {
    id: 186,
    question: 'During a review of past mistakes, you prefer to:',
    options: [
      { style: "visual", text: 'Take screenshots and organize them' },
      { style: "auditory", text: 'Discuss it out loud with a partner' },
      { style: "kinesthetic", text: 'Practice by doing, not just reading' },
    ],
  },
  {
    id: 187,
    question: 'During a peer tutoring session, you stay engaged when you:',
    options: [
      { style: "visual", text: 'Study a visual summary before starting' },
      { style: "auditory", text: 'Explain it to someone verbally' },
      { style: "kinesthetic", text: 'Move between tasks with short breaks' },
    ],
  },
  {
    id: 188,
    question: 'During a field trip, you retain material when you:',
    options: [
      { style: "visual", text: 'Create a visual mind map' },
      { style: "auditory", text: 'Hear it summarized in your own words' },
      { style: "kinesthetic", text: 'Work through problems physically' },
    ],
  },
  {
    id: 189,
    question: 'During a statistics chapter, you retain material when you:',
    options: [
      { style: "visual", text: 'See it laid out with diagrams or highlights' },
      { style: "auditory", text: 'Listen to a spoken explanation' },
      { style: "kinesthetic", text: 'Try it hands-on right away' },
    ],
  },
  {
    id: 190,
    question: 'During a algebra practice, you stay engaged when you:',
    options: [
      { style: "visual", text: 'Use color-coded notes and charts' },
      { style: "auditory", text: 'Play an audio recap while reviewing' },
      { style: "kinesthetic", text: 'Learn through trial and error' },
    ],
  },
  {
    id: 191,
    question: 'During a presentation prep, you stay engaged when you:',
    options: [
      { style: "visual", text: 'Rely on written outlines and pictures' },
      { style: "auditory", text: 'Repeat key ideas aloud to yourself' },
      { style: "kinesthetic", text: 'Simulate the situation actively' },
    ],
  },
  {
    id: 192,
    question: 'During a podcast learning, you retain material when you:',
    options: [
      { style: "visual", text: 'Watch a short video walkthrough' },
      { style: "auditory", text: 'Use call-and-response practice' },
      { style: "kinesthetic", text: 'Rewrite and rework each step by hand' },
    ],
  },
  {
    id: 193,
    question: 'During a science lab, you retain material when you:',
    options: [
      { style: "visual", text: 'Look at annotated examples' },
      { style: "auditory", text: 'Talk through the steps quietly' },
      { style: "kinesthetic", text: 'Build or manipulate something related' },
    ],
  },
  {
    id: 194,
    question: 'During a language learning, you prefer to:',
    options: [
      { style: "visual", text: 'Take screenshots and organize them' },
      { style: "auditory", text: 'Discuss it out loud with a partner' },
      { style: "kinesthetic", text: 'Practice by doing, not just reading' },
    ],
  },
  {
    id: 195,
    question: 'During a flashcard drill, you stay engaged when you:',
    options: [
      { style: "visual", text: 'Study a visual summary before starting' },
      { style: "auditory", text: 'Explain it to someone verbally' },
      { style: "kinesthetic", text: 'Move between tasks with short breaks' },
    ],
  },
  {
    id: 196,
    question: 'During a flashcard drill, you retain material when you:',
    options: [
      { style: "visual", text: 'Create a visual mind map' },
      { style: "auditory", text: 'Hear it summarized in your own words' },
      { style: "kinesthetic", text: 'Work through problems physically' },
    ],
  },
  {
    id: 197,
    question: 'During a algebra practice, you understand more when you:',
    options: [
      { style: "visual", text: 'See it laid out with diagrams or highlights' },
      { style: "auditory", text: 'Listen to a spoken explanation' },
      { style: "kinesthetic", text: 'Try it hands-on right away' },
    ],
  },
  {
    id: 198,
    question: 'During a psychology chapter, you understand more when you:',
    options: [
      { style: "visual", text: 'Use color-coded notes and charts' },
      { style: "auditory", text: 'Play an audio recap while reviewing' },
      { style: "kinesthetic", text: 'Learn through trial and error' },
    ],
  },
  {
    id: 199,
    question: 'During a peer tutoring session, you understand more when you:',
    options: [
      { style: "visual", text: 'Rely on written outlines and pictures' },
      { style: "auditory", text: 'Repeat key ideas aloud to yourself' },
      { style: "kinesthetic", text: 'Simulate the situation actively' },
    ],
  },
  {
    id: 200,
    question: 'During a midterm cramming, you understand more when you:',
    options: [
      { style: "visual", text: 'Watch a short video walkthrough' },
      { style: "auditory", text: 'Use call-and-response practice' },
      { style: "kinesthetic", text: 'Rewrite and rework each step by hand' },
    ],
  },
  {
    id: 201,
    question: 'During a documentary watching, you understand more when you:',
    options: [
      { style: "visual", text: 'Look at annotated examples' },
      { style: "auditory", text: 'Talk through the steps quietly' },
      { style: "kinesthetic", text: 'Build or manipulate something related' },
    ],
  },
  {
    id: 202,
    question: 'During a biology chapter, you retain material when you:',
    options: [
      { style: "visual", text: 'Take screenshots and organize them' },
      { style: "auditory", text: 'Discuss it out loud with a partner' },
      { style: "kinesthetic", text: 'Practice by doing, not just reading' },
    ],
  },
  {
    id: 203,
    question: 'During a science lab, you understand more when you:',
    options: [
      { style: "visual", text: 'Study a visual summary before starting' },
      { style: "auditory", text: 'Explain it to someone verbally' },
      { style: "kinesthetic", text: 'Move between tasks with short breaks' },
    ],
  },
  {
    id: 204,
    question: 'During a evening review, you prefer to:',
    options: [
      { style: "visual", text: 'Create a visual mind map' },
      { style: "auditory", text: 'Hear it summarized in your own words' },
      { style: "kinesthetic", text: 'Work through problems physically' },
    ],
  },
  {
    id: 205,
    question: 'During a biology chapter, you prefer to:',
    options: [
      { style: "visual", text: 'See it laid out with diagrams or highlights' },
      { style: "auditory", text: 'Listen to a spoken explanation' },
      { style: "kinesthetic", text: 'Try it hands-on right away' },
    ],
  },
  {
    id: 206,
    question: 'During a scholarship essay, you retain material when you:',
    options: [
      { style: "visual", text: 'Use color-coded notes and charts' },
      { style: "auditory", text: 'Play an audio recap while reviewing' },
      { style: "kinesthetic", text: 'Learn through trial and error' },
    ],
  },
  {
    id: 207,
    question: 'During a quiz retake, you stay engaged when you:',
    options: [
      { style: "visual", text: 'Rely on written outlines and pictures' },
      { style: "auditory", text: 'Repeat key ideas aloud to yourself' },
      { style: "kinesthetic", text: 'Simulate the situation actively' },
    ],
  },
  {
    id: 208,
    question: 'During a coding practice, you understand more when you:',
    options: [
      { style: "visual", text: 'Watch a short video walkthrough' },
      { style: "auditory", text: 'Use call-and-response practice' },
      { style: "kinesthetic", text: 'Rewrite and rework each step by hand' },
    ],
  },
  {
    id: 209,
    question: 'During a coding practice, you focus best when you:',
    options: [
      { style: "visual", text: 'Look at annotated examples' },
      { style: "auditory", text: 'Talk through the steps quietly' },
      { style: "kinesthetic", text: 'Build or manipulate something related' },
    ],
  },
  {
    id: 210,
    question: 'During a college research, you stay engaged when you:',
    options: [
      { style: "visual", text: 'Take screenshots and organize them' },
      { style: "auditory", text: 'Discuss it out loud with a partner' },
      { style: "kinesthetic", text: 'Practice by doing, not just reading' },
    ],
  },
  {
    id: 211,
    question: 'During a note-taking session, you stay engaged when you:',
    options: [
      { style: "visual", text: 'Study a visual summary before starting' },
      { style: "auditory", text: 'Explain it to someone verbally' },
      { style: "kinesthetic", text: 'Move between tasks with short breaks' },
    ],
  },
  {
    id: 212,
    question: 'During a science lab, you prefer to:',
    options: [
      { style: "visual", text: 'Create a visual mind map' },
      { style: "auditory", text: 'Hear it summarized in your own words' },
      { style: "kinesthetic", text: 'Work through problems physically' },
    ],
  },
  {
    id: 213,
    question: 'During a algebra practice, you prefer to:',
    options: [
      { style: "visual", text: 'See it laid out with diagrams or highlights' },
      { style: "auditory", text: 'Listen to a spoken explanation' },
      { style: "kinesthetic", text: 'Try it hands-on right away' },
    ],
  },
  {
    id: 214,
    question: 'During a museum visit, you understand more when you:',
    options: [
      { style: "visual", text: 'Use color-coded notes and charts' },
      { style: "auditory", text: 'Play an audio recap while reviewing' },
      { style: "kinesthetic", text: 'Learn through trial and error' },
    ],
  },
  {
    id: 215,
    question: 'During a midterm cramming, you focus best when you:',
    options: [
      { style: "visual", text: 'Rely on written outlines and pictures' },
      { style: "auditory", text: 'Repeat key ideas aloud to yourself' },
      { style: "kinesthetic", text: 'Simulate the situation actively' },
    ],
  },
  {
    id: 216,
    question: 'During a grammar review, you retain material when you:',
    options: [
      { style: "visual", text: 'Watch a short video walkthrough' },
      { style: "auditory", text: 'Use call-and-response practice' },
      { style: "kinesthetic", text: 'Rewrite and rework each step by hand' },
    ],
  },
  {
    id: 217,
    question: 'During a biology chapter, you understand more when you:',
    options: [
      { style: "visual", text: 'Look at annotated examples' },
      { style: "auditory", text: 'Talk through the steps quietly' },
      { style: "kinesthetic", text: 'Build or manipulate something related' },
    ],
  },
  {
    id: 218,
    question: 'During a college research, you focus best when you:',
    options: [
      { style: "visual", text: 'Take screenshots and organize them' },
      { style: "auditory", text: 'Discuss it out loud with a partner' },
      { style: "kinesthetic", text: 'Practice by doing, not just reading' },
    ],
  },
  {
    id: 219,
    question: 'During a vocabulary study, you focus best when you:',
    options: [
      { style: "visual", text: 'Study a visual summary before starting' },
      { style: "auditory", text: 'Explain it to someone verbally' },
      { style: "kinesthetic", text: 'Move between tasks with short breaks' },
    ],
  },
  {
    id: 220,
    question: 'During a history revision, you understand more when you:',
    options: [
      { style: "visual", text: 'Create a visual mind map' },
      { style: "auditory", text: 'Hear it summarized in your own words' },
      { style: "kinesthetic", text: 'Work through problems physically' },
    ],
  },
  {
    id: 221,
    question: 'During a music practice, you prefer to:',
    options: [
      { style: "visual", text: 'See it laid out with diagrams or highlights' },
      { style: "auditory", text: 'Listen to a spoken explanation' },
      { style: "kinesthetic", text: 'Try it hands-on right away' },
    ],
  },
  {
    id: 222,
    question: 'During a evening review, you retain material when you:',
    options: [
      { style: "visual", text: 'Use color-coded notes and charts' },
      { style: "auditory", text: 'Play an audio recap while reviewing' },
      { style: "kinesthetic", text: 'Learn through trial and error' },
    ],
  },
  {
    id: 223,
    question: 'During a documentary watching, you focus best when you:',
    options: [
      { style: "visual", text: 'Rely on written outlines and pictures' },
      { style: "auditory", text: 'Repeat key ideas aloud to yourself' },
      { style: "kinesthetic", text: 'Simulate the situation actively' },
    ],
  },
  {
    id: 224,
    question: 'During a art project, you stay engaged when you:',
    options: [
      { style: "visual", text: 'Watch a short video walkthrough' },
      { style: "auditory", text: 'Use call-and-response practice' },
      { style: "kinesthetic", text: 'Rewrite and rework each step by hand' },
    ],
  },
  {
    id: 225,
    question: 'During a weekly recap, you retain material when you:',
    options: [
      { style: "visual", text: 'Look at annotated examples' },
      { style: "auditory", text: 'Talk through the steps quietly' },
      { style: "kinesthetic", text: 'Build or manipulate something related' },
    ],
  },
  {
    id: 226,
    question: 'During a peer tutoring session, you retain material when you:',
    options: [
      { style: "visual", text: 'Take screenshots and organize them' },
      { style: "auditory", text: 'Discuss it out loud with a partner' },
      { style: "kinesthetic", text: 'Practice by doing, not just reading' },
    ],
  },
  {
    id: 227,
    question: 'During a museum visit, you focus best when you:',
    options: [
      { style: "visual", text: 'Study a visual summary before starting' },
      { style: "auditory", text: 'Explain it to someone verbally' },
      { style: "kinesthetic", text: 'Move between tasks with short breaks' },
    ],
  },
  {
    id: 228,
    question: 'During a science lab, you stay engaged when you:',
    options: [
      { style: "visual", text: 'Create a visual mind map' },
      { style: "auditory", text: 'Hear it summarized in your own words' },
      { style: "kinesthetic", text: 'Work through problems physically' },
    ],
  },
  {
    id: 229,
    question: 'During a review of past mistakes, you focus best when you:',
    options: [
      { style: "visual", text: 'See it laid out with diagrams or highlights' },
      { style: "auditory", text: 'Listen to a spoken explanation' },
      { style: "kinesthetic", text: 'Try it hands-on right away' },
    ],
  },
  {
    id: 230,
    question: 'During a midterm cramming, you retain material when you:',
    options: [
      { style: "visual", text: 'Use color-coded notes and charts' },
      { style: "auditory", text: 'Play an audio recap while reviewing' },
      { style: "kinesthetic", text: 'Learn through trial and error' },
    ],
  },
  {
    id: 231,
    question: 'During a vocabulary study, you prefer to:',
    options: [
      { style: "visual", text: 'Rely on written outlines and pictures' },
      { style: "auditory", text: 'Repeat key ideas aloud to yourself' },
      { style: "kinesthetic", text: 'Simulate the situation actively' },
    ],
  },
  {
    id: 232,
    question: 'During a language learning, you stay engaged when you:',
    options: [
      { style: "visual", text: 'Watch a short video walkthrough' },
      { style: "auditory", text: 'Use call-and-response practice' },
      { style: "kinesthetic", text: 'Rewrite and rework each step by hand' },
    ],
  },
  {
    id: 233,
    question: 'During a evening review, you understand more when you:',
    options: [
      { style: "visual", text: 'Look at annotated examples' },
      { style: "auditory", text: 'Talk through the steps quietly' },
      { style: "kinesthetic", text: 'Build or manipulate something related' },
    ],
  },
  {
    id: 234,
    question: 'During a language learning, you understand more when you:',
    options: [
      { style: "visual", text: 'Take screenshots and organize them' },
      { style: "auditory", text: 'Discuss it out loud with a partner' },
      { style: "kinesthetic", text: 'Practice by doing, not just reading' },
    ],
  },
  {
    id: 235,
    question: 'During a art project, you focus best when you:',
    options: [
      { style: "visual", text: 'Study a visual summary before starting' },
      { style: "auditory", text: 'Explain it to someone verbally' },
      { style: "kinesthetic", text: 'Move between tasks with short breaks' },
    ],
  },
  {
    id: 236,
    question: 'During a book club meeting, you stay engaged when you:',
    options: [
      { style: "visual", text: 'Create a visual mind map' },
      { style: "auditory", text: 'Hear it summarized in your own words' },
      { style: "kinesthetic", text: 'Work through problems physically' },
    ],
  },
  {
    id: 237,
    question: 'During a presentation prep, you focus best when you:',
    options: [
      { style: "visual", text: 'See it laid out with diagrams or highlights' },
      { style: "auditory", text: 'Listen to a spoken explanation' },
      { style: "kinesthetic", text: 'Try it hands-on right away' },
    ],
  },
  {
    id: 238,
    question: 'During a presentation prep, you retain material when you:',
    options: [
      { style: "visual", text: 'Use color-coded notes and charts' },
      { style: "auditory", text: 'Play an audio recap while reviewing' },
      { style: "kinesthetic", text: 'Learn through trial and error' },
    ],
  },
  {
    id: 239,
    question: 'During a team project, you prefer to:',
    options: [
      { style: "visual", text: 'Rely on written outlines and pictures' },
      { style: "auditory", text: 'Repeat key ideas aloud to yourself' },
      { style: "kinesthetic", text: 'Simulate the situation actively' },
    ],
  },
  {
    id: 240,
    question: 'During a interview prep, you retain material when you:',
    options: [
      { style: "visual", text: 'Watch a short video walkthrough' },
      { style: "auditory", text: 'Use call-and-response practice' },
      { style: "kinesthetic", text: 'Rewrite and rework each step by hand' },
    ],
  },
  {
    id: 241,
    question: 'During a final exam review, you focus best when you:',
    options: [
      { style: "visual", text: 'Look at annotated examples' },
      { style: "auditory", text: 'Talk through the steps quietly' },
      { style: "kinesthetic", text: 'Build or manipulate something related' },
    ],
  },
  {
    id: 242,
    question: 'During a review of past mistakes, you stay engaged when you:',
    options: [
      { style: "visual", text: 'Take screenshots and organize them' },
      { style: "auditory", text: 'Discuss it out loud with a partner' },
      { style: "kinesthetic", text: 'Practice by doing, not just reading' },
    ],
  },
  {
    id: 243,
    question: 'During a history revision, you stay engaged when you:',
    options: [
      { style: "visual", text: 'Study a visual summary before starting' },
      { style: "auditory", text: 'Explain it to someone verbally' },
      { style: "kinesthetic", text: 'Move between tasks with short breaks' },
    ],
  },
  {
    id: 244,
    question: 'During a peer tutoring session, you prefer to:',
    options: [
      { style: "visual", text: 'Create a visual mind map' },
      { style: "auditory", text: 'Hear it summarized in your own words' },
      { style: "kinesthetic", text: 'Work through problems physically' },
    ],
  },
  {
    id: 245,
    question: 'During a online course lecture, you focus best when you:',
    options: [
      { style: "visual", text: 'See it laid out with diagrams or highlights' },
      { style: "auditory", text: 'Listen to a spoken explanation' },
      { style: "kinesthetic", text: 'Try it hands-on right away' },
    ],
  },
  {
    id: 246,
    question: 'During a grammar review, you focus best when you:',
    options: [
      { style: "visual", text: 'Use color-coded notes and charts' },
      { style: "auditory", text: 'Play an audio recap while reviewing' },
      { style: "kinesthetic", text: 'Learn through trial and error' },
    ],
  },
  {
    id: 247,
    question: 'During a weekend study block, you prefer to:',
    options: [
      { style: "visual", text: 'Rely on written outlines and pictures' },
      { style: "auditory", text: 'Repeat key ideas aloud to yourself' },
      { style: "kinesthetic", text: 'Simulate the situation actively' },
    ],
  },
  {
    id: 248,
    question: 'During a museum visit, you stay engaged when you:',
    options: [
      { style: "visual", text: 'Watch a short video walkthrough' },
      { style: "auditory", text: 'Use call-and-response practice' },
      { style: "kinesthetic", text: 'Rewrite and rework each step by hand' },
    ],
  },
  {
    id: 249,
    question: 'During a college research, you prefer to:',
    options: [
      { style: "visual", text: 'Look at annotated examples' },
      { style: "auditory", text: 'Talk through the steps quietly' },
      { style: "kinesthetic", text: 'Build or manipulate something related' },
    ],
  },
  {
    id: 250,
    question: 'During a chemistry chapter, you understand more when you:',
    options: [
      { style: "visual", text: 'Take screenshots and organize them' },
      { style: "auditory", text: 'Discuss it out loud with a partner' },
      { style: "kinesthetic", text: 'Practice by doing, not just reading' },
    ],
  },
  {
    id: 251,
    question: 'During a weekly recap, you focus best when you:',
    options: [
      { style: "visual", text: 'Study a visual summary before starting' },
      { style: "auditory", text: 'Explain it to someone verbally' },
      { style: "kinesthetic", text: 'Move between tasks with short breaks' },
    ],
  },
  {
    id: 252,
    question: 'During a morning study routine, you understand more when you:',
    options: [
      { style: "visual", text: 'Create a visual mind map' },
      { style: "auditory", text: 'Hear it summarized in your own words' },
      { style: "kinesthetic", text: 'Work through problems physically' },
    ],
  },
  {
    id: 253,
    question: 'During a essay planning, you focus best when you:',
    options: [
      { style: "visual", text: 'See it laid out with diagrams or highlights' },
      { style: "auditory", text: 'Listen to a spoken explanation' },
      { style: "kinesthetic", text: 'Try it hands-on right away' },
    ],
  },
  {
    id: 254,
    question: 'During a chemistry chapter, you focus best when you:',
    options: [
      { style: "visual", text: 'Use color-coded notes and charts' },
      { style: "auditory", text: 'Play an audio recap while reviewing' },
      { style: "kinesthetic", text: 'Learn through trial and error' },
    ],
  },
  {
    id: 255,
    question: 'During a weekend study block, you understand more when you:',
    options: [
      { style: "visual", text: 'Rely on written outlines and pictures' },
      { style: "auditory", text: 'Repeat key ideas aloud to yourself' },
      { style: "kinesthetic", text: 'Simulate the situation actively' },
    ],
  },
  {
    id: 256,
    question: 'During a art project, you understand more when you:',
    options: [
      { style: "visual", text: 'Watch a short video walkthrough' },
      { style: "auditory", text: 'Use call-and-response practice' },
      { style: "kinesthetic", text: 'Rewrite and rework each step by hand' },
    ],
  },
  {
    id: 257,
    question: 'During a morning study routine, you focus best when you:',
    options: [
      { style: "visual", text: 'Look at annotated examples' },
      { style: "auditory", text: 'Talk through the steps quietly' },
      { style: "kinesthetic", text: 'Build or manipulate something related' },
    ],
  },
  {
    id: 258,
    question: 'During a geometry review, you prefer to:',
    options: [
      { style: "visual", text: 'Take screenshots and organize them' },
      { style: "auditory", text: 'Discuss it out loud with a partner' },
      { style: "kinesthetic", text: 'Practice by doing, not just reading' },
    ],
  },
  {
    id: 259,
    question: 'During a final exam review, you understand more when you:',
    options: [
      { style: "visual", text: 'Study a visual summary before starting' },
      { style: "auditory", text: 'Explain it to someone verbally' },
      { style: "kinesthetic", text: 'Move between tasks with short breaks' },
    ],
  },
  {
    id: 260,
    question: 'During a statistics chapter, you focus best when you:',
    options: [
      { style: "visual", text: 'Create a visual mind map' },
      { style: "auditory", text: 'Hear it summarized in your own words' },
      { style: "kinesthetic", text: 'Work through problems physically' },
    ],
  },
  {
    id: 261,
    question: 'During a podcast learning, you understand more when you:',
    options: [
      { style: "visual", text: 'See it laid out with diagrams or highlights' },
      { style: "auditory", text: 'Listen to a spoken explanation' },
      { style: "kinesthetic", text: 'Try it hands-on right away' },
    ],
  },
  {
    id: 262,
    question: 'During a coding practice, you retain material when you:',
    options: [
      { style: "visual", text: 'Use color-coded notes and charts' },
      { style: "auditory", text: 'Play an audio recap while reviewing' },
      { style: "kinesthetic", text: 'Learn through trial and error' },
    ],
  },
  {
    id: 263,
    question: 'During a geometry review, you retain material when you:',
    options: [
      { style: "visual", text: 'Rely on written outlines and pictures' },
      { style: "auditory", text: 'Repeat key ideas aloud to yourself' },
      { style: "kinesthetic", text: 'Simulate the situation actively' },
    ],
  },
  {
    id: 264,
    question: 'During a weekend study block, you stay engaged when you:',
    options: [
      { style: "visual", text: 'Watch a short video walkthrough' },
      { style: "auditory", text: 'Use call-and-response practice' },
      { style: "kinesthetic", text: 'Rewrite and rework each step by hand' },
    ],
  },
  {
    id: 265,
    question: 'During a reading comprehension drill, you focus best when you:',
    options: [
      { style: "visual", text: 'Look at annotated examples' },
      { style: "auditory", text: 'Talk through the steps quietly' },
      { style: "kinesthetic", text: 'Build or manipulate something related' },
    ],
  },
  {
    id: 266,
    question: 'During a psychology chapter, you focus best when you:',
    options: [
      { style: "visual", text: 'Take screenshots and organize them' },
      { style: "auditory", text: 'Discuss it out loud with a partner' },
      { style: "kinesthetic", text: 'Practice by doing, not just reading' },
    ],
  },
  {
    id: 267,
    question: 'During a field trip, you prefer to:',
    options: [
      { style: "visual", text: 'Study a visual summary before starting' },
      { style: "auditory", text: 'Explain it to someone verbally' },
      { style: "kinesthetic", text: 'Move between tasks with short breaks' },
    ],
  },
  {
    id: 268,
    question: 'During a field trip, you stay engaged when you:',
    options: [
      { style: "visual", text: 'Create a visual mind map' },
      { style: "auditory", text: 'Hear it summarized in your own words' },
      { style: "kinesthetic", text: 'Work through problems physically' },
    ],
  },
  {
    id: 269,
    question: 'During a peer tutoring session, you focus best when you:',
    options: [
      { style: "visual", text: 'See it laid out with diagrams or highlights' },
      { style: "auditory", text: 'Listen to a spoken explanation' },
      { style: "kinesthetic", text: 'Try it hands-on right away' },
    ],
  },
  {
    id: 270,
    question: 'During a morning study routine, you stay engaged when you:',
    options: [
      { style: "visual", text: 'Use color-coded notes and charts' },
      { style: "auditory", text: 'Play an audio recap while reviewing' },
      { style: "kinesthetic", text: 'Learn through trial and error' },
    ],
  },
  {
    id: 271,
    question: 'During a online course lecture, you stay engaged when you:',
    options: [
      { style: "visual", text: 'Rely on written outlines and pictures' },
      { style: "auditory", text: 'Repeat key ideas aloud to yourself' },
      { style: "kinesthetic", text: 'Simulate the situation actively' },
    ],
  },
  {
    id: 272,
    question: 'During a museum visit, you prefer to:',
    options: [
      { style: "visual", text: 'Watch a short video walkthrough' },
      { style: "auditory", text: 'Use call-and-response practice' },
      { style: "kinesthetic", text: 'Rewrite and rework each step by hand' },
    ],
  },
  {
    id: 273,
    question: 'During a flashcard drill, you prefer to:',
    options: [
      { style: "visual", text: 'Look at annotated examples' },
      { style: "auditory", text: 'Talk through the steps quietly' },
      { style: "kinesthetic", text: 'Build or manipulate something related' },
    ],
  },
  {
    id: 274,
    question: 'During a flashcard drill, you focus best when you:',
    options: [
      { style: "visual", text: 'Take screenshots and organize them' },
      { style: "auditory", text: 'Discuss it out loud with a partner' },
      { style: "kinesthetic", text: 'Practice by doing, not just reading' },
    ],
  },
  {
    id: 275,
    question: 'During a psychology chapter, you stay engaged when you:',
    options: [
      { style: "visual", text: 'Study a visual summary before starting' },
      { style: "auditory", text: 'Explain it to someone verbally' },
      { style: "kinesthetic", text: 'Move between tasks with short breaks' },
    ],
  },
  {
    id: 276,
    question: 'During a geometry review, you focus best when you:',
    options: [
      { style: "visual", text: 'Create a visual mind map' },
      { style: "auditory", text: 'Hear it summarized in your own words' },
      { style: "kinesthetic", text: 'Work through problems physically' },
    ],
  },
  {
    id: 277,
    question: 'During a weekend study block, you retain material when you:',
    options: [
      { style: "visual", text: 'See it laid out with diagrams or highlights' },
      { style: "auditory", text: 'Listen to a spoken explanation' },
      { style: "kinesthetic", text: 'Try it hands-on right away' },
    ],
  },
  {
    id: 278,
    question: 'During a grammar review, you prefer to:',
    options: [
      { style: "visual", text: 'Use color-coded notes and charts' },
      { style: "auditory", text: 'Play an audio recap while reviewing' },
      { style: "kinesthetic", text: 'Learn through trial and error' },
    ],
  },
  {
    id: 279,
    question: 'During a interview prep, you understand more when you:',
    options: [
      { style: "visual", text: 'Rely on written outlines and pictures' },
      { style: "auditory", text: 'Repeat key ideas aloud to yourself' },
      { style: "kinesthetic", text: 'Simulate the situation actively' },
    ],
  },
  {
    id: 280,
    question: 'During a weekend study block, you focus best when you:',
    options: [
      { style: "visual", text: 'Watch a short video walkthrough' },
      { style: "auditory", text: 'Use call-and-response practice' },
      { style: "kinesthetic", text: 'Rewrite and rework each step by hand' },
    ],
  },
  {
    id: 281,
    question: 'During a vocabulary study, you understand more when you:',
    options: [
      { style: "visual", text: 'Look at annotated examples' },
      { style: "auditory", text: 'Talk through the steps quietly' },
      { style: "kinesthetic", text: 'Build or manipulate something related' },
    ],
  },
  {
    id: 282,
    question: 'During a language learning, you focus best when you:',
    options: [
      { style: "visual", text: 'Take screenshots and organize them' },
      { style: "auditory", text: 'Discuss it out loud with a partner' },
      { style: "kinesthetic", text: 'Practice by doing, not just reading' },
    ],
  },
  {
    id: 283,
    question: 'During a grammar review, you stay engaged when you:',
    options: [
      { style: "visual", text: 'Study a visual summary before starting' },
      { style: "auditory", text: 'Explain it to someone verbally' },
      { style: "kinesthetic", text: 'Move between tasks with short breaks' },
    ],
  },
  {
    id: 284,
    question: 'During a interview prep, you stay engaged when you:',
    options: [
      { style: "visual", text: 'Create a visual mind map' },
      { style: "auditory", text: 'Hear it summarized in your own words' },
      { style: "kinesthetic", text: 'Work through problems physically' },
    ],
  },
  {
    id: 285,
    question: 'During a debate prep, you focus best when you:',
    options: [
      { style: "visual", text: 'See it laid out with diagrams or highlights' },
      { style: "auditory", text: 'Listen to a spoken explanation' },
      { style: "kinesthetic", text: 'Try it hands-on right away' },
    ],
  },
  {
    id: 286,
    question: 'During a vocabulary study, you stay engaged when you:',
    options: [
      { style: "visual", text: 'Use color-coded notes and charts' },
      { style: "auditory", text: 'Play an audio recap while reviewing' },
      { style: "kinesthetic", text: 'Learn through trial and error' },
    ],
  },
  {
    id: 287,
    question: 'During a algebra practice, you retain material when you:',
    options: [
      { style: "visual", text: 'Rely on written outlines and pictures' },
      { style: "auditory", text: 'Repeat key ideas aloud to yourself' },
      { style: "kinesthetic", text: 'Simulate the situation actively' },
    ],
  },
  {
    id: 288,
    question: 'During a history revision, you retain material when you:',
    options: [
      { style: "visual", text: 'Watch a short video walkthrough' },
      { style: "auditory", text: 'Use call-and-response practice' },
      { style: "kinesthetic", text: 'Rewrite and rework each step by hand' },
    ],
  },
  {
    id: 289,
    question: 'During a review of past mistakes, you retain material when you:',
    options: [
      { style: "visual", text: 'Look at annotated examples' },
      { style: "auditory", text: 'Talk through the steps quietly' },
      { style: "kinesthetic", text: 'Build or manipulate something related' },
    ],
  },
  {
    id: 290,
    question: 'During a reading comprehension drill, you retain material when you:',
    options: [
      { style: "visual", text: 'Take screenshots and organize them' },
      { style: "auditory", text: 'Discuss it out loud with a partner' },
      { style: "kinesthetic", text: 'Practice by doing, not just reading' },
    ],
  },
  {
    id: 291,
    question: 'During a morning study routine, you retain material when you:',
    options: [
      { style: "visual", text: 'Study a visual summary before starting' },
      { style: "auditory", text: 'Explain it to someone verbally' },
      { style: "kinesthetic", text: 'Move between tasks with short breaks' },
    ],
  },
  {
    id: 292,
    question: 'During a book club meeting, you understand more when you:',
    options: [
      { style: "visual", text: 'Create a visual mind map' },
      { style: "auditory", text: 'Hear it summarized in your own words' },
      { style: "kinesthetic", text: 'Work through problems physically' },
    ],
  },
  {
    id: 293,
    question: 'During a vocabulary study, you retain material when you:',
    options: [
      { style: "visual", text: 'See it laid out with diagrams or highlights' },
      { style: "auditory", text: 'Listen to a spoken explanation' },
      { style: "kinesthetic", text: 'Try it hands-on right away' },
    ],
  },
  {
    id: 294,
    question: 'During a final exam review, you stay engaged when you:',
    options: [
      { style: "visual", text: 'Use color-coded notes and charts' },
      { style: "auditory", text: 'Play an audio recap while reviewing' },
      { style: "kinesthetic", text: 'Learn through trial and error' },
    ],
  },
  {
    id: 295,
    question: 'During a grammar review, you understand more when you:',
    options: [
      { style: "visual", text: 'Rely on written outlines and pictures' },
      { style: "auditory", text: 'Repeat key ideas aloud to yourself' },
      { style: "kinesthetic", text: 'Simulate the situation actively' },
    ],
  },
  {
    id: 296,
    question: 'During a reading comprehension drill, you stay engaged when you:',
    options: [
      { style: "visual", text: 'Watch a short video walkthrough' },
      { style: "auditory", text: 'Use call-and-response practice' },
      { style: "kinesthetic", text: 'Rewrite and rework each step by hand' },
    ],
  },
  {
    id: 297,
    question: 'During a quiz retake, you focus best when you:',
    options: [
      { style: "visual", text: 'Look at annotated examples' },
      { style: "auditory", text: 'Talk through the steps quietly' },
      { style: "kinesthetic", text: 'Build or manipulate something related' },
    ],
  },
  {
    id: 298,
    question: 'During a scholarship essay, you focus best when you:',
    options: [
      { style: "visual", text: 'Take screenshots and organize them' },
      { style: "auditory", text: 'Discuss it out loud with a partner' },
      { style: "kinesthetic", text: 'Practice by doing, not just reading' },
    ],
  },
  {
    id: 299,
    question: 'During a statistics chapter, you understand more when you:',
    options: [
      { style: "visual", text: 'Study a visual summary before starting' },
      { style: "auditory", text: 'Explain it to someone verbally' },
      { style: "kinesthetic", text: 'Move between tasks with short breaks' },
    ],
  },
  {
    id: 300,
    question: 'During a team project, you stay engaged when you:',
    options: [
      { style: "visual", text: 'Create a visual mind map' },
      { style: "auditory", text: 'Hear it summarized in your own words' },
      { style: "kinesthetic", text: 'Work through problems physically' },
    ],
  },
];
