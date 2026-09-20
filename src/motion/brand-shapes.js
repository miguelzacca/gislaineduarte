import { BRAND_PARTS } from '../lib/brand.js';

const NUMBER = /[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/y;
const WHITESPACE = /[ \t\r\n]/;
const COMMANDS = new Set(['M', 'C', 'L', 'Z']);

function tokenize(data) {
  const tokens = [];
  let index = 0;
  let comma = false;
  while (index < data.length) {
    const character = data[index];
    if (WHITESPACE.test(character)) {
      index += 1;
      continue;
    }
    if (character === ',') {
      if (comma || tokens.at(-1)?.type !== 'number') throw new SyntaxError(`Unexpected comma at ${index}.`);
      comma = true;
      index += 1;
      continue;
    }
    if (COMMANDS.has(character)) {
      if (comma) throw new SyntaxError(`Expected a coordinate before ${character} at ${index}.`);
      tokens.push({ type: 'command', value: character });
      index += 1;
      continue;
    }
    NUMBER.lastIndex = index;
    const match = NUMBER.exec(data);
    if (!match) throw new SyntaxError(`Unsupported path token at ${index}: ${character}.`);
    const value = Number(match[0]);
    if (!Number.isFinite(value)) throw new SyntaxError(`Non-finite coordinate at ${index}.`);
    tokens.push({ type: 'number', value });
    comma = false;
    index = NUMBER.lastIndex;
  }
  if (comma) throw new SyntaxError('A path cannot end with a comma.');
  return tokens;
}

/** DOM-free parser for the brand's absolute M/C/L/Z paths and even-odd fill. */
export function parseBrandPath(data, THREE) {
  if (typeof data !== 'string') throw new TypeError('Brand path data must be a string.');
  if (typeof THREE?.ShapePath !== 'function') throw new TypeError('THREE.ShapePath is required.');
  const tokens = tokenize(data);
  if (tokens[0]?.value !== 'M' || tokens[0]?.type !== 'command') {
    throw new SyntaxError('A brand path must begin with an absolute M command.');
  }
  const path = new THREE.ShapePath();
  path.userData.style = { fillRule: 'evenodd' };
  let firstX = 0;
  let firstY = 0;
  let afterClose = false;
  let index = 0;

  while (index < tokens.length) {
    const token = tokens[index++];
    if (token.type !== 'command') throw new SyntaxError('Coordinates require a drawing command.');
    const command = token.value;
    const numbers = [];
    while (tokens[index]?.type === 'number') numbers.push(tokens[index++].value);

    if (command === 'Z') {
      if (numbers.length) throw new SyntaxError('Z does not accept coordinates.');
      // Match SVGLoader: autoClose closes sampled points without inserting a curve.
      path.currentPath.autoClose = true;
      if (path.currentPath.curves.length > 0) {
        path.currentPath.currentPoint.set(firstX, firstY);
        afterClose = true;
      }
      continue;
    }

    const stride = command === 'C' ? 6 : 2;
    if (!numbers.length || numbers.length % stride !== 0) {
      throw new SyntaxError(`${command} requires complete groups of ${stride} coordinates.`);
    }
    for (let offset = 0; offset < numbers.length; offset += stride) {
      if (command === 'M' && offset === 0) {
        path.moveTo(numbers[offset], numbers[offset + 1]);
        firstX = numbers[offset];
        firstY = numbers[offset + 1];
      } else if (command === 'C') {
        path.bezierCurveTo(...numbers.slice(offset, offset + stride));
      } else {
        path.lineTo(numbers[offset], numbers[offset + 1]);
      }
      // SVGLoader begins its next close origin at the first endpoint after Z.
      if (afterClose && command !== 'M' && offset === 0) {
        firstX = numbers[offset + stride - 2];
        firstY = numbers[offset + stride - 1];
      }
    }
    afterClose = false;
  }
  return path;
}

/** Preserves BRAND_PARTS order, color, subpaths, curve winding and holes. */
export function parseBrandPaths(THREE) {
  return BRAND_PARTS.map(({ path: data, color }) => {
    const path = parseBrandPath(data, THREE);
    path.color.setStyle(color);
    path.userData.style.fill = color;
    return path;
  });
}
