import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  const city = 'brasilia';
  const baseUrl = `https://www.ingresso.com/cinemas`;
  const cinemas = [];

  await page.goto(`${baseUrl}?city=${city}`);

  const mainDivSelector = 'div.mx-0.mb-\\[30px\\].mt-\\[10px\\].flex.flex-col.lg\\:mx-\\[5px\\].lg\\:flex-row.lg\\:flex-wrap';
  const allDivs = await page.$$(mainDivSelector);

  if (allDivs.length > 1) {

    const secondDiv = allDivs[1];
    console.log('Segunda div encontrada!');

    const subDivSelector = '.bg-ing-neutral-600';
    const subDivs = await secondDiv.$$(subDivSelector);

    console.log(`Encontradas ${subDivs.length} sub-divs.`);

    for (let i = 0; i < subDivs.length; i++) {
      const link = await subDivs[i].$('a');
      if (link) {
        const href = await page.evaluate(a => a.href, link);
        const cinemaName = await page.evaluate(a => a.querySelector('h3')?.innerText, link);
        cinemas.push({ name: cinemaName, link: href });
      }
    }
  } else {
    console.log('Div principal não encontrada.');
  }

  const cinema= cinemas[0];
  await page.goto(cinema.link);
  await browser.close();
})();
