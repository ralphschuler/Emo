# st7789-gfx2d

Ein kleines 2D-Grafik-Toolkit für den `ST7789`-Treiber.
Es bietet grundlegende Zeichenfunktionen wie Linien, Kreise,
gefüllte Polygone, Text-Rendering und ein tiles-basiertes
Dirty-Rendering.

## Entwicklung

Abhängigkeiten installieren:

```bash
bun install
```

Beispiel-Demo starten:

```bash
bun run index.ts
```

Die Demo zeigt bewegte Sprites und nutzt den `TileRenderer`,
um nur geänderte Bereiche des Bildschirms zu aktualisieren.

Dieses Projekt wurde mit `bun init` (v1.2.1) erstellt. [Bun](https://bun.sh)
ist eine schnelle JavaScript-Laufzeitumgebung und ein Toolkit.
