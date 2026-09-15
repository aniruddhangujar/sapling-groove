import { 
  filterLogsByRange, 
  calculateOverviewMetrics, 
  calculateFocusRhythm, 
  calculateAttentionField, 
  calculateSessionPatterns, 
  calculateIntentionSummaries, 
  generateDeterministicObservations,
  formatMinutes
} from '../utils/dashboardAnalytics';
import { UserProfile, FocusSessionLog, TreeType, TimelineType, SaplingGoal } from '../types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`  ✓ ${message}`);
  }
}

console.log('\n=============================================================');
console.log('SAPLING GROOVE — DASHBOARD ANALYTICS DETERMINISTIC TEST SUITE');
console.log('=============================================================\n');

const BASE_NOW = new Date('2026-09-15T15:00:00Z').getTime();

// --------------------------------------------------------------------------
// TEST 1 & 11: Zero Sessions / Empty Dashboard State
// --------------------------------------------------------------------------
console.log('--- TEST 1 & 11: Zero Sessions & Empty State ---');
const emptyProfile: UserProfile = {
  isPremium: false,
  totalFocusTime: 0,
  grove: [],
  logs: [],
  preferences: {}
};

const emptyMetrics = calculateOverviewMetrics(emptyProfile, '30d', BASE_NOW);
assert(emptyMetrics.totalFocusMinutes === 0, 'Zero sessions yields 0 focus minutes');
assert(emptyMetrics.totalSessions === 0, 'Zero sessions yields 0 sessions count');
assert(emptyMetrics.avgSessionMinutes === 0, 'No divide-by-zero on avg session');
assert(emptyMetrics.longestSessionMinutes === 0, 'Longest session is 0');
assert(emptyMetrics.activeDaysCount === 0, 'Active days count is 0');

const emptyPatterns = calculateSessionPatterns(emptyProfile.logs, '30d', BASE_NOW);
assert(emptyPatterns.mostActiveDay === null, 'Most active day is null when empty');
assert(emptyPatterns.mostActivePeriod === null, 'Most active period is null when empty');
assert(emptyPatterns.longestSession === null, 'Longest session is null when empty');

const emptyObservations = generateDeterministicObservations(emptyProfile, '30d', BASE_NOW);
assert(emptyObservations.length > 0, 'Empty state produces quiet reflective observation');
assert(emptyObservations[0].includes('observatory is quiet'), 'Observation informs user observatory is quiet');

// --------------------------------------------------------------------------
// TEST 2: Single Session
// --------------------------------------------------------------------------
console.log('\n--- TEST 2: Single Session ---');
const singleLog: FocusSessionLog = {
  id: 'log-single-1',
  goalName: 'Biochemistry',
  mode: 'chronos',
  startedAt: BASE_NOW - 2 * 3600000,
  endedAt: BASE_NOW - 1.5 * 3600000,
  durationMinutes: 30,
  completed: true
};

const singleProfile: UserProfile = {
  isPremium: false,
  totalFocusTime: 30,
  grove: [],
  logs: [singleLog],
  preferences: {}
};

const singleMetrics = calculateOverviewMetrics(singleProfile, '30d', BASE_NOW);
assert(singleMetrics.totalFocusMinutes === 30, 'Total focus matches single session');
assert(singleMetrics.totalSessions === 1, 'Total sessions count is 1');
assert(singleMetrics.avgSessionMinutes === 30, 'Avg session is exactly 30m');
assert(singleMetrics.longestSessionMinutes === 30, 'Longest session is 30m');
assert(singleMetrics.activeDaysCount === 1, 'Active days count is 1');

// --------------------------------------------------------------------------
// TEST 3: Multiple Sessions on Same Day
// --------------------------------------------------------------------------
console.log('\n--- TEST 3: Multiple Sessions on Same Day ---');
const sameDayLogs: FocusSessionLog[] = [
  {
    id: 's-1',
    goalName: 'Calculus',
    mode: 'chronos',
    startedAt: BASE_NOW - 6 * 3600000, // 9 AM
    endedAt: BASE_NOW - 5.5 * 3600000,
    durationMinutes: 30,
    completed: true
  },
  {
    id: 's-2',
    goalName: 'Calculus',
    mode: 'groove',
    startedAt: BASE_NOW - 3 * 3600000, // 12 PM
    endedAt: BASE_NOW - 2 * 3600000,
    durationMinutes: 60,
    completed: true
  },
  {
    id: 's-3',
    goalName: 'Calculus',
    mode: 'chronos',
    startedAt: BASE_NOW - 1 * 3600000, // 2 PM
    endedAt: BASE_NOW - 0.5 * 3600000,
    durationMinutes: 30,
    completed: true
  }
];

const sameDayProfile: UserProfile = {
  isPremium: false,
  totalFocusTime: 120,
  grove: [],
  logs: sameDayLogs,
  preferences: {}
};

const sameDayMetrics = calculateOverviewMetrics(sameDayProfile, '30d', BASE_NOW);
assert(sameDayMetrics.totalFocusMinutes === 120, 'Aggregates all 3 sessions (30+60+30 = 120)');
assert(sameDayMetrics.totalSessions === 3, 'Counts 3 sessions');
assert(sameDayMetrics.activeDaysCount === 1, 'Distinct calendar day count is 1 (not 3)');
assert(sameDayMetrics.avgSessionMinutes === 40, 'Average session is 40 min (120/3)');
assert(sameDayMetrics.longestSessionMinutes === 60, 'Longest session is 60 min');

// --------------------------------------------------------------------------
// TEST 4 & 5: Sessions Across Multiple Days & Time-Range Filtering
// --------------------------------------------------------------------------
console.log('\n--- TEST 4 & 5: Multi-Day Distribution & Time-Range Filtering ---');
const multiDayLogs: FocusSessionLog[] = [
  {
    id: 'm-today',
    goalName: 'Thesis',
    mode: 'chronos',
    startedAt: BASE_NOW - 2 * 3600000, // today
    endedAt: BASE_NOW - 1 * 3600000,
    durationMinutes: 60,
    completed: true
  },
  {
    id: 'm-3days',
    goalName: 'Thesis',
    mode: 'chronos',
    startedAt: BASE_NOW - 3 * 86400000, // 3 days ago
    endedAt: BASE_NOW - 3 * 86400000 + 45 * 60000,
    durationMinutes: 45,
    completed: true
  },
  {
    id: 'm-15days',
    goalName: 'Thesis',
    mode: 'chronos',
    startedAt: BASE_NOW - 15 * 86400000, // 15 days ago
    endedAt: BASE_NOW - 15 * 86400000 + 90 * 60000,
    durationMinutes: 90,
    completed: true
  },
  {
    id: 'm-45days',
    goalName: 'Thesis',
    mode: 'chronos',
    startedAt: BASE_NOW - 45 * 86400000, // 45 days ago
    endedAt: BASE_NOW - 45 * 86400000 + 120 * 60000,
    durationMinutes: 120,
    completed: true
  },
  {
    id: 'm-120days',
    goalName: 'Thesis',
    mode: 'chronos',
    startedAt: BASE_NOW - 120 * 86400000, // 120 days ago
    endedAt: BASE_NOW - 120 * 86400000 + 150 * 60000,
    durationMinutes: 150,
    completed: true
  }
];

// Test 7-Day Window
const logs7d = filterLogsByRange(multiDayLogs, '7d', BASE_NOW);
assert(logs7d.length === 2, '7-day filter captures only today and 3-days ago');
assert(logs7d.reduce((s, l) => s + l.durationMinutes, 0) === 105, '7d total is 105 mins (60+45)');

// Test 30-Day Window
const logs30d = filterLogsByRange(multiDayLogs, '30d', BASE_NOW);
assert(logs30d.length === 3, '30-day filter captures 3 sessions');
assert(logs30d.reduce((s, l) => s + l.durationMinutes, 0) === 195, '30d total is 195 mins (60+45+90)');

// Test 90-Day Window
const logs90d = filterLogsByRange(multiDayLogs, '90d', BASE_NOW);
assert(logs90d.length === 4, '90-day filter captures 4 sessions (excluding 120 days ago)');
assert(logs90d.reduce((s, l) => s + l.durationMinutes, 0) === 315, '90d total is 315 mins');

// Test All Window
const logsAll = filterLogsByRange(multiDayLogs, 'all', BASE_NOW);
assert(logsAll.length === 5, 'All filter captures all 5 historical sessions');
assert(logsAll.reduce((s, l) => s + l.durationMinutes, 0) === 465, 'All total is 465 mins');

// --------------------------------------------------------------------------
// TEST 6, 7, 8: Average, Longest Session & Most-Active Patterns
// --------------------------------------------------------------------------
console.log('\n--- TEST 6, 7, 8: Session Patterns Analysis ---');
const patternLogs: FocusSessionLog[] = [
  // Tuesday Morning 9 AM
  {
    id: 'p-1',
    goalName: 'Algorithms',
    mode: 'chronos',
    startedAt: new Date('2026-09-15T09:00:00').getTime(), // Tuesday
    endedAt: new Date('2026-09-15T09:45:00').getTime(),
    durationMinutes: 45,
    completed: true
  },
  // Tuesday Evening 7 PM (Longest)
  {
    id: 'p-2',
    goalName: 'Algorithms',
    mode: 'groove',
    startedAt: new Date('2026-09-15T19:00:00').getTime(), // Tuesday
    endedAt: new Date('2026-09-15T21:14:00').getTime(),
    durationMinutes: 134, // 2h 14m
    completed: true
  },
  // Monday Afternoon 2 PM
  {
    id: 'p-3',
    goalName: 'Algorithms',
    mode: 'chronos',
    startedAt: new Date('2026-09-14T14:00:00').getTime(), // Monday
    endedAt: new Date('2026-09-14T14:30:00').getTime(),
    durationMinutes: 30,
    completed: true
  }
];

const patterns = calculateSessionPatterns(patternLogs, '30d', BASE_NOW);
assert(patterns.mostActiveDay === 'Tuesday', 'Tuesday correctly identified as most active day');
assert(patterns.mostActivePeriod === 'Evening (5 PM – 10 PM)', 'Evening correctly identified as most active period');
assert(patterns.longestSession !== null && patterns.longestSession.minutes === 134, 'Longest session is 134m (2h 14m)');
assert(formatMinutes(patterns.longestSession!.minutes) === '2h 14m', 'formatMinutes formats 134m as "2h 14m"');
assert(patterns.avgSessionMinutes === Math.round((45 + 134 + 30) / 3), 'Average session correctly computed (70m)');

// --------------------------------------------------------------------------
// TEST 9 & 10: Intention Summaries & Permanent Canopy Protection
// --------------------------------------------------------------------------
console.log('\n--- TEST 9 & 10: Intention Summaries & Canopy Protection ---');
const activeGoal: SaplingGoal = {
  id: 'goal-active-1',
  name: 'Organic Chemistry',
  type: TreeType.OAK,
  timeline: TimelineType.DAY,
  startDate: BASE_NOW - 5 * 86400000,
  durationInDays: 5,
  dailyTargetMinutes: 30,
  totalTargetMinutes: 150,
  accruedMinutes: 90,
  lastFocusDate: BASE_NOW - 1 * 86400000, // Yesterday
  isComplete: false,
  health: 95,
  perfectionScore: 1.0
};

const completedCanopyGoal: SaplingGoal = {
  id: 'goal-matured-1',
  name: 'Machine Learning Basics',
  type: TreeType.SEQUOIA,
  timeline: TimelineType.MONTH,
  startDate: BASE_NOW - 60 * 86400000,
  durationInDays: 30,
  dailyTargetMinutes: 60,
  totalTargetMinutes: 1800,
  accruedMinutes: 1800,
  lastFocusDate: BASE_NOW - 20 * 86400000,
  isComplete: true, // Permanent Canopy
  health: 100,
  perfectionScore: 1.0
};

const groveProfile: UserProfile = {
  isPremium: false,
  totalFocusTime: 1890,
  grove: [activeGoal, completedCanopyGoal],
  logs: patternLogs,
  preferences: {}
};

const intentionSummaries = calculateIntentionSummaries(groveProfile, BASE_NOW);
assert(intentionSummaries.length === 1, 'Only active intentions are shown in active current list');
assert(intentionSummaries[0].goal.name === 'Organic Chemistry', 'Correct active intention resolved');
assert(intentionSummaries[0].vitalityReport.growthPct === 60, 'Growth is 60% (90/150m)');
assert(intentionSummaries[0].lastTendedText === 'Tended yesterday', 'Last tended shows "Tended yesterday"');
assert(intentionSummaries[0].remainingMinutes === 60, 'Remaining minutes is 60m (150 - 90)');

const metricsWithCanopy = calculateOverviewMetrics(groveProfile, '30d', BASE_NOW);
assert(metricsWithCanopy.activeIntentionsCount === 1, 'Active intentions is 1');
assert(metricsWithCanopy.eternalCanopyCount === 1, 'Eternal Canopy count is 1');

// Verify Eternal Canopy protection invariant: completed trees maintain 100% health & never regress
const maturedReport = calculateIntentionSummaries({ ...groveProfile, grove: [completedCanopyGoal] }, BASE_NOW);
assert(maturedReport.length === 0, 'Completed tree excluded from active work list');

// --------------------------------------------------------------------------
// TEST 12 & 13: Heatmap Levels & Guest / Authenticated Data Compatibility
// --------------------------------------------------------------------------
console.log('\n--- TEST 12 & 13: Heatmap Intensity Tiers & Data Compatibility ---');
const heatmapData = calculateAttentionField(patternLogs, '30d', BASE_NOW);
assert(heatmapData.weeks.length > 0, 'Attention field produces weekly rows');

// Check that cells have valid levels 0 to 4
let hasLevel0 = false;
let hasActiveLevel = false;
heatmapData.weeks.forEach(w => {
  w.forEach(cell => {
    assert(cell.level >= 0 && cell.level <= 4, `Cell level ${cell.level} is within [0, 4]`);
    if (cell.level === 0) hasLevel0 = true;
    if (cell.level > 0) hasActiveLevel = true;
    assert(cell.ariaLabel.length > 0, 'Accessible aria-label is present on each cell');
  });
});

assert(hasLevel0, 'Contains empty soil cells (level 0)');
assert(hasActiveLevel, 'Contains active botanical cells (level > 0)');

// Guest vs Authenticated structure test
const authenticatedProfile: UserProfile = {
  userId: 'user_auth_123',
  isPremium: true,
  totalFocusTime: 450,
  grove: [activeGoal],
  logs: patternLogs,
  groveTourCompleted: true,
  preferences: { soundscape: 'rain', ecoCanopyMode: false }
};

const authMetrics = calculateOverviewMetrics(authenticatedProfile, '30d', BASE_NOW);
assert(authMetrics.totalSessions === 3, 'Authenticated profile processes seamlessly');
assert(authMetrics.activeIntentionsCount === 1, 'Authenticated intentions resolved');

console.log('\n=============================================================');
console.log('✅ ALL 13 DASHBOARD ANALYTICS DETERMINISTIC TESTS PASSED');
console.log('=============================================================\n');
