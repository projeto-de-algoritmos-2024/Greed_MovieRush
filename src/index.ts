import puppeteer from 'puppeteer';

interface CinemaRawData {
  title: string;
  duration: string;
  times: string[];
}

interface CinemaDurationData {
  title: string;
  duration: string;
  times: MovieTime[];
}

interface MovieTime {
  start: Date;
  end: Date;
}

function calculateEndTime(duration: string, times : string[]): MovieTime[] {
  const [hours, minutes] = duration.split('h');
  const durationInMinutes = parseInt(hours) * 60 + parseInt(minutes);

  const movieTimes: MovieTime[] = times.map(time => {
    const [hour, minute] = time.split(':');
    const startTime = new Date();
    startTime.setHours(parseInt(hour));
    startTime.setMinutes(parseInt(minute));
    const endTime = new Date(startTime.getTime() + durationInMinutes * 60000);
    //console.log(`Início: ${startTime.toLocaleTimeString()}, fim: ${endTime.toLocaleTimeString()}`);

    return { start: startTime, end: endTime };
  });

  return movieTimes;


}

async function movieTimes(): Promise<CinemaDurationData[]> {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  const city = 'brasilia';
  const baseUrl = `https://www.ingresso.com/cinemas`;
  let movieTimes: {
    title: string;
    duration: string;
    times: string[];
  }[] = [];
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

  const movieListSelector = 'div.mx-3.my-5.sm\\:mb-8.lg\\:mx-0';
  
  if (cinemas.length > 0) {
    const cinema = cinemas[2];
    await page.goto(cinema.link);
    const buttonDateSelector = "#splide01-slide04"
    const buttonDate = await page.$(buttonDateSelector);
    if (buttonDate) {
      //await buttonDate.click();
      await page.waitForSelector(movieListSelector);
    }

    const movieList = await page.$(movieListSelector);

    if (movieList) {
      const movies = await page.evaluate(movieList => {
        return Array.from(movieList.children).map(child => child.innerHTML);
      }, movieList);

      console.log(`Encontradas ${movies.length} divs diretamente filhas da movie list.`);

      movieTimes = await page.evaluate(() => {
        const movies = Array.from(document.querySelectorAll('div.mx-3.my-5.sm\\:mb-8.lg\\:mx-0 > div'));
        return movies.map(movie => {
          const title = movie.querySelector('h3 a')?.innerText || 'Título não encontrado';
          const duration = movie.querySelector('p')?.innerText || 'Duração não encontrada';
          const times = Array.from(movie.querySelectorAll('a > div > span')).map(span => span.innerText);
          return { title, duration, times };
        });
      });

      console.log('Horários dos filmes:', movieTimes);
    } else {
      console.log('Movie list não encontrada.');
    }
  } else {
    console.log('Nenhum cinema encontrado.');
  }

  await browser.close();

  const movieTimesWithEndTime = movieTimes.map(({ title, duration, times }) => {
    return { title, duration, times: calculateEndTime(duration, times) };
  });

  return movieTimesWithEndTime;
};

function intervalScheduler(cinemaDurationData: CinemaDurationData[]) {
    const agenda = [];
    const allMovies: {
        title: string;
        start: Date;
        end: Date;
    }[] = [];
    const watchedStatus: Record<string, boolean> = {};

    // Coletar todos os filmes e inicializar a contagem de exibições
    cinemaDurationData.forEach((data) => {
      data.times.forEach((time) => {
        allMovies.push({ title: data.title, start: time.start, end: time.end });
      });
    });
  
  

    // Sort movies by a composite score of end time and session count
    allMovies.sort((a, b) => {
      return a.end.getTime() - b.end.getTime();
    }
    );
    for (let i = 0; i < allMovies.length; i++) {
      console.log(`Filme: ${allMovies[i].title}, início: ${allMovies[i].start.toLocaleTimeString()}, fim: ${allMovies[i].end.toLocaleTimeString()}`);
    }

    agenda.push(allMovies[0]);
    watchedStatus[allMovies[0].title] = true;
  
    for (let i = 1; i < allMovies.length; i++) {
      const lastMovie = agenda[agenda.length - 1];
      if (allMovies[i].start.getTime() >= lastMovie.end.getTime() && !watchedStatus[allMovies[i].title]) {
        agenda.push(allMovies[i]);
        watchedStatus[allMovies[i].title] = true;
      }
    }
    return agenda;
  }
(async () => {
  const times = await movieTimes();
  const agenda = intervalScheduler(times);
  for (let i = 0; i < agenda.length; i++) {
    console.log(`Filme: ${agenda[i].title}, início: ${agenda[i].start.toLocaleTimeString()}, fim: ${agenda[i].end.toLocaleTimeString()}`);
  }
})();
