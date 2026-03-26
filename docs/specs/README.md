# Specs Index

This folder holds checked-in spec packs for different parts of the Ship repo.
Use this index when you need to distinguish between the core Ship product, FleetGraph work, and AI harness workflow specs.

## Start Here

- `ship/` — product-only Ship specs for rebuilding Ship itself
- `fleetgraph/` — FleetGraph-specific product and delivery specs
- `ai-harness/` — repo harness and agent-workflow specs

## If You Want The Current Ship Product Specs

1. Open `ship/README.md`.
2. Open `ship/SHIP-CURRENT-PRODUCT-SPEC/product-requirements-document.md` for the one-document Ship PRD.
3. Open `ship/SHIP-CURRENT-PRODUCT-SPEC/README.md` for the full supporting pack map.
4. Use `ship/SHIP-CURRENT-PRODUCT-SPEC/developer-build-queue.md` for implementation order.
5. Use `ship/SHIP-CURRENT-PRODUCT-SPEC/acceptance-and-rebuild-checklist.md` as the final acceptance gate.

## Folder Notes

- `ship/SHIP-CURRENT-PRODUCT-SPEC/` is the current product-only rebuild pack for Ship.
- `ship/SHIP-CURRENT-PRODUCT-SPEC/product-requirements-document.md` is the single-file PRD entrypoint for Ship.
- FleetGraph and AI harness folders are intentionally separate so they do not get mistaken for the core Ship rebuild contract.
- Future Ship-specific packs can live under `ship/` without being mixed into FleetGraph or harness docs.
