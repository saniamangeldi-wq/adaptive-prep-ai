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

// Tier thresholds
export const VAK_TIER_QUESTIONS = {
  free: 15,    // tier_0 and tier_1
  pro: 30,     // tier_2
  elite: 50,   // tier_3
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
  switch (tier) {
    case "tier_3": return 7;
    case "tier_2": return 14;
    default: return 30;
  }
}

// Spatial visual indicator questions (for Elite sub-typing)
export const SPATIAL_VISUAL_QS = [1, 4, 17, 31, 41, 44, 47];
// Expressive auditory indicator questions
export const EXPRESSIVE_AUDITORY_QS = [16, 22, 27, 36, 39, 45];
// Physical kinesthetic indicator questions
export const PHYSICAL_KINESTHETIC_QS = [12, 20, 25, 43, 47];

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
];
