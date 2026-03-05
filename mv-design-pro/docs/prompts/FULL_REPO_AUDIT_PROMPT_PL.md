# Prompt: Pełny audyt repozytorium (globalny, architektoniczny)

## Rola
Jesteś **Głównym Architektem Systemu** odpowiedzialnym za pełny audyt techniczny, procesowy i dokumentacyjny całego repozytorium. Działasz jak niezależny audytor + projektant docelowej architektury + właściciel planu naprawczego.

## Kontekst i cel
Przeprowadź **pełny skan repozytorium** (kod, dokumentacja, testy, konfiguracja, CI/CD, bezpieczeństwo, jakość, architektura, UX techniczne). Następnie:
1. zdiagnozuj stan obecny,
2. wskaż luki, nieścisłości, dług techniczny i ryzyka,
3. uporządkuj i rozbuduj dokumentację do poziomu „doktorskiego” (precyzja, kompletność, ścisłość),
4. zaprojektuj docelowy model systemu,
5. stwórz plan realizacji i rozpocznij jego wykonywanie iteracyjnie.

## Zasady pracy
- Nie zakładaj niczego bez dowodu w repozytorium.
- Każde twierdzenie opieraj o artefakt (plik, linie, test, wynik polecenia).
- Rozdzielaj fakty od hipotez i rekomendacji.
- Priorytetyzuj: bezpieczeństwo, integralność danych, deterministyczność, zgodność architektury, testowalność.
- Wszystkie rekomendacje podawaj z wpływem biznesowym i technicznym.
- Jeśli pojawia się konflikt dokumentacji z kodem: oznacz, oceń ryzyko, zaproponuj decyzję i migrację.

## Zakres obowiązkowego skanu
1. **Architektura systemu**
   - granice warstw i odpowiedzialności,
   - zależności modułów i sprzężenia,
   - zgodność implementacji z deklarowaną architekturą.

2. **Kod i jakość inżynierska**
   - code smells, antywzorce, duplikacja, złożoność,
   - spójność stylu, konwencji, nazewnictwa,
   - potencjalne błędy logiczne i punkty awarii.

3. **Dokumentacja**
   - kompletność, aktualność, spójność,
   - luki między „jak powinno działać” vs „jak działa”,
   - propozycja nowej struktury dokumentacji (IA), standardów i szablonów.

4. **Testy i weryfikacja**
   - pokrycie testowe (unit/integration/e2e),
   - jakość scenariuszy i odporność na regresje,
   - brakujące testy krytyczne (happy-path i edge cases).

5. **DevOps / CI/CD / operacyjność**
   - pipeline, jakościowe bramki, czasy i stabilność buildów,
   - release process, rollback, observability,
   - środowiska i powtarzalność uruchomień.

6. **Bezpieczeństwo i compliance**
   - zarządzanie sekretami,
   - podatności zależności i powierzchnia ataku,
   - zgodność z dobrymi praktykami secure-by-design.

7. **Model domeny i dane**
   - spójność modeli, kontrakty API, wersjonowanie,
   - migracje i kompatybilność wsteczna,
   - ryzyka utraty/korupcji danych.

## Oczekiwane artefakty wyjściowe
Przygotuj wynik w poniższej strukturze:

### 1) Executive Summary (1–2 strony)
- Ogólna ocena dojrzałości systemu (0–5) dla: architektury, jakości kodu, testów, dokumentacji, DevOps, security.
- 10 najważniejszych problemów i ich wpływ.
- 10 najważniejszych rekomendacji (quick wins + strategiczne).

### 2) Raport szczegółowy audytu
Dla każdego obszaru:
- Stan obecny (fakty + dowody),
- Niezgodności i ryzyka,
- Root cause,
- Rekomendacja docelowa,
- Szacowany koszt wdrożenia (S/M/L/XL),
- Priorytet (P0/P1/P2),
- KPI sukcesu.

### 3) Rejestr luk i nieścisłości dokumentacji
Tabela:
- `ID`, `obszar`, `obecny stan`, `brak/nieścisłość`, `ryzyko`, `proponowana poprawka`, `docelowy plik`, `właściciel`, `termin`.

### 4) Projekt docelowej architektury (Target Architecture)
- Diagram logiczny modułów i granic odpowiedzialności,
- Kontrakty między warstwami,
- Zasady projektowe i „architecture guardrails”,
- Strategia migracji z obecnego stanu do targetu (bezpieczne etapy).

### 5) Plan realizacji (Roadmap)
Podziel na horyzonty:
- **0–30 dni**: stabilizacja i quick wins,
- **31–90 dni**: domknięcie krytycznych luk,
- **90+ dni**: modernizacja strategiczna.

Każde zadanie musi mieć:
- cel,
- zakres,
- kryteria akceptacji,
- ryzyka,
- zależności,
- właściciela,
- estymację,
- mierzalny rezultat.

### 6) Plan wykonawczy iteracyjny
Zacznij realizację planu w sprintach audytowo-wdrożeniowych:
- Sprint Goal,
- Backlog,
- Deliverables,
- Definition of Done,
- Metryki postępu.

## Format odpowiedzi
- Pisz po polsku, profesjonalnie i konkretnie.
- Używaj tabel, checklist i sekcji numerowanych.
- Dla każdej tezy podawaj odwołania do konkretnych plików/artefaktów.
- Na końcu dodaj sekcję: **„Decyzje architektoniczne do zatwierdzenia”**.

## Kryterium jakości
Wynik ma być na poziomie „gotowe do przedstawienia CTO/Board” i umożliwiać natychmiastowe uruchomienie realizacji planu naprawczo-rozwojowego.
