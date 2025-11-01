# 루틴 관리 기능 마이그레이션 가이드

## 🎯 개요

이 가이드는 SoD 페이지에 루틴 관리 기능을 추가하기 위한 데이터베이스 마이그레이션 방법을 설명합니다.

## 📋 변경 사항

### 1. 데이터베이스 변경
- **새 테이블**: `routines` - 루틴 정의를 저장
- **기존 테이블 수정**: `sods` 테이블에 `routine_id` 컬럼 추가

### 2. 새로운 기능
- ✅ 루틴 생성, 조회, 수정, 삭제 (CRUD)
- ✅ 루틴을 특정 월에 적용 (선택한 요일에 자동으로 SoD 생성)
- ✅ 루틴 해제 (해당 월의 루틴으로 생성된 SoD 일괄 삭제)
- ✅ 루틴 SoD는 summary가 보라색으로 표시되며 "(루틴)" 접두어 포함

## 🚀 마이그레이션 단계

### Step 1: Supabase SQL Editor 실행

1. Supabase Dashboard에 로그인
2. 프로젝트 선택
3. 왼쪽 메뉴에서 **SQL Editor** 클릭

### Step 2: SQL 스크립트 실행

`supabase_routines_migration.sql` 파일의 내용을 복사하여 SQL Editor에 붙여넣고 **Run** 버튼 클릭

#### 실행할 SQL 요약:

```sql
-- 1. routines 테이블 생성
CREATE TABLE IF NOT EXISTS routines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  title TEXT NOT NULL,
  summary TEXT,
  expression TEXT,
  start_at TIME NOT NULL,
  end_at TIME,
  repeat_days INTEGER[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE
);

-- 2. sods 테이블에 routine_id 컬럼 추가
ALTER TABLE sods ADD COLUMN routine_id UUID REFERENCES routines(id) ON DELETE SET NULL;

-- 3. 인덱스 생성
CREATE INDEX idx_routines_workspace_user ON routines(workspace_id, user_id);
CREATE INDEX idx_routines_active ON routines(is_active);
CREATE INDEX idx_sods_routine_id ON sods(routine_id);

-- 4. RLS 정책 설정
-- (스크립트에 포함됨)
```

### Step 3: 마이그레이션 확인

SQL 실행 후 다음을 확인:

1. **Table Editor**에서 `routines` 테이블 생성 확인
2. `sods` 테이블에 `routine_id` 컬럼 추가 확인
3. 에러 메시지가 없는지 확인

### Step 4: 애플리케이션 재시작

```bash
npm run dev
```

## 📊 데이터베이스 스키마

### routines 테이블

| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| id | UUID | Primary Key |
| workspace_id | UUID | 워크스페이스 ID (FK) |
| user_id | UUID | 사용자 ID (FK) |
| created_at | TIMESTAMP | 생성 시간 |
| title | TEXT | 루틴 이름 |
| summary | TEXT | 요약 |
| expression | TEXT | 상세 내용 |
| start_at | TIME | 시작 시간 (HH:MM:SS) |
| end_at | TIME | 종료 시간 (HH:MM:SS) |
| repeat_days | INTEGER[] | 반복 요일 배열 [0-6] (0=일요일) |
| is_active | BOOLEAN | 활성화 여부 |

### sods 테이블 (수정)

| 컬럼명 (추가) | 타입 | 설명 |
|--------------|------|------|
| routine_id | UUID | 루틴 ID (nullable, FK) |

## 🎨 사용 방법

### 1. 루틴 관리 모달 열기

SoD 페이지에서 **"루틴 관리"** 버튼 클릭

### 2. 루틴 생성

1. 모달 상단의 **+** 버튼 클릭
2. 루틴 정보 입력:
   - 루틴 이름 (필수)
   - 반복 요일 선택 (필수)
   - 시작/종료 시간
   - 요약 및 상세 내용
3. **저장** 버튼 클릭

### 3. 루틴 적용

1. 루틴 카드의 **"적용"** 버튼 클릭
2. 확인 메시지 확인
3. 현재 표시 중인 월의 선택된 요일에 자동으로 SoD 생성
4. Summary에 보라색 **(루틴)** 접두어 추가

### 4. 루틴 해제

1. 루틴 카드의 **"해제"** 버튼 클릭
2. 확인 메시지 확인
3. 현재 월의 해당 루틴으로 생성된 모든 SoD 삭제

### 5. 루틴 수정/삭제

- **수정**: 연필 아이콘 클릭 → 정보 수정 → 저장
- **삭제**: 휴지통 아이콘 클릭 → 확인

## 🔍 요일 저장 방식

PostgreSQL의 INTEGER 배열을 사용하여 요일 저장:

```typescript
// 예시
repeat_days: [1, 3, 5]  // 월, 수, 금

// 요일 매핑
0 = 일요일
1 = 월요일
2 = 화요일
3 = 수요일
4 = 목요일
5 = 금요일
6 = 토요일
```

## 🎯 주요 기능

### 루틴 적용 로직

```typescript
// 특정 월의 모든 날짜 중 선택된 요일만 필터링
const applyRoutineToMonth = async (routine, year, month) => {
  // 해당 월의 모든 날짜를 순회
  for (let day = 1; day <= lastDay; day++) {
    const date = new Date(year, month, day)
    const dayOfWeek = date.getDay()
    
    // 선택된 요일인 경우에만 SoD 생성
    if (routine.repeat_days.includes(dayOfWeek)) {
      // SoD 생성 (routine_id 포함)
    }
  }
}
```

### 보라색 표시 로직

```typescript
// SodeodModal.tsx
{sod.summary && (
  <div className={`text-sm font-semibold mb-1 ${
    sod.summary.startsWith('(루틴)')
      ? 'text-purple-600 dark:text-purple-400'  // 루틴 SoD
      : 'text-zinc-900 dark:text-zinc-100'       // 일반 SoD
  }`}>
    {sod.summary}
  </div>
)}
```

## 📝 API 함수

### supabase.ts에 추가된 함수들

```typescript
// 루틴 CRUD
getRoutinesByWorkspace(workspaceId, userId)
createRoutine(routine)
updateRoutine(routineId, userId, updates)
deleteRoutine(routineId, userId)

// 루틴 적용/해제
applyRoutineToMonth(routine, year, month, workspaceId, userId)
removeRoutineFromMonth(routineId, year, month, workspaceId, userId)
```

## 🐛 트러블슈팅

### 문제: "relation 'routines' does not exist"

**해결책**: SQL 마이그레이션이 실행되지 않았습니다. Step 2를 다시 실행하세요.

### 문제: "column 'routine_id' does not exist"

**해결책**: sods 테이블 수정이 실행되지 않았습니다. SQL 스크립트를 다시 실행하세요.

### 문제: RLS 정책 에러

**해결책**: Supabase에서 Authentication이 활성화되어 있는지 확인하고, RLS 정책을 다시 생성하세요.

## ✅ 완료 체크리스트

- [ ] `supabase_routines_migration.sql` 파일 실행
- [ ] Supabase Table Editor에서 `routines` 테이블 확인
- [ ] `sods` 테이블에 `routine_id` 컬럼 확인
- [ ] 애플리케이션 재시작 (`npm run dev`)
- [ ] "루틴 관리" 버튼 클릭 가능 확인
- [ ] 루틴 생성 테스트
- [ ] 루틴 적용 테스트
- [ ] 루틴 해제 테스트
- [ ] 보라색 "(루틴)" 표시 확인

## 🎉 완료!

모든 단계가 완료되면 루틴 관리 기능을 사용할 수 있습니다!

