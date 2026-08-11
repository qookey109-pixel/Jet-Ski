# V0.9.5 Open Sea Mode

V0.9.5 adds a switchable world layer on top of the existing ocean/runtime stack.

## Modes

- `open-sea`: default. Uses V0.9.3 irregular infinite ocean and floating origin. Lake shoreline rendering and collision are disabled.
- `sun-moon-lake`: enables the V0.9.4.x OSM Sun Moon Lake layer and shoreline collision.

## Important behavior

- Open Sea and Lake keep separate position snapshots when switching.
- The OSM lake may continue loading/caching in the background while Open Sea is active.
- If an async OSM load finishes while Open Sea is active, V0.9.5 disables the lake layer before rendering and restores the Open Sea pose.
- Core ocean/hydrodynamics files are not rewritten by this version.

## Next

Replace mode-only separation with a real coastal transition prototype: Taiwan shoreline -> nearshore -> open sea, streamed by chunks/tiles.
