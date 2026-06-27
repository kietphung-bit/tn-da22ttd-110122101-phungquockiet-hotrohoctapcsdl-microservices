import psycopg2
from psycopg2.extras import Json

from config import settings


def get_connection():
    return psycopg2.connect(settings.database_url)


def load_submission(submission_id: int) -> dict:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                select submission_id, user_id, exercise_id, diagram_data
                from submissions
                where submission_id = %s
                """,
                (submission_id,),
            )
            row = cur.fetchone()
            if row is None:
                raise ValueError(f"Submission not found: {submission_id}")
            return {
                "submission_id": row[0],
                "user_id": row[1],
                "exercise_id": row[2],
                "diagram_data": row[3] or {},
            }


def ensure_evaluation_metadata_columns(cur) -> None:
    cur.execute("alter table ai_evaluations add column if not exists provider varchar(50)")
    cur.execute("alter table ai_evaluations add column if not exists model varchar(100)")
    cur.execute("alter table ai_evaluations add column if not exists fallback_used boolean")
    cur.execute("alter table ai_evaluations add column if not exists fallback_from varchar(50)")


def ensure_evaluation_rounds_table(cur) -> None:
    cur.execute(
        """
        create table if not exists evaluation_rounds (
            round_id bigserial primary key,
            submission_id bigint not null references submissions(submission_id),
            round_number integer not null,
            diagram_data_snapshot jsonb,
            round_status varchar(20) not null,
            overall_score numeric(5, 2),
            provider varchar(50),
            model varchar(100),
            fallback_used boolean,
            fallback_from varchar(50),
            details_snapshot jsonb,
            created_at timestamp,
            submitted_at timestamp,
            graded_at timestamp,
            constraint uk_evaluation_round_submission_number unique (submission_id, round_number)
        )
        """
    )


def ensure_submission_failed_status_allowed(cur) -> None:
    cur.execute(
        """
        do $$
        declare
            stale_constraint record;
            target_constraint_exists boolean;
        begin
            for stale_constraint in
                select conname
                from pg_constraint
                where conrelid = 'submissions'::regclass
                  and contype = 'c'
                  and pg_get_constraintdef(oid) like '%submission_status%'
                  and pg_get_constraintdef(oid) not like '%FAILED%'
            loop
                execute format('alter table submissions drop constraint %I', stale_constraint.conname);
            end loop;

            select exists (
                select 1
                from pg_constraint
                where conrelid = 'submissions'::regclass
                  and conname = 'submissions_submission_status_check'
                  and pg_get_constraintdef(oid) like '%FAILED%'
            )
            into target_constraint_exists;

            if not target_constraint_exists then
                alter table submissions
                add constraint submissions_submission_status_check
                check (submission_status in ('DRAFT', 'SUBMITTED', 'PROCESSING', 'GRADED', 'FAILED'));
            end if;
        end $$;
        """
    )


def persist_evaluation(
    submission_id: int,
    score: float,
    details: list[dict],
    round_id: int | None = None,
    round_number: int | None = None,
    provider: str = "MOCK",
    model: str | None = None,
    fallback_used: bool = False,
    fallback_from: str | None = None,
) -> int:
    with get_connection() as conn:
        with conn.cursor() as cur:
            ensure_evaluation_metadata_columns(cur)
            ensure_evaluation_rounds_table(cur)
            cur.execute(
                """
                insert into ai_evaluations
                    (submission_id, overall_score, evaluated_at, provider, model, fallback_used, fallback_from)
                values (%s, %s, now(), %s, %s, %s, %s)
                on conflict (submission_id)
                do update set overall_score = excluded.overall_score,
                              evaluated_at = excluded.evaluated_at,
                              provider = excluded.provider,
                              model = excluded.model,
                              fallback_used = excluded.fallback_used,
                              fallback_from = excluded.fallback_from
                returning evaluation_id
                """,
                (submission_id, score, provider, model, fallback_used, fallback_from),
            )
            evaluation_id = cur.fetchone()[0]

            cur.execute(
                "delete from evaluation_details where ai_evaluation_id = %s",
                (evaluation_id,),
            )

            for detail in details:
                cur.execute(
                    """
                    insert into evaluation_details
                        (ai_evaluation_id, error_type, eva_description, error_location)
                    values (%s, %s, %s, %s)
                    """,
                    (
                        evaluation_id,
                        detail["error_type"],
                        detail["description"],
                        detail["location"],
                    ),
                )

            cur.execute(
                """
                update submissions
                set submission_status = 'GRADED'
                where submission_id = %s
                """,
                (submission_id,),
            )

            if round_id is not None or round_number is not None:
                detail_snapshot = [
                    {
                        "errorType": detail["error_type"],
                        "evaDescription": detail["description"],
                        "errorLocation": detail["location"],
                    }
                    for detail in details
                ]
                if round_id is not None:
                    cur.execute(
                        """
                        update evaluation_rounds
                        set round_status = 'GRADED',
                            overall_score = %s,
                            provider = %s,
                            model = %s,
                            fallback_used = %s,
                            fallback_from = %s,
                            details_snapshot = %s,
                            graded_at = now()
                        where round_id = %s
                        """,
                        (
                            score,
                            provider,
                            model,
                            fallback_used,
                            fallback_from,
                            Json(detail_snapshot),
                            round_id,
                        ),
                    )
                    if cur.rowcount == 0 and round_number is not None:
                        cur.execute(
                            """
                            update evaluation_rounds
                            set round_status = 'GRADED',
                                overall_score = %s,
                                provider = %s,
                                model = %s,
                                fallback_used = %s,
                                fallback_from = %s,
                                details_snapshot = %s,
                                graded_at = now()
                            where submission_id = %s and round_number = %s
                            """,
                            (
                                score,
                                provider,
                                model,
                                fallback_used,
                                fallback_from,
                                Json(detail_snapshot),
                                submission_id,
                                round_number,
                            ),
                        )
                else:
                    cur.execute(
                        """
                        update evaluation_rounds
                        set round_status = 'GRADED',
                            overall_score = %s,
                            provider = %s,
                            model = %s,
                            fallback_used = %s,
                            fallback_from = %s,
                            details_snapshot = %s,
                            graded_at = now()
                        where submission_id = %s and round_number = %s
                        """,
                        (
                            score,
                            provider,
                            model,
                            fallback_used,
                            fallback_from,
                            Json(detail_snapshot),
                            submission_id,
                            round_number,
                        ),
                    )

        conn.commit()

    return evaluation_id


def mark_submission_failed(
    submission_id: int,
    round_id: int | None = None,
    round_number: int | None = None,
) -> None:
    with get_connection() as conn:
        with conn.cursor() as cur:
            ensure_evaluation_rounds_table(cur)
            ensure_submission_failed_status_allowed(cur)
            if round_id is not None:
                cur.execute(
                    """
                    update evaluation_rounds
                    set round_status = 'FAILED'
                    where round_id = %s
                    """,
                    (round_id,),
                )
                if cur.rowcount == 0 and round_number is not None:
                    cur.execute(
                        """
                        update evaluation_rounds
                        set round_status = 'FAILED'
                        where submission_id = %s and round_number = %s
                        """,
                        (submission_id, round_number),
                    )
            elif round_number is not None:
                cur.execute(
                    """
                    update evaluation_rounds
                    set round_status = 'FAILED'
                    where submission_id = %s and round_number = %s
                    """,
                    (submission_id, round_number),
                )
            cur.execute(
                """
                update submissions
                set submission_status = 'FAILED'
                where submission_id = %s
                  and submission_status in ('SUBMITTED', 'PROCESSING')
                """,
                (submission_id,),
            )
        conn.commit()
