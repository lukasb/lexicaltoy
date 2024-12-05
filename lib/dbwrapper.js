const { Pool } = require('pg');

if (process.env.VERCEL_ENV === 'test') {
  console.log("using test db");
  /*neonConfig.wsProxy = (host) => `${host}:54330/v1`;
  neonConfig.useSecureWebSocket = false;
  neonConfig.pipelineTLS = false;
  neonConfig.pipelineTLS = false;
  neonConfig.pipelineConnect = false;*/
} else if (process.env.NODE_ENV === 'development') {
  console.log("using dev db");
} else {
  console.log("using prod db");
}

const pool = new Pool({ connectionString: process.env.POSTGRES_URL});

function sqlTemplate(strings, ...values) {
  if (!isTemplateStringsArray(strings) || !Array.isArray(values)) {
    throw new Error(
      'It looks like you tried to call `sql` as a function. Make sure to use it as a tagged template.\n' +
        "\tExample: sql`SELECT * FROM users`, not sql('SELECT * FROM users')",
    );
  }

  let result = strings[0] ?? '';

  for (let i = 1; i < strings.length; i++) {
    result += `$${i}${strings[i] ?? ''}`;
  }

  return [result, values];
}

function isTemplateStringsArray(strings) {
  return (
    Array.isArray(strings) && 'raw' in strings && Array.isArray(strings.raw)
  );
}

async function sql(strings, ...values) {
  const [query, params] = sqlTemplate(strings, ...values);
  return pool.query(query, params);
}

module.exports = {
  sql,
  db: pool
};