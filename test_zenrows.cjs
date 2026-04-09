'use strict'
require('dotenv').config()
const axios = require('axios')

const KEY = process.env.ZENROWS_API_KEY
console.log(`API key: ${KEY ? KEY.slice(0,8) + '...' : 'MISSING'}`)

// Test 1: simple fetch (no JS render) — cheapest, just verifies auth + connectivity
async function test(label, url, params = {}) {
  console.log(`\n── ${label}`)
  console.log(`   url: ${url}`)
  try {
    const res = await axios.get('https://api.zenrows.com/v1/', {
      params: { url, apikey: KEY, ...params },
      timeout: 120_000,
    })
    const html = res.data
    const title = html.match(/<title[^>]*>([^<]+)/i)?.[1]?.trim() || '(no title tag)'
    console.log(`   status:       ${res.status}`)
    console.log(`   html length:  ${html.length} chars`)
    console.log(`   <title>:      ${title}`)
    console.log(`   PASS`)
  } catch (err) {
    const status = err.response?.status
    const body   = err.response?.data
    console.log(`   status: ${status ?? 'N/A'} — ${err.message}`)
    if (body) console.log(`   body:   ${JSON.stringify(body).slice(0, 300)}`)
    console.log(`   FAIL`)
  }
}

;(async () => {
  // Test 1: plain fetch — confirms API key is valid
  await test('plain fetch (no JS render)', 'https://httpbin.org/get')

  // Test 2: B&H listing page — confirms B&H isn't blocking / URL is valid
  await test(
    'B&H listing page (js_render)',
    'https://www.bhphotovideo.com/c/browse/digital-cameras/ci/9811',
    { js_render: 'true', premium_proxy: 'true', antibot: 'true', wait: '2000' }
  )

  // Test 3: single B&H product page
  await test(
    'B&H product page (js_render)',
    'https://www.bhphotovideo.com/c/product/1935439-REG/sony_a7_v_mirrorless_camera.html',
    { js_render: 'true', premium_proxy: 'true', antibot: 'true', wait: '2000' }
  )
})()
