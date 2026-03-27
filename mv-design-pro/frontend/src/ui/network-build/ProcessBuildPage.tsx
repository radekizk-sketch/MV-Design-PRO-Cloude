/**
 * ProcessBuildPage — Strona budowy sieci renderowana dla route #network-build.
 *
 * Wyświetla komunikat informujący, że budowa sieci odbywa się
 * bezpośrednio w SLD z ProcessPanel jako panelem bocznym.
 *
 * BINDING: 100% PL etykiety.
 */

export function ProcessBuildPage() {
  return (
    <div
      className="flex flex-col items-center justify-center h-full p-8 text-center"
      data-testid="process-build-page"
    >
      <div className="max-w-md space-y-4">
        <svg
          className="w-16 h-16 mx-auto text-ind-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={1}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
          />
        </svg>
        <h2 className="text-lg font-semibold text-chrome-800">
          Budowa sieci SN
        </h2>
        <p className="text-sm text-chrome-600">
          Panel procesowy budowy sieci jest dostępny w lewym panelu nawigacji
          podczas pracy ze schematem jednokreskowym (SLD).
        </p>
        <p className="text-xs text-chrome-500">
          Przejdź do widoku schematu jednokreskowego, aby rozpocząć budowę sieci
          krok po kroku: od źródła zasilania GPZ, przez magistrale i stacje,
          po odgałęzienia, ringi i źródła OZE/BESS.
        </p>
        <a
          href="#"
          className="inline-block px-4 py-2 text-sm font-medium text-white bg-ind-600 rounded-ind hover:bg-ind-700 transition-colors"
        >
          Przejdź do schematu
        </a>
      </div>
    </div>
  );
}

export default ProcessBuildPage;
