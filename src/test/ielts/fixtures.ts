import type { WritingTask } from "@ielts/contract.ts";
import { getBankTask } from "@ielts/taskBank.ts";

export const OPINION_TASK = getBankTask("t2-opinion-03") as WritingTask;
export const LINE_TASK = getBankTask("ac-line-01") as WritingTask;
export const LETTER_TASK = getBankTask("gt-formal-01") as WritingTask;

/** A ~260-word Task 2 script with typical band-6 errors. */
export const OPINION_SCRIPT = `Nowadays, smartphones are everywhere and many children receive one before they are ten years old. Some people argue that children under twelve should not own a smartphone. I completely agree with this view, because the risks are greater than the benefits.

Firstly, smartphones can damage children's concentration. When a child have a phone in their pocket, they are constantly distracted by games and messages. For example, my younger brother used to spend three hours every evening on his phone instead of doing homework, and his marks dropped significantly. In addition, many apps are designed to be addictive, which makes it even harder for young children to control their use.

Secondly, smartphones expose children to dangers online. Children are not yet able to recognise harmful content or people who want to trick them. Moreover, social media can make them feel bad about their appearance, which is a serious problem for their mental health.

Some people say that children need phones for safety, so parents can contact them. However, a simple phone without internet access would solve this problem without the risks i mentioned above. Furthermore, schools can contact parents directly if something happens. Basic phones are also much cheaper, so families would save money as well as worry less.

In conclusion, I strongly believe that children under the age of twelve should not have smartphones. Parents should wait until their children are more mature and give them a basic phone for emergencies instead. This would protect children's concentration and their safety while still allowing families to stay in touch.`;

/** A valid model payload for OPINION_TASK / OPINION_SCRIPT. */
export function goodOpinionOutput(): Record<string, unknown> {
  return {
    variantDetected: "opinion",
    flags: [],
    checklist: [
      { id: "clear_position", met: "yes", note: "Position stated in the introduction and repeated in the conclusion." },
      { id: "answers_question", met: "yes", note: "Addresses children under twelve owning smartphones." },
      { id: "developed", met: "yes", note: "Main ideas are explained with examples." },
      { id: "conclusion", met: "yes", note: "Clear conclusion." },
    ],
    issues: [
      {
        quote: "When a child have a phone",
        criterion: "grammar",
        tag: "subject_verb_agreement",
        explanation: "'a child' is singular, so the verb must be 'has'.",
        suggestion: "When a child has a phone",
      },
      {
        quote: "the risks i mentioned",
        criterion: "grammar",
        tag: "spelling", // mapped to lexical by the server
        explanation: "The pronoun I is always a capital letter.",
        suggestion: "the risks I mentioned",
      },
      {
        quote: "This sentence is not in the script at all.",
        criterion: "lexical",
        tag: "word_choice",
        explanation: "Hallucinated.",
        suggestion: "Nothing.",
      },
    ],
    criteria: {
      task: {
        evidence: ["I completely agree with this view, because the risks are greater than the benefits."],
        rationale: "Clear position throughout; ideas relevant but the second body paragraph is under-developed.",
        band: 7,
        toNextBand: "Develop each main idea with a specific example.",
      },
      coherence: {
        evidence: ["Firstly, smartphones can damage children's concentration."],
        rationale: "Logical organisation, but connectors are somewhat mechanical.",
        band: 6.5,
        toNextBand: "Vary linking and use referencing.",
      },
      lexical: {
        evidence: ["his marks dropped significantly"],
        rationale: "Adequate range with some less common items.",
        band: 6.5,
        toNextBand: "Use more precise topic vocabulary.",
      },
      grammar: {
        evidence: ["When a child have a phone in their pocket"],
        rationale: "Mix of simple and complex forms with some errors.",
        band: 6,
        toNextBand: "Check subject-verb agreement.",
      },
    },
    strengths: ["Clear position", "Relevant personal example"],
    priorities: [{ title: "Develop ideas", why: "Thin paragraph limits Task Response.", how: "Add an example and a consequence." }],
    summary: "A clear, well-organised essay with a consistent position.",
    rewrite: {
      original:
        "Secondly, smartphones expose children to dangers online. Children are not yet able to recognise harmful content or people who want to trick them. Moreover, social media can make them feel bad about their appearance, which is a serious problem for their mental health.",
      improved: "Secondly, smartphones expose children to online dangers that they are not yet equipped to recognise.",
      changes: ["More precise vocabulary"],
    },
    modelAnswer: "",
    overall: 9, // a model-supplied overall must be ignored
  };
}
