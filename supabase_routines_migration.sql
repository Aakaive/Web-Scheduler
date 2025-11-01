-- 루틴 테이블 생성
CREATE TABLE IF NOT EXISTS routines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 루틴 기본 정보
  title TEXT NOT NULL,
  summary TEXT,
  expression TEXT,
  
  -- 시간 정보
  start_at TIME NOT NULL,
  end_at TIME,
  
  -- 반복 요일 (0=일요일, 1=월요일, ..., 6=토요일)
  repeat_days INTEGER[] NOT NULL DEFAULT '{}',
  
  -- 활성화 여부
  is_active BOOLEAN DEFAULT TRUE
);

-- sods 테이블에 routine_id 컬럼 추가 (이미 존재하는 경우 무시)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sods' AND column_name = 'routine_id'
  ) THEN
    ALTER TABLE sods ADD COLUMN routine_id UUID REFERENCES routines(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_routines_workspace_user ON routines(workspace_id, user_id);
CREATE INDEX IF NOT EXISTS idx_routines_active ON routines(is_active);
CREATE INDEX IF NOT EXISTS idx_sods_routine_id ON sods(routine_id);

-- RLS (Row Level Security) 정책 활성화
ALTER TABLE routines ENABLE ROW LEVEL SECURITY;

-- RLS 정책 생성
DO $$ 
BEGIN
  -- SELECT 정책
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'routines' AND policyname = 'Users can view their own routines'
  ) THEN
    CREATE POLICY "Users can view their own routines"
      ON routines FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  -- INSERT 정책
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'routines' AND policyname = 'Users can insert their own routines'
  ) THEN
    CREATE POLICY "Users can insert their own routines"
      ON routines FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  -- UPDATE 정책
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'routines' AND policyname = 'Users can update their own routines'
  ) THEN
    CREATE POLICY "Users can update their own routines"
      ON routines FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;

  -- DELETE 정책
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'routines' AND policyname = 'Users can delete their own routines'
  ) THEN
    CREATE POLICY "Users can delete their own routines"
      ON routines FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- 완료 메시지
DO $$ 
BEGIN
  RAISE NOTICE '루틴 테이블 마이그레이션이 완료되었습니다.';
END $$;

