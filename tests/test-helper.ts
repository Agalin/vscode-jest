/* istanbul ignore file */
import { Location, LocationRange, TestResult } from '../src/TestResults/TestResult';
import { TestReconciliationStateType } from '../src/TestResults';
import { ItBlock, TestAssertionStatus } from 'jest-editor-support';
import { JestProcessRequest } from '../src/JestProcessManagement';
import { JestTestProcessType } from '../src/Settings';
import { AutoRunAccessor } from '../src/JestExt';

export const EmptyLocation = {
  line: 0,
  column: 0,
};
export const EmptyLocationRange = {
  start: EmptyLocation,
  end: EmptyLocation,
};
export const makeLocation = (pos: [number, number]): Location => ({
  line: pos[0],
  column: pos[1],
});
export const makePositionRange = (pos: [number, number, number, number]) => ({
  start: makeLocation([pos[0], pos[1]]),
  end: makeLocation([pos[2], pos[3]]),
});
export const isSameLocation = (p1: Location, p2: Location): boolean =>
  p1.line === p2.line && p1.column === p2.column;
export const isSameLocationRange = (r1: LocationRange, r2: LocationRange): boolean =>
  isSameLocation(r1.start, r2.start) && isSameLocation(r1.end, r2.end);

export const makeZeroBased = (r: LocationRange): LocationRange => ({
  start: { line: r.start.line - 1, column: r.start.column - 1 },
  end: { line: r.end.line - 1, column: r.end.column - 1 },
});
export const findResultForTest = (results: TestResult[], itBlock: ItBlock): TestResult[] => {
  const zeroBasedRange = makeZeroBased(itBlock);
  return results.filter((r) => r.name === itBlock.name && isSameLocationRange(r, zeroBasedRange));
};

// factory method
export const makeItBlock = (name?: string, pos?: [number, number, number, number]): any => {
  const loc = pos ? makePositionRange(pos) : EmptyLocationRange;
  return {
    type: 'it',
    name,
    ...loc,
  };
};
export const makeDescribeBlock = (name: string, itBlocks: any[]): any => ({
  type: 'describe',
  name,
  children: itBlocks,
});
export const makeRoot = (children: any[]): any => ({
  type: 'root',
  children,
});
export const makeAssertion = (
  title: string,
  status: TestReconciliationStateType,
  ancestorTitles: string[] = [],
  location?: [number, number],
  override?: Partial<TestAssertionStatus>
): TestAssertionStatus =>
  ({
    title,
    ancestorTitles,
    fullName: [...ancestorTitles, title].join(' '),
    status,
    location: location ? makeLocation(location) : EmptyLocation,
    ...(override || {}),
  } as TestAssertionStatus);

export const makeTestResult = (
  title: string,
  status: TestReconciliationStateType,
  ancestorTitles: string[] = [],
  range?: [number, number, number, number],
  override?: Partial<TestResult>
): TestResult => ({
  name: [...ancestorTitles, title].join(' '),
  status,
  identifier: {
    title,
    ancestorTitles,
  },
  ...(range ? makePositionRange(range) : EmptyLocationRange),
  ...(override || {}),
});

export const mockProcessRequest = (
  type: JestTestProcessType,
  override?: Partial<JestProcessRequest>
): any /*JestProcessRequest */ => {
  return {
    type,
    schedule: { queue: 'blocking' },
    listener: jest.fn(),
    ...(override || {}),
  };
};

export const mockProjectWorkspace = (...args: any[]): any => {
  const [
    rootPath,
    jestCommandLine,
    pathToConfig,
    localJestMajorVersion,
    outputFileSuffix,
    collectCoverage,
    debug,
    nodeEnv,
  ] = args;
  return {
    rootPath,
    jestCommandLine,
    pathToConfig,
    localJestMajorVersion,
    outputFileSuffix,
    collectCoverage,
    debug,
    nodeEnv,
  };
};

export const mockWworkspaceLogging = (): any => ({ create: () => jest.fn() });

export const mockJestExtContext = (autoRun?: AutoRunAccessor): any => {
  return {
    workspace: jest.fn(),
    runnerWorkspace: jest.fn(),
    settings: jest.fn(),
    loggingFactory: { create: jest.fn(() => jest.fn()) },
    autoRun: autoRun ?? jest.fn(),
  };
};

export const mockJestProcessContext = (): any => {
  return {
    ...mockJestExtContext(),
    output: { appendLine: jest.fn(), clear: jest.fn() },
    updateStatusBar: jest.fn(),
    updateWithData: jest.fn(),
  };
};
