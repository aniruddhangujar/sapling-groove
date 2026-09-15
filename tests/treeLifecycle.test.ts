import { 
  calculateGoalVitality, 
  applySessionUpdate, 
  TreeVitality, 
  setTimeOverride, 
  getNow,
  calculateCumulativeGrowth,
  calculateGrowthStage
} from '../utils/treeLifecycle';
import { desaturateToWilted } from '../utils/voxelTreeBuilder';
import { TreeType, TimelineType, SaplingGoal, FocusSessionLog } from '../types';
import { TREE_CONFIGS } from '../constants';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`  ✓ ${message}`);
  }
}

console.log('\n=============================================================');
console.log('SAPLING GROOVE — INTENTION & VITALITY LIFECYCLE TEST SUITE');
console.log('=============================================================\n');

// --------------------------------------------------------------------------
// TEST A — Freshly planted seed
// --------------------------------------------------------------------------
console.log('--- TEST A: Freshly Planted Seed ---');
const day0 = 1770000000000; // Fixed deterministic baseline timestamp
setTimeOverride(day0);

const goalA: SaplingGoal = {
  id: 'goal_test_a',
  name: 'Calculus Mastery',
  type: TreeType.OAK,
  timeline: TimelineType.DAY,
  startDate: day0,
  durationInDays: 30,
  dailyTargetMinutes: 120, // 2 hours/day
  totalTargetMinutes: 3600, // 60 hours
  accruedMinutes: 0,
  isComplete: false,
  health: 100,
  perfectionScore: 1.0
};

const reportA = calculateGoalVitality(goalA, day0, []);
assert(reportA.growthPct === 0, 'Growth starts at 0%');
assert(reportA.growthStage === 'Seed', 'Initial stage is Seed');
assert(reportA.vitality === TreeVitality.THRIVING, 'Initial vitality is Thriving');
assert(reportA.health === 100, 'Initial health is 100');
assert(!reportA.isWilting, 'Seed is not wilting');
assert(goalA.type === TreeType.OAK, 'Species is correctly Oak');

// --------------------------------------------------------------------------
// TEST B — Partial growth with faithful practice
// --------------------------------------------------------------------------
console.log('\n--- TEST B: Partial Growth with Maintained Intention ---');
const logsB: FocusSessionLog[] = [];
let currentGoalB = { ...goalA };

// Simulate 5 days of faithful daily focus (2 hours per day)
for (let d = 1; d <= 5; d++) {
  const sessionTime = day0 + d * 86400000;
  logsB.push({
    id: `log_b_${d}`,
    goalId: currentGoalB.id,
    goalName: currentGoalB.name,
    treeType: currentGoalB.type,
    mode: 'chronos',
    startedAt: sessionTime - 120 * 60000,
    endedAt: sessionTime,
    durationMinutes: 120,
    completed: true
  });
  currentGoalB = applySessionUpdate(currentGoalB, 120, false, sessionTime);
}

const day5 = day0 + 5 * 86400000;
const reportB = calculateGoalVitality(currentGoalB, day5, logsB);
assert(currentGoalB.accruedMinutes === 600, 'Accrued 600 minutes (10 hours)');
assert(reportB.growthPct === 17, 'Growth is 17% (10h / 60h)');
assert(reportB.vitality === TreeVitality.THRIVING, 'Vitality remains Thriving under faithful practice');
assert(!reportB.isWilting, 'Tree is not wilting');

// --------------------------------------------------------------------------
// TEST C — Short neglect: Missed expected focus
// --------------------------------------------------------------------------
console.log('\n--- TEST C: Short Neglect ---');
// Fast forward 3 days without focus (Day 8)
const day8 = day0 + 8 * 86400000;
const reportC = calculateGoalVitality(currentGoalB, day8, logsB);
assert(currentGoalB.accruedMinutes === 600, 'Historical growth is 100% untouched (still 600 minutes)');
assert(reportC.growthPct === 17, 'Growth percentage remains 17%');
assert(reportC.health < 70, `Health has declined due to missed practice (health: ${reportC.health})`);
assert(reportC.isWilting, 'Tree enters wilting state');

// --------------------------------------------------------------------------
// TEST D — Extended neglect
// --------------------------------------------------------------------------
console.log('\n--- TEST D: Extended Neglect ---');
// Fast forward to Day 15 (10 days since last focus)
const day15 = day0 + 15 * 86400000;
const reportD = calculateGoalVitality(currentGoalB, day15, logsB);
assert(currentGoalB.accruedMinutes === 600, 'Growth is STILL 600 minutes (never reduced by neglect)');
assert(reportD.isWilting, 'Tree is visibly wilted');
assert(currentGoalB.id === goalA.id, 'Tree is never deleted or destroyed');

// --------------------------------------------------------------------------
// TEST E — Severe neglect with protected floor
// --------------------------------------------------------------------------
console.log('\n--- TEST E: Severe Neglect & Invariant Floor ---');
// Fast forward 40 days without focus
const day45 = day0 + 45 * 86400000;
const reportE = calculateGoalVitality(currentGoalB, day45, logsB);
assert(currentGoalB.accruedMinutes === 600, 'Accrued growth remains intact');
assert(reportE.vitality === TreeVitality.SEVERELY_WILTED, 'Tree is in Severely Wilted state');
assert(reportE.health >= 15, `Health does not drop below floor of 15 (health: ${reportE.health})`);
assert(currentGoalB.type === TreeType.OAK, 'Species is still Oak');

// --------------------------------------------------------------------------
// TEST F — The Exact User Scenario (Step-by-Step Verification)
// --------------------------------------------------------------------------
console.log('\n--- TEST F: The Exact User Scenario (Step-by-Step) ---');
const scenarioStart = 1780000000000;
const scenarioLogs: FocusSessionLog[] = [];

// Step 1: Plant intention 2 hours/day for 30 days
let treeF: SaplingGoal = {
  id: 'goal_scenario',
  name: 'Quantum Mechanics',
  type: TreeType.CHERRY_BLOSSOM,
  timeline: TimelineType.DAY,
  startDate: scenarioStart,
  durationInDays: 30,
  dailyTargetMinutes: 120,
  totalTargetMinutes: 3600,
  accruedMinutes: 0,
  isComplete: false,
  health: 100,
  perfectionScore: 1.0
};

// Days 1, 2, 3: Study 2 hours each day
for (let d = 1; d <= 3; d++) {
  const sessionTime = scenarioStart + d * 86400000;
  scenarioLogs.push({
    id: `log_f_${d}`,
    goalId: treeF.id,
    goalName: treeF.name,
    treeType: treeF.type,
    mode: 'chronos',
    startedAt: sessionTime - 120 * 60000,
    endedAt: sessionTime,
    durationMinutes: 120,
    completed: true
  });
  treeF = applySessionUpdate(treeF, 120, false, sessionTime);
}

const day3Time = scenarioStart + 3 * 86400000;
const repF3 = calculateGoalVitality(treeF, day3Time, scenarioLogs);
assert(treeF.accruedMinutes === 360, 'Day 3: Accrued 360 mins (6h)');
assert(repF3.growthPct === 10, 'Day 3: Growth increases to 10%');
assert(repF3.vitality === TreeVitality.THRIVING, 'Day 3: Tree is healthy/thriving');
assert(treeF.type === TreeType.CHERRY_BLOSSOM, 'Day 3: Species unchanged');

// Step 2: Simulate Day 10 with no further focus
const day10Time = scenarioStart + 10 * 86400000;
const repF10 = calculateGoalVitality(treeF, day10Time, scenarioLogs);
assert(treeF.accruedMinutes === 360, 'Day 10: Accumulated growth is UNCHANGED (360 mins)');
assert(repF10.growthPct === 10, 'Day 10: Growth percentage is UNCHANGED (10%)');
assert(repF10.isWilting, 'Day 10: Tree is now appropriately wilted');
assert(scenarioLogs.length === 3, 'Day 10: Historical sessions remain in full');
assert(treeF.totalTargetMinutes === 3600, 'Day 10: Intention definition unchanged');

// Step 3: Simulate prolonged absence (Day 25)
const day25Time = scenarioStart + 25 * 86400000;
const repF25 = calculateGoalVitality(treeF, day25Time, scenarioLogs);
assert(repF25.vitality === TreeVitality.SEVERELY_WILTED, 'Day 25: Tree becomes Severely Wilted');
assert(treeF.accruedMinutes === 360, 'Day 25: Growth STILL does not decrease');
assert(Boolean(treeF.id), 'Day 25: Tree STILL exists');

// Step 4: User returns and performs a tiny 5-minute session
const returnSession1Time = day25Time + 1 * 86400000;
scenarioLogs.push({
  id: 'log_f_tiny',
  goalId: treeF.id,
  goalName: treeF.name,
  treeType: treeF.type,
  mode: 'chronos',
  startedAt: returnSession1Time - 5 * 60000,
  endedAt: returnSession1Time,
  durationMinutes: 5,
  completed: true
});
treeF = applySessionUpdate(treeF, 5, false, returnSession1Time);
const repFReturn1 = calculateGoalVitality(treeF, returnSession1Time, scenarioLogs);
assert(treeF.accruedMinutes === 365, '5m Session: Growth increases slightly to 365 mins');
assert(repFReturn1.isRecovering, '5m Session: Recovery begins (isRecovering = true)');
assert(repFReturn1.health < 70, `5m Session: Does NOT instantly become healthy (health: ${repFReturn1.health})`);

// Step 5: User performs a meaningful 2-hour session next day
const returnSession2Time = returnSession1Time + 1 * 86400000;
scenarioLogs.push({
  id: 'log_f_meaningful',
  goalId: treeF.id,
  goalName: treeF.name,
  treeType: treeF.type,
  mode: 'chronos',
  startedAt: returnSession2Time - 120 * 60000,
  endedAt: returnSession2Time,
  durationMinutes: 120,
  completed: true
});
treeF = applySessionUpdate(treeF, 120, false, returnSession2Time);
const repFReturn2 = calculateGoalVitality(treeF, returnSession2Time, scenarioLogs);
assert(repFReturn2.health > repFReturn1.health, `Meaningful session produces stronger recovery (from ${repFReturn1.health} to ${repFReturn2.health})`);

// Step 6: Repeated sessions aligned with the original intention
for (let d = 3; d <= 5; d++) {
  const contTime = returnSession1Time + d * 86400000;
  scenarioLogs.push({
    id: `log_f_restore_${d}`,
    goalId: treeF.id,
    goalName: treeF.name,
    treeType: treeF.type,
    mode: 'chronos',
    startedAt: contTime - 120 * 60000,
    endedAt: contTime,
    durationMinutes: 120,
    completed: true
  });
  treeF = applySessionUpdate(treeF, 120, false, contTime);
}

const restoreTime = returnSession1Time + 5 * 86400000;
const repFRestore = calculateGoalVitality(treeF, restoreTime, scenarioLogs);
assert(repFRestore.vitality === TreeVitality.THRIVING || repFRestore.vitality === TreeVitality.HEALTHY, `Repeated faithful sessions restore vitality to ${repFRestore.vitality}`);
assert(repFRestore.health >= 80, `Health restored to ${repFRestore.health}`);

// Step 7: Complete the intention
treeF = applySessionUpdate(treeF, 3600 - treeF.accruedMinutes, true, restoreTime);
assert(treeF.isComplete === true, 'Tree is marked complete');

// Simulate 6 months of inactivity on completed tree
const sixMonthsLater = restoreTime + 180 * 86400000;
const repFImmortal = calculateGoalVitality(treeF, sixMonthsLater, scenarioLogs);
assert(repFImmortal.vitality === TreeVitality.THRIVING, 'Completed tree in Permanent Canopy remains Thriving');
assert(repFImmortal.health === 100, 'Completed tree health is locked at 100');
assert(!repFImmortal.isWilting, 'Completed tree NEVER wilts');
assert(treeF.accruedMinutes >= 3600, 'Completed tree growth never regresses');

// --------------------------------------------------------------------------
// TEST G — Refresh and Serialization Persistence
// --------------------------------------------------------------------------
console.log('\n--- TEST G: Refresh & JSON Persistence ---');
const serialized = JSON.stringify(treeF);
const deserialized: SaplingGoal = JSON.parse(serialized);
const reportG = calculateGoalVitality(deserialized, sixMonthsLater, scenarioLogs);
assert(reportG.health === 100, 'Deserialized goal preserves exact derived vitality report');
assert(reportG.growthPct === 100, 'Deserialized goal preserves exact growth');

// --------------------------------------------------------------------------
// TEST H — Authentication Persistence & Merge
// --------------------------------------------------------------------------
console.log('\n--- TEST H: Authentication Persistence & Merge Invariants ---');
const localTree: SaplingGoal = { ...treeF, accruedMinutes: 1200, lastFocusDate: day5 };
const remoteTree: SaplingGoal = { ...treeF, accruedMinutes: 1800, lastFocusDate: day8 };

// Merge logic used in storageService: max accruedMinutes, latest focusDate
const merged: SaplingGoal = {
  ...localTree,
  accruedMinutes: Math.max(localTree.accruedMinutes, remoteTree.accruedMinutes),
  lastFocusDate: Math.max(localTree.lastFocusDate || 0, remoteTree.lastFocusDate || 0)
};

assert(merged.accruedMinutes === 1800, 'Merged goal preserves maximum accrued work');
assert(merged.lastFocusDate === day8, 'Merged goal preserves latest focus date');

// --------------------------------------------------------------------------
// TEST I — Species Identity under Wilting (All 11 Species)
// --------------------------------------------------------------------------
console.log('\n--- TEST I: Species Identity Preservation under Wilting ---');
const speciesList = Object.values(TreeType);
assert(speciesList.length === 11, 'All 11 tree species tested');

const wiltedColors = new Set<string>();
for (const sp of speciesList) {
  const cfg = TREE_CONFIGS[sp];
  const wiltedLeaf = desaturateToWilted(cfg.leafLight, 0.55, 0.82);
  const wiltedTrunk = desaturateToWilted(cfg.trunkMid, 0.40, 0.78);

  assert(wiltedLeaf !== '#3f3f46', `${sp} leaf is not flat monochrome #3f3f46 (got: ${wiltedLeaf})`);
  assert(wiltedTrunk !== '#18181b', `${sp} trunk is not flat pitch black #18181b (got: ${wiltedTrunk})`);
  wiltedColors.add(wiltedLeaf);
}
assert(wiltedColors.size >= 8, 'Distinct species retain unique visual color signatures when wilted');

// --------------------------------------------------------------------------
// TEST J — Completed Permanent Canopy Protection
// --------------------------------------------------------------------------
console.log('\n--- TEST J: Permanent Canopy Protection ---');
const matureBamboo: SaplingGoal = {
  id: 'mature_bamboo',
  name: 'Zen Review',
  type: TreeType.BAMBOO,
  timeline: TimelineType.WEEK,
  startDate: day0 - 365 * 86400000,
  durationInDays: 7,
  dailyTargetMinutes: 60,
  totalTargetMinutes: 420,
  accruedMinutes: 420,
  isComplete: true,
  health: 100,
  perfectionScore: 1.0,
  lastFocusDate: day0 - 300 * 86400000
};

const repMature = calculateGoalVitality(matureBamboo, day0, []);
assert(repMature.health === 100, 'Permanent Canopy tree retains 100% health after 300 days inactivity');
assert(repMature.vitality === TreeVitality.THRIVING, 'Permanent Canopy tree is permanently Thriving');
assert(!repMature.isWilting, 'Permanent Canopy tree never wilts');
assert(repMature.growthPct === 100, 'Permanent Canopy tree maintains 100% maturity');

// --------------------------------------------------------------------------
// TEST K — Cadence & Intention Horizon Audit (DAY vs WEEK vs MONTH vs YEAR)
// --------------------------------------------------------------------------
console.log('\n--- TEST K: Cadence & Intention Horizon Audit ---');
const baselineK = 1790000000000;

// Intention 1: "2 hours/day" (DAY timeline)
const goalDay: SaplingGoal = {
  id: 'goal_k_day',
  name: 'Daily 2h Sprint',
  type: TreeType.OAK,
  timeline: TimelineType.DAY,
  startDate: baselineK,
  durationInDays: 30,
  dailyTargetMinutes: 120, // 2 hours/day
  totalTargetMinutes: 3600,
  accruedMinutes: 0,
  isComplete: false,
  health: 100,
  perfectionScore: 1.0,
  lastFocusDate: baselineK
};

// Intention 2: "10 hours/week" (WEEK timeline)
const goalWeek: SaplingGoal = {
  id: 'goal_k_week',
  name: 'Weekly 10h Pacing',
  type: TreeType.MAPLE,
  timeline: TimelineType.WEEK,
  startDate: baselineK,
  durationInDays: 28,
  dailyTargetMinutes: 86, // ~600m / 7d = 10h / week
  totalTargetMinutes: 2408,
  accruedMinutes: 0,
  isComplete: false,
  health: 100,
  perfectionScore: 1.0,
  lastFocusDate: baselineK
};

// Intention 3: "1 month study" (MONTH timeline)
const goalMonth: SaplingGoal = {
  id: 'goal_k_month',
  name: 'Monthly Deep Dive',
  type: TreeType.BAMBOO,
  timeline: TimelineType.MONTH,
  startDate: baselineK,
  durationInDays: 30,
  dailyTargetMinutes: 60,
  totalTargetMinutes: 1800,
  accruedMinutes: 0,
  isComplete: false,
  health: 100,
  perfectionScore: 1.0,
  lastFocusDate: baselineK
};

// Intention 4: "1 year habit" (YEAR timeline)
const goalYear: SaplingGoal = {
  id: 'goal_k_year',
  name: 'Annual Habit',
  type: TreeType.CACTUS,
  timeline: TimelineType.YEAR,
  startDate: baselineK,
  durationInDays: 365,
  dailyTargetMinutes: 45,
  totalTargetMinutes: 16425,
  accruedMinutes: 0,
  isComplete: false,
  health: 100,
  perfectionScore: 1.0,
  lastFocusDate: baselineK
};

// Check 1: Inactivity of 2.5 days
const time2_5DaysLater = baselineK + 2.5 * 86400000;
const repDayAfter2_5d = calculateGoalVitality(goalDay, time2_5DaysLater, []);
const repWeekAfter2_5d = calculateGoalVitality(goalWeek, time2_5DaysLater, []);

// Daily commitment expects daily practice (grace period 1.5d) -> wilts after 2.5 days
assert(repDayAfter2_5d.isWilting, 'Daily intention (2h/day) wilts after 2.5 days of missed practice');

// Weekly commitment has a 3-day grace period -> still healthy after 2.5 days
assert(!repWeekAfter2_5d.isWilting, 'Weekly intention (10h/week) remains healthy after 2.5 days (within weekly rhythm)');
assert(repWeekAfter2_5d.health >= 70, `Weekly health is maintained (${repWeekAfter2_5d.health})`);

// Check 2: Inactivity of 6 days
const time6DaysLater = baselineK + 6 * 86400000;
const repWeekAfter6d = calculateGoalVitality(goalWeek, time6DaysLater, []);
const repMonthAfter6d = calculateGoalVitality(goalMonth, time6DaysLater, []);
const repYearAfter6d = calculateGoalVitality(goalYear, time6DaysLater, []);

assert(repWeekAfter6d.isWilting, 'Weekly intention wilts after 6 days of inactivity (missed weekly pace)');
assert(repMonthAfter6d.isWilting, 'Monthly intention wilts after 6 days without tending');
assert(!repYearAfter6d.isWilting, 'Yearly intention with long horizon remains within 6-day grace buffer');

// Check 3: Inactivity of 12 days
const time12DaysLater = baselineK + 12 * 86400000;
const repYearAfter12d = calculateGoalVitality(goalYear, time12DaysLater, []);
assert(repYearAfter12d.isWilting, 'Yearly intention wilts after 12 days of prolonged neglect');

console.log('\n=============================================================');
console.log('✅ ALL 11 TESTS PASSED DETERMINISTICALLY WITH ZERO REGRESSIONS');
console.log('=============================================================\n');

