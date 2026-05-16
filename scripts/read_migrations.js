const { Client } = require('pg')
const fs = require('fs')
const url = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/ga_db'
;(async ()=>{
  const client = new Client({ connectionString: url })
  try {
    await client.connect()
    const res = await client.query('SELECT id, hash, created_at, tag FROM drizzle.__drizzle_migrations ORDER BY id')
    fs.writeFileSync('.migrations_output.json', JSON.stringify(res.rows, null, 2))
    console.log('WROTE .migrations_output.json')
  } catch (e) {
    console.error('ERR', e.message)
    fs.writeFileSync('.migrations_output.json', JSON.stringify({ error: e.message }))
  } finally {
    await client.end()
  }
})()
