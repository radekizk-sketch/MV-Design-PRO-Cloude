"""
Domain Operations Models — modele Pydantic v2 dla systemu operacji domenowych.

Kanoniczne modele envelope'ów, odpowiedzi, payloadów operacji
oraz typów pomocniczych stosowanych w warstwie domenowej ENM.

Wszystkie modele używają Pydantic v2 BaseModel z konfiguracją frozen
(niemutowalność instancji, bezpieczne hashowanie).
"""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel


# ---------------------------------------------------------------------------
# Konfiguracja bazowa — frozen dla wszystkich modeli
# ---------------------------------------------------------------------------


class _FrozenBase(BaseModel):
    """Baza z konfiguracją frozen — niemutowalne instancje."""

    model_config = {"frozen": True}


# ===========================================================================
# 1. ENVELOPE — wspólna koperta wywołania operacji domenowej
# ===========================================================================


class DomainOpPayload(_FrozenBase):
    """Payload operacji domenowej.

    Zawiera kanoniczną nazwę operacji, klucz idempotentności
    oraz właściwe dane (payload) operacji.
    """

    name: str
    """Kanoniczna nazwa operacji (np. 'add_grid_source_sn')."""

    idempotency_key: str
    """Klucz idempotentności — zapewnia jednokrotne wykonanie."""

    payload: dict[str, Any]
    """Dane specyficzne dla danej operacji."""


class DomainOpEnvelope(_FrozenBase):
    """Wspólny envelope wywołania operacji domenowej.

    Identyfikuje projekt, bazowy snapshot modelu
    oraz operację do wykonania.
    """

    project_id: str
    """Identyfikator projektu."""

    snapshot_base_hash: str
    """Hash snapshotu bazowego — zapewnia spójność optimistic concurrency."""

    operation: DomainOpPayload
    """Payload operacji do wykonania."""


# ===========================================================================
# 2. RESPONSE — odpowiedź operacji domenowej
# ===========================================================================


class ReadinessBlocker(_FrozenBase):
    """Blokujący problem gotowości — uniemożliwia wykonanie obliczeń."""

    code: str
    """Kod błędu (np. 'MISSING_SOURCE', 'NO_CATALOG')."""

    severity: Literal["BLOKUJACE"] = "BLOKUJACE"
    """Poziom ważności — zawsze BLOKUJACE."""

    message_pl: str
    """Komunikat w języku polskim."""

    element_ref: str | None = None
    """Opcjonalna referencja do elementu, którego dotyczy problem."""


class ReadinessWarning(_FrozenBase):
    """Ostrzeżenie gotowości — nie blokuje, ale wymaga uwagi."""

    code: str
    """Kod ostrzeżenia (np. 'MISSING_CT', 'SHORT_SEGMENT')."""

    severity: Literal["OSTRZEZENIE"] = "OSTRZEZENIE"
    """Poziom ważności — zawsze OSTRZEZENIE."""

    message_pl: str
    """Komunikat w języku polskim."""

    element_ref: str | None = None
    """Opcjonalna referencja do elementu, którego dotyczy ostrzeżenie."""


class ReadinessInfo(_FrozenBase):
    """Informacja o gotowości modelu do obliczeń.

    Zawiera flagę gotowości oraz listy blokerów i ostrzeżeń.
    """

    ready: bool
    """True jeśli model jest gotowy do obliczeń (brak blokerów)."""

    blockers: list[ReadinessBlocker] = []
    """Lista problemów blokujących obliczenia."""

    warnings: list[ReadinessWarning] = []
    """Lista ostrzeżeń (nie blokują obliczeń)."""


class FixActionItem(_FrozenBase):
    """Deterministyczna sugestia naprawcza dla problemu walidacyjnego.

    Opisuje akcję UI do podjęcia — nie modyfikuje modelu.
    """

    code: str
    """Kod akcji naprawczej (np. 'FIX_MISSING_CATALOG')."""

    action_type: Literal[
        "OPEN_MODAL",
        "NAVIGATE_TO_ELEMENT",
        "SELECT_CATALOG",
        "ADD_MISSING_DEVICE",
    ]
    """Typ akcji UI do wykonania."""

    element_ref: str | None = None
    """Opcjonalna referencja do elementu docelowego."""

    panel: str | None = None
    """Panel UI, który należy otworzyć."""

    step: str | None = None
    """Krok kreatora, do którego należy przejść."""

    focus: str | None = None
    """Pole formularza, na które należy ustawić fokus."""

    message_pl: str = ""
    """Komunikat dla użytkownika w języku polskim."""


class ChangeSet(_FrozenBase):
    """Zestaw zmian wykonanych przez operację domenową.

    Identyfikatory elementów utworzonych, zmodyfikowanych i usuniętych.
    """

    created_element_ids: list[str] = []
    """Identyfikatory nowo utworzonych elementów."""

    updated_element_ids: list[str] = []
    """Identyfikatory zmodyfikowanych elementów."""

    deleted_element_ids: list[str] = []
    """Identyfikatory usuniętych elementów."""


class SelectionHint(_FrozenBase):
    """Podpowiedź dla UI — który element zaznaczyć po operacji."""

    element_id: str | None = None
    """Identyfikator elementu do zaznaczenia."""

    element_type: str | None = None
    """Typ elementu (np. 'bus', 'branch', 'transformer')."""

    zoom_to: bool = True
    """Czy przybliżyć widok do zaznaczonego elementu."""


class AuditEntry(_FrozenBase):
    """Wpis śladu audytowego operacji.

    Każdy krok operacji generuje jeden wpis.
    """

    step: int
    """Numer kroku operacji (1-based)."""

    action: str
    """Opis wykonanej akcji."""

    element_id: str | None = None
    """Opcjonalny identyfikator elementu, na którym wykonano akcję."""

    detail: str = ""
    """Dodatkowe szczegóły (np. wartości parametrów)."""


class DomainEvent(_FrozenBase):
    """Zdarzenie domenowe emitowane przez operację.

    Zdarzenia opisują co się zmieniło w modelu —
    służą do reaktywnej aktualizacji widoków.
    """

    event_seq: int
    """Numer sekwencyjny zdarzenia w ramach operacji."""

    event_type: str
    """Typ zdarzenia (np. 'SEGMENT_SPLIT', 'STATION_CREATED')."""

    element_id: str | None = None
    """Opcjonalny identyfikator elementu, którego dotyczy zdarzenie."""

    detail: str = ""
    """Dodatkowe szczegóły zdarzenia."""


class DomainOpResponse(_FrozenBase):
    """Odpowiedź operacji domenowej.

    Zawiera pełny stan modelu po operacji, widoki logiczne,
    informacje o gotowości, sugestie naprawcze, zmiany,
    ślad audytowy oraz zdarzenia domenowe.
    """

    snapshot: dict[str, Any]
    """Pełny snapshot modelu po wykonaniu operacji."""

    logical_views: dict[str, Any] = {}
    """Widoki logiczne (np. drzewo topologiczne, widok magistrali)."""

    readiness: ReadinessInfo
    """Informacja o gotowości modelu do obliczeń."""

    fix_actions: list[FixActionItem] = []
    """Lista sugestii naprawczych dla wykrytych problemów."""

    changes: ChangeSet
    """Zestaw zmian wykonanych przez operację."""

    selection_hint: SelectionHint | None = None
    """Podpowiedź dla UI — co zaznaczyć po operacji."""

    audit_trail: list[AuditEntry] = []
    """Ślad audytowy — kroki wykonane w ramach operacji."""

    domain_events: list[DomainEvent] = []
    """Zdarzenia domenowe emitowane przez operację."""


# ===========================================================================
# 3. InsertAt — kanoniczny model pozycji wstawienia
# ===========================================================================


class AnchorValue(_FrozenBase):
    """Wartość kotwicząca — pozycja względem istniejącego elementu.

    Używana gdy mode='ANCHOR' w InsertAt.
    """

    anchor_id: str
    """Identyfikator elementu kotwiczącego."""

    offset_m: float
    """Przesunięcie od kotwicy w metrach."""


class InsertAt(_FrozenBase):
    """Kanoniczny model pozycji wstawienia elementu na segmencie.

    Trzy tryby:
    - RATIO: pozycja jako ułamek długości segmentu (0.0–1.0)
    - ODLEGLOSC_OD_POCZATKU_M: odległość od początku segmentu w metrach
    - ANCHOR: pozycja względem istniejącego elementu (AnchorValue)
    """

    mode: Literal["RATIO", "ODLEGLOSC_OD_POCZATKU_M", "ANCHOR"]
    """Tryb określania pozycji wstawienia."""

    value: float | AnchorValue
    """Wartość pozycji — float dla RATIO/ODLEGLOSC, AnchorValue dla ANCHOR."""


# ===========================================================================
# 4. Station Field Models — modele pól stacji SN/nN
# ===========================================================================


class CatalogBindings(_FrozenBase):
    """Powiązania katalogowe pola stacji.

    Referencje do pozycji katalogowych dla linii, łączników,
    przekładników prądowych i napięciowych.
    """

    line_catalog_ref: str | None = None
    """Referencja katalogowa linii/kabla."""

    switch_catalog_ref: str | None = None
    """Referencja katalogowa łącznika."""

    ct_catalog_ref: str | None = None
    """Referencja katalogowa przekładnika prądowego (CT)."""

    vt_catalog_ref: str | None = None
    """Referencja katalogowa przekładnika napięciowego (VT)."""


class SNFieldSpec(_FrozenBase):
    """Specyfikacja pola SN (średniego napięcia).

    Opisuje rolę pola, plan aparatury oraz powiązania katalogowe.
    """

    field_role: Literal[
        "LINIA_IN",
        "LINIA_OUT",
        "LINIA_ODG",
        "TRANSFORMATOROWE",
        "SPRZEGLO",
    ]
    """Rola pola SN w rozdzielnicy."""

    apparatus_plan: list[str]
    """Plan aparatury pola (np. ['LACZNIK_GLOWNY_SN', 'PRZEKLADNIK_PRADOWY'])."""

    catalog_bindings: CatalogBindings | None = None
    """Opcjonalne powiązania katalogowe aparatury."""


class TransformerSpec(_FrozenBase):
    """Specyfikacja transformatora SN/nN w stacji.

    Opisuje typ, katalog i parametry transformatora.
    """

    create: Literal[True] = True
    """Flaga utworzenia transformatora (zawsze True)."""

    transformer_catalog_ref: str | None = None
    """Referencja do pozycji katalogowej transformatora."""

    model_type: Literal["DWU_UZWOJENIOWY"] = "DWU_UZWOJENIOWY"
    """Typ modelu transformatora."""

    tap_changer_present: bool = False
    """Czy transformator posiada przełącznik zaczepów."""


class NNFeederSpec(_FrozenBase):
    """Specyfikacja odpływu nN (niskiego napięcia).

    Opisuje rolę odpływu oraz powiązania katalogowe.
    """

    feeder_role: Literal[
        "ODPLYW_NN",
        "ODPLYW_REZERWOWY",
        "ZRODLO_NN_PV",
        "ZRODLO_NN_BESS",
    ]
    """Rola odpływu nN."""

    catalog_bindings: CatalogBindings | None = None
    """Opcjonalne powiązania katalogowe odpływu."""


class NNBlockSpec(_FrozenBase):
    """Minimalny blok nN (niskiego napięcia).

    Opisuje konfigurację szyny nN, wyłącznika głównego
    oraz odpływów nN w stacji.
    """

    create_nn_bus: Literal[True] = True
    """Flaga utworzenia szyny nN (zawsze True)."""

    main_breaker_nn: Literal[True] = True
    """Flaga utworzenia wyłącznika głównego nN (zawsze True)."""

    outgoing_feeders_nn_count: int = 1
    """Liczba odpływów nN (>= 1)."""

    outgoing_feeders_nn: list[NNFeederSpec] = []
    """Specyfikacje poszczególnych odpływów nN."""


class StationOptions(_FrozenBase):
    """Opcje tworzenia stacji SN/nN.

    Flagi sterujące automatycznym tworzeniem elementów stacji.
    """

    create_transformer_field: bool = True
    """Czy utworzyć pole transformatorowe."""

    create_default_fields: bool = True
    """Czy utworzyć domyślne pola SN."""

    create_nn_bus: bool = True
    """Czy utworzyć szynę nN."""


# ===========================================================================
# 5. Operation-specific payloads — payloady operacji domenowych
# ===========================================================================


class AddGridSourceSNPayload(_FrozenBase):
    """Payload operacji: add_grid_source_sn.

    Dodaje źródło zasilania sieciowego SN (punkt zasilania z systemu).
    """

    source_name: str | None = None
    """Opcjonalna nazwa źródła zasilania."""

    bus_name: str | None = None
    """Opcjonalna nazwa szyny zasilającej."""

    voltage_kv: float
    """Napięcie znamionowe [kV]."""

    sk3_mva: float | None = None
    """Moc zwarciowa trójfazowa [MVA]."""

    ik3_ka: float | None = None
    """Prąd zwarciowy trójfazowy [kA]."""

    rx_ratio: float | None = None
    """Stosunek R/X impedancji zwarciowej."""

    pozycja_widokowa: dict[str, Any] | None = None
    """Pozycja elementu na schemacie jednokreskowym (SLD)."""


class SegmentSpec(_FrozenBase):
    """Specyfikacja segmentu linii/kabla.

    Opisuje rodzaj, długość i katalog segmentu.
    """

    rodzaj: Literal["KABEL", "LINIA_NAPOWIETRZNA"]
    """Rodzaj segmentu — kabel lub linia napowietrzna."""

    dlugosc_m: float
    """Długość segmentu [m]."""

    catalog_ref: str | None = None
    """Opcjonalna referencja katalogowa."""

    name: str | None = None
    """Opcjonalna nazwa segmentu."""


class ContinueTrunkSegmentSNPayload(_FrozenBase):
    """Payload operacji: continue_trunk_segment_sn.

    Kontynuuje budowę magistrali SN o kolejny segment.
    """

    trunk_id: str
    """Identyfikator magistrali."""

    from_terminal_id: str
    """Identyfikator terminala, od którego kontynuować."""

    segment: SegmentSpec
    """Specyfikacja nowego segmentu."""

    parametry_jawne: dict[str, Any] = {}
    """Jawnie podane parametry elektryczne (tryb EKSPERT)."""

    pozycja_widokowa: dict[str, Any] | None = None
    """Pozycja elementu na schemacie jednokreskowym (SLD)."""


class StationSpec(_FrozenBase):
    """Specyfikacja stacji SN/nN.

    Opisuje typ, rolę, nazwę oraz napięcia stacji.
    """

    station_type: Literal["A", "B", "C", "D"]
    """Typ stacji (A/B/C/D wg klasyfikacji)."""

    station_role: Literal["STACJA_SN_NN"] = "STACJA_SN_NN"
    """Rola stacji — stacja transformatorowa SN/nN."""

    station_name: str | None = None
    """Opcjonalna nazwa stacji."""

    sn_voltage_kv: float
    """Napięcie strony SN [kV]."""

    nn_voltage_kv: float
    """Napięcie strony nN [kV]."""


class TrunkRef(_FrozenBase):
    """Referencja do magistrali — kontekst wstawienia stacji.

    Opcjonalnie wskazuje magistralę i terminale
    w kontekście wstawienia stacji na segmencie.
    """

    trunk_id: str | None = None
    """Identyfikator magistrali."""

    terminal_from_id: str | None = None
    """Identyfikator terminala początkowego."""

    terminal_to_id: str | None = None
    """Identyfikator terminala końcowego."""


class InsertStationOnSegmentSNPayload(_FrozenBase):
    """Payload operacji: insert_station_on_segment_sn.

    Wstawia stację transformatorową SN/nN na istniejącym segmencie.
    Segment zostaje rozdzielony, stacja powstaje w punkcie podziału.
    """

    segment_id: str
    """Identyfikator segmentu, na którym wstawiana jest stacja."""

    insert_at: InsertAt
    """Pozycja wstawienia na segmencie."""

    station: StationSpec
    """Specyfikacja tworzonej stacji."""

    sn_fields: list[SNFieldSpec]
    """Lista pól SN rozdzielnicy."""

    transformer: TransformerSpec
    """Specyfikacja transformatora SN/nN."""

    nn_block: NNBlockSpec
    """Specyfikacja bloku nN."""

    options: StationOptions
    """Opcje tworzenia stacji."""

    trunk_ref: TrunkRef | None = None
    """Opcjonalna referencja do magistrali."""


class StartBranchSegmentSNPayload(_FrozenBase):
    """Payload operacji: start_branch_segment_sn.

    Rozpoczyna nowe odgałęzienie (branch) od istniejącej szyny.
    """

    from_bus_ref: str
    """Referencja szyny, od której startuje odgałęzienie."""

    from_port: str | None = None
    """Opcjonalny port na szynie źródłowej."""

    segment: SegmentSpec
    """Specyfikacja pierwszego segmentu odgałęzienia."""

    pozycja_widokowa: dict[str, Any] | None = None
    """Pozycja elementu na schemacie jednokreskowym (SLD)."""


class InsertSectionSwitchSNPayload(_FrozenBase):
    """Payload operacji: insert_section_switch_sn.

    Wstawia łącznik sekcyjny (rozłącznik/wyłącznik) na segmencie.
    """

    segment_id: str
    """Identyfikator segmentu, na którym wstawiany jest łącznik."""

    insert_at: InsertAt
    """Pozycja wstawienia na segmencie."""

    switch_type: Literal["ROZLACZNIK", "WYLACZNIK"] = "ROZLACZNIK"
    """Typ łącznika — rozłącznik lub wyłącznik."""

    switch_name: str | None = None
    """Opcjonalna nazwa łącznika."""

    normal_state: Literal["closed", "open"] = "closed"
    """Stan normalny łącznika."""


class ConnectSecondaryRingSNPayload(_FrozenBase):
    """Payload operacji: connect_secondary_ring_sn.

    Łączy dwie szyny segmentem zamykającym pierścień SN.
    """

    from_bus_ref: str
    """Referencja szyny początkowej pierścienia."""

    to_bus_ref: str
    """Referencja szyny końcowej pierścienia."""

    segment: SegmentSpec | None = None
    """Opcjonalna specyfikacja segmentu łączącego."""

    ring_name: str | None = None
    """Opcjonalna nazwa pierścienia."""


class SetNormalOpenPointPayload(_FrozenBase):
    """Payload operacji: set_normal_open_point.

    Ustawia punkt normalnie otwarty (NOP) na łączniku w pierścieniu.
    """

    switch_ref: str
    """Referencja łącznika, który ma być punktem NOP."""

    corridor_ref: str | None = None
    """Opcjonalna referencja magistrali (korytarza)."""


class AddTransformerSNNNPayload(_FrozenBase):
    """Payload operacji: add_transformer_sn_nn.

    Dodaje transformator SN/nN między istniejącymi szynami.
    """

    hv_bus_ref: str
    """Referencja szyny strony górnego napięcia (SN)."""

    lv_bus_ref: str
    """Referencja szyny strony dolnego napięcia (nN)."""

    transformer_catalog_ref: str | None = None
    """Opcjonalna referencja katalogowa transformatora."""

    sn_mva: float | None = None
    """Moc znamionowa [MVA]."""

    uhv_kv: float | None = None
    """Napięcie znamionowe strony górnej [kV]."""

    ulv_kv: float | None = None
    """Napięcie znamionowe strony dolnej [kV]."""

    uk_percent: float | None = None
    """Napięcie zwarcia [%]."""

    pk_kw: float | None = None
    """Straty obciążeniowe [kW]."""

    station_ref: str | None = None
    """Opcjonalna referencja stacji, do której należy transformator."""


class AssignCatalogToElementPayload(_FrozenBase):
    """Payload operacji: assign_catalog_to_element.

    Przypisuje pozycję katalogową do istniejącego elementu modelu.
    """

    element_ref: str
    """Referencja elementu, do którego przypisywany jest katalog."""

    catalog_item_id: str
    """Identyfikator pozycji katalogowej."""

    catalog_item_version: str | None = None
    """Opcjonalna wersja pozycji katalogowej."""


class UpdateElementParametersPayload(_FrozenBase):
    """Payload operacji: update_element_parameters.

    Aktualizuje parametry istniejącego elementu modelu.
    """

    element_ref: str
    """Referencja elementu do aktualizacji."""

    parameters: dict[str, Any]
    """Słownik parametrów do ustawienia."""

    reason: str | None = None
    """Opcjonalny powód zmiany (audyt)."""


# ===========================================================================
# 6. CANONICAL OPERATION NAMES — kanoniczne nazwy operacji
# ===========================================================================


CANONICAL_OPS: set[str] = {
    "add_grid_source_sn",
    "continue_trunk_segment_sn",
    "insert_station_on_segment_sn",
    "start_branch_segment_sn",
    "insert_section_switch_sn",
    "connect_secondary_ring_sn",
    "set_normal_open_point",
    "add_transformer_sn_nn",
    "assign_catalog_to_element",
    "update_element_parameters",
}
"""Zbiór kanonicznych nazw operacji domenowych."""


ALIAS_MAP: dict[str, str] = {
    "add_trunk_segment_sn": "continue_trunk_segment_sn",
    "add_branch_segment_sn": "start_branch_segment_sn",
    "start_branch_from_port": "start_branch_segment_sn",
    "insert_station_on_trunk_segment_sn": "insert_station_on_segment_sn",
    "insert_station_on_trunk_segment": "insert_station_on_segment_sn",
    "connect_ring_sn": "connect_secondary_ring_sn",
    "connect_secondary_ring": "connect_secondary_ring_sn",
}
"""Mapa aliasów operacji — mapowanie alternatywnych nazw na kanoniczne."""


DOMAIN_EVENT_TYPES: list[str] = [
    "SEGMENT_SPLIT",
    "CUT_NODE_CREATED",
    "STATION_CREATED",
    "PORTS_CREATED",
    "FIELDS_CREATED_SN",
    "DEVICES_CREATED_SN",
    "TR_CREATED",
    "BUS_NN_CREATED",
    "FIELDS_CREATED_NN",
    "DEVICES_CREATED_NN",
    "RECONNECTED_GRAPH",
    "LOGICAL_VIEWS_UPDATED",
    "SOURCE_CREATED",
    "BUS_CREATED",
    "BRANCH_CREATED",
    "SWITCH_INSERTED",
    "RING_CONNECTED",
    "NOP_SET",
    "TRANSFORMER_CREATED",
    "CATALOG_ASSIGNED",
    "PARAMETERS_UPDATED",
]
"""Lista dozwolonych typów zdarzeń domenowych."""


# ===========================================================================
# 7. TERMINAL REF — kanoniczny byt „końca magistrali"
# ===========================================================================


class TerminalRef(_FrozenBase):
    """Referecja terminala magistrali/odgałęzienia.

    Opisuje jednoznacznie punkt końcowy magistrali lub odgałęzienia
    wraz z jego statusem (dostępność do dalszej budowy).
    """

    element_id: str
    """Identyfikator elementu (szyny), do którego terminal należy."""

    port_id: str
    """Identyfikator portu na elemencie."""

    trunk_id: str | None = None
    """Identyfikator magistrali (jeśli terminal należy do magistrali)."""

    branch_id: str | None = None
    """Identyfikator odgałęzienia (jeśli terminal należy do odgałęzienia)."""

    status: Literal["OTWARTY", "ZAJETY", "ZAREZERWOWANY_DLA_RINGU"]
    """Status terminala — dostępność do dalszej budowy."""


# ===========================================================================
# 8. LOGICAL VIEWS — widoki logiczne (pochodna Snapshot)
# ===========================================================================


class TrunkViewV1(_FrozenBase):
    """Widok magistrali — pochodna topologii Snapshot."""

    corridor_ref: str
    """Identyfikator magistrali (korytarza)."""

    corridor_type: str
    """Typ magistrali (radial/ring/mixed)."""

    segments: list[str]
    """Uporządkowana lista identyfikatorów segmentów magistrali."""

    no_point_ref: str | None = None
    """Identyfikator punktu normalnie otwartego (NOP), jeśli istnieje."""

    terminals: list[TerminalRef] = []
    """Terminale magistrali (punkty końcowe dostępne do rozbudowy)."""


class BranchViewV1(_FrozenBase):
    """Widok odgałęzienia — pochodna topologii Snapshot."""

    branch_id: str
    """Identyfikator odgałęzienia."""

    from_element_id: str
    """Element źródłowy odgałęzienia."""

    from_port_id: str
    """Port źródłowy odgałęzienia."""

    segments: list[str]
    """Lista identyfikatorów segmentów odgałęzienia."""

    terminals: list[TerminalRef] = []
    """Terminale odgałęzienia (punkty końcowe)."""


class SecondaryConnectorViewV1(_FrozenBase):
    """Widok połączenia wtórnego (pierścień) — pochodna topologii Snapshot."""

    connector_id: str
    """Identyfikator połączenia wtórnego."""

    from_element_id: str
    """Element początkowy pierścienia."""

    to_element_id: str
    """Element końcowy pierścienia."""

    segment_ref: str
    """Identyfikator segmentu zamykającego pierścień."""


class LogicalViewsV1(_FrozenBase):
    """Pełne widoki logiczne — deterministyczna pochodna Snapshot.

    Zawiera uporządkowaną strukturę magistral, odgałęzień,
    połączeń wtórnych i terminali.
    """

    trunks: list[TrunkViewV1] = []
    """Lista magistral z segmentami i terminalami."""

    branches: list[BranchViewV1] = []
    """Lista odgałęzień."""

    secondary_connectors: list[SecondaryConnectorViewV1] = []
    """Lista połączeń wtórnych (pierścienie)."""

    terminals: list[TerminalRef] = []
    """Wszystkie terminale dostępne w sieci (agregat)."""


# ===========================================================================
# 9. MATERIALIZED PARAMS — materializacja parametrów katalogowych
# ===========================================================================


class MaterializedLineParams(_FrozenBase):
    """Zmaterializowane parametry linii/kabla z katalogu."""

    catalog_item_id: str
    """Identyfikator pozycji katalogowej."""

    catalog_item_version: str | None = None
    """Wersja pozycji katalogowej."""

    r_ohm_per_km: float | None = None
    """Rezystancja [Ω/km]."""

    x_ohm_per_km: float | None = None
    """Reaktancja [Ω/km]."""

    i_max_a: float | None = None
    """Prąd maksymalny [A]."""


class MaterializedTransformerParams(_FrozenBase):
    """Zmaterializowane parametry transformatora z katalogu."""

    catalog_item_id: str
    """Identyfikator pozycji katalogowej."""

    catalog_item_version: str | None = None
    """Wersja pozycji katalogowej."""

    u_k_percent: float | None = None
    """Napięcie zwarcia [%]."""

    p0_kw: float | None = None
    """Straty jałowe [kW]."""

    pk_kw: float | None = None
    """Straty obciążeniowe [kW]."""

    s_n_kva: float | None = None
    """Moc znamionowa [kVA]."""


class MaterializedParams(_FrozenBase):
    """Zmaterializowane parametry katalogowe w Snapshot.

    Każde wiązanie katalogowe tworzy kopię parametrów
    w momencie przypisania — aktualizacja katalogu
    nie zmienia istniejących obliczeń.
    """

    lines_sn: dict[str, MaterializedLineParams] = {}
    """Parametry linii SN: segment_id → parametry."""

    transformers_sn_nn: dict[str, MaterializedTransformerParams] = {}
    """Parametry transformatorów SN/nN: transformer_id → parametry."""


# ===========================================================================
# 10. LAYOUT INFO — informacja o układzie geometrycznym
# ===========================================================================


class LayoutInfo(_FrozenBase):
    """Informacja o deterministycznym układzie geometrycznym SLD."""

    layout_hash: str
    """SHA-256 hash układu geometrycznego."""

    layout_version: str = "1.0"
    """Wersja algorytmu układu."""
