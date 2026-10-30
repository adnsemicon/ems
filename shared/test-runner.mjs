import assert from 'assert';
import {
  validateUpdateSections,
  getDeadlineStatus,
  DEFAULT_APP_TIMEZONE,
  CUTOFF_HOUR,
  CUTOFF_MINUTE,
  COMPANY_REPORT_TO,
  COMPANY_REPORT_CC,
} from './validation.ts';
import { prepareDailyReports } from '../backend/api/src/reports.ts';
import { upsertEmployee } from '../backend/api/src/auth.ts';
import { CAREER_LEVELS, isCareerLevel } from './types.ts';

console.log('--- Running EMS Unit Tests ---');

// 1. Test validation logic
console.log('Testing validateUpdateSections...');
const emptyResult = validateUpdateSections({});
assert.strictEqual(emptyResult.valid, false, 'Empty payload should be invalid');
assert.strictEqual(emptyResult.errors.length, 1, "Should require Today's Tasks");

const validResult = validateUpdateSections({
  todaysTasks: ['Complete circuit floorplan', 'Timing closure'],
  suddenTasks: ['Debug clock jitter'],
  blockers: [],
  plansGoingForward: ['Run DRC checks'],
});
assert.strictEqual(validResult.valid, true, 'Valid payload should pass');
assert.strictEqual(validResult.sanitized.todaysTasks.length, 2);
assert.strictEqual(validResult.sanitized.suddenTasks.length, 1);
assert.strictEqual(validResult.sanitized.blockers.length, 0);
assert.strictEqual(validResult.sanitized.plansGoingForward.length, 1);

// 2. Test Deadline Status logic
console.log('Testing getDeadlineStatus...');
// Midday test (e.g., 2:00 PM Asia/Dhaka)
const midday = new Date('2026-10-18T08:00:00Z'); // 14:00 in UTC+6
const middayStatus = getDeadlineStatus(midday, 'Asia/Dhaka');
assert.strictEqual(middayStatus.isLocked, false, 'Midday should not be locked');
assert.ok(middayStatus.remainingSeconds > 0, 'Remaining seconds should be positive');

// Past cutoff test (e.g., 11:35 PM Asia/Dhaka)
const pastCutoff = new Date('2026-10-18T17:35:00Z'); // 23:35 in UTC+6
const pastStatus = getDeadlineStatus(pastCutoff, 'Asia/Dhaka');
assert.strictEqual(pastStatus.isLocked, true, '23:35 should be locked');
assert.strictEqual(pastStatus.remainingSeconds, 0, 'Remaining seconds should be 0 when locked');

// 3. Test Recipients configuration
console.log('Testing Company Report recipients...');
assert.strictEqual(COMPANY_REPORT_TO, 'foez.ahmed@adnsemicon.com');
assert.ok(COMPANY_REPORT_CC.includes('mohiuddin.reyad@adnsemicon.com'));
assert.ok(COMPANY_REPORT_CC.includes('farhan.efty@adnsemicon.com'));

// 4. Career level definitions and validation
console.log('Testing career levels...');
assert.deepStrictEqual(
  CAREER_LEVELS.map(level => level.value),
  ['E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'E7', 'E8', 'E9', 'E10', 'E11', 'E12']
);
assert.strictEqual(isCareerLevel('E12'), true);
assert.strictEqual(isCareerLevel('E13'), false);

// 5. OAuth refreshes should preserve the administrator-managed employee name
console.log('Testing employee display-name preservation...');
const existingProfile = {
  id: 'emp-1',
  github_id: 'github-1',
  github_username: 'employee',
  name: 'Preferred Display Name',
  email: 'old@example.com',
  official_email: 'employee@adnsemicon.com',
  avatar_url: 'https://example.com/old-avatar.png',
  team_id: null,
  role: 'employee',
  approval_status: 'approved',
  level: 'E4',
  created_at: '2026-01-01T00:00:00.000Z',
  manager_name: null,
};
let employeeUpdateQuery = '';
const employeeDb = {
  prepare(query) {
    if (query.startsWith('SELECT e.*')) {
      return { bind: () => ({ first: async () => existingProfile }) };
    }
    employeeUpdateQuery = query;
    return { bind: () => ({ run: async () => ({ success: true }) }) };
  },
};
const refreshedEmployee = await upsertEmployee(employeeDb, {
  id: 'github-1',
  login: 'employee',
  name: 'GitHub Account Name',
  email: 'new@example.com',
  avatar_url: 'https://example.com/new-avatar.png',
});
assert.strictEqual(refreshedEmployee.name, 'Preferred Display Name');
assert.strictEqual(/\bname\s*=/.test(employeeUpdateQuery), false, 'OAuth refresh must not overwrite the display name');

// 6. Empty report dates should not prepare any emails
console.log('Testing empty daily report batches...');
const emptyReportQueries = [];
const emptyReportDb = {
  prepare(query) {
    emptyReportQueries.push(query);
    return {
      bind() {
        return {
          run: async () => ({ success: true }),
          all: async () => ({ results: [] }),
        };
      },
    };
  },
};
const emptyBatch = await prepareDailyReports(
  emptyReportDb,
  '2020-01-01',
  'Asia/Dhaka',
  { DEV_SIGN_IN_ENABLED: 'false' }
);
assert.deepStrictEqual(emptyBatch.emailsToSend, [], 'An empty date should not generate emails');
assert.strictEqual(
  emptyReportQueries.some(query => query.includes('report_deliveries')),
  false,
  'An empty date should not create report delivery records'
);

console.log('All EMS unit tests passed successfully!');
