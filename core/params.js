/**
 * params.js — parameters are data.
 *
 * An app declares its parameters once. The panel UI, the saved recipe, the
 * gallery filters and the gamepad bindings are all read off that declaration,
 * so adding a control is one entry here rather than HTML plus CSS plus a
 * serializer plus a restore path that quietly forgets one field.
 *
 * Two things earn this file its place, and both are about what an app then
 * never has to write:
 *
 *   `values` is the recipe. Not a thing converted into one — the same plain
 *   JSON, which is why restore() is a one-liner and why a recipe cannot drift
 *   out of step with the controls that made it.
 *
 *   A param of `type: "object"` is how one app eats what another made, and
 *   `consumedObjectIds()` is how lineage stops being the app's problem. An app
 *   that assembles `parents` by hand has a bug in it — see the skweeb-object
 *   skill.
 *
 * Nothing here draws. Widgets live in core/ParamPanel.js, which reads the same
 * schema; this file is the data and the rules.
 *
 * Emits on document:  'params:changed' { app, key, value }
 */

/**
 * How each declared type is coerced coming back in. A recipe is JSON that may
 * have been written by an older version of the app, so every one of these
 * takes anything at all and returns something usable — an old recipe in a
 * newer app is a migration, not a crash (docs/object-model.md).
 */
const TYPES = {
  range: {
    default: spec => clamp(num(spec.default, spec.min ?? 0), spec),
    coerce(value, spec) {
      const n = num(value, this.default(spec));
      // `step: 'any'`, as HTML has it: no grid — a fractal's centre wants every digit.
      return clamp(typeof spec.step === 'number' && spec.step > 0 ? snap(n, spec) : n, spec);
    },
  },

  int: {
    default: spec => Math.round(clamp(num(spec.default, spec.min ?? 0), spec)),
    coerce: (value, spec) => Math.round(clamp(num(value, spec.default ?? 0), spec)),
  },

  bool: {
    default: spec => !!spec.default,
    coerce: value => !!value,
  },

  enum: {
    default: spec => (spec.options || []).includes(spec.default)
      ? spec.default : (spec.options || [])[0] ?? null,
    coerce(value, spec) {
      return (spec.options || []).includes(value) ? value : this.default(spec);
    },
  },

  color: {
    default: spec => (typeof spec.default === 'string' ? spec.default : '#000000'),
    coerce(value, spec) {
      return typeof value === 'string' && value.trim() ? value.trim() : this.default(spec);
    },
  },

  'color[]': {
    default: spec => (Array.isArray(spec.default) ? spec.default.slice() : []),
    coerce(value, spec) {
      if (!Array.isArray(value)) return this.default(spec);
      return value.filter(v => typeof v === 'string' && v.trim()).map(v => v.trim());
    },
  },

  text: {
    default: spec => (spec.default == null ? '' : String(spec.default)),
    coerce: value => (value == null ? '' : String(value)),
  },

  /**
   * An object from the vault, held as its id and nothing else — an id is what
   * a recipe can carry, what lineage is made of, and what survives the object
   * being re-rendered at another size. The panel resolves it to a title and a
   * thumbnail when it needs to; `accepts` filters the picker.
   */
  object: {
    default: spec => (typeof spec.default === 'string' ? spec.default : null),
    coerce: value => (typeof value === 'string' && value ? value : null),
  },

  /**
   * One sprite of a family, held as its index — the number a recorded mark
   * stores, which is why it is an index and not a URL. `family` names the
   * param that says which family, so the panel can show that family's sprites
   * as a grid. Wrapping past the end is the family's business, not this one's.
   */
  sprite: {
    default: spec => Math.max(0, Math.round(num(spec.default, 0))),
    coerce: (value, spec) => Math.max(0, Math.round(num(value, spec.default ?? 0))),
  },

  /**
   * What is under the marks: a colour, or `none` for a transparent ground.
   * One value instead of a colour and a switch, so a recipe cannot say "white,
   * but transparent".
   */
  ground: {
    default: spec => (typeof spec.default === 'string' ? spec.default : '#ffffff'),
    coerce(value, spec) {
      if (value === 'none') return 'none';
      return typeof value === 'string' && value.trim() ? value.trim() : this.default(spec);
    },
  },
};

/**
 * The types a schema may declare. Exported so tests/params.mjs can hold this
 * list and core/ParamPanel.js's widget list against each other: a type with no
 * widget is a control that silently never appears in any panel.
 */
export const PARAM_TYPES = Object.keys(TYPES);

/**
 * Whether a param's row applies, given the other values. `when` is data:
 *
 *   { path: 'point' }                 only for that value
 *   { input: ['text', 'glyphs'] }     for any of these
 *   { mark: { not: 'dot' } }          for anything but
 *   [{ a: 1 }, { b: 2 }]              a list: when any one of them holds
 *
 * In one, every entry must hold. A row that does not apply is hidden, never
 * cleared — its value stays in the recipe, so switching back finds it as it was.
 *
 * @param {object} spec    the param's declaration
 * @param {object} values  the current values
 */
export function applies(spec, values) {
  const when = spec && spec.when;
  if (!when) return true;
  return Array.isArray(when) ? when.some(one => holds(one, values)) : holds(when, values);
}

/** Whether every entry of one `when` holds. */
function holds(when, values) {
  for (const [key, want] of Object.entries(when)) {
    const have = values[key];
    if (want && typeof want === 'object' && !Array.isArray(want) && 'not' in want) {
      const not = Array.isArray(want.not) ? want.not : [want.not];
      if (not.includes(have)) return false;
    } else if (!(Array.isArray(want) ? want : [want]).includes(have)) {
      return false;
    }
  }
  return true;
}

const num = (value, fallback) => {
  const n = typeof value === 'number' ? value : parseFloat(value);
  return Number.isFinite(n) ? n : fallback;
};

const clamp = (n, spec) => {
  if (typeof spec.min === 'number' && n < spec.min) return spec.min;
  if (typeof spec.max === 'number' && n > spec.max) return spec.max;
  return n;
};

/**
 * Snap to the declared step, measured from min so the grid starts where it
 * should — and rounded back to the precision the schema was written in.
 * `min + k·step` in floating point is 0.12000000000000001 for a 0.005 step
 * and 0.15000000000000002 for 0.05, which lands in every recipe and every
 * readout that shows it.
 */
const snap = (n, spec) => {
  const base = typeof spec.min === 'number' ? spec.min : 0;
  const k = Math.round((n - base) / spec.step);
  return Number((base + k * spec.step).toFixed(Math.max(places(base), places(spec.step))));
};

/** How many decimals a declared number needs: 0.005 is 3, 1e-7 is 7, 4 is 0. */
const places = x => {
  let p = 0;
  while (p < 15 && Math.round(x * 10 ** p) / 10 ** p !== x) p++;
  return p;
};

/**
 * A whole set of values for a schema, from whatever came in: each key
 * coerced as set() would, anything missing at its default. For a schema that
 * is not an app's — a filter in a chain (core/gpu/) — where declaring a
 * Params each would announce every value to the page.
 *
 * @param {Object<string, object>} schema
 * @param {object} [incoming]
 */
export function valuesFor(schema, incoming = {}) {
  const out = {};
  for (const [key, spec] of Object.entries(schema)) {
    const type = TYPES[spec.type];
    if (!type) throw new Error(`params: unknown type ${spec.type} for ${key}`);
    const given = incoming && Object.prototype.hasOwnProperty.call(incoming, key);
    out[key] = given ? type.coerce(incoming[key], spec) : type.default(spec);
  }
  return out;
}

/**
 * Declare an app's parameters.
 *
 * @param {string} app     the app's name, carried on every change event
 * @param {Object<string, object>} schema  key -> { type, ...spec }
 * @returns {Params}
 */
export function defineParams(app, schema) {
  const keys = Object.keys(schema);

  for (const key of keys) {
    const spec = schema[key];
    if (!spec || !TYPES[spec.type]) {
      throw new Error(`params(${app}.${key}): unknown type ${spec && spec.type}. ` +
                      `Add a widget type to core/params.js once, for everyone.`);
    }
  }

  const values = {};
  const listeners = new Set();
  let restoring = false;

  const defaults = () => {
    const out = {};
    for (const key of keys) out[key] = TYPES[schema[key].type].default(schema[key]);
    return out;
  };

  const announce = (key, value) => {
    for (const fn of listeners) fn(key, value, params);
    if (typeof document !== 'undefined') {
      document.dispatchEvent(new CustomEvent('params:changed', { detail: { app, key, value } }));
    }
  };

  const params = {
    get app() { return app; },
    get schema() { return schema; },
    get keys() { return keys.slice(); },

    /** The recipe. A copy, so a caller cannot reach in and change state. */
    get values() { return JSON.parse(JSON.stringify(values)); },

    get(key) { return values[key]; },

    /** The declaration for one key, for a panel or a gallery filter. */
    spec(key) { return schema[key]; },

    /**
     * set('cell', 20) or set({ cell: 20, invert: true }).
     *
     * Unknown keys are dropped rather than thrown on: that is what lets a
     * recipe written by a later version of the app load in an earlier one.
     * Missing keys keep their current value, so this is also restore().
     */
    set(keyOrValues, maybeValue) {
      const incoming = typeof keyOrValues === 'string'
        ? { [keyOrValues]: maybeValue }
        : (keyOrValues || {});

      const changed = [];
      for (const key of Object.keys(incoming)) {
        if (!Object.prototype.hasOwnProperty.call(schema, key)) continue;
        const next = TYPES[schema[key].type].coerce(incoming[key], schema[key]);
        if (JSON.stringify(next) === JSON.stringify(values[key])) continue;
        values[key] = next;
        changed.push([key, next]);
      }
      for (const [key, value] of changed) announce(key, value);
      return changed.length;
    },

    /**
     * Load a whole recipe: anything the recipe does not mention goes back to
     * its default rather than keeping whatever was on screen. Without that, a
     * restore inherits state from whatever was loaded before it, which is the
     * bug where a piece comes back subtly wrong and only sometimes.
     *
     * Every key that changed is announced, the ones going back to a default
     * included — they used to go back silently, so Reset moved no widget and
     * redrew nothing. All of it is in place before anyone hears, and
     * `restoring` is true while they do: a recipe arriving is not an edit, and
     * a listener that chains one value to another (frame.js) must leave it be.
     */
    restore(recipe) {
      const was = JSON.parse(JSON.stringify(values));
      Object.assign(values, defaults());
      const incoming = recipe || {};
      for (const key of Object.keys(incoming)) {
        if (!Object.prototype.hasOwnProperty.call(schema, key)) continue;
        values[key] = TYPES[schema[key].type].coerce(incoming[key], schema[key]);
      }
      restoring = true;
      try {
        for (const key of keys) {
          if (JSON.stringify(values[key]) !== JSON.stringify(was[key])) announce(key, values[key]);
        }
      } finally {
        restoring = false;
      }
      return params;
    },

    /** True while a restore is announcing: a whole recipe, not an edit. */
    get restoring() { return restoring; },

    reset() { return params.restore({}); },

    /**
     * Every vault object this app is currently made from — the `parents` of
     * whatever it saves next. Automatic, and deliberately so: an app that
     * builds lineage by hand gets it wrong in a way that only shows up months
     * later, as a render that cannot explain where it came from. A row that
     * does not apply keeps its value but draws nothing, so what it names is
     * no parent: an escape-time fractal is not made of the sprite its copies
     * would use.
     */
    consumedObjectIds() {
      const ids = [];
      for (const key of keys) {
        if (schema[key].type !== 'object' || !applies(schema[key], values)) continue;
        const id = values[key];
        if (id && !ids.includes(id)) ids.push(id);
      }
      return ids;
    },

    /** Subscribe to changes. Returns the unsubscribe. */
    on(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };

  Object.assign(values, defaults());
  return params;
}
