import { QueryResultRow } from 'pg';
import pkg from 'pg';
const { Pool } = pkg;
 
if (process.env.NODE_ENV === 'test') {
  console.log("using test db");
  console.log("connection string:", process.env.POSTGRES_URL);
} else if (process.env.NODE_ENV === 'development') {
  console.log("using development db");
} else if (process.env.NODE_ENV === 'production') {
  console.log("using prod db");
} else {
  console.log("NODE_ENV not set");
  process.exit(1);
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