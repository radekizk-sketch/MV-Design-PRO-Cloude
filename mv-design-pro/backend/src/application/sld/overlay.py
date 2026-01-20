from __future__ import annotations

from typing import Any

from domain.sld import SldBranchSymbol, SldDiagram, SldNodeSymbol


class ResultSldOverlayBuilder:
    def __init__(self, limits: dict | None = None) -> None:
        self._limits = limits or {}

    def build(
        self,
        *,
        diagram: SldDiagram,
        node_symbols: list[SldNodeSymbol],
        branch_symbols: list[SldBranchSymbol],
        result_dict: dict[str, Any],
        analysis_type: str,
        run_id: str | None = None,
    ) -> dict[str, Any]:
        analysis = analysis_type.upper()
        if analysis == "SC":
            return self._build_sc_overlay(
                diagram=diagram,
                node_symbols=node_symbols,
                branch_symbols=branch_symbols,
                result_dict=result_dict,
                run_id=run_id,
            )
        if analysis == "PF":
            return self._build_pf_overlay(
                diagram=diagram,
                node_symbols=node_symbols,
                branch_symbols=branch_symbols,
                result_dict=result_dict,
                run_id=run_id,
            )
        raise ValueError(f"Unsupported analysis_type: {analysis_type}")

    def _build_sc_overlay(
        self,
        *,
        diagram: SldDiagram,
        node_symbols: list[SldNodeSymbol],
        branch_symbols: list[SldBranchSymbol],
        result_dict: dict[str, Any],
        run_id: str | None,
    ) -> dict[str, Any]:
        node_overlay: dict[str, dict[str, Any]] = {}
        branch_overlay: dict[str, dict[str, Any]] = {}

        fault_node_id = result_dict.get("fault_node_id")
        values = {
            key: result_dict[key]
            for key in ("ikss_a", "ip_a", "ith_a", "sk_mva", "ik_total_a", "ik_thevenin_a")
            if key in result_dict
        }
        if fault_node_id:
            mapped_nodes = {str(symbol.network_node_id) for symbol in node_symbols}
            if str(fault_node_id) in mapped_nodes:
                node_overlay[str(fault_node_id)] = {"values": values, "status": "OK"}

        contributions = result_dict.get("branch_contributions") or []
        branch_map = {str(symbol.network_branch_id): symbol for symbol in branch_symbols}
        aggregated: dict[str, dict[str, Any]] = {}
        for contrib in contributions:
            branch_id = str(contrib.get("branch_id", ""))
            if not branch_id or branch_id not in branch_map:
                continue
            existing = aggregated.setdefault(
                branch_id, {"i_contrib_a": 0.0, "direction": None}
            )
            existing["i_contrib_a"] += float(contrib.get("i_contrib_a", 0.0))
            direction = contrib.get("direction")
            if existing["direction"] in {None, direction}:
                existing["direction"] = direction
            else:
                existing["direction"] = "mixed"

        for branch_id, values_map in aggregated.items():
            branch_overlay[branch_id] = {
                "values": values_map,
                "status": "OK",
                "direction": values_map.get("direction"),
            }

        payload = {
            "diagram_id": str(diagram.id),
            "analysis_type": "SC",
            "node_overlays": node_overlay,
            "branch_overlays": branch_overlay,
        }
        if run_id:
            payload["run_id"] = run_id
        return payload

    def _build_pf_overlay(
        self,
        *,
        diagram: SldDiagram,
        node_symbols: list[SldNodeSymbol],
        branch_symbols: list[SldBranchSymbol],
        result_dict: dict[str, Any],
        run_id: str | None,
    ) -> dict[str, Any]:
        node_overlay: dict[str, dict[str, Any]] = {}
        branch_overlay: dict[str, dict[str, Any]] = {}

        node_u_mag = result_dict.get("node_u_mag_pu", {})
        node_u_kv = result_dict.get("node_voltage_kv", {})
        node_angle = result_dict.get("node_angle_rad", {})
        node_p = result_dict.get("node_p_mw", {})
        node_q = result_dict.get("node_q_mvar", {})

        limits = self._limits.get("bus_voltage_limits") or self._limits.get("bus_voltage")
        limits = limits or {}

        for symbol in node_symbols:
            node_id = str(symbol.network_node_id)
            values: dict[str, Any] = {}
            if node_id in node_u_mag:
                values["u_pu"] = node_u_mag.get(node_id)
            if node_id in node_u_kv:
                values["u_kv"] = node_u_kv.get(node_id)
            if node_id in node_angle:
                values["angle_rad"] = node_angle.get(node_id)
            if node_id in node_p:
                values["p_mw"] = node_p.get(node_id)
            if node_id in node_q:
                values["q_mvar"] = node_q.get(node_id)
            if not values:
                continue
            status = "OK"
            limit = limits.get(node_id) if isinstance(limits, dict) else None
            if isinstance(limit, dict) and "u_min_pu" in limit and "u_max_pu" in limit:
                u_val = node_u_mag.get(node_id)
                if u_val is not None:
                    if u_val < limit["u_min_pu"] or u_val > limit["u_max_pu"]:
                        status = "WARN"
            node_overlay[node_id] = {"values": values, "status": status}

        branch_current = result_dict.get("branch_current_ka", {})
        branch_loading = result_dict.get("branch_loading_pct", {})
        branch_losses = result_dict.get("branch_loss_mw", {})
        for symbol in branch_symbols:
            branch_id = str(symbol.network_branch_id)
            values: dict[str, Any] = {}
            if branch_id in branch_current:
                values["i_ka"] = branch_current.get(branch_id)
            if branch_id in branch_loading:
                values["loading_pct"] = branch_loading.get(branch_id)
            if branch_id in branch_losses:
                values["p_loss_mw"] = branch_losses.get(branch_id)
            if not values:
                continue
            branch_overlay[branch_id] = {"values": values, "status": "OK"}

        payload = {
            "diagram_id": str(diagram.id),
            "analysis_type": "PF",
            "node_overlays": node_overlay,
            "branch_overlays": branch_overlay,
        }
        if run_id:
            payload["run_id"] = run_id
        return payload
