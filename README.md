# ⛽ TankApp — Echtzeit-Spritpreise & Tankstellen-Finder

<div align="center">

![React 19](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6.x-646CFF?logo=vite&logoColor=white)
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
  - Wechsle flexibel zwischen der übersichtlichen Tankstellen-Liste und der interaktiven **Leaflet-Karte** mit Preis-Pins.
  - Detaillierte Popups mit Öffnungszeiten, Markenfarben und Direktnavigation.
- 🏷️ **Marken-Schnellfilter**: Filtere mit einem Klick nach Tankstellenketten wie **Aral, Shell, Jet, TotalEnergies, HEM, Esso, Avia, Star** oder freien Tankstellen.
- ⭐ **Favoriten-Funktion**: Markiere häufig genutzte Tankstellen mit dem Sternsymbol und rufe sie jederzeit gefiltert ab (dauerhaft im `localStorage` gespeichert).
- 💰 **Sprit- & Ersparnisrechner**: Berechne im Handumdrehen, wie viele Euro du bei einer vollen Tankfüllung (z. B. 50 Liter) gegenüber teureren Alternativen sparst.
- 🔔 **Preisalarm / Wunschpreis**: Hinterlege deinen Zielpreis pro Liter, um sofort zu sehen, ob Tanken sich aktuell lohnt.
- 🧭 **1-Klick-Navigation**: Öffnet die Zielroute direkt in **Apple Maps** (unter iOS) oder **Google Maps**.
- 📍 **GPS & Adresssuche**: Automatische Live-Standortermittlung per Browser-GPS oder manuelle Suche nach Postleitzahl, Ort oder Adresse.
- 🎚️ **Flexibler Suchradius**: Frei wählbarer Suchkreis von 1 km bis 25 km.
- 🔄 **Pull-to-Refresh**: Bequemes Herunterziehen auf dem Smartphone zum sofortigen Aktualisieren der Preise.
- 📱 **Native PWA-Erfahrung**: Lässt sich ohne App Store direkt auf dem iOS-Homescreen ablegen (Vollbildmodus, keine Browser-Adressleiste).
- 🛡️ **Integrierter Vercel Serverless Proxy**: Schützt den Tankerkönig-API-Key serverseitig vor Missbrauch und puffert Anfragen mit Edge-Caching (`Cache-Control: s-maxage=60`).
- 🧪 **Eingebauter Demo-Modus**: Teste die App sofort nach dem Klonen – auch ohne eigenen API-Key.

---

## 🛠️ Tech Stack

| Bereich | Technologie | Beschreibung |
| :--- | :--- | :--- |
| **Frontend** | [React 19](https://react.dev/) | Moderne Komponentenarchitektur mit React Hooks |
| **Sprache** | [TypeScript](https://www.typescriptlang.org/) | Typsicherheit und Wartbarkeit |
| **Build-Tool** | [Vite 6](https://vite.dev/) | Extrem schnelle HMR & schlanke Production-Bundles |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com/) | Responsives, hochmodernes Utility-First CSS |
| **Karten** | [Leaflet](https://leafletjs.com/) & CartoDB | Schnelle, interaktive Kartendarstellung ohne Google-Maps-Kosten |
| **Icons** | [Lucide React](https://lucide.dev/) | Konsistente, moderne Vektor-Icons |
| **Backend / Proxy** | [Vercel Serverless Functions](https://vercel.com/) | API-Key-Verschleierung & Edge Caching (`/api/stations`) |
| **Datenquelle** | [Tankerkönig API (MTS-K)](https://creativecommons.tankerkoenig.de/) | Offizielle deutsche Kraftstoff-Marktdaten |

---

## 🚀 Schnellstart (Lokal)

### Voraussetzungen
- [Node.js](https://nodejs.org/) (Version 18 oder neuer)
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

### 4. Build für Produktion
```bash
npm run build
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
1. **In den App-Einstellungen**: Über das **Schlüssel-Symbol** oben rechts direkt im Browser / auf dem Smartphone eingeben (wird lokal im Browser gespeichert).
2. **In der lokalen `.env`**: Als `VITE_TANKERKOENIG_API_KEY=...` für die lokale Entwicklung.
3. **Auf Vercel (Empfohlen für Produktion)**: Als Umgebungsvariable `TANKERKOENIG_API_KEY` im Vercel Dashboard hinterlegen. Dadurch greift das Frontend auf den sicheren Serverless Proxy `/api/stations` zu, ohne dass der Key im Client-Code exponiert wird.

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
│   └── stations.js          # API-Proxy mit Rate-Limiting & Caching
├── public/                  # Statische Assets & PWA-Icons
├── src/
│   ├── assets/              # Bilder und SVGs
│   ├── components/          # React-UI-Komponenten
│   │   ├── FuelSelector.tsx # Kraftstoffauswahl (Diesel, E10, E5)
│   │   ├── Header.tsx       # Kopfzeile mit Status und Dialogen
│   │   ├── MapView.tsx      # Interaktive Leaflet-Karte mit Pins
│   │   ├── PriceAlertModal.tsx # Wunschpreis- & Alarmkonfiguration
│   │   ├── PWAInstallGuideModal.tsx # Schritt-für-Schritt PWA-Anleitung
│   │   ├── SearchAndFilters.tsx # Markenfilter, Sortierung & Radius
│   │   ├── SettingsModal.tsx    # API-Key- & App-Einstellungen
│   │   └── StationCard.tsx  # Tankstellen-Karte mit Preisvergleich
│   ├── hooks/               # Custom React Hooks (z.B. Pull-to-Refresh)
│   ├── services/            # API-Abfragen und Demo-Fallback-Logik
│   ├── utils/               # Markenstyling, Formatierung & Sparrechner
│   ├── App.tsx              # Hauptanwendung & State-Management
│   ├── main.tsx             # Einstiegspunkt
│   └── types.ts             # TypeScript Typdefinitionen
├── package.json
├── tsconfig.json
├── vercel.json              # Vercel Rewrites & Routing
└── vite.config.ts           # Vite Konfiguration
```

---

## 📜 Lizenz & Datenquelle

- **Code:** Veröffentlicht unter der [MIT-Lizenz](LICENSE).
- **Kraftstoffdaten:** Bereitgestellt von [Tankerkönig](https://creativecommons.tankerkoenig.de/) unter den Bedingungen der [Creative Commons CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) Lizenz. Datenquelle ist die offizielle [Markttransparenzstelle für Kraftstoffe (MTS-K)](https://www.bundeskartellamt.de/DE/Wirtschaftsbereiche/Mineraloel/MTS-Kraftstoffe/mtskraftstoffe_node.html) des Bundeskartellamts.
