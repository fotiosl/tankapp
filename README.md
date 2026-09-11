# ⛽ TankApp - Spritpreise & Tankstellen (mehr-tanken Alternative für iOS)

Eine moderne, blitzschnelle Progressive Web App (PWA), die speziell für iPhones optimiert ist. Sie holt minutengenaue Spritpreise von der offiziellen Markttransparenzstelle für Kraftstoffe (MTS-K) via Tankerkönig.

---

## 📱 Features

- **Echtzeit-Spritpreise**: Diesel, Super E10 und Super E5.
- **Preis-Highlighting**: Günstigste Tankstelle im Suchkreis wird automatisch grün hervorgehoben („Günstigste“ & Cent-Differenz zu anderen Tankstellen).
- **Suchradius**: Standardmäßig **5 km**, flexibel einstellbar von 1 bis 25 km (maximales API-Limit).
- **Marken- & Namenssuche**: Sofortige Filterung nach Tankstellenketten (Aral, Shell, TotalEnergies, Jet, HEM, Avia, Star, freie Tankstellen usw.).
- **Live GPS & Ortssuche**: Automatische Standorterkennung auf dem iPhone + manuelle Suche nach jeder Stadt, Postleitzahl oder Adresse.
- **Listen- & Kartenansicht**: Umschaltung zwischen iOS-Kartenliste und interaktiver Leaflet-Karte mit Preis-Pins.
- **1-Klick-Navigation**: Öffnet mit einem Tipp die Route in Apple Maps (auf iOS) oder Google Maps.
- **iPhone PWA (Ohne App Store)**: Lässt sich direkt auf den iOS-Homescreen ablegen und startet im Vollbildmodus ohne Browserleisten.

---

## 🚀 Schnellstart auf dem PC

```bash
# Entwicklungsserver starten (erreichbar im gesamten Heim-WLAN):
npm run dev
```

Der Server bindet automatisch an alle Netzwerkadapter (`--host`).
Dein PC hat aktuell im Heimnetzwerk die IP:
`http://192.168.0.225:5173`

---

## 📲 Auf dem iPhone installieren (Ohne App Store)

1. Verbinde dein iPhone mit demselben **WLAN** wie deinen PC.
2. Öffne auf dem iPhone die App **Safari**.
3. Gib in die Adressleiste ein: `http://192.168.0.225:5173`
4. Tippe unten in der Leiste auf das **„Teilen“-Symbol** (Quadrat mit Pfeil nach oben).
5. Scrolle etwas herunter und wähle **„Zum Home-Bildschirm“**.
6. Tippe oben rechts auf **„Hinzufügen“**.
7. Fertig! Die **TankApp** liegt nun als vollwertiges App-Icon auf deinem iPhone-Homescreen und öffnet sich bei jedem Antippen wie eine App aus dem App Store.

---

## 🔑 Tankerkönig API-Key

Die App startet standardmäßig im **Demo-Modus**, damit du sofort alles ausprobieren kannst.

Für echte Live-Preise an allen deutschen Tankstellen:
1. Öffne [https://creativecommons.tankerkoenig.de/](https://creativecommons.tankerkoenig.de/)
2. Klicke auf **„API-Key“**, trage deine E-Mail ein und bestätige die Lizenz.
3. Klicke in der Bestätigungs-E-Mail auf den Link, um deinen Key zu erhalten.
4. **Trage den Key ein**:
   - Entweder direkt in der App auf deinem iPhone über das **Schlüssel-Symbol** oben rechts.
   - Oder erstelle eine Datei `.env` mit: `VITE_TANKERKOENIG_API_KEY=dein-key-hier`.

---

## 🌐 Für unterwegs im Auto (Kostenloses Hosting)

Um die App auch unterwegs im Mobilfunknetz (4G/5G) überall auf dem iPhone nutzen zu können:
1. Lade das Projekt auf GitHub hoch.
2. Verbinde das Repository kostenlos mit [Vercel](https://vercel.com) oder [Cloudflare Pages](https://pages.cloudflare.com).
3. Du erhältst innerhalb von 30 Sekunden eine feste HTTPS-URL (z.B. `https://tankapp.vercel.app`), auf der auch das iPhone-GPS unterwegs perfekt funktioniert!
