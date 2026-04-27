"""security scalability baseline tables

Revision ID: 20260427_01
Revises: 
Create Date: 2026-04-27
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260427_01"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "lead_scores",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("lead_id", sa.Uuid(), nullable=False),
        sa.Column("score", sa.Integer(), nullable=False),
        sa.Column("grade", sa.String(length=1), nullable=False),
        sa.Column("score_reasons", sa.JSON(), nullable=False),
        sa.Column("last_calculated", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("is_dead", sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(["lead_id"], ["leads.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("lead_id"),
    )
    op.create_index(op.f("ix_lead_scores_lead_id"), "lead_scores", ["lead_id"], unique=True)
    op.create_index(op.f("ix_lead_scores_score"), "lead_scores", ["score"], unique=False)
    op.create_index(op.f("ix_lead_scores_grade"), "lead_scores", ["grade"], unique=False)
    op.create_index(op.f("ix_lead_scores_last_calculated"), "lead_scores", ["last_calculated"], unique=False)
    op.create_index(op.f("ix_lead_scores_is_dead"), "lead_scores", ["is_dead"], unique=False)

    op.create_table(
        "lead_alerts",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("lead_id", sa.Uuid(), nullable=False),
        sa.Column("assigned_to_id", sa.Uuid(), nullable=True),
        sa.Column("triggered_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("responded_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("escalated", sa.Boolean(), nullable=False),
        sa.Column("trigger_reason", sa.String(length=255), nullable=False),
        sa.ForeignKeyConstraint(["assigned_to_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["lead_id"], ["leads.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_lead_alerts_lead_id"), "lead_alerts", ["lead_id"], unique=False)
    op.create_index(op.f("ix_lead_alerts_assigned_to_id"), "lead_alerts", ["assigned_to_id"], unique=False)
    op.create_index(op.f("ix_lead_alerts_triggered_at"), "lead_alerts", ["triggered_at"], unique=False)
    op.create_index(op.f("ix_lead_alerts_responded_at"), "lead_alerts", ["responded_at"], unique=False)
    op.create_index(op.f("ix_lead_alerts_escalated"), "lead_alerts", ["escalated"], unique=False)

    op.create_table(
        "escalation_logs",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("alert_id", sa.Uuid(), nullable=False),
        sa.Column("lead_id", sa.Uuid(), nullable=False),
        sa.Column("manager_user_id", sa.Uuid(), nullable=True),
        sa.Column("reason", sa.String(length=255), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["alert_id"], ["lead_alerts.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["lead_id"], ["leads.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["manager_user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_escalation_logs_alert_id"), "escalation_logs", ["alert_id"], unique=False)
    op.create_index(op.f("ix_escalation_logs_lead_id"), "escalation_logs", ["lead_id"], unique=False)
    op.create_index(op.f("ix_escalation_logs_manager_user_id"), "escalation_logs", ["manager_user_id"], unique=False)
    op.create_index(op.f("ix_escalation_logs_created_at"), "escalation_logs", ["created_at"], unique=False)

    op.create_table(
        "dead_lead_logs",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("lead_id", sa.Uuid(), nullable=False),
        sa.Column("reason", sa.String(length=255), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("marked_dead_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("revived_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["lead_id"], ["leads.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_dead_lead_logs_lead_id"), "dead_lead_logs", ["lead_id"], unique=False)
    op.create_index(op.f("ix_dead_lead_logs_marked_dead_at"), "dead_lead_logs", ["marked_dead_at"], unique=False)
    op.create_index(op.f("ix_dead_lead_logs_revived_at"), "dead_lead_logs", ["revived_at"], unique=False)

    op.create_table(
        "audit_logs",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("actor_user_id", sa.Uuid(), nullable=True),
        sa.Column("actor_role", sa.String(length=32), nullable=True),
        sa.Column("action", sa.String(length=128), nullable=False),
        sa.Column("entity_type", sa.String(length=64), nullable=False),
        sa.Column("entity_id", sa.String(length=128), nullable=False),
        sa.Column("outcome", sa.String(length=32), nullable=False),
        sa.Column("ip_address", sa.String(length=64), nullable=True),
        sa.Column("metadata_json", sa.JSON(), nullable=True),
        sa.Column("message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_audit_logs_actor_user_id"), "audit_logs", ["actor_user_id"], unique=False)
    op.create_index(op.f("ix_audit_logs_actor_role"), "audit_logs", ["actor_role"], unique=False)
    op.create_index(op.f("ix_audit_logs_action"), "audit_logs", ["action"], unique=False)
    op.create_index(op.f("ix_audit_logs_entity_type"), "audit_logs", ["entity_type"], unique=False)
    op.create_index(op.f("ix_audit_logs_entity_id"), "audit_logs", ["entity_id"], unique=False)
    op.create_index(op.f("ix_audit_logs_created_at"), "audit_logs", ["created_at"], unique=False)

    op.create_table(
        "webhook_receipts",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("provider", sa.String(length=64), nullable=False),
        sa.Column("idempotency_key", sa.String(length=255), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("idempotency_key"),
    )
    op.create_index(op.f("ix_webhook_receipts_provider"), "webhook_receipts", ["provider"], unique=False)
    op.create_index(op.f("ix_webhook_receipts_idempotency_key"), "webhook_receipts", ["idempotency_key"], unique=True)
    op.create_index(op.f("ix_webhook_receipts_created_at"), "webhook_receipts", ["created_at"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_webhook_receipts_created_at"), table_name="webhook_receipts")
    op.drop_index(op.f("ix_webhook_receipts_idempotency_key"), table_name="webhook_receipts")
    op.drop_index(op.f("ix_webhook_receipts_provider"), table_name="webhook_receipts")
    op.drop_table("webhook_receipts")

    op.drop_index(op.f("ix_audit_logs_created_at"), table_name="audit_logs")
    op.drop_index(op.f("ix_audit_logs_entity_id"), table_name="audit_logs")
    op.drop_index(op.f("ix_audit_logs_entity_type"), table_name="audit_logs")
    op.drop_index(op.f("ix_audit_logs_action"), table_name="audit_logs")
    op.drop_index(op.f("ix_audit_logs_actor_role"), table_name="audit_logs")
    op.drop_index(op.f("ix_audit_logs_actor_user_id"), table_name="audit_logs")
    op.drop_table("audit_logs")

    op.drop_index(op.f("ix_dead_lead_logs_revived_at"), table_name="dead_lead_logs")
    op.drop_index(op.f("ix_dead_lead_logs_marked_dead_at"), table_name="dead_lead_logs")
    op.drop_index(op.f("ix_dead_lead_logs_lead_id"), table_name="dead_lead_logs")
    op.drop_table("dead_lead_logs")

    op.drop_index(op.f("ix_escalation_logs_created_at"), table_name="escalation_logs")
    op.drop_index(op.f("ix_escalation_logs_manager_user_id"), table_name="escalation_logs")
    op.drop_index(op.f("ix_escalation_logs_lead_id"), table_name="escalation_logs")
    op.drop_index(op.f("ix_escalation_logs_alert_id"), table_name="escalation_logs")
    op.drop_table("escalation_logs")

    op.drop_index(op.f("ix_lead_alerts_escalated"), table_name="lead_alerts")
    op.drop_index(op.f("ix_lead_alerts_responded_at"), table_name="lead_alerts")
    op.drop_index(op.f("ix_lead_alerts_triggered_at"), table_name="lead_alerts")
    op.drop_index(op.f("ix_lead_alerts_assigned_to_id"), table_name="lead_alerts")
    op.drop_index(op.f("ix_lead_alerts_lead_id"), table_name="lead_alerts")
    op.drop_table("lead_alerts")

    op.drop_index(op.f("ix_lead_scores_is_dead"), table_name="lead_scores")
    op.drop_index(op.f("ix_lead_scores_last_calculated"), table_name="lead_scores")
    op.drop_index(op.f("ix_lead_scores_grade"), table_name="lead_scores")
    op.drop_index(op.f("ix_lead_scores_score"), table_name="lead_scores")
    op.drop_index(op.f("ix_lead_scores_lead_id"), table_name="lead_scores")
    op.drop_table("lead_scores")
