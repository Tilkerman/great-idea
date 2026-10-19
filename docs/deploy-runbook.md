# Деплой TiLi (единый контур)

## Официальный прод

Только **`scripts/deploy-pages.sh`** из копии **без `\` в пути** (см. `.cursor/rules/project-location.mdc`):

```bash
rsync -a --delete --exclude node_modules --exclude dist --exclude .git \
  "/Users/macbookair/Работа/список\\календарь/" \
  "/Users/macbookair/Работа/список/календарь/"
cd "/Users/macbookair/Работа/список/календарь"
bash scripts/deploy-pages.sh
```

Скрипт по порядку:

1. `npm run build:pages` → `dist/` (лендинг + `/app/`)
2. `gh-pages` ветка на GitHub
3. Purge jsDelivr (`app/index.html`, `app/sw.js`)
4. Cloudflare Worker с `APP_BUILD` = short SHA ветки **gh-pages**
5. **Smoke** `scripts/smoke-tili-app.sh` (редирект `?_r=` + HTTP 200 на JS)

Если smoke падает — **не считать релиз удачным**.

## GitHub Actions

Workflow **CI build** (`.github/workflows/pages.yml`) — только **сборка** на push в `main`.  
Он **не** публикует сайт (чтобы не было второго деплоя).

## Домены

| URL | Что |
|-----|-----|
| https://tili.su/ | Лендинг (GitHub Pages) |
| https://tili.su/app/ | PWA (Worker → jsDelivr @ gh-pages commit) |
| https://api.tili.su/ | API / push proxy (VPS) |

Пользователям давать **https://tili.su/app/**.

## После деплоя на iPhone

1. Полностью закрыть PWA.
2. Открыть снова (или Safari → tili.su/app/).
3. При белом экране: Safari → Данные сайтов → удалить **tili.su**.

## Почему был белый экран

Vite удаляет старые `index-*.js` при новом билде. Safari держит старый `index.html` → 404 на JS.  
Лечение: редирект `?_r=<release>`, purge jsDelivr, Worker pin на коммит gh-pages, smoke перед «готово».
