# SLD_TYPY_STACJI_KANONICZNE

Status: wiazacy dla aktualnego mapowania typow stacji.

Kod:
- `backend/src/enm/domain_operations.py`
- `frontend/src/ui/sld/StationFieldRenderer.tsx`
- `frontend/src/ui/sld/core/stationBlockBuilder.ts`

Wejscie backendowe:
- `insert_station_on_segment_sn` przyjmuje typy `A`, `B`, `C`, `D` oraz aliasy semantyczne,
- backend zapisuje semantyczny `station_type` oraz metadane `station_type_sn` i `station_type_semantic`.

Mapowanie aktywne:
- `A` -> `mv_lv`
- `B` -> `inline`
- `C` -> `branch`
- `D` -> `sectional`

Widok SLD:
- renderer stacji utrzymuje etykiety `TYPE_A`, `TYPE_B`, `TYPE_C`, `TYPE_D`,
- aktualne etykiety UI to odpowiednio stacja koncowa, przelotowa, odgalezna i sekcyjna.

Regula wiazaca:
- dokumentacja musi wskazywac, ze backend przechowuje typ semantyczny, a czesc renderu nadal posluguje sie oznaczeniami `TYPE_A-D`,
- nie wolno opisywac typologii stacji jako w pelni ujednoliconej we wszystkich warstwach, bo kod nadal utrzymuje oba poziomy nazewnictwa.
