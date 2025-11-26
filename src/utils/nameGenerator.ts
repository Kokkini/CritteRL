/**
 * NameGenerator - Generates random Reddit-style names (adjective + noun)
 */

const ADJECTIVES = [
  'Swift', 'Mighty', 'Clever', 'Brave', 'Fierce', 'Nimble', 'Agile', 'Bold',
  'Quick', 'Strong', 'Wise', 'Cunning', 'Fierce', 'Graceful', 'Powerful', 'Elite',
  'Ancient', 'Mystic', 'Wild', 'Tamed', 'Fierce', 'Gentle', 'Rapid', 'Steady',
  'Elegant', 'Rugged', 'Sleek', 'Sturdy', 'Vibrant', 'Calm', 'Energetic', 'Precise',
  'Adaptive', 'Resilient', 'Dynamic', 'Stable', 'Flexible', 'Robust', 'Smooth', 'Sharp'
];

const NOUNS = [
  'Runner', 'Walker', 'Jumper', 'Crawler', 'Glider', 'Dancer', 'Sprinter', 'Hopper',
  'Stalker', 'Hunter', 'Seeker', 'Finder', 'Tracker', 'Scout', 'Explorer', 'Pioneer',
  'Warrior', 'Fighter', 'Champion', 'Guardian', 'Defender', 'Protector', 'Sentinel', 'Knight',
  'Beast', 'Creature', 'Entity', 'Being', 'Organism', 'Specimen', 'Lifeform', 'Animal',
  'Machine', 'Engine', 'Motor', 'Device', 'Gadget', 'Tool', 'Apparatus', 'Contraption',
  'Spirit', 'Soul', 'Essence', 'Force', 'Power', 'Energy', 'Vitality', 'Strength'
];

/**
 * Generate a random Reddit-style name (adjective + noun)
 */
export function generateRandomName(): string {
  const adjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return `${adjective} ${noun}`;
}

