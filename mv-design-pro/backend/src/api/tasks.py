"""Celery task definitions for async batch execution."""

import logging
from uuid import UUID

from api.celery_app import app

logger = logging.getLogger(__name__)


@app.task(bind=True, name="execute_batch_task", max_retries=0)
def execute_batch_task(self, batch_id: str) -> dict:
    """
    Execute a batch job asynchronously via Celery.

    Calls BatchExecutionService.execute_batch() in the worker process.
    The API endpoint dispatches this task and returns immediately.

    Args:
        batch_id: UUID string of the batch to execute.

    Returns:
        Dict with batch status and metadata.
    """
    from application.batch_execution_service import BatchExecutionService
    from application.execution_engine.service import ExecutionEngineService

    logger.info("Celery task: executing batch %s", batch_id)

    try:
        # Create fresh service instances for the worker
        engine = ExecutionEngineService()
        service = BatchExecutionService(engine)

        parsed_id = UUID(batch_id)
        batch = service.execute_batch(parsed_id)

        result = {
            "batch_id": str(batch.batch_id),
            "status": batch.status.value,
            "run_ids": [str(rid) for rid in batch.run_ids],
            "errors": list(batch.errors) if batch.errors else [],
        }

        logger.info(
            "Celery task: batch %s completed with status %s",
            batch_id,
            batch.status.value,
        )
        return result

    except Exception as exc:
        logger.error(
            "Celery task: batch %s failed: %s",
            batch_id,
            exc,
        )
        raise
