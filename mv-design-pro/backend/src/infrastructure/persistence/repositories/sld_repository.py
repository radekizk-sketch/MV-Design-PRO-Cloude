from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID, uuid4

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from domain.sld import SldAnnotation, SldBranchSymbol, SldDiagram, SldNodeSymbol
from infrastructure.persistence.models import (
    SldAnnotationORM,
    SldBranchSymbolORM,
    SldDiagramORM,
    SldNodeSymbolORM,
)


class SldRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def create_diagram(
        self,
        project_id: UUID,
        name: str,
        *,
        version: str = "1.0",
        layout_meta: dict | None = None,
        diagram_id: UUID | None = None,
        created_at: datetime | None = None,
        updated_at: datetime | None = None,
        commit: bool = True,
    ) -> SldDiagram:
        diagram_id = diagram_id or uuid4()
        now = datetime.now(timezone.utc)
        created_at = created_at or now
        updated_at = updated_at or created_at
        layout_meta = layout_meta or {}
        diagram = SldDiagram(
            id=diagram_id,
            project_id=project_id,
            name=name,
            version=version,
            layout_meta=layout_meta,
            created_at=created_at,
            updated_at=updated_at,
        )
        self._session.add(
            SldDiagramORM(
                id=diagram.id,
                project_id=diagram.project_id,
                name=diagram.name,
                version=diagram.version,
                layout_meta_jsonb=diagram.layout_meta,
                created_at=diagram.created_at,
                updated_at=diagram.updated_at,
            )
        )
        if commit:
            self._session.commit()
        return diagram

    def update_diagram(
        self, diagram: SldDiagram, *, commit: bool = True
    ) -> None:
        stmt = select(SldDiagramORM).where(SldDiagramORM.id == diagram.id)
        row = self._session.execute(stmt).scalar_one_or_none()
        if row is None:
            raise ValueError(f"SLD diagram {diagram.id} not found")
        row.name = diagram.name
        row.version = diagram.version
        row.layout_meta_jsonb = diagram.layout_meta
        row.updated_at = diagram.updated_at
        if commit:
            self._session.commit()

    def get_diagram(self, diagram_id: UUID) -> SldDiagram | None:
        stmt = select(SldDiagramORM).where(SldDiagramORM.id == diagram_id)
        row = self._session.execute(stmt).scalar_one_or_none()
        if row is None:
            return None
        return self._diagram_from_row(row)

    def list_diagrams(self, project_id: UUID) -> list[SldDiagram]:
        stmt = select(SldDiagramORM).where(SldDiagramORM.project_id == project_id)
        rows = self._session.execute(stmt).scalars().all()
        return [self._diagram_from_row(row) for row in rows]

    def delete_diagram(self, diagram_id: UUID, *, commit: bool = True) -> None:
        self._session.execute(
            delete(SldAnnotationORM).where(SldAnnotationORM.diagram_id == diagram_id)
        )
        self._session.execute(
            delete(SldBranchSymbolORM).where(SldBranchSymbolORM.diagram_id == diagram_id)
        )
        self._session.execute(
            delete(SldNodeSymbolORM).where(SldNodeSymbolORM.diagram_id == diagram_id)
        )
        self._session.execute(delete(SldDiagramORM).where(SldDiagramORM.id == diagram_id))
        if commit:
            self._session.commit()

    def clear_symbols(self, diagram_id: UUID, *, commit: bool = True) -> None:
        self._session.execute(
            delete(SldAnnotationORM).where(SldAnnotationORM.diagram_id == diagram_id)
        )
        self._session.execute(
            delete(SldBranchSymbolORM).where(SldBranchSymbolORM.diagram_id == diagram_id)
        )
        self._session.execute(
            delete(SldNodeSymbolORM).where(SldNodeSymbolORM.diagram_id == diagram_id)
        )
        if commit:
            self._session.commit()

    def upsert_node_symbols(
        self, diagram_id: UUID, symbols: list[SldNodeSymbol], *, commit: bool = True
    ) -> None:
        if not symbols:
            return
        network_ids = [symbol.network_node_id for symbol in symbols]
        stmt = select(SldNodeSymbolORM).where(
            SldNodeSymbolORM.diagram_id == diagram_id,
            SldNodeSymbolORM.network_node_id.in_(network_ids),
        )
        existing_rows = self._session.execute(stmt).scalars().all()
        existing_map = {row.network_node_id: row for row in existing_rows}
        for symbol in symbols:
            row = existing_map.get(symbol.network_node_id)
            if row is None:
                self._session.add(
                    SldNodeSymbolORM(
                        id=symbol.id,
                        diagram_id=symbol.diagram_id,
                        network_node_id=symbol.network_node_id,
                        symbol_type=symbol.symbol_type,
                        x=symbol.x,
                        y=symbol.y,
                        rotation=symbol.rotation,
                        style_jsonb=symbol.style,
                    )
                )
            else:
                row.symbol_type = symbol.symbol_type
                row.x = symbol.x
                row.y = symbol.y
                row.rotation = symbol.rotation
                row.style_jsonb = symbol.style
        if commit:
            self._session.commit()

    def upsert_branch_symbols(
        self, diagram_id: UUID, symbols: list[SldBranchSymbol], *, commit: bool = True
    ) -> None:
        if not symbols:
            return
        network_ids = [symbol.network_branch_id for symbol in symbols]
        stmt = select(SldBranchSymbolORM).where(
            SldBranchSymbolORM.diagram_id == diagram_id,
            SldBranchSymbolORM.network_branch_id.in_(network_ids),
        )
        existing_rows = self._session.execute(stmt).scalars().all()
        existing_map = {row.network_branch_id: row for row in existing_rows}
        for symbol in symbols:
            row = existing_map.get(symbol.network_branch_id)
            if row is None:
                self._session.add(
                    SldBranchSymbolORM(
                        id=symbol.id,
                        diagram_id=symbol.diagram_id,
                        network_branch_id=symbol.network_branch_id,
                        from_symbol_id=symbol.from_symbol_id,
                        to_symbol_id=symbol.to_symbol_id,
                        routing_jsonb=symbol.routing,
                        style_jsonb=symbol.style,
                    )
                )
            else:
                row.from_symbol_id = symbol.from_symbol_id
                row.to_symbol_id = symbol.to_symbol_id
                row.routing_jsonb = symbol.routing
                row.style_jsonb = symbol.style
        if commit:
            self._session.commit()

    def list_node_symbols(self, diagram_id: UUID) -> list[SldNodeSymbol]:
        stmt = select(SldNodeSymbolORM).where(SldNodeSymbolORM.diagram_id == diagram_id)
        rows = self._session.execute(stmt).scalars().all()
        return [self._node_symbol_from_row(row) for row in rows]

    def list_branch_symbols(self, diagram_id: UUID) -> list[SldBranchSymbol]:
        stmt = select(SldBranchSymbolORM).where(SldBranchSymbolORM.diagram_id == diagram_id)
        rows = self._session.execute(stmt).scalars().all()
        return [self._branch_symbol_from_row(row) for row in rows]

    def list_annotations(self, diagram_id: UUID) -> list[SldAnnotation]:
        stmt = select(SldAnnotationORM).where(SldAnnotationORM.diagram_id == diagram_id)
        rows = self._session.execute(stmt).scalars().all()
        return [self._annotation_from_row(row) for row in rows]

    def upsert_annotations(
        self, diagram_id: UUID, annotations: list[SldAnnotation], *, commit: bool = True
    ) -> None:
        if not annotations:
            return
        ids = [annotation.id for annotation in annotations]
        stmt = select(SldAnnotationORM).where(
            SldAnnotationORM.diagram_id == diagram_id, SldAnnotationORM.id.in_(ids)
        )
        existing_rows = self._session.execute(stmt).scalars().all()
        existing_map = {row.id: row for row in existing_rows}
        for annotation in annotations:
            row = existing_map.get(annotation.id)
            if row is None:
                self._session.add(
                    SldAnnotationORM(
                        id=annotation.id,
                        diagram_id=annotation.diagram_id,
                        text=annotation.text,
                        x=annotation.x,
                        y=annotation.y,
                        style_jsonb=annotation.style,
                    )
                )
            else:
                row.text = annotation.text
                row.x = annotation.x
                row.y = annotation.y
                row.style_jsonb = annotation.style
        if commit:
            self._session.commit()

    def update_layout_meta(
        self, diagram_id: UUID, layout_meta: dict, *, commit: bool = True
    ) -> None:
        stmt = select(SldDiagramORM).where(SldDiagramORM.id == diagram_id)
        row = self._session.execute(stmt).scalar_one_or_none()
        if row is None:
            raise ValueError(f"SLD diagram {diagram_id} not found")
        row.layout_meta_jsonb = layout_meta
        row.updated_at = datetime.now(timezone.utc)
        if commit:
            self._session.commit()

    def mark_project_dirty(self, project_id: UUID, *, commit: bool = True) -> None:
        stmt = select(SldDiagramORM).where(SldDiagramORM.project_id == project_id)
        rows = self._session.execute(stmt).scalars().all()
        now = datetime.now(timezone.utc)
        for row in rows:
            meta = dict(row.layout_meta_jsonb or {})
            meta["dirty"] = True
            row.layout_meta_jsonb = meta
            row.updated_at = now
        if commit:
            self._session.commit()

    @staticmethod
    def _diagram_from_row(row: SldDiagramORM) -> SldDiagram:
        return SldDiagram(
            id=row.id,
            project_id=row.project_id,
            name=row.name,
            version=row.version,
            layout_meta=row.layout_meta_jsonb or {},
            created_at=row.created_at,
            updated_at=row.updated_at,
        )

    @staticmethod
    def _node_symbol_from_row(row: SldNodeSymbolORM) -> SldNodeSymbol:
        return SldNodeSymbol(
            id=row.id,
            diagram_id=row.diagram_id,
            network_node_id=row.network_node_id,
            symbol_type=row.symbol_type,
            x=row.x,
            y=row.y,
            rotation=row.rotation,
            style=row.style_jsonb or {},
        )

    @staticmethod
    def _branch_symbol_from_row(row: SldBranchSymbolORM) -> SldBranchSymbol:
        return SldBranchSymbol(
            id=row.id,
            diagram_id=row.diagram_id,
            network_branch_id=row.network_branch_id,
            from_symbol_id=row.from_symbol_id,
            to_symbol_id=row.to_symbol_id,
            routing=list(row.routing_jsonb or []),
            style=row.style_jsonb or {},
        )

    @staticmethod
    def _annotation_from_row(row: SldAnnotationORM) -> SldAnnotation:
        return SldAnnotation(
            id=row.id,
            diagram_id=row.diagram_id,
            text=row.text,
            x=row.x,
            y=row.y,
            style=row.style_jsonb or {},
        )
