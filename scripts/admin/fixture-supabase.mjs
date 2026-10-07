// Local in-memory Supabase query adapter for the ORIGINAL commerce authorization methods.
// No HTTP, API keys, provider calls, storage or dispatch. Unsupported operations fail closed.
const allowed = new Set([
  'square_orders',
  'business_members',
  'events',
  'event_rsvps',
  'pickup_order_reviews',
  'pickup_order_review_reports',
  'pickup_order_review_events',
  'verified_event_reviews',
  'verified_event_review_reports',
  'verified_event_review_events',
]);
const identifier = (value) => {
  if (!/^[a-z_][a-z_0-9]*$/.test(value)) throw new Error('Unsupported fixture identifier');
  return '"' + value + '"';
};
const fixedId = (table, row) => {
  const suffix = (value) => String(value).slice(-12);
  if (table === 'pickup_order_reviews') return 'f1000000-0000-4000-8000-' + suffix(row.order_id);
  if (table === 'pickup_order_review_reports')
    return 'f2000000-0000-4000-8000-' + suffix(row.review_id);
  if (table === 'verified_event_reviews')
    return (
      'e2000000-0000-4000-8000-' + (row.customer_id.endsWith('3') ? '000000000001' : '000000000002')
    );
  if (table === 'verified_event_review_reports')
    return 'e3000000-0000-4000-8000-' + suffix(row.review_id);
  return undefined;
};
export function fixtureSupabase(db) {
  const calls = [];
  class Query {
    constructor(table) {
      if (!allowed.has(table)) throw new Error('Unsupported fixture table');
      this.table = table;
      this.fields = '*';
      this.filters = [];
      this.mode = 'select';
      this.one = false;
      this.strict = false;
    }
    select(fields = '*') {
      this.fields = fields;
      return this;
    }
    insert(row) {
      this.mode = 'insert';
      this.row = { ...row };
      const id = fixedId(this.table, row);
      if (id) this.row.id = id;
      return this;
    }
    eq(key, value) {
      this.filters.push([key, '=', value]);
      return this;
    }
    not(key, operator, value) {
      if (operator !== 'is' || value !== null) throw new Error('Unsupported fixture filter');
      this.filters.push([key, 'is not', null]);
      return this;
    }
    limit(n) {
      if (!Number.isInteger(n) || n < 1 || n > 100) throw new Error('Invalid fixture limit');
      this.maximum = n;
      return this;
    }
    maybeSingle() {
      this.one = true;
      return this;
    }
    single() {
      this.one = true;
      this.strict = true;
      return this;
    }
    then(resolve, reject) {
      return this.run().then(resolve, reject);
    }
    async run() {
      const fields = this.fields === '*' ? '*' : this.fields.split(',').map(identifier).join(',');
      const values = [];
      let sql;
      if (this.mode === 'insert') {
        const keys = Object.keys(this.row);
        sql =
          'insert into public.' +
          identifier(this.table) +
          '(' +
          keys.map(identifier).join(',') +
          ') values(' +
          keys
            .map((key) => {
              values.push(this.row[key]);
              return '$' + values.length;
            })
            .join(',') +
          ') returning ' +
          fields;
      } else {
        const where = this.filters.map(([key, op, value]) =>
          op === 'is not'
            ? identifier(key) + ' is not null'
            : (values.push(value), identifier(key) + ' = $' + values.length),
        );
        sql =
          'select ' +
          fields +
          ' from public.' +
          identifier(this.table) +
          (where.length ? ' where ' + where.join(' and ') : '') +
          (this.maximum ? ' limit ' + this.maximum : '');
      }
      calls.push({ table: this.table, operation: this.mode });
      try {
        const { rows } = await db.query(sql, values);
        if (this.one && (rows.length > 1 || (this.strict && rows.length !== 1)))
          return { data: null, error: { message: 'Unexpected synthetic result count' } };
        return { data: this.one ? (rows[0] ?? null) : rows, error: null };
      } catch (error) {
        return { data: null, error: { message: error.message, code: error.code } };
      }
    }
  }
  return { from: (table) => new Query(table), calls };
}
