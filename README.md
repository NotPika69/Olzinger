# Olzinger Haustechnik – Website

Maßgeschneiderter Neuauftritt für die **Olzinger GmbH** (Heizung · Sanitär · Lüftung · Regenerative Energien, Ergolding bei Landshut, seit 1985).

Statische Website ohne Build-Schritt: HTML, CSS und JavaScript, alle Bibliotheken und Schriften lokal eingebunden (kein CDN, keine Cookies, kein Tracking).

## Gestaltungsidee: „Wärmebild“

Haustechnik sieht man nicht – man spürt sie. Deshalb zeigt der Einstieg ein **live berechnetes Wärmebild** (WebGL) mit Isothermen wie bei einer Thermografie-Kamera. Die Maus wirkt als Wärmequelle, hinterlässt eine Wärmespur, und ein Messfadenkreuz zeigt die „Temperatur“ an. Durch die ganze Seite zieht sich das Motiv **warm trifft kalt** (Vorlauf/Rücklauf): Farbverlauf Blau → Magenta → Orange, das Logo als Thermostat-Skala, Bänder in Rücklauf-Blau und Vorlauf-Orange.

## Bereiche der Startseite

| Bereich | Besonderheit |
|---|---|
| Preloader | Thermostat-Bogen „dreht hoch“, Jahreszahl zählt von 1985 bis heute (nur beim ersten Aufruf) |
| Hero | WebGL-Wärmebild, Live-Öffnungsstatus (inkl. bayerischer Feiertage) |
| Bänder | Endlos-Laufschrift, reagiert auf Scroll-Tempo und -Richtung |
| Intro | Text „heizt sich“ Wort für Wort beim Scrollen auf |
| Leistungen | 5 gestapelte Karten (Sticky-Stack) mit animierten Illustrationen: Wärmepumpe, Heizkörper, Waschtisch, Wärmetauscher, Manometer |
| Energie-Haus | Interaktiver Hausschnitt: Wärmepumpe, Solarthermie, Speicher, Fußbodenheizung, Bad, Lüftung – mit fließenden Medien in den Leitungen |
| Heizungs-Finder | 4 Fragen → Empfehlung (Wärmepumpe / Pellets / Hybrid) mit Passungsbalken; Ergebnis lässt sich ins Kontaktformular übernehmen |
| Ablauf | Rohrleitung füllt sich beim Scrollen |
| Über uns | Zähler, Zeitleiste mit Zählwerk-Jahreszahl (1985 → heute), Geschäftsführung |
| Karriere | Ausbildung Anlagenmechaniker/in SHK, Initiativbewerbung |
| Kontakt | Kontaktkarten, Öffnungszeiten mit „Heute“-Markierung, Formular |
| Footer | Schriftzug „heizt auf“ beim Scrollen |

Außerdem: `impressum.html`, `datenschutz.html`, `404.html` („Kein Anschluss unter dieser Adresse“), weicher Seitenwechsel, SEO-Daten (Schema.org `HVACBusiness`, Open-Graph-Bild, Sitemap).

## Lokal ansehen

```bash
python3 -m http.server 8000
# dann http://localhost:8000 öffnen
```

`index.html` lässt sich auch direkt per Doppelklick öffnen; das Kontaktformular nutzt dann den E-Mail-Fallback.

## Veröffentlichen

Den kompletten Ordnerinhalt auf den Webspace laden (z. B. per FTP). Voraussetzungen:

- Beliebiger Webserver; für den direkten Formularversand **PHP 7.4+** mit funktionierender `mail()`-Funktion (`kontakt.php`).
- Ohne PHP funktioniert das Formular trotzdem: Es öffnet dann das E-Mail-Programm des Besuchers mit vorbereiteter Nachricht.
- `.htaccess` (Apache) setzt die 404-Seite, Caching und Sicherheits-Header. Bei anderen Servern einfach ignorieren.
- `404.html` nutzt absolute Pfade (`/assets/...`) – liegt die Seite in einem Unterordner, Pfade dort anpassen.

## Vor dem Livegang prüfen (TODO)

Die Firmendaten stammen aus öffentlich zugänglichen Quellen. Bitte bestätigen bzw. ergänzen:

- [ ] **Impressum:** Umsatzsteuer-ID und berufsrechtliche Angaben (Kammer, Berufsbezeichnung) – als Kommentar in `impressum.html` vorbereitet.
- [ ] **Datenschutz:** Hosting-Anbieter, Speicherdauer der Server-Logs, Vertrag zur Auftragsverarbeitung – als `TODO` in `datenschutz.html` markiert. Rechtstexte sind Entwürfe und ersetzen keine Rechtsberatung.
- [ ] **Inhalte:** Mitarbeiterzahl (≈ 25), Ausbildungsstart (September), Leistungsliste, Texte zur Karriere.
- [ ] **Formular:** In `kontakt.php` Empfänger/Absender prüfen (`RECIPIENT`, `SENDER`); einmal testweise absenden.
- [ ] Optional: echte Fotos (Team, Projekte, Bäder) ergänzen – die Illustrationen sind so gestaltet, dass sie auch ohne Fotos tragen.

## Struktur

```
index.html            Startseite
impressum.html        Impressum
datenschutz.html      Datenschutzerklärung
404.html              Fehlerseite
kontakt.php           Formularversand (optional, PHP)
assets/css/main.css   Design-System und alle Styles
assets/js/thermal.js  WebGL-Wärmebild
assets/js/main.js     Preloader, Smooth-Scroll, Navigation, Scroll-Animationen
assets/js/house.js    Energie-Haus (Tabs, Hotspots, Autoplay)
assets/js/finder.js   Heizungs-Finder (Bewertungslogik + Ergebnis)
assets/js/contact.js  Öffnungszeiten live, Feiertage, Kontaktformular
assets/vendor/        GSAP, ScrollTrigger, SplitText, Lenis (lokal)
assets/fonts/         Instrument Sans & Instrument Serif (OFL, lokal)
assets/img/           Favicon, Logo, Open-Graph-Bild
tools/og-template.html  Vorlage zum Neu-Rendern des Open-Graph-Bilds
```

## Anpassen

- **Farben, Abstände, Schriften:** Design-Tokens am Anfang von `assets/css/main.css` (`--warm`, `--cool`, `--ink`, `--paper` …).
- **Öffnungszeiten:** in `assets/js/contact.js` (`SCHEDULE`) sowie in `index.html` (Text und Schema.org-Daten).
- **Heizungs-Finder:** Gewichtung in `assets/js/finder.js` (`evaluate`), Texte in `TEXTS`.
- **Open-Graph-Bild:** `tools/og-template.html` im Browser öffnen (über einen lokalen Server) und einen Screenshot mit 1200 × 630 px als `assets/img/og-image.jpg` speichern.

## Qualität

- Barrierefreiheit: geprüft mit axe-core (WCAG 2.1 AA) – keine Befunde; Tastaturbedienung für Menü, Tabs und Finder; `prefers-reduced-motion` wird respektiert (keine Smooth-Scroll-, Preloader- oder Scroll-Animationen).
- Ohne JavaScript bleiben alle Inhalte sichtbar und nutzbar.
- Getestet in Chromium: Desktop (1366, 1440, 1920 px), Tablet (834 px) und Smartphone (390 px).

## Lizenzen

GSAP 3.15 (Standard „No Charge“ License), Lenis (MIT), Instrument Sans/Serif (SIL OFL 1.1) – Details in `assets/vendor/LICENSES.md` und `assets/fonts/`.
