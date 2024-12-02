import { QueryResultRow } from 'pg';
import pkg from 'pg';
const { Pool } = pkg;
 
if (process.env.NODE_ENV === 'test') {
  console.log("using test db");
  console.log("connection string:", process.env.POSTGRES_URL);
} else {
  console.log("using prod db");
}

const pool = new Pool({ connectionString: process.env.POSTGRES_URL});

type Primitive = string | number | boolean | undefined | null;

function sqlTemplate(
  strings: TemplateStringsArray,
  ...values: Primitive[]
): [string, Primitive[]] {
  let result = strings[0] ?? '';
  for (let i = 1; i < strings.length; i++) {
    result += `$${i}${strings[i] ?? ''}`;
  }
  return [result, values];
}

export async function sql<O extends QueryResultRow>(
  strings: TemplateStringsArray,
  ...values: Primitive[]
) {
  const [query, params] = sqlTemplate(strings, ...values);
  return pool.query<O>(query, params);
}

export const db = {
  sql,
  pool,
};