// Version 1 is a shared contract with the compatibility module and React team.
// Do not reorder IDs or reinterpret saved option values; introduce a new version.
const scenarios = [
  ['cleanliness', 'A shared counter is messy after dinner. When would you clean it?', ['Immediately', 'By the end of the day', 'Within a few days', 'During the weekly cleanup']],
  ['sleep', 'On a typical class night, when do you settle down to sleep?', ['Before 10 pm', 'Between 10 pm and midnight', 'Between midnight and 2 am', 'After 2 am']],
  ['noise', 'Your roommate is studying in the room. What sound level fits your usual routine?', ['Keep the room silent', 'Use headphones and keep conversation brief', 'Play quiet background audio', 'Continue normal music and conversation']],
  ['guests', 'How often would you normally invite guests into the shared room?', ['Never', 'About once a month', 'About once a week', 'Most days']],
  ['smoking', 'Which smoking or vaping routine describes you?', ['I do neither', 'Occasionally, outside only', 'Frequently, outside only', 'I would smoke or vape indoors']],
  ['sharing', 'Your roommate wants to use your belongings. What arrangement works for you?', ['Keep belongings separate', 'Ask permission each time', 'Share agreed everyday supplies', 'Share most everyday belongings freely']]
];

export const QUESTION_IDS = Object.freeze(scenarios.map(([id]) => id));
export const QUESTIONNAIRE_VERSION = 1;
export const questionnaire = Object.freeze({
  version: QUESTIONNAIRE_VERSION,
  questions: scenarios.map(([id, prompt, options]) => ({
    id, prompt, options: options.map((label, value) => ({ value, label }))
  }))
});
