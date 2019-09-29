// @ts-nocheck
import {
  Vector, Victor, FORWARD, LEFT, UP
} from './vector';
import { isArray, multQuatVec, fromEulerYXZ } from './util';
import { formatNumber } from './formatter';
import { cachedFactory } from './operator';
import { isAngle, degree, IDegree } from './degree';

const X = 0;
const Y = 1;
const Z = 2;
const W = 3;
const AXES = Symbol('axes');

const FORWARD_CACHE = Symbol('forward');
const LEFT_CACHE = Symbol('left');
const UP_CACHE = Symbol('up');

function length([x, y, z, w]) {
  return Math.sqrt(x * x + y * y + z * z + w * w);
}
function normalize(axes) {
  const len = length(axes);
  axes[X] /= len;
  axes[Y] /= len;
  axes[Z] /= len;
  axes[W] /= len;
}

function look(forward, up) {
  const vector = forward.normalize();
  const vector2 = up.crossNormalize(vector);
  const vector3 = vector.crossNormalize(vector2);
  const m00 = vector2.x;
  const m01 = vector2.y;
  const m02 = vector2.z;
  const m10 = vector3.x;
  const m11 = vector3.y;
  const m12 = vector3.z;
  const m20 = vector.x;
  const m21 = vector.y;
  const m22 = vector.z;

  const num8 = (m00 + m11) + m22;
  const quaternion = new Array(4);
  if (num8 > 0) {
    let num = Math.sqrt(num8 + 1);
    quaternion[W] = num * 0.5;
    num = 0.5 / num;
    quaternion[X] = (m12 - m21) * num;
    quaternion[Y] = (m20 - m02) * num;
    quaternion[Z] = (m01 - m10) * num;
    return quaternion;
  }
  if ((m00 >= m11) && (m00 >= m22)) {
    const num7 = Math.sqrt(((1 + m00) - m11) - m22);
    const num4 = 0.5 / num7;
    quaternion[X] = 0.5 * num7;
    quaternion[Y] = (m01 + m10) * num4;
    quaternion[Z] = (m02 + m20) * num4;
    quaternion[W] = (m12 - m21) * num4;
    return quaternion;
  }
  if (m11 > m22) {
    const num6 = Math.sqrt(((1 + m11) - m00) - m22);
    const num3 = 0.5 / num6;
    quaternion[X] = (m10 + m01) * num3;
    quaternion[Y] = 0.5 * num6;
    quaternion[Z] = (m21 + m12) * num3;
    quaternion[W] = (m20 - m02) * num3;
    return quaternion;
  }
  const num5 = Math.sqrt(((1 + m22) - m00) - m11);
  const num2 = 0.5 / num5;
  quaternion[X] = (m20 + m02) * num2;
  quaternion[Y] = (m21 + m12) * num2;
  quaternion[Z] = 0.5 * num5;
  quaternion[W] = (m01 - m10) * num2;
  return quaternion;
}

function axisAngle(axis, angle) {
  const quaternion = new Array(4);
  const a = angle * 0.5;
  const sa = Math.sin(a);
  const ca = Math.cos(a);
  quaternion[X] = sa * axis.x;
  quaternion[Y] = sa * axis.y;
  quaternion[Z] = sa * axis.z;
  quaternion[W] = ca;
  return quaternion;
}

class AQuaternion {
  /**
   * @typedef {import('./degree').Degree} Degree
   * @typedef {import('./degree').IDegree} IDegree
   * @typedef {IDegree | Degree | number} DegreeType
   *
   * @param {number | Vector | Victor | [number, number, number, number] } [x]
   * @param {number | Vector | Victor} [y]
   * @param {number} [z]
   * @param {number} [w]
   */
  constructor(x, y, z, w) {
    if (typeof x === 'number') {
      this[AXES] = [x, y, z, w];
    } else if (isArray(x)) {
      this[AXES] = [...x];
    } else if (isAngle(y)) {
      this[AXES] = axisAngle(x, y);
    } else if (x) {
      this[AXES] = look(x, y || UP);
    } else {
      this[AXES] = [0, 0, 0, 1];
    }
    normalize(this[AXES]);
  }

  multiply(other) {
    if (typeof other.w === 'number') {
      return this.multiplyQuaternion(other);
    }
    return this.multiplyVector(other);
  }

  multiplyVector(vec) {
    return multQuatVec(this, vec);
  }

  multiplyQuaternion(quat) {
    const q1x = this.x;
    const q1y = this.y;
    const q1z = this.z;
    const q1w = this.w;
    const q2x = quat.x;
    const q2y = quat.y;
    const q2z = quat.z;
    const q2w = quat.w;
    const x = q1w * q2x + q1x * q2w + q1y * q2z - q1z * q2y;
    const y = q1w * q2y + q1y * q2w + q1z * q2x - q1x * q2z;
    const z = q1w * q2z + q1z * q2w + q1x * q2y - q1y * q2x;
    const w = q1w * q2w - q1x * q2x - q1y * q2y - q1z * q2z;
    return new this.constructor(x, y, z, w);
  }

  mul(other) {
    return this.multiply(other);
  }

  conjugate() {
    const {
      x, y, z, w
    } = this;
    return this.constructor(x * -1, y * -1, z * -1, w);
  }

  /**
  *
  * @param {AQuaternion} v
  * @returns {boolean}
  */
  equals(v) {
    return this.x === v.x && this.y === v.y && this.z === v.z && this.w === v.w;
  }

  get left() {
    return this.multiplyVector(LEFT);
  }

  get dir() {
    return this.multiplyVector(FORWARD);
  }

  get up() {
    return this.multiplyVector(UP);
  }

  /**
    *
    * @returns {number}
    */
  get x() {
    return this[AXES][X];
  }

  /**
    *
    * @throws SetNotImplementedError
    */
  set x(_) {
    throw new Error('set x() not implemented');
  }

  /**
   *
   * @returns {number}
   */
  get y() {
    return this[AXES][Y];
  }

  /**
   *
   * @throws SetNotImplementedError
   */
  set y(_) {
    throw new Error('set y() not implemented');
  }

  /**
   *
   * @returns {number}
   */
  get z() {
    return this[AXES][Z];
  }

  /**
   *
   * @throws SetNotImplementedError
   */
  set z(_) {
    throw new Error('set z() not implemented');
  }

  /**
   *
   * @returns {number}
   */
  get w() {
    return this[AXES][W];
  }

  /**
   *
   * @throws SetNotImplementedError
   */
  set w(_) {
    throw new Error('set w() not implemented');
  }

  /**
   *
   * @returns {string}
   */
  toString() {
    return `{ x: ${formatNumber(this.x)}, y: ${formatNumber(this.y)}, z: ${formatNumber(this.z)}, w: ${formatNumber(this.w)} }`;
  }
}


export class Quaternion extends AQuaternion {
  /**
     *
     * @param {number} x
     */
  set x(x) {
    this[AXES][X] = x;
  }

  /**
   *
   * @param {number} y
   */
  set y(y) {
    this[AXES][Y] = y;
  }

  /**
   *
   * @param {number} z
   */
  set z(z) {
    this[AXES][Z] = z;
  }

  /**
  *
  * @param {number} w
  */
  set w(w) {
    this[AXES][W] = w;
  }

  /**
   *
   * @returns {number}
   */
  get x() {
    return this[AXES][X];
  }

  /**
   *
   * @returns {number}
   */
  get y() {
    return this[AXES][Y];
  }

  /**
   *
   * @returns {number}
   */
  get z() {
    return this[AXES][Z];
  }

  /**
   *
   * @returns {number}
   */
  get w() {
    return this[AXES][W];
  }
}

function fromCache(scope, key, fn) {
  let res = scope[key];
  if (!res) {
    res = fn();
    scope[key] = res;
  }
  return res;
}

export class IQuaternion extends AQuaternion {
  get left() {
    return fromCache(this, LEFT_CACHE, () => this.multiplyVector(LEFT));
  }

  get dir() {
    return fromCache(this, FORWARD_CACHE, () => this.multiplyVector(FORWARD));
  }

  get up() {
    return fromCache(this, UP_CACHE, () => this.multiplyVector(UP));
  }
}

const quaternionFactory = cachedFactory(Quaternion);

/**
 * @typedef {Vector | Victor} VectorType
 * @typedef {() => Quaternion} QuatZero
 * @typedef {(x: number , y: number, z: number, w: number) => Quaternion} QuatNumber
 * @typedef {(dir: VectorType) => Quaternion} QuatDir
 * @typedef {(dir: VectorType, up: VectorType) => Quaternion} QuatDirUp
 * @typedef {(axis: VectorType, angle: DegreeType) => Quaternion} QuatAxis
 * @typedef {(arr: [number, number, number, number]) => Quaternion} QuatArr
 * @typedef {QuatNumber & QuatDir & QuatDirUp & QuatAxis & QuatArr & QuatZero}
 *
 * @param {number | VectorType | [number, number, number, number]} [x]
 * @param {number | VectorType} [y]
 * @param {number} [z]
 * @param {number} [w]
 * @hidden
 */
export const quaternion = function (x, y, z, w) {
  return quaternionFactory(x, y, z, w);
};

const iquaternionFactory = cachedFactory(IQuaternion);

/**
 * @typedef {() => IQuaternion} IQuatZero
 * @typedef {(x: number, y: number, z: number, w: number) => IQuaternion} IQuatNumber
 * @typedef {(dir: VectorType) => IQuaternion} IQuatDir
 * @typedef {(dir: VectorType, up: VectorType) => IQuaternion} IQuatDirUp
 * @typedef {(axis: VectorType, angle: DegreeType) => IQuaternion} IQuatAxis
 * @typedef {(arr: [number, number, number, number]) => IQuaternion} IQuatArr
 * @typedef {IQuatNumber & IQuatDir & IQuatDirUp & IQuatAxis & IQuatArr & IQuatZero}
 *
 * @param {number | VectorType | [number, number, number, number]} [x]
 * @param {number | VectorType} [y]
 * @param {number} [z]
 * @param {number} [w]
 * @hidden
 */
export const iquaternion = function (x, y, z, w) {
  return iquaternionFactory(x, y, z, w);
};

const LEFT90 = new IQuaternion(LEFT, degree(90));

/**
 *
 * @param {{ alpha: number, beta: number, gamma: number }} orientationEvent
 * @param {number} orientation
 * @returns {IQuaternion}
 */
export function fromOrientation({ alpha, beta, gamma }, orientation) {
  const x = degree(beta);
  const y = degree(alpha);
  const z = degree(-gamma);
  let rot = new IQuaternion(fromEulerYXZ(x, y, z));
  rot = rot.multiplyQuaternion(LEFT90);

  if (orientation) {
    const { dir } = rot;
    const local = new IQuaternion(dir, degree(orientation));
    rot = local.multiplyQuaternion(rot);
  }
  return rot;
}

export const Export = {

  /**
   * @type {QuatZero}
   */
  quaternion: () => quaternion(),

  /**
   * @type {QuatDir}
   */
  quaternion: (dir) => quaternion(dir),

  /**
   * @type {QuatDirUp}
   */
  quaternion: (dir, up) => quaternion(dir, up),

  /**
   * @type {QuatArr}
   */
  quaternion: (arr) => quaternion(arr),

  /**
   * @type {QuatAxis}
   */
  quaternion: (axis, angle) => quaternion(axis, angle),

  /**
   * @type {QuatNumber}
   */
  quaternion: (x, y, z, w) => quaternion(x, y, z, w),

  /**
   * @type {IQuatZero}
   */
  iquaternion: () => iquaternion(),

  /**
  * @type {IQuatDir}
  */
  iquaternion: (dir) => iquaternion(dir),

  /**
   * @type {IQuatDirUp}
   */
  iquaternion: (dir, up) => iquaternion(dir, up),

  /**
   * @type {IQuatArr}
   */
  iquaternion: (arr) => iquaternion(arr),

  /**
   * @type {IQuatAxis}
   */
  iquaternion: (axis, angle) => iquaternion(axis, angle),

  /**
   * @type {IQuatNumber}
   */
  iquaternion: (x, y, z, w) => iquaternion(x, y, z, w)
};

export const IDENTITY = iquaternion(0, 0, 0, 1);
