-- todos 테이블에 sod_id 컬럼 추가 (이미 존재하는 경우 무시)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'todos' AND column_name = 'sod_id'
  ) THEN
    ALTER TABLE todos ADD COLUMN sod_id UUID REFERENCES sods(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_todos_sod_id ON todos(sod_id);

-- 완료 메시지
DO $$ 
BEGIN
  RAISE NOTICE 'todos 테이블에 sod_id 컬럼이 추가되었습니다.';
END $$;

