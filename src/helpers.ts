import { platform } from 'os';
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'fs';
import { normalize, join } from 'path';
import { ExtensionContext } from 'vscode';

import { PluginResourceSettings, hasUserSetPathToJest } from './Settings';
import { TestIdentifier } from './TestResults';
import { TestStats } from './types';

/**
 * Known binary names of `react-scripts` forks
 */
const createReactAppBinaryNames = [
  'react-scripts',
  'react-native-scripts',
  'react-scripts-ts',
  'react-app-rewired',
];

/**
 * File extension for npm binaries
 */
export const nodeBinExtension: string = platform() === 'win32' ? '.cmd' : '';

/**
 * Resolves the location of an npm binary
 *
 * Returns the path if it exists, or `undefined` otherwise
 */
function getLocalPathForExecutable(rootPath: string, executable: string): string | undefined {
  const absolutePath = normalize(
    join(rootPath, 'node_modules', '.bin', executable + nodeBinExtension)
  );
  return existsSync(absolutePath) ? absolutePath : undefined;
}

/**
 * Tries to read the test command from the scripts section within `package.json`
 *
 * Returns the test command in case of success,
 * `undefined` if there was an exception while reading and parsing `package.json`
 * `null` if there is no test script
 */
export function getTestCommand(rootPath: string): string | undefined | null {
  try {
    const packagePath = join(rootPath, 'package.json');
    const packageJSON = JSON.parse(readFileSync(packagePath, 'utf8'));
    if (packageJSON && packageJSON.scripts && packageJSON.scripts.test) {
      return packageJSON.scripts.test;
    }
    return null;
  } catch {
    return undefined;
  }
}

/**
 * Checks if the supplied test command could have been generated by create-react-app
 */
export function isCreateReactAppTestCommand(testCommand?: string | null): boolean {
  return (
    !!testCommand &&
    createReactAppBinaryNames.some((binary) => testCommand.includes(`${binary} test`))
  );
}

/**
 * Checks if the project in `rootPath` was bootstrapped by `create-react-app`.
 */
function isBootstrappedWithCreateReactApp(rootPath: string): boolean {
  const testCommand = getTestCommand(rootPath);
  if (testCommand === undefined) {
    // In case parsing `package.json` failed or was unconclusive,
    // fallback to checking for the presence of the binaries in `./node_modules/.bin`
    return createReactAppBinaryNames.some(
      (binary) => getLocalPathForExecutable(rootPath, binary) !== undefined
    );
  }
  return isCreateReactAppTestCommand(testCommand);
}

/**
 * Handles getting the jest runner, handling the OS and project specific work too
 *
 * @returns {string}
 */
// tslint:disable-next-line no-shadowed-variable
export function pathToJest({ pathToJest, rootPath }: PluginResourceSettings): string {
  if (pathToJest && hasUserSetPathToJest(pathToJest)) {
    return normalize(pathToJest);
  }

  if (isBootstrappedWithCreateReactApp(rootPath)) {
    return 'npm test --';
  }

  const p = getLocalPathForExecutable(rootPath, 'jest') || 'jest' + nodeBinExtension;
  return `"${p}"`;
}

/**
 * Handles getting the path to config file
 *
 * @returns {string}
 */
export function pathToConfig(pluginSettings: PluginResourceSettings): string {
  if (pluginSettings.pathToConfig) {
    return normalize(pluginSettings.pathToConfig);
  }

  return '';
}

/**
 *  Taken From https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions
 */
export function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

/**
 * ANSI colors/characters cleaning based on http://stackoverflow.com/questions/25245716/remove-all-ansi-colors-styles-from-strings
 */
export function cleanAnsi(str: string): string {
  return str.replace(
    // eslint-disable-next-line no-control-regex
    /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g,
    ''
  );
}

export type IdStringType = 'display' | 'display-reverse' | 'full-name';
export function testIdString(type: IdStringType, identifier: TestIdentifier): string {
  if (!identifier.ancestorTitles.length) {
    return identifier.title;
  }
  const parts = [...identifier.ancestorTitles, identifier.title];
  switch (type) {
    case 'display':
      return parts.join(' > ');
    case 'display-reverse':
      return parts.reverse().join(' < ');
    case 'full-name':
      return parts.join(' ');
  }
}

/**
 * Generate path to icon used in decorations
 * NOTE: Should not be called repeatedly for the performance reasons. Cache your results.
 */
export function prepareIconFile(
  context: ExtensionContext,
  iconName: string,
  source: string,
  color?: string
): string {
  const iconsPath = join('generated-icons');

  const resolvePath = (...args: string[]): string => {
    return context.asAbsolutePath(join(...args));
  };

  const resultIconPath = resolvePath(iconsPath, `${iconName}.svg`);
  let result = source.toString();

  if (color) {
    result = result.replace('fill="currentColor"', `fill="${color}"`);
  }

  if (!existsSync(resultIconPath) || readFileSync(resultIconPath).toString() !== result) {
    if (!existsSync(resolvePath(iconsPath))) {
      mkdirSync(resolvePath(iconsPath));
    }

    writeFileSync(resultIconPath, result);
  }

  return resultIconPath;
}

const SurroundingQuoteRegex = /^["']+|["']+$/g;
export const removeSurroundingQuote = (command: string): string =>
  command.replace(SurroundingQuoteRegex, '');

// TestStats
export const emptyTestStats = (): TestStats => {
  return { success: 0, fail: 0, unknown: 0 };
};
