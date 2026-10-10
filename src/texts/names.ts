/* ══════════════════════════════════════════════════════
   Signatures: "Gentle_Heron_42".
   Reddit-style Adjective_Noun_Number with a yoga and nature spin. Generated
   after payment, shuffled until it feels right, then fixed (like Reddit's
   generated usernames). Signs the mandala images texted back as prompts are
   answered. Stored as sms_subscribers.display_name by the texts service.
   ══════════════════════════════════════════════════════ */

const ADJECTIVES = [
  "Steady", "Gentle", "Grounded", "Rooted", "Still", "Soft", "Bright", "Patient",
  "Quiet", "Warm", "Calm", "Kind", "Light", "Slow", "Open", "Easeful",
  "Mindful", "Humble", "Brave", "Tender", "Restful", "Golden", "Morning", "Wandering",
  "Breathing", "Balanced", "Supple", "Awake", "Unhurried", "Honest",
];

const NOUNS = [
  "Lotus", "Heron", "Warrior", "Tree", "Mountain", "Breath", "Crane", "Pigeon",
  "Cobra", "Sunrise", "River", "Fern", "Moon", "Petal", "Sprout", "Eagle",
  "Camel", "Bridge", "Boat", "Dancer", "Garland", "Pebble", "Willow", "Sparrow",
  "Tortoise", "Firefly", "Cedar", "Lantern", "Meadow", "Tide", "Cloud", "Ember",
];

function pick<T>(list: readonly T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

/** A fresh name each call. The number keeps names distinct without being an id. */
export function generateJournalName(): string {
  const n = 10 + Math.floor(Math.random() * 90);
  return `${pick(ADJECTIVES)}_${pick(NOUNS)}_${n}`;
}

