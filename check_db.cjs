'use strict'
require('dotenv').config()
const { Client } = require('pg')

async function main() {
  const pg = new Client({ connectionString: process.env.SUPABASE_DB_URL })
  await pg.connect()

  // Connection sanity check
  const { rows: dbInfo } = await pg.query(`SELECT current_database(), current_user, inet_server_addr()`)
  console.log('\n── Connection')
  console.log(`   DB URL:  ${process.env.SUPABASE_DB_URL?.replace(/:([^:@]+)@/, ':***@')}`)
  console.log(`   database: ${dbInfo[0].current_database}`)
  console.log(`   user:     ${dbInfo[0].current_user}`)
  console.log(`   server:   ${dbInfo[0].inet_server_addr}`)

  // Cast any BOOLEAN spec columns to TEXT (boolean inference was too aggressive)
  const existingTables = ['cameras', 'lenses', 'lighting']
  for (const t of existingTables) {
    const { rows: boolCols } = await pg.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = $1
         AND data_type = 'boolean'
         AND column_name NOT IN ('id')`,
      [t]
    )
    for (const { column_name } of boolCols) {
      await pg.query(
        `ALTER TABLE "${t}" ALTER COLUMN "${column_name}" TYPE TEXT
         USING CASE WHEN "${column_name}" THEN 'Yes' ELSE 'No' END`
      )
      console.log(`   cast ${t}."${column_name}" BOOLEAN → TEXT`)
    }
  }
  console.log('\n── Boolean columns cast to TEXT')

  // List ALL tables in public schema
  const { rows: allTables } = await pg.query(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`
  )
  console.log(`\n── Tables in public schema (${allTables.length} total)`)
  console.log(`   ${allTables.map(r => r.tablename).join(', ') || '(none)'}`)

  // Remove duplicate bhphoto_url rows (keep highest id) and NULL bhphoto_url rows from old imports
  for (const t of existingTables) {
    // Delete rows with NULL bhphoto_url (old import artefacts)
    const { rowCount: nulls } = await pg.query(
      `DELETE FROM "${t}" WHERE bhphoto_url IS NULL`
    )
    if (nulls > 0) console.log(`   removed ${nulls} NULL bhphoto_url rows from ${t}`)

    // Dedupe remaining rows
    const { rows } = await pg.query(
      `SELECT bhphoto_url, COUNT(*) FROM "${t}"
       WHERE bhphoto_url IS NOT NULL
       GROUP BY bhphoto_url HAVING COUNT(*) > 1`
    )
    if (rows.length) {
      await pg.query(
        `DELETE FROM "${t}" a USING "${t}" b
         WHERE a.id < b.id AND a.bhphoto_url = b.bhphoto_url`
      )
      console.log(`   deduped ${rows.length} bhphoto_url values in ${t}`)
    }
  }

  const tables = ['cameras', 'lenses', 'lighting', 'drones', 'gimbals', 'sd_cards', 'lighting_accessories']

  for (const table of tables) {
    try {
      const { rows: countRows } = await pg.query(`SELECT COUNT(*) AS total FROM "${table}"`)
      const { total } = countRows[0]

      // List columns that exist
      const { rows: cols } = await pg.query(
        `SELECT column_name FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = $1
         ORDER BY ordinal_position`,
        [table]
      )
      const colNames = cols.map(r => r.column_name)
      const hasScrapedAt = colNames.includes('scraped_at')

      // Sample a row if any exist
      const { rows: sample } = await pg.query(`SELECT * FROM "${table}" LIMIT 1`)
      const filledCols = sample[0]
        ? Object.entries(sample[0]).filter(([, v]) => v != null).map(([k]) => k)
        : []

      console.log(`\n── ${table}`)
      console.log(`   rows: ${total}`)
      console.log(`   scraped_at column: ${hasScrapedAt ? 'YES' : 'MISSING'}`)
      console.log(`   total columns: ${colNames.length}`)
      if (filledCols.length) console.log(`   sample filled cols: ${filledCols.join(', ')}`)
    } catch (err) {
      console.log(`\n── ${table}  [ERROR: ${err.message}]`)
    }
  }

  await pg.end()
}

main().catch(err => { console.error(err.message); process.exit(1) })
