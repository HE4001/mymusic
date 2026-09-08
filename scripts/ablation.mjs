import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import {
  copyFile,
  mkdir,
  readFile,
  writeFile,
} from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ablationRoot = resolve(projectRoot, '.cache', 'ablation');
const runRoot = resolve(ablationRoot, `run-${Date.now()}-${randomUUID()}`);
const resultsPath = resolve(ablationRoot, 'results.json');
const vitestEntry = resolve(projectRoot, 'node_modules', 'vitest', 'vitest.mjs');
const sourcePath = resolve(projectRoot, 'src/hooks/usePlayer.ts');

// Keep this list explicit. Copy only the files needed by the selected tests;
// node_modules stays at the real project root and is never copied.
const copiedFiles = [
  'server/b2.ts',
  'server/http.ts',
  'server/library.ts',
  'server/library.json',
  'functions/api/_middleware.ts',
  'functions/api/library.ts',
  'functions/api/play-url.ts',
  'src/types.ts',
  'tests/server.test.ts',
  'tests/player.test.ts',
  'src/hooks/usePlayer.ts',
  'src/lib/api.ts',
  'src/lib/demo.ts',
  'src/lib/player.ts',
  'src/lib/preferences.ts',
  'src/lib/queue.ts',
  'vitest.config.ts',
];

const variants = [
  {
    name: 'remove-stale-ticket-guard',
    description: '移除旧播放请求的结果丢弃保护',
    sourceFile: 'src/hooks/usePlayer.ts',
    mutation: {
      needle: '        if (operationId !== operationIdRef.current || abortController.signal.aborted) return;',
      replacement: '',
    },
    expectedFailedTests: ['player flow ignores an older ticket that resolves after the latest selection'],
  },
  {
    name: 'baseline',
    description: '原始播放与服务端逻辑',
    expectedFailedTests: [],
  },
];

function assertInside(parentPath, childPath) {
  const parent = resolve(parentPath);
  const child = resolve(childPath);
  const childRelative = relative(parent, child);
  if (
    childRelative === '' ||
    childRelative === '..' ||
    childRelative.startsWith(`..${requirePathSeparator()}`) ||
    isAbsolute(childRelative)
  ) {
    throw new Error(`拒绝使用 ablation 目录外路径：${child}`);
  }
}

function requirePathSeparator() {
  return process.platform === 'win32' ? '\\' : '/';
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

function countOccurrences(source, needle) {
  let count = 0;
  let offset = 0;
  while (true) {
    const index = source.indexOf(needle, offset);
    if (index === -1) {
      return count;
    }
    count += 1;
    offset = index + needle.length;
  }
}

function applyMutation(source, variant) {
  const { needle, replacement } = variant.mutation;
  const matchCount = countOccurrences(source, needle);
  if (matchCount !== 1) {
    throw new Error(
      `${variant.name} 的精确突变匹配数为 ${matchCount}，预期为 1：${needle}`,
    );
  }
  return {
    source: source.replace(needle, replacement),
    matchCount,
  };
}

async function copyVariantTree(variantDirectory) {
  for (const relativePath of copiedFiles) {
    const sourcePath = resolve(projectRoot, relativePath);
    const targetPath = resolve(variantDirectory, relativePath);
    assertInside(projectRoot, sourcePath);
    assertInside(runRoot, targetPath);
    await mkdir(dirname(targetPath), { recursive: true });
    await copyFile(sourcePath, targetPath);
  }
}

function tail(value, maximumLength = 4000) {
  if (value.length <= maximumLength) {
    return value;
  }
  return value.slice(-maximumLength);
}

async function runVitest(variantDirectory, reportPath) {
  const args = [
    vitestEntry,
    'run',
    '--config',
    'vitest.config.ts',
    '--reporter=json',
    '--outputFile',
    reportPath,
  ];

  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(process.execPath, args, {
      cwd: variantDirectory,
      env: { ...process.env, CI: '1' },
      windowsHide: true,
    });
    let stdout = '';
    let stderr = '';

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('error', rejectRun);
    child.on('close', (code, signal) => {
      resolveRun({
        exitCode: code,
        signal,
        stdout: tail(stdout),
        stderr: tail(stderr),
      });
    });
  });
}

async function readVitestReport(reportPath) {
  try {
    const text = await readFile(reportPath, 'utf8');
    return { report: JSON.parse(text), readError: null };
  } catch (error) {
    return { report: null, readError: errorMessage(error) };
  }
}

function failedTestsFromReport(report) {
  if (!report || !Array.isArray(report.testResults)) {
    return [];
  }

  const failedTests = [];
  for (const suite of report.testResults) {
    const assertions = Array.isArray(suite.assertionResults)
      ? suite.assertionResults
      : [];
    for (const assertion of assertions) {
      if (assertion.status !== 'failed') {
        continue;
      }
      const messages = Array.isArray(assertion.failureMessages)
        ? assertion.failureMessages
        : [];
      failedTests.push({
        file: typeof suite.name === 'string' ? suite.name : '',
        name:
          typeof assertion.fullName === 'string'
            ? assertion.fullName
            : typeof assertion.title === 'string'
              ? assertion.title
              : '未命名测试',
        message: tail(messages.join('\n'), 2000),
      });
    }
  }
  return failedTests;
}

function suiteErrorsFromReport(report) {
  if (!report || !Array.isArray(report.testResults)) {
    return [];
  }

  const suiteErrors = [];
  for (const suite of report.testResults) {
    for (const key of ['testExecError', 'failureMessage', 'error']) {
      if (suite[key]) {
        suiteErrors.push({
          file: typeof suite.name === 'string' ? suite.name : '',
          message: tail(
            typeof suite[key] === 'string'
              ? suite[key]
              : JSON.stringify(suite[key]),
            2000,
          ),
        });
      }
    }
    if (
      typeof suite.message === 'string' &&
      suite.message.trim() !== '' &&
      (!Array.isArray(suite.assertionResults) || suite.assertionResults.length === 0)
    ) {
      suiteErrors.push({
        file: typeof suite.name === 'string' ? suite.name : '',
        message: tail(suite.message, 2000),
      });
    }
  }
  return suiteErrors;
}

function classifyRun(exitCode, report, failedTests, suiteErrors) {
  const hasReport = report !== null;
  const hasTests =
    hasReport &&
    typeof report.numTotalTests === 'number' &&
    report.numTotalTests > 0;
  if (
    exitCode === 0 &&
    report?.success === true &&
    hasTests &&
    failedTests.length === 0 &&
    suiteErrors.length === 0
  ) {
    return 'passed';
  }
  if (hasTests && failedTests.length > 0 && suiteErrors.length === 0) {
    return 'assertion_failure';
  }
  if (suiteErrors.length > 0 || report === null) {
    return 'import_or_syntax_error';
  }
  return 'unexpected_failure';
}

function matchesExpectedFailures(failedTests, expectedFailedTests) {
  if (failedTests.length !== expectedFailedTests.length) {
    return false;
  }
  const actualNames = new Set(failedTests.map((test) => test.name));
  return expectedFailedTests.every((name) => actualNames.has(name));
}

async function runVariant(source, variant) {
  const variantDirectory = resolve(runRoot, variant.name);
  assertInside(runRoot, variantDirectory);
  await mkdir(variantDirectory, { recursive: true });
  await copyVariantTree(variantDirectory);

  let matchCount = null;
  if (variant.mutation) {
    if (variant.sourceFile) source = (await readFile(resolve(projectRoot, variant.sourceFile), 'utf8')).replace(/\r\n?/g, '\n');
    const mutated = applyMutation(source, variant);
    matchCount = mutated.matchCount;
    const targetPath = resolve(variantDirectory, variant.sourceFile ?? 'src/hooks/usePlayer.ts');
    assertInside(runRoot, targetPath);
    await writeFile(targetPath, mutated.source, 'utf8');
  }

  const reportPath = resolve(variantDirectory, 'vitest-report.json');
  assertInside(runRoot, reportPath);
  const processResult = await runVitest(variantDirectory, reportPath);
  const { report, readError } = await readVitestReport(reportPath);
  const failedTests = failedTestsFromReport(report);
  const suiteErrors = suiteErrorsFromReport(report);
  const classification = classifyRun(
    processResult.exitCode,
    report,
    failedTests,
    suiteErrors,
  );
  const expectedFailures = matchesExpectedFailures(
    failedTests,
    variant.expectedFailedTests,
  );
  const valid =
    variant.name === 'baseline'
      ? classification === 'passed' && processResult.exitCode === 0
      : classification === 'assertion_failure' &&
        processResult.exitCode !== 0 &&
        expectedFailures;

  return {
    name: variant.name,
    description: variant.description,
    exitCode: processResult.exitCode,
    signal: processResult.signal,
    classification,
    valid,
    mutationMatchCount: matchCount,
    expectedFailedTests: variant.expectedFailedTests,
    failedTests,
    suiteErrors,
    reportReadError: readError,
    reportPath: relative(projectRoot, reportPath),
    stdoutTail: processResult.stdout,
    stderrTail: processResult.stderr,
  };
}

async function main() {
  await mkdir(ablationRoot, { recursive: true });
  assertInside(ablationRoot, runRoot);
  assertInside(ablationRoot, resultsPath);

  const source = (await readFile(sourcePath, 'utf8')).replace(/\r\n?/g, '\n');
  const variantResults = [];

  for (const variant of [...variants].sort((a, b) => Number(b.name === 'baseline') - Number(a.name === 'baseline'))) {
    try {
      variantResults.push(await runVariant(source, variant));
    } catch (error) {
      variantResults.push({
        name: variant.name,
        description: variant.description,
        exitCode: null,
        signal: null,
        classification: 'setup_error',
        valid: false,
        mutationMatchCount: null,
        expectedFailedTests: variant.expectedFailedTests,
        failedTests: [],
        suiteErrors: [],
        reportReadError: null,
        reportPath: null,
        error: errorMessage(error),
      });
    }
  }

  const allValid = variantResults.length === variants.length && variantResults.every((result) => result.valid);
  const results = {
    generatedAt: new Date().toISOString(),
    projectRoot,
    runDirectory: relative(projectRoot, runRoot),
    tool: 'project node_modules/vitest',
    overall: allValid ? 'passed' : 'failed',
    variants: variantResults,
  };
  await writeFile(resultsPath, `${JSON.stringify(results, null, 2)}\n`, 'utf8');

  for (const result of variantResults) {
    const status = result.valid ? '通过' : '失败';
    console.log(`${result.name}: ${status} (${result.classification}, exit=${result.exitCode})`);
    if (result.error) {
      console.error(`${result.name}: ${result.error}`);
    }
  }
  console.log(`结果已写入 ${relative(projectRoot, resultsPath)}`);

  if (!allValid) {
    process.exitCode = 1;
  }
}

await main();
