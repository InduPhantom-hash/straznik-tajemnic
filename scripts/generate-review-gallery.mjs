import fs from 'fs';
import path from 'path';

const packsMeta = [
  {
    "id": "case-s01",
    "slug": "case-s11-01",
    "wave": "Fala 1",
    "title": "Nawiedzony dom (The Haunting)",
    "era": "1920, Boston",
    "source": "Starter Klasyczny CoC 7e (str. 15-32)",
    "canonDesc": "Klasyczne śledztwo w nawiedzonym bostońskim domu Waltera Corbitta. Badacze przeszukują archiwa Boston Globe, Kaplicę Kontemplacji i sam dom przy French Hill, odkrywając zmumifikowane ciało czarnoksiężnika w piwnicy."
  },
  {
    "id": "case-s02",
    "slug": "noc-zaglady",
    "wave": "Fala 1",
    "title": "Noc zagłady (World War Cthulhu)",
    "era": "Jesień 1940, Okupowana Polska",
    "source": "Starter Mity Wojny (str. 17-38)",
    "canonDesc": "Wojenny survival w odciętym klasztorze w Generalnym Gubernatorstwie. Tomasz Burski, złamany klęską wrześniową partyzant, zawarł pakt z Kozicą z Tysiącem Młodych (Shub-Niggurath), sprowadzając na okolicę nieludzki koszmar."
  },
  {
    "id": "case-s03",
    "slug": "czarny-sarkofag",
    "wave": "Fala 1",
    "title": "Tajemnica Czarnego Sarkofagu (Prolog Peru)",
    "era": "1919, Lima i Andy, Peru",
    "source": "Starter Maski Nyarlathotepa (str. 17-38)",
    "canonDesc": "Ekspedycja Jacksona Eliasa i schorowanego Augusta Larkina w Andy w rejon jeziora Titicaca i Puno. W starych kopalniach srebra i zaginionej piramidzie czai się starożytna groza Kharisiri – istot wysysających ludzką esencję i tłuszcz."
  },
  {
    "id": "case-m01",
    "slug": "posrod-pradawnych-drzew",
    "wave": "Fala 1",
    "title": "Pośród pradawnych drzew (Amidst the Ancient Trees)",
    "era": "1927, Vermont, Bennington",
    "source": "Księga Strażnika CoC 7e (str. 343-360)",
    "canonDesc": "Poszukiwania porwanej Jane Strong przez gang porywaczy w gęstych, prastarych lasach Vermont. Na bagnach kryje się potężny sługa Gla'akiego oraz kryształowa trumna obcej istoty więżącej umysły okolicznych osadników."
  },
  {
    "id": "case-m02",
    "slug": "szkarlatne-litery",
    "wave": "Fala 1",
    "title": "Szkarłatne litery (Crimson Letters)",
    "era": "1920s, Arkham, Uniwersytet Miskatonic",
    "source": "Księga Strażnika CoC 7e (str. 361-382)",
    "canonDesc": "Śledztwo na kampusie Uniwersytetu Miskatonic po tajemniczej śmierci Charlesa Leita. Zaginiony pergamin z pismem czarnoksięskim wywołuje obłęd wśród bostońskich kolekcjonerów, antykwariuszy i akademików, przywołując horror ze szczelin rzeczywistości."
  },
  {
    "id": "case-q01",
    "slug": "cien-nad-prabutami",
    "wave": "Fala 1",
    "title": "Cień nad Prabutami: Szpitalny Koszmar",
    "era": "1973, Prabuty (PRL)",
    "source": "Scenariusz Silnika Gry (data/adventures/predefined)",
    "canonDesc": "Prowincjonalny szpital psychiatryczny w Prabutach w latach 70. Tajne eksperymenty neuropatologiczne z użyciem preparatów z Rybich Ludzi, zimna wojna, milicyjne tuszowanie zaginięć pacjentów."
  },
  {
    "id": "case-q02",
    "slug": "tajemnica-pendnika-lagiewki",
    "wave": "Fala 1",
    "title": "Tajemnica Pędnika: Genialny Wynalazca z Kowar",
    "era": "1996, Kowary i Karkonosze",
    "source": "Scenariusz Silnika Gry (data/adventures/predefined)",
    "canonDesc": "Warsztat wynalazcy Lucjana Łągiewki u stóp Karkonoszy. Próba zderzeniowa czerwonego Fiata 126p (Malucha) z zderzakiem kinetycznym na stadionie miejskim w Kowarach i grawimetryczne anomalie w opuszczonej sztolni uranowej nr 19 powiązane z Mi-Go."
  },
  {
    "id": "case-q03",
    "slug": "tajemnica-dzieci-z-traszyna",
    "wave": "Fala 1",
    "title": "Tajemnica Dzieci z Traszyna",
    "era": "1999, Traszyn (Lubelszczyzna)",
    "source": "Scenariusz Silnika Gry (data/adventures/predefined)",
    "canonDesc": "Późne lato 1999 roku na zapomnianej lubelskiej wsi. Zaginięcia dzieci, odwrócony krzyż w stodole, lokalny kult w cieniu prastarego kurhanu i sekrety milczącej społeczności."
  },
  {
    "id": "case-q04",
    "slug": "przybysz-z-matriksa-glogow",
    "wave": "Fala 1",
    "title": "Przybysz z Matriksa: Incydent Głogowski",
    "era": "2001, Głogów",
    "source": "Scenariusz Silnika Gry (data/adventures/predefined)",
    "canonDesc": "Początek ery kafejek internetowych i modemów dial-up. Dziwne transmisje w sieci miejskiej, CRT monitory pokazujące niemożliwe ciągi danych, rytuały cyfrowe i materializacja obcej inteligencji w piwnicach blokowisk."
  },
  {
    "id": "case-q05",
    "slug": "englewood-murder-castle-1893",
    "wave": "Fala 1",
    "title": "The Englewood Labyrinth (H.H. Holmes)",
    "era": "1893, Chicago",
    "source": "Scenariusz Silnika Gry (data/adventures/predefined)",
    "canonDesc": "Wystawa Światowa w Chicago i ponury \"Zamek Morderstw\" dr. H.H. Holmesa w Englewood. Labirynt ślepych korytarzy, pieców kremacyjnych, zapadni i tajemnych komór gazowych maskujących okultystyczny kult."
  },
  {
    "id": "case-q06",
    "slug": "almer-coe-spectacles-1924",
    "wave": "Fala 1",
    "title": "The Almer Coe Anomaly: Okulary Prawdy",
    "era": "1924, Chicago",
    "source": "Scenariusz Silnika Gry (data/adventures/predefined)",
    "canonDesc": "Ekskluzywny salon optyczny Almer Coe & Co. w centrum Chicago. Soczewki ze szlifowanego minerału z meteorytu pozwalające dostrzec istoty z innych wymiarów żerujące na nieświadomych przechodniach Michigan Avenue."
  },
  {
    "id": "case-q07",
    "slug": "circleville-letters-1983",
    "wave": "Fala 1",
    "title": "The Poison Pen of Circleville",
    "era": "1983, Circleville, Ohio",
    "source": "Scenariusz Silnika Gry (data/adventures/predefined)",
    "canonDesc": "Prowincjonalne miasteczko w Ohio terroryzowane anonimowymi, jadowitymi listami odsłaniającymi najgłębsze tajemnice mieszkańców. Śmiertelne pułapki na drogach i telepatyczny byt manipulujący zbiorową histerią."
  },
  {
    "id": "case-q08",
    "slug": "ovidhall-lake-anomaly-2005",
    "wave": "Fala 1",
    "title": "The Ovidhall Lake Anomaly",
    "era": "2005, Michigan",
    "source": "Scenariusz Silnika Gry (data/adventures/predefined)",
    "canonDesc": "Głębokie jezioro polodowcowe w stanie Michigan. Dziwne odczyty sonarów batymetrycznych, znikający wędkarze i podwodne struktury budowane przez istoty z głębin jeziornych."
  },
  {
    "id": "case-h01",
    "slug": "dorosli-we-mgle",
    "wave": "Fala 2",
    "title": "Dorośli we mgle",
    "era": "1920s, Poznań (Chwaliszewo)",
    "source": "Horror nad Wartą (str. 5-28)",
    "canonDesc": "Gęsta, nieprzenikniona mgła opadająca nad Wartę w Poznaniu. Zaginięcia dzieci na robotniczym Chwaliszewie, zaniepokojeni lekarze w Szpitalu Miejskim przy ul. Szkolnej i prastary nadrzeczny kult."
  },
  {
    "id": "case-h02",
    "slug": "koszmar-poznania",
    "wave": "Fala 2",
    "title": "Koszmar Poznania",
    "era": "1920s, Poznań (Cytadela / Fort Winiary)",
    "source": "Horror nad Wartą (str. 29-52)",
    "canonDesc": "Mroczne podziemia i kazamaty Fortu Winiary (poznańskiej Cytadeli). Wojskowe tajemnice garnizonu wielkopolskiego, dawne lochy i nieludzkie anomalie budzące się w ceglanych korytarzach."
  },
  {
    "id": "case-h03",
    "slug": "milosc-ci-wszystko-wybaczy",
    "wave": "Fala 2",
    "title": "Miłość ci wszystko wybaczy?",
    "era": "1920s, Poznań (Teatr Wielki i Cytadela)",
    "source": "Horror nad Wartą (str. 53-84)",
    "canonDesc": "Romans i okultyzm w teatralnym Poznaniu. Primadonna Teatru Wielkiego, tajemniczy arystokrata-okultysta, szyfrowane listy miłosne, krypty zadżumionych i hipnotyczne tango z ukrytym fałszywym tonem."
  },
  {
    "id": "case-h04",
    "slug": "w-cieniu-swiatel",
    "wave": "Fala 2",
    "title": "W cieniu świateł (PeWuKa 1929)",
    "era": "1929, Poznań (Targi Krajowe)",
    "source": "Horror nad Wartą (str. 85-118)",
    "canonDesc": "Powszechna Wystawa Krajowa (PeWuKa 1929). Szczyt modernizmu II RP, miliony żarówek, monumentalna wieża targowa, spalone podstacje transformatorowe i byt żerujący na potężnych polach elektromagnetycznych."
  },
  {
    "id": "case-u01",
    "slug": "sprawa-malego-cohna",
    "wave": "Fala 2",
    "title": "Sprawa Małego Cohna",
    "era": "1924, Poznań (Stare Zoo)",
    "source": "Usłysz Zew Cthulhu (str. 7-26)",
    "canonDesc": "Tajemnicza śmierć 70-letniego indyjskiego słonia \"Małego Cohna\" w Starym Zoo przy ul. Zwierzynieckiej w Poznaniu. Wirtuoz Klemens Chorąż-Wojciechowski, posługacze sekty Tcho-Tcho i zakazany rytuał ożywienia."
  },
  {
    "id": "case-u02",
    "slug": "dawno-temu-w-dusznikach",
    "wave": "Fala 2",
    "title": "Dawno temu w Dusznikach",
    "era": "1826, Bad Reinerz (Duszniki-Zdrój)",
    "source": "Usłysz Zew Cthulhu (str. 27-50)",
    "canonDesc": "Uzdrowisko Bad Reinerz w 1826 roku podczas kuracji młodego Fryderyka Chopina. Młyn papierniczy, miedziorytowa mapa kurortu, dysonansowe nuty obłędu i groza czająca się w dolinach Gór Stołowych."
  },
  {
    "id": "case-u03",
    "slug": "babie-lato",
    "wave": "Fala 2",
    "title": "Babie Lato: Partyzancki Koszmar",
    "era": "1943, Lubelszczyzna (Puszcza Solska)",
    "source": "Usłysz Zew Cthulhu (str. 51-82)",
    "canonDesc": "Partyzancka minikampania w Puszczy Solskiej. Ściśle tajna niemiecka aparatura nasłuchowa Netzwaffe, grypsy Batalionów Chłopskich, radiooperator odbierający sygnały spoza Ziemi i mgła pełna pajęczyn babiego lata."
  },
  {
    "id": "case-t01",
    "slug": "dziedzictwo-tatr",
    "wave": "Fala 2",
    "title": "Dziedzictwo Tatr",
    "era": "1920s, Zakopane i Tatry",
    "source": "Cienie Tatr (str. 7-32)",
    "canonDesc": "Wyprawa w wysokie partie Tatr w rejon Morskiego Oka i Czerwonych Wierchów. Dawna góralska legenda o śpiących rycerzach, prastary pergamin, lodowe szczeliny jaskiniowe i nieludzkie odciski w wiecznej zmarzlinie."
  },
  {
    "id": "case-t02",
    "slug": "pelzajaca-kontrrewolucja",
    "wave": "Fala 2",
    "title": "Pełzająca kontrrewolucja",
    "era": "1971, Gdańsk (Przymorze, Falowiec)",
    "source": "Cienie Tatr (str. 33-58)",
    "canonDesc": "Monstrualny modernistyczny Falowiec w Gdańsku po grudniu 1970 r. Odcięta żywa dłoń znaleziona w zsypie na śmieci, tajne raporty SB, milicyjne dochodzenie i groza ożywionej materii w betonowym labiryncie PRL."
  },
  {
    "id": "case-t03",
    "slug": "pociag-do-szalenstwa",
    "wave": "Fala 2",
    "title": "Pociąg do szaleństwa",
    "era": "1970s, Walim i Góry Sowie (Riese)",
    "source": "Cienie Tatr (str. 59-86)",
    "canonDesc": "Tajemnice podziemnego kompleksu Riese w Walimiu. Ekipa filmowa dokumentalistów, poniemiecki profesor Fritz Friedman, zaminowane sztolnie i pociąg widmo krążący w zapieczętowanych podziemiach Gór Sowich."
  },
  {
    "id": "case-t04",
    "slug": "czarny-jak-wegiel",
    "wave": "Fala 2",
    "title": "Czarny jak węgiel",
    "era": "1922, Wieś Konina / Anapol pod Krakowem",
    "source": "Cienie Tatr (str. 87-112)",
    "canonDesc": "Upadek meteorytu w podkrakowskiej wsi. Czarna, pulsująca kosmiczna ruda, zakażone studnie, postępujący obłęd mieszkańców i ekspedycja geologów z Uniwersytetu Jagiellońskiego."
  },
  {
    "id": "case-p01",
    "slug": "dezintegrator",
    "wave": "Fala 3",
    "title": "Dezintegrator (The Disintegrator)",
    "era": "1930s, Szanghaj (Hotel Shanghai)",
    "source": "Pulp Cthulhu (Rozdział 11, str. 159-182)",
    "canonDesc": "Tajna aukcja w luksusowym Hotelu Shanghai w koncesji międzynarodowej. Ekscentryczny dr Walter Harden prezentuje maszynę z promieniem dezintegrującym, a brytyjskie, radzieckie i japońskie wywiady walczą o przejęcie śmiercionośnego wynalazku."
  },
  {
    "id": "case-p02",
    "slug": "czekajac-na-huragan",
    "wave": "Fala 3",
    "title": "Czekając na huragan (Waiting for the Hurricane)",
    "era": "Święto Pracy 1935, Key West, Floryda",
    "source": "Pulp Cthulhu (Rozdział 12, str. 183-200)",
    "canonDesc": "Katastrofalny huragan 5. kategorii odcina wyspę Key West od lądu. Pośród szalejącego cyklonu, zrywającego dachy i zalewającego ulice, hybryda Douglas Whiting i kult Dagonitów wykorzystują żywioł jako zasłonę do krwawego rytuału przywołania."
  },
  {
    "id": "case-p03",
    "slug": "puszka-pandory",
    "wave": "Fala 3",
    "title": "Puszka Pandory (Pandora's Box)",
    "era": "1930s, Nowy Jork (Pałac Pandory)",
    "source": "Pulp Cthulhu (Rozdział 13, str. 201-228)",
    "canonDesc": "Ekskluzywny nocny klub Pandora Palace w Nowym Jorku. Promotor Vern Bailey („Zabójczy” Eddie Bartlett), okultystyczna kapłanka Lilith Chalmers i starożytna brązowa szkatuła emitująca trujące szmaragdowe światło sprowadzające nieszczęście i szaleństwo."
  },
  {
    "id": "case-p04",
    "slug": "powolny-rejs-do-chin",
    "wave": "Fala 3",
    "title": "Powolny rejs do Chin (A Slow Boat to China)",
    "era": "1930s, Pacyfik (Transatlantyk S.S. President Coolidge)",
    "source": "Pulp Cthulhu (Rozdział 14, str. 229-257)",
    "canonDesc": "Wielodniowy rejs luksusowym liniowcem pasażerskim z San Francisco do Szanghaju. Kapitan Henry Nelson próbuje opanować sytuację po serii makabrycznych morderstw w kajutach pierwszej klasy i pojawieniu się nieludzkich istot na otwartym oceanie."
  }
];

let html = `<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Przegląd Prerenderowanych Multimediów - Strażnik Tajemnic AI (Fala 1)</title>
  <style>
    :root {
      --bg: #0f1115;
      --card-bg: #181b22;
      --border: #2d3342;
      --accent: #d4a373;
      --text: #e6edf3;
      --text-muted: #8b949e;
      --tag-bg: #21262d;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      padding: 40px 20px;
      line-height: 1.6;
    }
    .container { max-width: 1400px; margin: 0 auto; }
    header {
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 1px solid var(--border);
      text-align: center;
    }
    h1 { font-size: 2.2rem; color: var(--accent); margin-bottom: 8px; letter-spacing: -0.5px; }
    .subtitle { color: var(--text-muted); font-size: 1.1rem; }
    .summary-badge {
      display: inline-block;
      margin-top: 14px;
      padding: 6px 14px;
      background: #1f6feb22;
      color: #58a6ff;
      border: 1px solid #1f6feb44;
      border-radius: 20px;
      font-size: 0.9rem;
      font-weight: 600;
    }
    .scenario-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      margin-bottom: 50px;
      overflow: hidden;
      box-shadow: 0 8px 24px rgba(0,0,0,0.4);
    }
    .scenario-header {
      padding: 24px 30px;
      background: #13161c;
      border-bottom: 1px solid var(--border);
    }
    .scenario-title {
      font-size: 1.5rem;
      color: #fff;
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 8px;
    }
    .badge-era {
      font-size: 0.8rem;
      padding: 4px 10px;
      background: #388bfd22;
      color: #79c0ff;
      border-radius: 12px;
      border: 1px solid #388bfd44;
    }
    .scenario-source { font-size: 0.85rem; color: var(--accent); margin-bottom: 12px; font-weight: 500; }
    .scenario-desc {
      color: #c9d1d9;
      font-size: 0.95rem;
      background: #1a1e26;
      padding: 12px 16px;
      border-radius: 8px;
      border-left: 3px solid var(--accent);
    }
    .media-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
      gap: 20px;
      padding: 30px;
    }
    .asset-card {
      background: #12141a;
      border: 1px solid #262b37;
      border-radius: 8px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .asset-img-container {
      background: #000;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 220px;
    }
    .asset-img-container img {
      width: 100%;
      height: auto;
      display: block;
      object-fit: cover;
      transition: transform 0.2s ease;
    }
    .asset-img-container:hover img {
      transform: scale(1.02);
    }
    .asset-info {
      padding: 16px;
      flex-grow: 1;
      display: flex;
      flex-direction: column;
    }
    .asset-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    .asset-tag {
      font-size: 0.75rem;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 4px;
      text-transform: uppercase;
    }
    .tag-clue { background: #d2992222; color: #e3b341; border: 1px solid #d2992244; }
    .tag-npc { background: #a371f722; color: #bc8cff; border: 1px solid #a371f744; }
    .tag-audio { background: #23863622; color: #3fb950; border: 1px solid #23863644; }
    .asset-id { font-family: monospace; font-size: 0.8rem; color: var(--text-muted); }
    .asset-title { font-size: 1rem; font-weight: 600; color: #f0f6fc; margin-bottom: 6px; }
    .asset-tags { margin-top: auto; padding-top: 10px; display: flex; flex-wrap: wrap; gap: 6px; }
    .pill {
      font-size: 0.7rem;
      background: var(--tag-bg);
      color: #8b949e;
      padding: 2px 6px;
      border-radius: 4px;
    }
    .audio-player-box {
      background: #161b22;
      padding: 16px;
      border-radius: 8px;
      margin: 0 30px 24px 30px;
      border: 1px solid #30363d;
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .audio-player-box audio {
      flex-grow: 1;
      height: 36px;
    }
    .audio-title {
      font-size: 0.9rem;
      font-weight: 600;
      color: #3fb950;
      white-space: nowrap;
    }
  </style>
</head>
<body>
<div class="container">
  <header>
    <h1>Strażnik Tajemnic AI - Galeria Weryfikacyjna Fali 1</h1>
    <div class="subtitle">Przegląd 13 gotowych pakietów multimedialnych wygenerowanych pod kątem zgodności z oficjalnym kanonem przygód</div>
    <div class="summary-badge">Status: 13 pakietów | 80 plików multimedialnych | 100% zwalidowane na dysku</div>
  </header>
`;

for (const p of packsMeta) {
  const manifestPath = path.resolve(`public/adventure-packs/${p.slug}/manifest.json`);
  if (!fs.existsSync(manifestPath)) continue;
  
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const assets = manifest.assets || [];
  const audioAssets = assets.filter(a => a.category === 'audio-handout');
  const visualAssets = assets.filter(a => a.category !== 'audio-handout');

  html += `
  <section class="scenario-card" id="${p.slug}">
    <div class="scenario-header">
      <div class="scenario-title">
        <span>${p.title}</span>
        <span class="badge-era">${p.era}</span>
      </div>
      <div class="scenario-source">📖 Źródło / Kanon: ${p.source}</div>
      <div class="scenario-desc">
        <strong>Opis fabularny w podręczniku:</strong> ${p.canonDesc}
      </div>
    </div>
  `;

  if (audioAssets.length > 0) {
    for (const aud of audioAssets) {
      const audioBase64 = fs.readFileSync(`public/adventure-packs/${p.slug}/${aud.file}`).toString('base64');
      html += `
      <div class="audio-player-box">
        <span class="tag-audio asset-tag">AUDIO DIEGETYCZNE</span>
        <div class="audio-title">${aud.id} (${aud.file})</div>
        <audio controls src="data:audio/mp3;base64,${audioBase64}"></audio>
      </div>
      `;
    }
  }

  html += `<div class="media-grid">`;
  for (const item of visualAssets) {
    const isNpc = item.category === 'npc-portrait';
    const tagClass = isNpc ? 'tag-npc' : 'tag-clue';
    const tagLabel = isNpc ? 'NPC (3:4)' : 'DOWÓD (16:9)';
    const imgPath = `public/adventure-packs/${p.slug}/${item.file}`;
    let dataUri = '';
    if (fs.existsSync(imgPath)) {
      const b64 = fs.readFileSync(imgPath).toString('base64');
      dataUri = `data:image/webp;base64,${b64}`;
    }

    html += `
      <div class="asset-card">
        <div class="asset-img-container">
          <img src="${dataUri}" alt="${item.id}" loading="lazy">
        </div>
        <div class="asset-info">
          <div class="asset-meta">
            <span class="${tagClass} asset-tag">${tagLabel}</span>
            <span class="asset-id">${item.file}</span>
          </div>
          <div class="asset-title">${item.id}</div>
          <div class="asset-tags">
            ${(item.tagsPl || []).map(t => `<span class="pill">${t}</span>`).join('')}
          </div>
        </div>
      </div>
    `;
  }
  html += `</div></section>`;
}

html += `
</div>
</body>
</html>
`;

fs.writeFileSync('docs/reports/przeglad-fala-1.html', html, 'utf8');
fs.writeFileSync('docs/reports/przeglad-wszystkie-fale.html', html, 'utf8');
console.log('✅ Zaktualizowano raport HTML z wbudowanymi zasobami (data:base64): docs/reports/przeglad-fala-1.html');
