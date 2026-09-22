-- Run this once in Supabase: Project -> SQL Editor -> New query -> paste -> Run.
-- Multi-teacher schedule schema (replaces the old single-file data/schedules.json).

create table if not exists teachers (
  id text primary key,
  name text not null,
  department text,
  education text,
  special_duty text,
  totals jsonb
);

create table if not exists subjects (
  id bigserial primary key,
  teacher_id text not null references teachers(id) on delete cascade,
  code text not null,
  name text not null,
  theory_hours int,
  practice_hours int,
  credits int,
  total_hours int,
  unique (teacher_id, code)
);

create table if not exists periods (
  id bigserial primary key,
  teacher_id text not null references teachers(id) on delete cascade,
  day text not null,
  start_time text not null,
  end_time text not null,
  type text,
  subject_code text not null,
  room text,
  group_name text,
  student_count int
);

create index if not exists periods_teacher_id_idx on periods(teacher_id);
create index if not exists periods_day_idx on periods(day);
create index if not exists subjects_teacher_id_idx on subjects(teacher_id);
