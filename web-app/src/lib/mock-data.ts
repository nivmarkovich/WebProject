// Mock Data Generator — 50 Israeli Volunteers with LoRa/Defibrillator Equipment
// Used by the seed script to populate PostgreSQL and MongoDB

export interface MockVolunteer {
  firstName: string;
  lastName: string;
  mobileNumber: string;
  loraId: string | null;
  hasDefibrillator: boolean;
  hasLora: boolean;
  // Telemetry (for MongoDB)
  lat: number;
  lng: number;
  batteryLevel: number;
  lastTransmissionMinutesAgo: number;
  signalStrength: number;
  meshHops: number;
}

// Hebrew first names (common Israeli names)
const FIRST_NAMES = [
  'דוד', 'משה', 'יוסף', 'אברהם', 'יעקב', 'שמעון', 'דניאל', 'אלון',
  'עמית', 'נועם', 'איתן', 'רועי', 'גיל', 'אור', 'תומר', 'עידו',
  'שחר', 'ניב', 'יונתן', 'אסף', 'מיכאל', 'רפאל', 'גבריאל', 'אריאל',
  'שלומי', 'רן', 'אלי', 'בועז', 'עומר', 'ליאור',
  'שרה', 'רחל', 'לאה', 'מרים', 'חנה', 'דבורה', 'נעמי', 'רות',
  'תמר', 'שירה', 'נועה', 'מאיה', 'יעל', 'דנה', 'הדר', 'ליאת',
  'עדי', 'שני', 'אורלי', 'רוני',
];

const LAST_NAMES = [
  'כהן', 'לוי', 'מזרחי', 'פרץ', 'ביטון', 'דהן', 'אברהם', 'פרידמן',
  'שפירא', 'גולדשטיין', 'רוזנברג', 'ברק', 'אלון', 'גולן', 'שלום',
  'יוסף', 'חיים', 'דוד', 'בן-דוד', 'אזולאי', 'גבאי', 'חדד',
  'סויסה', 'מלכה', 'עמר', 'אוחיון', 'טל', 'בר', 'שטרן', 'רווח',
];

// Regions with coordinates (center) for spreading volunteers
interface Region {
  name: string;
  centerLat: number;
  centerLng: number;
  spread: number; // degrees of random spread
  count: number;
}

const REGIONS: Region[] = [
  { name: 'יער בן שמן (מרכז)', centerLat: 31.9515, centerLng: 34.9455, spread: 0.03, count: 20 },
  { name: 'הכרמל (צפון)', centerLat: 32.7303, centerLng: 35.0116, spread: 0.03, count: 15 },
  { name: 'סינגל בארי (דרום)', centerLat: 31.4239, centerLng: 34.4921, spread: 0.02, count: 15 },
];

function randomInRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function generateLoraId(): string {
  const hex = '0123456789abcdef';
  let id = '!';
  for (let i = 0; i < 8; i++) {
    id += hex[Math.floor(Math.random() * hex.length)];
  }
  return id;
}

function generateIsraeliMobile(index: number): string {
  const prefixes = ['050', '052', '053', '054', '055', '058'];
  const prefix = prefixes[index % prefixes.length];
  const num = String(1000000 + Math.floor(Math.random() * 8999999));
  return `${prefix}-${num.slice(0, 3)}-${num.slice(3)}`;
}

export function generateMockVolunteers(): MockVolunteer[] {
  const volunteers: MockVolunteer[] = [];
  let nameIndex = 0;

  for (const region of REGIONS) {
    for (let i = 0; i < region.count; i++) {
      const hasLora = Math.random() < 0.6; // 60% have LoRa
      const hasDefibrillator = Math.random() < 0.9 || !hasLora; // 90% have defi, or must if no LoRa

      volunteers.push({
        firstName: FIRST_NAMES[nameIndex % FIRST_NAMES.length],
        lastName: LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)],
        mobileNumber: generateIsraeliMobile(nameIndex),
        loraId: hasLora ? generateLoraId() : null,
        hasDefibrillator,
        hasLora,
        lat: region.centerLat + (Math.random() - 0.5) * 2 * region.spread,
        lng: region.centerLng + (Math.random() - 0.5) * 2 * region.spread,
        batteryLevel: Math.floor(randomInRange(40, 100)),
        lastTransmissionMinutesAgo: Math.floor(randomInRange(0, 120)),
        signalStrength: Math.floor(randomInRange(-90, -40)),
        meshHops: Math.floor(randomInRange(0, 4)),
      });

      nameIndex++;
    }
  }

  return volunteers;
}

// Generate initial gamification scores for mock data
export function generateMockScores(volunteerId: number): {
  totalPoints: number;
  responses: number;
  avgResponseS: number;
  badges: string[];
} {
  const responses = Math.floor(randomInRange(0, 20));
  const totalPoints = responses * 10 + Math.floor(randomInRange(0, 50));
  const avgResponseS = Math.floor(randomInRange(120, 600));
  
  const badges: string[] = [];
  if (totalPoints >= 50) badges.push('מציל חיים');
  if (avgResponseS < 180 && responses >= 3) badges.push('ברק');
  if (Math.random() < 0.3) badges.push('שומר הרשת');
  if (Math.random() < 0.4) badges.push('מוכן תמיד');

  return { totalPoints, responses, avgResponseS, badges };
}
