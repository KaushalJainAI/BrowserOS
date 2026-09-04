/**
 * A small spreadsheet formula engine.
 *
 * Supports arithmetic, cell references (`B2`), ranges (`A1:A9`), comparisons
 * and the common aggregate functions. Written as a recursive-descent parser
 * rather than `eval` so a formula — which may be typed by the user *or written
 * by the agent* — can never execute arbitrary JavaScript in the page.
 */

export type CellValue = string;
export type Grid = Record<string, CellValue>;

export interface EvalResult {
  value: number | string | boolean;
  error?: string;
}

/** `A1` → `{ column: 0, row: 0 }`. */
export function parseRef(ref: string): { column: number; row: number } | null {
  const match = /^\$?([A-Z]+)\$?(\d+)$/i.exec(ref.trim());
  if (!match) return null;
  const letters = match[1].toUpperCase();
  let column = 0;
  for (const char of letters) column = column * 26 + (char.charCodeAt(0) - 64);
  return { column: column - 1, row: Number(match[2]) - 1 };
}

export function columnName(index: number): string {
  let name = '';
  let value = index + 1;
  while (value > 0) {
    const remainder = (value - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    value = Math.floor((value - 1) / 26);
  }
  return name;
}

export function cellKey(column: number, row: number): string {
  return `${columnName(column)}${row + 1}`;
}

function expandRange(from: string, to: string): string[] {
  const start = parseRef(from);
  const end = parseRef(to);
  if (!start || !end) return [];
  const keys: string[] = [];
  for (let row = Math.min(start.row, end.row); row <= Math.max(start.row, end.row); row += 1) {
    for (let col = Math.min(start.column, end.column); col <= Math.max(start.column, end.column); col += 1) {
      keys.push(cellKey(col, row));
    }
  }
  return keys;
}

type Token =
  | { type: 'number'; value: number }
  | { type: 'string'; value: string }
  | { type: 'ref'; value: string }
  | { type: 'range'; from: string; to: string }
  | { type: 'name'; value: string }
  | { type: 'op'; value: string }
  | { type: 'paren'; value: '(' | ')' }
  | { type: 'comma' };

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;

  while (index < input.length) {
    const char = input[index];

    if (/\s/.test(char)) { index += 1; continue; }

    if (/[0-9.]/.test(char)) {
      let literal = '';
      while (index < input.length && /[0-9.]/.test(input[index])) literal += input[index++];
      tokens.push({ type: 'number', value: Number(literal) });
      continue;
    }

    if (char === '"') {
      let literal = '';
      index += 1;
      while (index < input.length && input[index] !== '"') literal += input[index++];
      index += 1;
      tokens.push({ type: 'string', value: literal });
      continue;
    }

    if (/[A-Za-z_]/.test(char)) {
      let word = '';
      while (index < input.length && /[A-Za-z0-9_$]/.test(input[index])) word += input[index++];

      // `A1:B2` is a range; `A1` alone is a reference; anything else is a
      // function name, which must be followed by an opening paren.
      if (input[index] === ':' && parseRef(word)) {
        index += 1;
        let second = '';
        while (index < input.length && /[A-Za-z0-9$]/.test(input[index])) second += input[index++];
        tokens.push({ type: 'range', from: word, to: second });
        continue;
      }
      if (parseRef(word) && input[index] !== '(') {
        tokens.push({ type: 'ref', value: word.toUpperCase() });
        continue;
      }
      tokens.push({ type: 'name', value: word.toUpperCase() });
      continue;
    }

    if (char === '(' || char === ')') {
      tokens.push({ type: 'paren', value: char });
      index += 1;
      continue;
    }

    if (char === ',' || char === ';') {
      tokens.push({ type: 'comma' });
      index += 1;
      continue;
    }

    // Two-character comparison operators must be matched before single ones.
    const pair = input.slice(index, index + 2);
    if (['<=', '>=', '<>'].includes(pair)) {
      tokens.push({ type: 'op', value: pair });
      index += 2;
      continue;
    }
    if ('+-*/^%&<>='.includes(char)) {
      tokens.push({ type: 'op', value: char });
      index += 1;
      continue;
    }

    throw new Error(`Unexpected character “${char}”`);
  }

  return tokens;
}

type Resolver = (ref: string) => number | string | boolean;

const FUNCTIONS: Record<string, (args: Array<number | string | boolean>) => number | string | boolean> = {
  SUM: (args) => numbers(args).reduce((total, value) => total + value, 0),
  PRODUCT: (args) => numbers(args).reduce((total, value) => total * value, 1),
  AVERAGE: (args) => {
    const list = numbers(args);
    if (!list.length) return 0;
    return list.reduce((total, value) => total + value, 0) / list.length;
  },
  MIN: (args) => (numbers(args).length ? Math.min(...numbers(args)) : 0),
  MAX: (args) => (numbers(args).length ? Math.max(...numbers(args)) : 0),
  COUNT: (args) => numbers(args).length,
  COUNTA: (args) => args.filter((value) => value !== '' && value !== undefined).length,
  ROUND: ([value, digits]) => {
    const factor = 10 ** Number(digits ?? 0);
    return Math.round(Number(value) * factor) / factor;
  },
  ABS: ([value]) => Math.abs(Number(value)),
  SQRT: ([value]) => Math.sqrt(Number(value)),
  POWER: ([base, exponent]) => Number(base) ** Number(exponent),
  IF: ([condition, whenTrue, whenFalse]) => (condition ? whenTrue ?? '' : whenFalse ?? ''),
  CONCAT: (args) => args.map(String).join(''),
  UPPER: ([value]) => String(value).toUpperCase(),
  LOWER: ([value]) => String(value).toLowerCase(),
  LEN: ([value]) => String(value).length,
  MEDIAN: (args) => {
    const list = numbers(args).sort((a, b) => a - b);
    if (!list.length) return 0;
    const middle = Math.floor(list.length / 2);
    return list.length % 2 ? list[middle] : (list[middle - 1] + list[middle]) / 2;
  },
};

function numbers(values: Array<number | string | boolean>): number[] {
  return values
    .map((value) => (typeof value === 'number' ? value : Number(value)))
    .filter((value) => Number.isFinite(value));
}

/**
 * Recursive-descent parser. Precedence, lowest first:
 * comparison → concat → additive → multiplicative → power → unary → primary.
 */
function parse(tokens: Token[], resolve: Resolver): number | string | boolean {
  let position = 0;

  const peek = () => tokens[position];
  const eat = () => tokens[position++];

  function primary(): number | string | boolean {
    const token = eat();
    if (!token) throw new Error('Unexpected end of formula');

    if (token.type === 'number') return token.value;
    if (token.type === 'string') return token.value;
    if (token.type === 'ref') return resolve(token.value);

    if (token.type === 'range') {
      throw new Error('A range is only valid inside a function');
    }

    if (token.type === 'paren' && token.value === '(') {
      const value = comparison();
      const closing = eat();
      if (!closing || closing.type !== 'paren' || closing.value !== ')') {
        throw new Error('Missing closing parenthesis');
      }
      return value;
    }

    if (token.type === 'op' && (token.value === '-' || token.value === '+')) {
      const value = Number(primary());
      return token.value === '-' ? -value : value;
    }

    if (token.type === 'name') {
      const fn = FUNCTIONS[token.value];
      if (!fn) throw new Error(`Unknown function ${token.value}`);
      const open = eat();
      if (!open || open.type !== 'paren' || open.value !== '(') {
        throw new Error(`${token.value} expects arguments`);
      }

      const args: Array<number | string | boolean> = [];
      if (peek()?.type === 'paren' && (peek() as { value: string }).value === ')') {
        eat();
        return fn(args);
      }

      for (;;) {
        const next = peek();
        // Ranges flatten into the argument list, so SUM(A1:A5) works.
        if (next?.type === 'range') {
          eat();
          for (const key of expandRange(next.from, next.to)) args.push(resolve(key));
        } else {
          args.push(comparison());
        }
        const separator = eat();
        if (!separator) throw new Error('Missing closing parenthesis');
        if (separator.type === 'comma') continue;
        if (separator.type === 'paren' && separator.value === ')') break;
        throw new Error('Malformed argument list');
      }
      return fn(args);
    }

    throw new Error('Unexpected token in formula');
  }

  function power(): number | string | boolean {
    let left = primary();
    while (peek()?.type === 'op' && (peek() as { value: string }).value === '^') {
      eat();
      left = Number(left) ** Number(primary());
    }
    return left;
  }

  function multiplicative(): number | string | boolean {
    let left = power();
    for (;;) {
      const token = peek();
      if (token?.type !== 'op' || !['*', '/', '%'].includes(token.value)) break;
      eat();
      const right = Number(power());
      const leftNumber = Number(left);
      if (token.value === '*') left = leftNumber * right;
      else if (token.value === '/') {
        if (right === 0) throw new Error('#DIV/0!');
        left = leftNumber / right;
      } else left = leftNumber % right;
    }
    return left;
  }

  function additive(): number | string | boolean {
    let left = multiplicative();
    for (;;) {
      const token = peek();
      if (token?.type !== 'op' || !['+', '-'].includes(token.value)) break;
      eat();
      const right = Number(multiplicative());
      left = token.value === '+' ? Number(left) + right : Number(left) - right;
    }
    return left;
  }

  function concat(): number | string | boolean {
    let left = additive();
    while (peek()?.type === 'op' && (peek() as { value: string }).value === '&') {
      eat();
      left = String(left) + String(additive());
    }
    return left;
  }

  function comparison(): number | string | boolean {
    let left = concat();
    for (;;) {
      const token = peek();
      if (token?.type !== 'op' || !['=', '<', '>', '<=', '>=', '<>'].includes(token.value)) break;
      eat();
      const right = concat();
      switch (token.value) {
        case '=': left = left === right; break;
        case '<>': left = left !== right; break;
        case '<': left = Number(left) < Number(right); break;
        case '>': left = Number(left) > Number(right); break;
        case '<=': left = Number(left) <= Number(right); break;
        default: left = Number(left) >= Number(right);
      }
    }
    return left;
  }

  const result = comparison();
  if (position < tokens.length) throw new Error('Unexpected trailing input');
  return result;
}

/**
 * Evaluate one cell. `visiting` carries the dependency chain so a circular
 * reference reports as `#CIRCULAR!` instead of blowing the stack.
 */
export function evaluateCell(
  key: string,
  grid: Grid,
  visiting: Set<string> = new Set(),
): EvalResult {
  const raw = grid[key];
  if (raw === undefined || raw === '') return { value: '' };
  if (!raw.startsWith('=')) {
    const asNumber = Number(raw);
    return { value: raw.trim() !== '' && Number.isFinite(asNumber) ? asNumber : raw };
  }

  if (visiting.has(key)) return { value: '#CIRCULAR!', error: 'Circular reference' };
  visiting.add(key);

  try {
    const resolve: Resolver = (ref) => {
      const result = evaluateCell(ref.toUpperCase(), grid, visiting);
      if (result.error) throw new Error(result.error);
      return result.value;
    };
    const value = parse(tokenize(raw.slice(1)), resolve);
    return { value: typeof value === 'number' && !Number.isFinite(value) ? '#NUM!' : value };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid formula';
    return { value: message.startsWith('#') ? message : '#ERROR!', error: message };
  } finally {
    visiting.delete(key);
  }
}

export function formatCellValue(value: number | string | boolean): string {
  if (typeof value === 'number') {
    // Trim floating-point noise without truncating meaningful precision.
    return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(6)));
  }
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  return value;
}

/** Parse CSV into a grid keyed by cell reference. */
export function csvToGrid(csv: string): { grid: Grid; rows: number; columns: number } {
  const grid: Grid = {};
  const lines = csv.replace(/\r\n?/g, '\n').split('\n');
  let columns = 0;

  lines.forEach((line, rowIndex) => {
    if (rowIndex === lines.length - 1 && line === '') return;
    const cells = splitCsvLine(line);
    columns = Math.max(columns, cells.length);
    cells.forEach((cell, columnIndex) => {
      if (cell !== '') grid[cellKey(columnIndex, rowIndex)] = cell;
    });
  });

  const rows = lines[lines.length - 1] === '' ? lines.length - 1 : lines.length;
  return { grid, rows, columns };
}

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (quoted) {
      if (char === '"') {
        // A doubled quote inside a quoted field is a literal quote.
        if (line[index + 1] === '"') { current += '"'; index += 1; }
        else quoted = false;
      } else current += char;
    } else if (char === '"') quoted = true;
    else if (char === ',') { cells.push(current); current = ''; }
    else current += char;
  }
  cells.push(current);
  return cells;
}

export function gridToCsv(grid: Grid, rows: number, columns: number): string {
  const lines: string[] = [];
  for (let row = 0; row < rows; row += 1) {
    const cells: string[] = [];
    for (let column = 0; column < columns; column += 1) {
      const raw = grid[cellKey(column, row)] ?? '';
      cells.push(/[",\n]/.test(raw) ? `"${raw.replace(/"/g, '""')}"` : raw);
    }
    lines.push(cells.join(','));
  }
  return `${lines.join('\n')}\n`;
}

/**
 * Evaluate a standalone arithmetic expression — no cell references.
 *
 * Shared with CalcPro, which previously ran user input through `eval()` behind
 * a character allowlist. An allowlist is the wrong shape of defence: it has to
 * be right about every input forever, and this desktop lets an agent put text
 * into fields. Parsing the expression instead means there is no code path from
 * input to execution at all.
 */
export function evaluateExpression(expression: string): number | null {
  try {
    const value = parse(tokenize(expression), () => {
      throw new Error('Cell references are not available here');
    });
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}
