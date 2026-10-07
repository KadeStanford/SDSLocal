import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const escape = (value) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
const readJson = (file) =>
  fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '')) : null;
const label = (status) =>
  status === 'passed' ? 'Staging Pass' : status === 'failed' ? 'Staging Fail' : 'Not Tested';

export function renderReadiness(output, root) {
  const run = readJson(path.join(output, 'checks.json'));
  if (!run) throw new Error('Run checks.json is required');
  const assessment = readJson(path.join(root, 'docs/readiness/assessment.json'));
  const staging = readJson(path.join(root, 'docs/readiness/staging-assessment.json'));
  const live = readJson(path.join(root, 'reports/readiness/evidence/staging-readonly.json'));
  const stageVerdict = live
    ? (staging?.verdict ?? 'Inspect the dated staging request evidence below.')
    : 'No staging requests executed in this report. This run contains local/source evidence only.';
  const database = readJson(path.join(root, 'reports/readiness/database/summary.json'));
  const browser = readJson(path.join(root, 'reports/readiness/browser/results.json'));
  const commerce = readJson(path.join(root, 'reports/readiness/integration/commerce.json'));
  const deletionPrivacy = readJson(
    path.join(root, 'reports/readiness/combined-privacy/summary.json'),
  );
  const deletionBaseline = readJson(
    path.join(root, 'reports/readiness/deletion-baseline/summary.json'),
  );
  const deletionConcurrency = readJson(
    path.join(root, 'reports/readiness/deletion-concurrency/summary.json'),
  );
  const adminTrial = readJson(
    path.join(root, 'reports/readiness/evidence/staging-admin-trial.json'),
  );
  const adminPreservation = readJson(
    path.join(root, 'reports/readiness/evidence/staging-admin-preservation.json'),
  );
  const adminTrialPassed =
    adminTrial?.committed === false &&
    adminTrial?.admin_rpc_absent === true &&
    adminPreservation?.fingerprints_unchanged === true &&
    adminPreservation?.memberships_unchanged === true &&
    adminPreservation?.public_schema_acl_unchanged === true &&
    adminPreservation?.history_unchanged === true &&
    adminPreservation?.schema_absent === true;
  const adminHtml = adminTrial
    ? `<h2>Separate staging database trial</h2><p><span class="badge ${adminTrialPassed ? 'passed' : 'failed'}">${adminTrialPassed ? 'Staging Pass' : 'Staging Fail'}</span> <b>Transactional admin DDL / ACL / denial checks only.</b> ${escape(adminTrial.verification)}. Trial observed ${escape(adminTrial.verified_at)}; independent preservation check ${escape(adminPreservation?.checked_at)} confirmed ${escape(adminPreservation?.table_fingerprints_checked)} table fingerprints, memberships, schema ACL and migration history unchanged. The admin trial was rolled back; new admin schema/RPCs remain absent. Category/history corrections remain installed. <b>This is not installed portal acceptance or a signed-in app workflow.</b> <a href="../evidence/staging-admin-trial.json">Trial receipt</a> / <a href="../evidence/staging-admin-preservation.json">Preservation receipt</a>.</p>`
    : '';
  const suites = run.checks
    .filter((check) => check.id.startsWith('test-'))
    .map((check) => {
      const json = readJson(path.join(output, check.id + '.json'));
      return {
        id: check.id,
        total: json?.numTotalTests ?? 0,
        passed: json?.numPassedTests ?? 0,
        failed: json?.numFailedTests ?? 0,
        skipped: json?.numPendingTests ?? 0,
        files: json?.testResults?.length ?? 0,
        status: check.status,
      };
    });
  const totals = suites.reduce(
    (sum, suite) => ({
      total: sum.total + suite.total,
      passed: sum.passed + suite.passed,
      failed: sum.failed + suite.failed,
      skipped: sum.skipped + suite.skipped,
    }),
    { total: 0, passed: 0, failed: 0, skipped: 0 },
  );
  const summary = {
    ...run,
    generatedAtUtc: new Date().toISOString(),
    assessment,
    staging,
    liveStaging: live,
    suites,
    totals,
    integration: {
      database,
      browser: browser?.stats ?? null,
      commerce,
      deletionPrivacy,
      deletionBaseline,
      deletionConcurrency,
    },
    stagingAdminTrial: { result: adminTrial, preservation: adminPreservation },
    coverageLimit:
      'Local source and fixture results do not certify staging, installed OTA behavior, native rendering, external providers or store acceptance.',
  };
  fs.writeFileSync(path.join(output, 'summary.json'), JSON.stringify(summary, null, 2));
  const nativeRows = (staging?.journeys ?? [])
    .map(
      (row) =>
        `<tr data-status="${escape(row.status)}"><td><b>${escape(row.flow)}</b><br><small>${escape(row.layer)}</small></td><td><span class="badge ${escape(row.status)}">${label(row.status)}</span></td><td>${escape(row.evidence)}</td><td>${escape(row.blocker)}</td></tr>`,
    )
    .join('');
  const apiRows = (live?.checks ?? [])
    .map(
      (check) =>
        `<tr data-status="${escape(check.status)}"><td><b>${escape(check.id)}</b><details><summary>Exact request</summary><code>GET ${escape(live.backend + check.route)}</code></details></td><td><span class="badge ${escape(check.status)}">${label(check.status)}</span><br>HTTP ${escape(check.httpStatus ?? 'not requested')}</td><td>${escape(check.result ? JSON.stringify(check.result) : (check.error ?? check.reason))}<br><small>${escape(check.completedAtUtc ?? check.startedAtUtc)}</small></td></tr>`,
    )
    .join('');
  const suiteRows = suites
    .map(
      (suite) =>
        `<tr><td><a href="${escape(suite.id)}.json">${escape(suite.id)}</a></td><td>${suite.passed}</td><td>${suite.failed}</td><td>${suite.skipped}</td><td>${suite.total}</td></tr>`,
    )
    .join('');
  const commandRows = run.checks
    .map(
      (check) =>
        `<tr><td>${escape(check.id)}</td><td>${escape(check.status)}; exit ${escape(check.exitCode)}</td><td><a href="${escape(check.log)}">Log</a><details><summary>Exact command and date</summary><pre>CWD ${escape(check.cwd)}\n${escape(check.command)}\n${escape(check.startedAt)}</pre></details></td></tr>`,
    )
    .join('');
  const evidenceLinks = (assessment?.evidenceFiles ?? [])
    .filter((item) => fs.existsSync(path.join(root, 'reports/readiness/evidence', item.file)))
    .map((item) => `<li><a href="../evidence/${escape(item.file)}">${escape(item.label)}</a></li>`)
    .join('');
  const next = (staging?.nextSteps ?? assessment?.nextSteps ?? [])
    .map((item) => `<li>${escape(item)}</li>`)
    .join('');
  const failedJourneys = [];
  const walkBrowser = (suite) => {
    for (const spec of suite.specs ?? [])
      for (const test of spec.tests ?? [])
        if (test.status === 'unexpected') failedJourneys.push(spec.title);
    for (const child of suite.suites ?? []) walkBrowser(child);
  };
  for (const suite of browser?.suites ?? []) walkBrowser(suite);
  const deletionHtml =
    deletionPrivacy || deletionConcurrency
      ? `<h2>Pending account-deletion regression evidence</h2>
<p>${deletionPrivacy ? `<b>${deletionPrivacy.passed} passed; ${deletionPrivacy.failed} failed</b> combined fixtures using actual local baseline roles at ${escape(deletionPrivacy.completedAtUtc)}. Admin001 includes the privacy-redacted replay guard; pending migrations applied only inside FULL ROLLBACK. <a href="../combined-privacy/summary.json">Combined fixtures / preservation</a>. Older-baseline deletion004: ${deletionBaseline?.passed ?? 0} passed; ${deletionBaseline?.failed ?? 0} failed. <a href="../deletion-baseline/summary.json">Baseline receipt</a>.` : 'Combined local-role fixtures not run.'}</p>
<p>${deletionConcurrency ? `<b>${deletionConcurrency.passed} passed; ${deletionConcurrency.failed} failed; ${deletionConcurrency.infrastructureErrors} infrastructure errors</b> across seven workflows and six actual PostgreSQL lock waits at ${escape(deletionConcurrency.completedAtUtc)}. Late report/review and co-owner activation/deactivation cases pass unchanged after fixes. <a href="../deletion-concurrency/summary.json">Actual concurrent results</a> / <a href="../evidence/deletion-concurrency-before-fix.json">Four retained pre-fix failures</a>. Synthetic schema-only temporary local database removed; source schema/history/role fingerprints preserved. Managed ownership/default ACLs omitted from clone.` : 'Concurrent workflows not run.'}</p>
<p>These results cover the stated local interleavings. Other lock orderings, obligation changes, real JWT/native transport, storage/provider cleanup and financial/contact retention remain unverified. Deletion004 is a local candidate; no hosted application authorized. <a href="../evidence/DELETION-PRIVACY-CANDIDATE.md">Exact retention/scrubbing contract and limits</a>.</p>`
      : '';
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Parish Pass — actual staging results</title><script>if(location.protocol==='http:'&&location.pathname==='/'){const base=document.createElement('base');base.href='/latest/';document.head.append(base)}</script><style>
body{margin:0;background:#f7f8f5;color:#172821;font:16px/1.55 system-ui,sans-serif}main{max-width:1200px;margin:auto;padding:28px 24px 60px}h1{font-size:38px;line-height:1.15;margin:12px 0}h2{font-size:24px;margin-top:30px}a{color:#145c43}.hero{background:#15392e;color:#f4f7f0;padding:24px;border-radius:16px}.hero a{color:#b8e6c6}.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;margin:20px 0}.card{border:1px solid #d6dfd8;background:white;padding:16px;border-radius:12px}.card b{display:block;font-size:30px}.notice{border-left:5px solid #9a6600;background:#fff3d7;padding:15px}.scroll{overflow:auto}table{border-collapse:collapse;width:100%;background:white}th,td{padding:12px;text-align:left;border-bottom:1px solid #d9e1dc;vertical-align:top}th{background:#e5ede7}td small{color:#58665f}.badge{display:inline-block;padding:3px 9px;border-radius:10px;white-space:nowrap}.passed{background:#e0f1e5;color:#124528}.failed{background:#fae1df;color:#7b1919}.not-tested{background:#e5edf7;color:#203f6c}details{margin:12px 0}details.local{border:1px solid #c9d5cd;border-radius:12px;padding:16px;background:#eef2ed}summary{cursor:pointer;font-weight:650}code,pre{font-size:12px;overflow-wrap:anywhere}pre{white-space:pre-wrap;background:#f1f4f0;padding:12px}select{font:inherit;padding:7px;border-radius:7px}footer{margin-top:28px;font-size:13px;color:#526058}
</style></head><body><main>
<div class="hero"><small>PARISH PASS · NORMAL PREVIEW OTA STAGING</small><h1>Actual staging results</h1><p>${escape(stageVerdict)}</p><p>Exact backend: <b>lgddhdexvwclfrnzjtly</b> · sds-local-staging<br>Read-only API run: ${escape(live?.observedAtUtc ?? 'Not executed')} to ${escape(live?.completedAtUtc ?? 'Not executed')}</p><p><a href="../READINESS.md">Plain-language report</a> · <a href="https://supabase.com/dashboard/project/lgddhdexvwclfrnzjtly">Staging backend</a> · <a href="https://expo.dev/accounts/kadestanford/projects/sds-local/updates/2217fdae-1e17-48ad-9ff7-2a895a867b46">Observed normal-preview OTA</a></p></div>
<div class="cards"><div class="card"><b>${live?.totals?.passed ?? 0}</b>staging backend checks passed</div><div class="card"><b>${live?.totals?.failed ?? 0}</b>staging backend checks failed</div><div class="card"><b>${staging?.nativeJourneysExecuted ?? 0}</b>installed native journeys executed</div><div class="card"><b>${staging?.journeys?.filter((row) => row.status === 'not-tested').length ?? 0}</b>listed journeys Not Tested</div></div>
<p class="notice">${live ? '<b>Backend passes cover only the requests listed below.</b> Category/history installation and anonymous denial are verified.' : '<b>No current staging request evidence is attached to this run.</b> Local/source checks cannot establish staging success.'} Signed-in success, tenant isolation and native app behavior remain Not Tested. No readiness percentage is inferred from check counts.</p>
<p>${escape(staging?.artifactIdentity ?? assessment?.stagingIdentity ?? '')}</p>
<h2>Staging customer and business journeys</h2><label>Show <select id="filter"><option value="all">All staging evidence</option><option value="passed">Staging Pass</option><option value="failed">Staging Fail</option><option value="not-tested">Not Tested</option></select></label><div class="scroll"><table class="staging"><thead><tr><th>Journey / execution layer</th><th>Actual status</th><th>Evidence now</th><th>Remaining execution input</th></tr></thead><tbody>${nativeRows || '<tr><td colspan="4">No staging journey evidence was supplied.</td></tr>'}</tbody></table></div>
<h2>Executed staging backend checks</h2><p>Anonymous GET only. Required catalog records were nonempty; required fields were validated. These requests do not render the app or complete a signed-in journey. <a href="../evidence/staging-readonly.json">Raw dated requests and assertions</a> · <a href="../evidence/staging-category-receipt.json">Category migration receipt</a> · <a href="../evidence/staging-history-receipt.json">History migration receipt</a> · <a href="../evidence/staging-rpc-live-role-denial.txt">Task-4 live role checks</a>.</p><div class="scroll"><table class="staging"><thead><tr><th>Check / request</th><th>Actual result</th><th>Assertion evidence / UTC date</th></tr></thead><tbody>${apiRows || '<tr><td colspan="3">Not Tested</td></tr>'}</tbody></table></div>
${adminHtml}<h2>Ranked next steps</h2><ol>${next}</ol>
<details class="local"><summary>Secondary local source and isolated workflow evidence — does not establish staging success</summary><p>Source snapshot: ${escape(assessment?.sourceIdentity ?? root)}<br>Source run: ${escape(run.startedAt)} to ${escape(run.completedAt)}.</p><p><b>${totals.passed}/${totals.total} source assertions passed; ${totals.failed} failed; ${totals.skipped} skipped.</b> ${escape(summary.coverageLimit)}</p><div class="scroll"><table><thead><tr><th>Source suite / raw JSON</th><th>Passed</th><th>Failed</th><th>Skipped</th><th>Total</th></tr></thead><tbody>${suiteRows}</tbody></table></div>
<h2>Actual isolated local workflow runs</h2><div class="scroll"><table><thead><tr><th>Layer</th><th>Actual result</th><th>Scope and evidence</th></tr></thead><tbody><tr><td>PostgreSQL migrations/RLS/permissions</td><td>${database ? `${database.passed} passed; ${database.failed} failed / ${database.total} fixture files` : 'Not run'}</td><td><a href="../database/summary.json">Raw SQL summary and logs</a>. Local rollback fixtures; ${escape(database?.completedAtUtc)}.</td></tr><tr><td>Browser + real local auth/database</td><td>${browser ? `${browser.stats.expected} passed; ${browser.stats.unexpected} failed; ${browser.stats.skipped} skipped` : 'Not run'}</td><td><a href="../browser/html/index.html">Browser report</a> / <a href="../browser/results.json">Raw JSON</a>. Separate Chromium context, localhost only. ${escape(browser?.stats?.startTime)}. ${failedJourneys.length ? `Actual failed journey: ${escape(failedJourneys.join('; '))}.` : ''}</td></tr><tr><td>Commerce orchestration + real local API/DB</td><td>${escape(commerce?.status ?? 'Not run')}</td><td><a href="../integration/commerce.json">Receipt</a> / <a href="../integration/commerce.log">Log</a>. Provider HTTP fixture; no real provider transaction. ${escape(commerce?.completedAtUtc)}</td></tr></tbody></table></div>
${deletionHtml}<h2>Source commands and logs</h2><div class="scroll"><table><thead><tr><th>Check</th><th>Actual source result</th><th>Evidence</th></tr></thead><tbody>${commandRows}</tbody></table></div><p><a href="../baseline/checks.json">Original source baseline</a> · <a href="../evidence/clean-build.json">Earlier clean web production-build receipt</a> · <a href="summary.json">Full combined report JSON</a>.</p>
</details><details><summary>Supporting receipts, source identity and coverage limits</summary><ul>${evidenceLinks}</ul></details>
<footer>Generated ${escape(summary.generatedAtUtc)}. Local report; no source push, OTA or deployment. Task-4 alone performed the two dated staging SQL corrections. Unexecuted journeys are Not Tested.</footer>
</main><script>document.querySelector('#filter').addEventListener('change',event=>{document.querySelectorAll('table.staging tr[data-status]').forEach(row=>{row.hidden=event.target.value!=='all'&&row.dataset.status!==event.target.value})});setInterval(async()=>{try{const response=await fetch('summary.json',{cache:'no-store'});const value=await response.json();if(value.generatedAtUtc!==${JSON.stringify(summary.generatedAtUtc)})location.reload()}catch{}},30000);</script></body></html>`;
  fs.writeFileSync(path.join(output, 'index.html'), html);
  return summary;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  renderReadiness(path.resolve(root, process.argv[2] ?? 'reports/readiness/latest'), root);
}
