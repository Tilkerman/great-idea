# Лендинг TiLi

Статичная страница: **`public/landing.html`** → после сборки  
`https://tilkerman.github.io/great-idea/landing.html`

Языки: RU / EN / ES (переключатель, выбор в `localStorage`: `tili-landing-lang`).

Кнопка «Открыть приложение» ведёт на `./` (корень PWA).

## Свой домен

1. Купить домен, в DNS — **A/CNAME** на GitHub Pages (или хостинг статики).
2. В репозитории **Settings → Pages → Custom domain**.
3. Когда лендинг станет главной страницей сайта:
   - вариант A: `index.html` лендинга в корне, приложение на `/app/` (нужно сменить `base` в Vite);
   - вариант B: корень = лендинг (`landing.html` → переименовать/копировать в `index.html` отдельного деплоя), приложение на поддомене `app.example.com`.

Пока домена нет — шарить ссылку на лендинг или сразу на PWA.

## Правки

Тексты — в объекте `copy` внизу `landing.html`. Скриншоты: заменить блок `.preview` на `<img src="./screens/...">` в `public/`.
