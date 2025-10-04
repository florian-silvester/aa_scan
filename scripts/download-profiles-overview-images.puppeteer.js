#!/usr/bin/env node

const fs = require('fs')
const os = require('os')
const path = require('path')
const fetch = (...a) => import('node-fetch').then(({default: f}) => f(...a))

function stripSize(u) { return u.replace(/-(?:\d+)[xX](?:\d+)\.(jpg|jpeg|png|webp)$/i, '.$1') }
function isThumb(u) { return /(100x100|150x150|200x200|258x300|300x300|400x300|460x300|600x400|672x1024|693x1024|707x1024)\.(jpg|jpeg|png|webp)$/i.test(u) }

async function downloadAll(urls, outDir) {
  fs.mkdirSync(outDir, { recursive: true })
  let ok=0, fail=0
  let i=0
  const concurrency = 8
  async function worker(){
    while(i<urls.length){
      const idx=i++
      const u=urls[idx]
      const name=path.basename(u)
      try{
        const res=await fetch(u,{headers:{'User-Agent':'aa-scraper/1.0','Referer':'https://artaurea.de/profiles/'}})
        if(!res.ok) throw new Error('HTTP '+res.status)
        const ab=await res.arrayBuffer()
        fs.writeFileSync(path.join(outDir,name),Buffer.from(ab))
        ok++
      }catch(e){fail++}
    }
  }
  await Promise.all(Array.from({length:concurrency},worker))
  return {ok,fail}
}

async function main(){
  const puppeteer = require('puppeteer')
  const startUrl='https://artaurea.de/profiles/'
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox','--disable-setuid-sandbox'] })
  const page = await browser.newPage()
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X) AppleWebKit/537.36 (KHTML, like Gecko) Chrome Safari')
  await page.goto(startUrl, { waitUntil: 'domcontentloaded' })

  // Scroll to trigger lazy-load
  const scrollSteps = 20
  for (let s=0;s<scrollSteps;s++) {
    await page.evaluate(y => window.scrollBy(0, y), 2000)
    await new Promise(r => setTimeout(r, 300))
  }
  // Light delay for late loaders
  await new Promise(r => setTimeout(r, 1000))

  // Collect real image URLs from src, data-src, data-lazy, srcset and picture/source
  const urls = await page.evaluate(() => {
    const set = new Set()
    const push = u => { if (u && /\/wp-content\/uploads\//.test(u)) set.add(u.split('?')[0]) }

    document.querySelectorAll('img').forEach(img => {
      push(img.getAttribute('src'))
      push(img.getAttribute('data-src'))
      push(img.getAttribute('data-lazy'))
      const ss = img.getAttribute('srcset')
      if (ss) ss.split(',').forEach(part => push(part.trim().split(' ')[0]))
    })
    document.querySelectorAll('picture source').forEach(src => {
      const ss = src.getAttribute('srcset')
      if (ss) ss.split(',').forEach(part => push(part.trim().split(' ')[0]))
    })
    return Array.from(set)
  })
  await browser.close()

  const originals = Array.from(new Set(urls.map(stripSize))).filter(u => !isThumb(u))
  const outDir = path.join(os.homedir(),'Downloads','aa_overview_rendered')
  console.log('Found (raw):', urls.length, 'Unique originals:', originals.length)
  const {ok,fail} = await downloadAll(originals, outDir)
  console.log('Saved to:', outDir)
  console.log('Downloaded:', ok, 'Failed:', fail)
}

main().catch(err=>{ console.error(err); process.exit(1) })


