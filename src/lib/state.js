import { SEED_STORY, SEED_CREDIT_MAP } from '../data/seed-story.js';

export const ST = {
  ep: 0,
  scene: 0,
  choices: {},
  audioOn: false,
  branch: null
};

export let CURRENT_STORY = SEED_STORY;
export let CURRENT_CREDIT_MAP = SEED_CREDIT_MAP;

export function setCurrentStory(story) { CURRENT_STORY = story; }
export function setCurrentCreditMap(map) { CURRENT_CREDIT_MAP = map; }
