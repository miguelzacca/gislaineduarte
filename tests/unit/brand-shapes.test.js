import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import * as THREE from 'three';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
import { BRAND_PARTS } from '../../src/lib/brand.js';
import { parseBrandPath, parseBrandPaths } from '../../src/motion/brand-shapes.js';

function node(name, attributes = {}, childNodes = []) {
  return {
    nodeType: 1, nodeName: name, childNodes,
    hasAttribute: key => Object.hasOwn(attributes, key),
    getAttribute: key => attributes[key] ?? null,
  };
}

// Only the XML envelope is stubbed. The reference uses Three's real SVG parser,
// transforms, curve construction and toShapes(), not a second path parser.
function referencePaths(parts) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'DOMParser');
  Object.defineProperty(globalThis, 'DOMParser', {
    configurable: true,
    value: class {
      parseFromString() {
        return {
          querySelectorAll: () => [],
          documentElement: node('svg', {}, parts.map(part => node('path', {
            d: part.path, fill: part.color ?? '#000000', 'fill-rule': 'evenodd',
          }))),
        };
      }
    },
  });
  try {
    return new SVGLoader().parse('<svg/>').paths;
  } finally {
    if (previous) Object.defineProperty(globalThis, 'DOMParser', previous);
    else delete globalThis.DOMParser;
  }
}

function curves(path) {
  return path.curves.map(curve => curve.toJSON());
}

function points(values) {
  return values.map(point => point?.toArray() ?? null);
}

function assertEquivalent(actual, expected) {
  assert.equal(actual.subPaths.length, expected.subPaths.length);
  for (const [index, subpath] of actual.subPaths.entries()) {
    const reference = expected.subPaths[index];
    assert.deepEqual(curves(subpath), curves(reference));
    assert.equal(subpath.autoClose, reference.autoClose);
    assert.deepEqual(subpath.currentPoint, reference.currentPoint);
    for (const resolution of [8, 20]) {
      assert.deepEqual(points(subpath.getPoints(resolution)), points(reference.getPoints(resolution)));
    }
    for (const resolution of [68, 128]) {
      assert.deepEqual(points(subpath.getSpacedPoints(resolution)), points(reference.getSpacedPoints(resolution)));
    }
    assert.equal(THREE.ShapeUtils.area(subpath.getPoints()), THREE.ShapeUtils.area(reference.getPoints()));
  }
  const shapes = actual.toShapes();
  const expectedShapes = expected.toShapes();
  assert.equal(shapes.length, expectedShapes.length);
  for (const [index, shape] of shapes.entries()) {
    assert.deepEqual(curves(shape), curves(expectedShapes[index]));
    assert.deepEqual(shape.holes.map(curves), expectedShapes[index].holes.map(curves));
  }
}

describe('worker-safe brand paths', () => {
  test('four ordered ShapePaths preserve the three negative spaces and brand colors', () => {
    assert.equal(typeof globalThis.DOMParser, 'undefined');
    const parsed = parseBrandPaths(THREE);
    assert.equal(parsed.length, 4);
    assert.deepEqual(parsed.map(path => path.subPaths.length), [2, 2, 2, 1]);
    assert.deepEqual(parsed.map(path => path.toShapes().length), [1, 1, 1, 1]);
    assert.deepEqual(parsed.map(path => path.toShapes()[0].holes.length), [1, 1, 1, 0]);
    for (const [index, path] of parsed.entries()) {
      assert.ok(path instanceof THREE.ShapePath);
      assert.equal(path.userData.style.fillRule, 'evenodd');
      assert.equal(path.color.getHexString(), BRAND_PARTS[index].color.slice(1).toLowerCase());
      for (const subpath of path.subPaths) assert.equal(subpath.autoClose, true);
    }
  });

  test('every control point, endpoint, winding and mobile/desktop contour sample equals SVGLoader', () => {
    const parsed = parseBrandPaths(THREE);
    const reference = referencePaths(BRAND_PARTS);
    for (const [index, path] of parsed.entries()) {
      assertEquivalent(path, reference[index]);
      assert.deepEqual(path.color, reference[index].color);
    }
  });

  test('extruded positions, normals and UVs are byte-for-byte identical to SVGLoader', () => {
    const parsed = parseBrandPaths(THREE);
    const reference = referencePaths(BRAND_PARTS);
    for (const [index, path] of parsed.entries()) {
      const options = {
        depth: index === 3 ? 108 : index === 1 ? 60 : 78,
        steps: 1, curveSegments: 20, bevelEnabled: true, bevelSegments: 5,
        bevelSize: index === 3 ? 9 : 5.5, bevelThickness: index === 3 ? 13 : 8,
      };
      const geometry = new THREE.ExtrudeGeometry(path.toShapes(), options);
      const expected = new THREE.ExtrudeGeometry(reference[index].toShapes(), options);
      try {
        for (const attribute of ['position', 'normal', 'uv']) {
          assert.deepEqual(geometry.getAttribute(attribute).array, expected.getAttribute(attribute).array);
        }
        assert.deepEqual(geometry.index, expected.index);
        assert.deepEqual(geometry.groups, expected.groups);
      } finally {
        geometry.dispose();
        expected.dispose();
      }
    }
  });

  test('Z changes autoClose/currentPoint without adding a closing LineCurve', () => {
    const path = parseBrandPath('M10 20L30 40L50 60Z', THREE);
    assert.equal(path.currentPath.curves.length, 2);
    assert.equal(path.currentPath.autoClose, true);
    assert.deepEqual(path.currentPath.currentPoint.toArray(), [10, 20]);
    assert.deepEqual(path.currentPath.curves.at(-1).v2.toArray(), [50, 60]);
    assert.deepEqual(points(path.currentPath.getPoints()), [[10, 20], [30, 40], [50, 60], [10, 20]]);
  });

  for (const data of [
    'M0 0 10 0 10 10 0 10Z',
    'M.5-.5L1e2,+2.5E1C100 30 90 35 80 40 70 45 60 50 50 55Z',
    'M0 0L10 0 10 10ZM20 20L30 20 30 30Z',
    'M0 0L10 0ZL20 20 30 30Z',
    'M0 0L10 0ZC1 2 3 4 5 6 7 8 9 10 11 12Z',
    'M0 0ZZM2 2L3 3',
    'M0 0L10 10',
  ]) {
    test(`supported absolute commands retain SVGLoader semantics: ${data}`, () => {
      assertEquivalent(parseBrandPath(data, THREE), referencePaths([{ path: data }])[0]);
    });
  }

  test('separate parses do not share mutable shapes, colors or style objects', () => {
    const first = parseBrandPaths(THREE);
    const second = parseBrandPaths(THREE);
    first[0].subPaths[0].curves[0].v0.x = -999;
    first[0].userData.style.fillRule = 'nonzero';
    first[0].color.set('#ffffff');
    assert.equal(second[0].subPaths[0].curves[0].v0.x, 542);
    assert.equal(second[0].userData.style.fillRule, 'evenodd');
    assert.equal(second[0].color.getHexString(), '173f35');
  });

  for (const data of [
    '', ' ', 'none', '0 0', 'L0 0', 'C0 0 1 1 2 2', 'Z', 'm0 0', 'M0 0l1 1',
    'M0 0H2', 'M0 0Q1 1 2 2', 'M0 0A1 1 0 0 0 2 2', 'M0 0z',
    'M', 'M0', 'M0 0 1', 'M0 0L', 'M0 0L1', 'M0 0C1 2 3 4 5', 'M0 0Z1 2',
    'M,0 0', 'M0,,0', 'M0 0,', 'M0 0,L1 1', 'M0 0L,1 1',
    'M0 NaN', 'M0 Infinity', 'M0 1e309', 'M0 -1e309', 'M0 1e', 'M0 1e+',
    'M0 0x1', 'M0 0;L1 1', 'M0 0@', 'M0 0/*comment*/',
  ]) {
    test(`rejects malformed or unsupported data: ${JSON.stringify(data)}`, () => {
      assert.throws(() => parseBrandPath(data, THREE), SyntaxError);
    });
  }

  test('rejects invalid argument types before allocating paths', () => {
    for (const data of [null, undefined, 42, {}, []]) assert.throws(() => parseBrandPath(data, THREE), TypeError);
    for (const namespace of [undefined, null, {}, { ShapePath: 42 }]) {
      assert.throws(() => parseBrandPath('M0 0', namespace), TypeError);
    }
  });
});
