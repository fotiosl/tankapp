# ⛽ TankApp — Echtzeit-Spritpreise & Tankstellen-Finder

<div align="center">

![React 19](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-7.x-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8.x-646CFF?logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.x-38B2AC?logo=tailwind-css&logoColor=white)
![Leaflet](https://img.shields.io/badge/Leaflet-1.9-199900?logo=leaflet&logoColor=white)
![PWA Ready](https://img.shields.io/badge/PWA-iOS_%26_Mobile_Ready-FF2D20?logo=apple&logoColor=white)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)

**Eine moderne, blitzschnelle Progressive Web App (PWA) für minutengenaue Spritpreise in Deutschland.**  
*Speziell für das iPhone und mobile Browser optimiert – schlank, datensparsam und ohne überladene App-Store-Werbung.*

[Features](#-features) • [Tech Stack](#-tech-stack) • [Schnellstart](#-schnellstart-lokal) • [iPhone Installation](#-auf-dem-iphone-installieren-pwa) • [API & Vercel](#-tankerk%C3%B6nig-api--deployment) • [Lizenz](#-lizenz--datenquelle)

</div>

---

## 📖 Überblick

**TankApp** ist eine leichtgewichtige Web-App zum schnellen Auffinden der günstigsten Tankstellen in deiner Umgebung. Die Daten stammen direkt von der offiziellen **Markttransparenzstelle für Kraftstoffe (MTS-K)** des Bundeskartellamts, bezogen über die Schnittstelle von **Tankerkönig**.

Egal ob auf dem Weg zur Arbeit, vor der Urlaubsfahrt oder spontan unterwegs: TankApp liefert in Sekundenbruchteilen die aktuellen Preise für **Diesel**, **Super E10** und **Super E5** – inklusive Ersparnisrechner, Favoritenliste und integrierter Kartenansicht.

---

## ✨ Features

- ⚡ **Echtzeit-Preise**: Minutengenaue Preise für Diesel, Super E10 und Super E5.
- 🏆 **Preis-Highlighting**: Die günstigste Tankstelle im Umkreis wird automatisch hervorgehoben – inklusive Anzeige der genauen Ersparnis pro Liter.
- 🗺️ **Interaktive Karte & Listenansicht**:
  - Wechsle flexibel zwischen der übersichtlichen Tankstellen-Liste und der interaktiven **Leaflet-Karte** (inkl. Dark-Mode-Kartenstil, Marken-Badges, Status und Routen-Darstellung).
  - Lazy-Loading der Karten-Engine für extrem schnelle erste Ladezeiten.
- 🏷️ **Marken-Schnellfilter**: Filtere mit einem Klick (mit Wortgrenzen-Schutz) nach Tankstellenketten wie **Aral, Shell, JET, Total, Esso, HEM, AVIA und star** oder per Freitext nach Name, Straße, Ort und PLZ.
- ⭐ **Favoriten-Funktion**: Markiere häufig genutzte Tankstellen mit dem Sternsymbol und rufe sie jederzeit gefiltert ab (dauerhaft im `localStorage` gespeichert).
- 💰 **Sprit- & Ersparnisrechner**: Berechnet automatisch die Netto-Ersparnis (abzüglich Umweg-Spritkosten) im Vergleich zur nächstgelegenen geöffneten Tankstelle.
- 🔔 **Preisalarm / Wunschpreis**: Hinterlege deinen Zielpreis pro Liter für ein sofortiges In-App-Treffer-Banner plus optionale Browser-/PWA-Benachrichtigungen.
- 🧭 **1-Klick-Navigation**: Öffnet die Zielroute direkt in **Apple Maps** (Universal Link unter iOS) oder **Google Maps**.
- 📍 **GPS & Adresssuche**: Automatische Live-Standortermittlung per Browser-GPS, Speicherung des letzten Standorts sowie manuelle Ortssuche über den Serverless Geocoding-Proxy (`/api/geocode`).
- 🎚️ **Flexibler Suchradius & Routen-Modus**: Debounced Suchkreis von 1 km bis 25 km sowie Korridor-Suche entlang einer Luftlinien-Strecke.
- 🔄 **Pull-to-Refresh & Offline-Fallback**: Bequemes Herunterziehen zum Aktualisieren der Preise sowie automatische Anzeige zuletzt geladener Preise bei fehlender Netzverbindung.
- 📱 **Native PWA-Erfahrung**: 1-Klick-Installation auf Android/Desktop (`beforeinstallprompt`) sowie iOS-Homescreen-Anleitung.
- 🛡️ **Integrierte Vercel Serverless Proxies**: Schützen den Tankerkönig-API-Key serverseitig (`/api/stations`) und kapseln die Nominatim-Ortssuche (`/api/geocode`) mit Rate-Limiting, Edge-Caching und Security-Headern.
- 🧪 **Eingebauter Demo-Modus**: Teste die App sofort nach dem Klonen – auch ohne eigenen API-Key.

---

## 🛠️ Tech Stack

| Bereich | Technologie | Beschreibung |
| :--- | :--- | :--- |
| **Frontend** | [React 19](https://react.dev/) | Moderne Komponentenarchitektur mit React Hooks |
| **Sprache** | [TypeScript 7](https://www.typescriptlang.org/) | Typsicherheit und native Performance |
| **Build-Tool** | [Vite 8](https://vite.dev/) | Extrem schnelle HMR & schlanke Production-Bundles |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com/) | Responsives, hochmodernes Utility-First CSS |
| **Karten** | [Leaflet](https://leafletjs.com/) & CartoDB | Schnelle, interaktive Kartendarstellung ohne Google-Maps-Kosten |
| **Icons** | [Lucide React](https://lucide.dev/) | Konsistente, moderne Vektor-Icons |
| **Backend / Proxy** | [Vercel Serverless Functions](https://vercel.com/) | API-Key-Verschleierung & Edge Caching (`/api/stations`) |
| **Datenquelle** | [Tankerkönig API (MTS-K)](https://creativecommons.tankerkoenig.de/) | Offizielle deutsche Kraftstoff-Marktdaten |

---

## 🚀 Schnellstart (Lokal)

### Voraussetzungen
- [Node.js](https://nodejs.org/) (Version 26 empfohlen, passend zu `engines.node`)
- npm, pnpm oder yarn

### 1. Repository klonen & Abhängigkeiten installieren
```bash
git clone https://github.com/fotiosl/tankapp.git
cd tankapp
npm install
```

### 2. Konfiguration (Optional)
Kopiere die Vorlage für Umgebungsvariablen:
```bash
cp .env.example .env
```
Trage deinen Tankerkönig-API-Key ein:
```env
VITE_TANKERKOENIG_API_KEY=dein_persoenlicher_api_key
```
> **Hinweis:** Lässt du die Variable leer, startet die App automatisch im **Demo-Modus** mit realistischen Beispieldaten, damit du sofort die Benutzeroberfläche testen kannst.

### 3. Entwicklungsserver starten
```bash
npm run dev
```
Der Server startet standardmäßig auf `http://localhost:5173/` (mit `--host` auch im gesamten Heim-WLAN unter der lokalen IP erreichbar).

### 4. Qualitätssicherung & Build für Produktion
```bash
npm run typecheck      # TypeScript-Prüfung (tsc -b)
npm run lint           # Oxlint inkl. Type-Aware & A11y-Regeln
npm test               # Vitest Unit- & Integrationstests
npm run test:coverage  # Testabdeckung (V8 Coverage)
npm run build          # Produktions-Build
```

---

## 🔑 Tankerkönig API & Deployment

### API-Key erhalten
1. Gehe auf [https://creativecommons.tankerkoenig.de/](https://creativecommons.tankerkoenig.de/).
2. Klicke auf **„API-Key“** und registriere dich mit deiner E-Mail-Adresse.
3. Bestätige die Lizenzbedingungen der MTS-K (kostenfreie private Nutzung).
4. Nach Klick auf den Aktivierungslink erhältst du deinen persönlichen API-Key.

### Verwendung in der App
Der API-Key kann auf drei Wegen genutzt werden:
1. **In den App-Einstellungen**: Über das **Zahnrad-Symbol (Einstellungen)** oben rechts direkt im Browser / auf dem Smartphone eingeben (wird lokal im Browser gespeichert).
2. **In der lokalen `.env`**: Als `VITE_TANKERKOENIG_API_KEY=...` für die lokale Entwicklung.
3. **Auf Vercel (Empfohlen für Produktion)**: Als Umgebungsvariable `TANKERKOENIG_API_KEY` im Vercel Dashboard hinterlegen. Optional können zusätzliche CORS-Origins per `ALLOWED_ORIGINS` (kommasepariert) freigeschaltet werden. Dadurch greift das Frontend auf den sicheren Serverless Proxy `/api/stations` zu, ohne dass der Key im Client-Code exponiert wird.

### Deployment auf Vercel
Das Projekt ist vorkonfiguriert für [Vercel](https://vercel.com/):
1. Verknüpfe dein GitHub-Repository mit Vercel.
2. Füge unter **Project Settings > Environment Variables** hinzu:
   - Key: `TANKERKOENIG_API_KEY`
   - Value: `dein_tankerkoenig_api_key`
3. Klicke auf **Deploy** – fertig! Du erhältst eine verschlüsselte HTTPS-URL (z. B. `https://tankapp.vercel.app`), auf der auch die Geolocation-API auf Mobilgeräten sicher funktioniert.

---

## 📲 Auf dem iPhone installieren (PWA)

Die Web-App kann ohne Umweg über den App Store direkt auf dem iPhone-Homescreen abgelegt werden:

1. Öffne die deployte URL (z. B. `https://tankapp.vercel.app`) in **Safari** auf deinem iPhone.
2. Tippe in der unteren Safari-Leiste auf das **„Teilen“-Symbol** (Quadrat mit Pfeil nach oben).
3. Scrolle in der Liste nach unten und wähle **„Zum Home-Bildschirm“** (*Add to Home Screen*).
4. Tippe oben rechts auf **„Hinzufügen“**.
5. Die **TankApp** erscheint nun als vollwertige App auf deinem Startbildschirm und startet im Vollbildmodus ohne störende Browserleisten.

---

## 📂 Projektstruktur

```text
tankapp/
├── api/                     # Vercel Serverless Functions
│   ├── _shared.js           # Gemeinsame CORS-, Security- & Rate-Limit-Helfer
│   ├── stations.js          # Tankerkönig-Proxy mit Eingabevalidierung & Edge-Caching
│   └── geocode.js           # Nominatim-Proxy mit konformem User-Agent & 24h-Caching
├── public/                  # Statische Assets, Service Worker & PWA-Icons
├── tests/                   # Backend-Tests für Vercel Serverless Functions
├── src/
│   ├── components/          # React-UI-Komponenten (MapView & Modals lazy-loaded)
│   │   ├── AddressSearchBox.tsx # Wiederverwendbare Ortssuche
│   │   ├── ErrorBoundary.tsx    # Fehler-Auffangkomponente
│   │   ├── FuelSelector.tsx     # Kraftstoffauswahl (Diesel, E10, E5)
│   │   ├── Header.tsx           # Kopfzeile mit Status und Dialogen
│   │   ├── MapView.tsx          # Interaktive Leaflet-Karte (Light/Dark + Route)
│   │   ├── ModalShell.tsx       # Barrierefreie Dialog-Basis (Focus-Trap & Escape)
│   │   ├── PriceAlertModal.tsx  # Wunschpreis- & Alarmkonfiguration
│   │   ├── PWAInstallGuideModal.tsx # 1-Klick- & iOS-Installationsanleitung
│   │   ├── SearchAndFilters.tsx # Markenfilter, Sortierung & debounced Radius
│   │   ├── SettingsModal.tsx    # API-Key- & App-Einstellungen
│   │   └── StationCard.tsx      # Tankstellen-Karte mit Preisvergleich & Öffnungszeiten
│   ├── hooks/               # Custom React Hooks (Stations, Geolocation, Alerts, PWA, Theme)
│   ├── services/            # API-Abfragen, Proxy-Sync und Caching
│   ├── utils/               # Markenstyling, Formatierung & Sparrechner
│   ├── App.tsx              # Hauptanwendung
│   ├── main.tsx             # Einstiegspunkt, ErrorBoundary & SW-Registrierung
│   └── types.ts             # TypeScript Typdefinitionen
├── .github/workflows/ci.yml # GitHub Actions CI (Typecheck, Lint, Test, Build)
├── package.json
├── tsconfig.json
├── vercel.json              # Security-Header, SW-Caching & SPA-Rewrites
└── vite.config.ts           # Vite Konfiguration
```

---

## 📜 Lizenz & Datenquelle

- **Code:** Veröffentlicht unter der [MIT-Lizenz](LICENSE).
- **Kraftstoffdaten:** Bereitgestellt von [Tankerkönig](https://creativecommons.tankerkoenig.de/) unter den Bedingungen der [Creative Commons CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) Lizenz. Datenquelle ist die offizielle [Markttransparenzstelle für Kraftstoffe (MTS-K)](https://www.bundeskartellamt.de/DE/Wirtschaftsbereiche/Mineraloel/MTS-Kraftstoffe/mtskraftstoffe_node.html) des Bundeskartellamts.
