# nc-manager — Project Kickoff Brief

> **For Claude Code**: 이 문서는 **nc-manager** 프로젝트의 첫 구축을 시작하기 위한 종합 브리핑입니다. 처음부터 끝까지 읽고, 불명확한 부분은 질문한 뒤 작업을 시작하세요. 기존 4개 자매 모듈(ChangeManager, APQPManager, AuditSay, GaugeManager)의 일관성을 유지하는 것이 매우 중요합니다.

---

## 0. 프로젝트 개요

### 0.1 무엇을 만드는가
자동차 부품 제조업(IATF 16949 환경)을 위한 **부적합 및 고객 클레임 관리 SaaS 모듈**.

기존 자매 모듈:
- **ChangeManager** — https://change-manager-self.vercel.app/ (변경관리)
- **APQPManager** — apqpmanager.com (선행품질계획)
- **AuditSay** — auditsay.com (감사관리)
- **GaugeManager** — gaugemanager.com (게이지/MSA)

NC-manager는 이 생태계의 마지막 핵심 모듈로, 향후 **통합 도메인 + SSO + 공통 조직/멤버 모델**로 묶일 예정.

### 0.2 핵심 설계 원칙: Dual-Track Architecture

부적합(Nonconformity)과 고객 클레임(Customer Complaint)은 본질적으로 다른 라이프사이클을 가짐:
- **Internal NC**: 회사 내부에서 발견 — 수입검사, 공정, 출하검사, 사내 audit, MSA 부적합 등
- **Customer Complaint**: 고객이 제기 — In-line(0km) / Field / 비공식 불만

→ **두 엔티티를 별도 테이블로 두되, 공통 CAPA 엔진(원인분석/대책/유효성/수평전개)을 공유**.

> 이중 트랙을 채택하는 이유: 필수항목·SLA·보고대상·KPI 산출방식이 두 도메인에서 다르기 때문. 그러나 근본원인 분석과 시정조치 프로세스는 동일하므로 분리하면 중복이 발생함.

### 0.3 용어 사전 (혼동 방지)
| 용어 | 정의 | 본 시스템 사용 |
|---|---|---|
| Nonconformity (NC) | 요구사항 미충족 사실 자체 | Internal NC 테이블 |
| Defect | 의도된 사용에 대한 부적합 (PL 연결 가능) | NC 또는 Complaint의 속성 |
| Complaint | 고객 불만족의 표현 (사실여부 무관) | Customer Complaint 테이블 |
| NTF | No Trouble Found — 조사 결과 부적합 없음 | Complaint의 종결 사유 중 하나 |
| 0km | 고객 inline 또는 출고 직후 발견 | Complaint.discovery_stage |
| Field | 시장/사용 중 발견 | Complaint.discovery_stage |
| CAPA | Corrective And Preventive Action | 공통 모듈 |
| 8D | 8 Disciplines 문제해결 방법론 | CAPA 양식 옵션 |

**모듈명**: **nc-manager** 로 확정. (Internal NC와 Customer Complaint를 모두 포괄하는 의미로, "NC"를 광의의 비적합/품질이슈 약어로 사용)

---

## 1. 기술 스택 (자매 모듈과 동일하게)

### 1.1 필수 스택
- **프레임워크**: Next.js (App Router) + TypeScript
- **DB**: Neon Postgres (자매 모듈과 동일 인스턴스 또는 신규 프로젝트 — 사용자 확인)
- **ORM**: Drizzle ORM (또는 Prisma — 자매 모듈 일치)
- **인증**: APQPManager의 회원가입/조직/멤버 관리 패턴을 그대로 차용
- **스타일**: Tailwind CSS + AuditSay의 디자인 토큰/컴포넌트 라이브러리 일치
- **호스팅**: Vercel (당장은 자체 도메인 없이 *.vercel.app 사용)
- **파일 저장소**: Vercel Blob 또는 S3 (자매 모듈과 동일)

### 1.2 자매 모듈에서 가져올 것
**작업 시작 전 반드시 확인**:
1. `apqpmanager.com` 레포의 다음 항목을 nc-manager로 복제/참조:
   - 회원가입 / 로그인 / 비밀번호 재설정 플로우
   - Organization 생성 및 Member 초대 플로우
   - Role 정의 (Owner / Admin / Member / Viewer 등)
   - 조직 전환 UI (Org Switcher)
2. `auditsay.com` 레포에서:
   - 디자인 시스템 (색상, 타이포, 컴포넌트, 사이드바, 헤더)
   - 페이지 레이아웃 패턴
   - 테이블 / 폼 / 모달 / 토스트 컴포넌트

> **Claude Code에게**: 만약 위 레포에 직접 접근이 안 되면, 사용자에게 해당 컴포넌트/스키마 export를 요청하세요. 디자인 일관성이 핵심입니다.

### 1.3 향후 통합 대비 (지금 코드에 반영해 둘 것)
- 환경변수 `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_BASE_DOMAIN` 사용
- 세션 쿠키 도메인을 `.{BASE_DOMAIN}` 으로 설정 가능하게 (지금은 비활성, 나중에 활성)
- API 라우트 prefix를 `/api/nc/...`로 통일 → 향후 모놀리식 통합 시 충돌 없음
- DB 스키마는 `nc_*` 또는 별도 schema namespace 사용

---

## 2. 도메인 모델

### 2.1 ERD 개념도

```
Organization (자매모듈 공유)
   └── Member (자매모듈 공유)
   └── Site / Plant
   └── Customer (고객 마스터)
   └── Supplier (공급사 마스터)
   └── Part (부품 마스터)
   └── Process (공정 마스터)

[Internal NC Track]
InternalNC
   ├── 발견단계: 수입검사/공정/출하검사/사내Audit/MSA/기타
   ├── Containment (봉쇄/격리)
   ├── Disposition (처분: 재작업/특채/폐기/반품)
   └── → CAPA (옵션, 중대도에 따라)

[Customer Complaint Track]
CustomerComplaint
   ├── 발견단계: 0km(inline) / Field / 비공식
   ├── 접수경로: 공식 클레임 / 이메일 / 전화 / 미팅
   ├── Initial Response (24시간 이내)
   ├── Containment (즉시 봉쇄)
   └── → CAPA (필수, 8D 권장)

[Common CAPA Engine]
CAPA
   ├── Issue (1..N parent: InternalNC 또는 CustomerComplaint)
   ├── Root Cause Analysis (5Why, Fishbone, Is/IsNot)
     ├── Occurrence cause (발생원인)
     └── Detection cause (유출원인)
   ├── Action Items (Correction / Corrective / Preventive)
   ├── Verification (유효성 평가)
   ├── Effectiveness Monitoring (N개월)
   └── Horizontal Deployment (수평전개 대상)
```

### 2.2 핵심 테이블 스키마 (Drizzle 예시)

```typescript
// === 마스터 ===
export const sites = pgTable('nc_sites', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').notNull().references(() => organizations.id),
  code: text('code').notNull(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const customers = pgTable('nc_customers', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').notNull(),
  code: text('code').notNull(),
  name: text('name').notNull(),
  // 고객별 SLA, 클레임 포털 URL 등
  initialResponseSlaHours: integer('initial_response_sla_hours').default(24),
  containmentSlaHours: integer('containment_sla_hours').default(48),
  finalReportSlaDays: integer('final_report_sla_days').default(15),
});

export const suppliers = pgTable('nc_suppliers', { /* ... */ });
export const parts = pgTable('nc_parts', { /* ... */ });
export const processes = pgTable('nc_processes', { /* ... */ });

// === 분류체계 (3단 + 자유태그) ===
export const ncCategoriesL2 = pgTable('nc_categories_l2', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id'),
  code: text('code').notNull(), // 'DIM', 'APP', 'FUNC', 'MAT', 'PKG', 'DOC', 'ETC'
  nameKo: text('name_ko').notNull(),
  nameEn: text('name_en').notNull(),
  isSystem: boolean('is_system').default(false), // 시스템 기본값 여부
});

export const ncCategoriesL3 = pgTable('nc_categories_l3', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id'),
  parentL2Id: uuid('parent_l2_id').notNull(),
  code: text('code').notNull(),
  nameKo: text('name_ko').notNull(),
  nameEn: text('name_en').notNull(),
});

// === Internal NC ===
export const internalNCs = pgTable('nc_internal_ncs', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').notNull(),
  ncNumber: text('nc_number').notNull(), // NC-2025-0001 (조직별 시퀀스)
  
  // 발견 정보
  discoveredAt: timestamp('discovered_at').notNull(),
  discoveryStage: text('discovery_stage').notNull(), // incoming|in_process|outgoing|internal_audit|msa|other
  discoveredBySiteId: uuid('discovered_by_site_id'),
  discoveredByProcessId: uuid('discovered_by_process_id'),
  discoveredByUserId: uuid('discovered_by_user_id').notNull(),
  
  // 발생 정보 (분리: 어디서 만들어졌는가)
  occurrenceSiteId: uuid('occurrence_site_id'),
  occurrenceProcessId: uuid('occurrence_process_id'),
  occurrenceSupplierId: uuid('occurrence_supplier_id'), // 수입검사 NC인 경우
  
  // 대상
  partId: uuid('part_id'),
  lotNumber: text('lot_number'),
  quantityInspected: numeric('quantity_inspected'),
  quantityNc: numeric('quantity_nc'),
  
  // 분류
  categoryL2Id: uuid('category_l2_id'),
  categoryL3Id: uuid('category_l3_id'),
  tags: text('tags').array(),
  
  // 내용
  title: text('title').notNull(),
  description: text('description'),
  
  // 중대도 / 우선순위
  severity: text('severity').notNull(), // critical|major|minor
  safetyRelated: boolean('safety_related').default(false),
  regulatoryRelated: boolean('regulatory_related').default(false),
  
  // 상태
  status: text('status').notNull().default('open'),
  // open → contained → disposition_decided → closed (또는 escalated_to_capa)
  
  // 봉쇄
  containmentLocation: text('containment_location'),
  containmentQuantity: numeric('containment_quantity'),
  containedAt: timestamp('contained_at'),
  containedByUserId: uuid('contained_by_user_id'),
  
  // 처분
  dispositionType: text('disposition_type'), // rework|deviation|scrap|return_to_supplier|use_as_is
  dispositionApprovedByUserId: uuid('disposition_approved_by_user_id'),
  dispositionApprovedAt: timestamp('disposition_approved_at'),
  dispositionNotes: text('disposition_notes'),
  
  // CAPA 연결
  capaId: uuid('capa_id'),
  capaRequired: boolean('capa_required').default(false),
  
  // 비용 (COPQ)
  costScrap: numeric('cost_scrap'),
  costRework: numeric('cost_rework'),
  costOther: numeric('cost_other'),
  
  closedAt: timestamp('closed_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// === Customer Complaint ===
export const customerComplaints = pgTable('nc_customer_complaints', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').notNull(),
  complaintNumber: text('complaint_number').notNull(), // CC-2025-0001
  
  // 고객 정보
  customerId: uuid('customer_id').notNull(),
  customerSiteName: text('customer_site_name'),
  customerReference: text('customer_reference'), // 고객측 클레임 번호
  
  // 접수
  receivedAt: timestamp('received_at').notNull(),
  receivedChannel: text('received_channel').notNull(), // portal|email|phone|meeting|informal
  isFormal: boolean('is_formal').default(true), // 비공식 불만 여부
  receivedByUserId: uuid('received_by_user_id').notNull(),
  
  // 발견 단계
  discoveryStage: text('discovery_stage').notNull(), // inline_0km|field|warranty|other
  
  // 대상
  partId: uuid('part_id'),
  lotNumber: text('lot_number'),
  quantityClaimed: numeric('quantity_claimed'),
  quantityConfirmed: numeric('quantity_confirmed'),
  
  // 분류
  categoryL2Id: uuid('category_l2_id'),
  categoryL3Id: uuid('category_l3_id'),
  tags: text('tags').array(),
  
  // 내용
  title: text('title').notNull(),
  customerDescription: text('customer_description'),
  
  // 중대도
  severity: text('severity').notNull(),
  safetyRelated: boolean('safety_related').default(false),
  recallRisk: boolean('recall_risk').default(false),
  
  // SLA 트래킹
  initialResponseDueAt: timestamp('initial_response_due_at'),
  initialResponseSentAt: timestamp('initial_response_sent_at'),
  containmentDueAt: timestamp('containment_due_at'),
  containedAt: timestamp('contained_at'),
  finalReportDueAt: timestamp('final_report_due_at'),
  finalReportSentAt: timestamp('final_report_sent_at'),
  
  // 상태
  status: text('status').notNull().default('received'),
  // received → acknowledged → contained → investigating → 8d_in_progress → final_reported → closed
  // 또는 closed_ntf (No Trouble Found)
  resolutionType: text('resolution_type'), // confirmed_nc|ntf|customer_misuse|partial
  
  // CAPA 연결 (필수)
  capaId: uuid('capa_id'),
  
  // 비용
  costRecallReturn: numeric('cost_recall_return'),
  costPenalty: numeric('cost_penalty'),
  costOther: numeric('cost_other'),
  
  closedAt: timestamp('closed_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// === 공통 CAPA ===
export const capas = pgTable('nc_capas', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').notNull(),
  capaNumber: text('capa_number').notNull(),
  
  sourceType: text('source_type').notNull(), // internal_nc|customer_complaint|audit|change|gauge|other
  sourceId: uuid('source_id').notNull(), // polymorphic
  
  methodology: text('methodology').notNull().default('8d'), // 8d|simple_capa|a3
  
  title: text('title').notNull(),
  problemStatement: text('problem_statement'),
  
  // 8D 단계 데이터는 JSONB로 (또는 서브테이블)
  d1Team: jsonb('d1_team'),
  d2Description: text('d2_description'),
  d3InterimContainment: text('d3_interim_containment'),
  d4RootCause: jsonb('d4_root_cause'), // {occurrence: {method, content}, detection: {...}}
  d5PermanentActions: jsonb('d5_permanent_actions'),
  d6Implementation: jsonb('d6_implementation'),
  d7Prevention: jsonb('d7_prevention'),
  d8Recognition: jsonb('d8_recognition'),
  
  status: text('status').notNull().default('open'),
  // open → in_progress → actions_implemented → effectiveness_monitoring → closed
  
  championUserId: uuid('champion_user_id'),
  
  effectivenessReviewDueAt: timestamp('effectiveness_review_due_at'),
  effectivenessReviewedAt: timestamp('effectiveness_reviewed_at'),
  effectivenessVerdict: text('effectiveness_verdict'), // effective|not_effective|partial
  
  closedAt: timestamp('closed_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const capaActions = pgTable('nc_capa_actions', {
  id: uuid('id').primaryKey().defaultRandom(),
  capaId: uuid('capa_id').notNull().references(() => capas.id),
  actionType: text('action_type').notNull(), // correction|corrective|preventive
  description: text('description').notNull(),
  responsibleUserId: uuid('responsible_user_id'),
  dueAt: timestamp('due_at'),
  completedAt: timestamp('completed_at'),
  evidence: text('evidence'),
  status: text('status').notNull().default('open'),
});

export const horizontalDeployments = pgTable('nc_horizontal_deployments', {
  id: uuid('id').primaryKey().defaultRandom(),
  capaId: uuid('capa_id').notNull(),
  targetType: text('target_type').notNull(), // part|process|supplier|customer|site
  targetId: uuid('target_id').notNull(),
  status: text('status').notNull().default('open'),
  appliedAt: timestamp('applied_at'),
});

// === 첨부 / 활동 로그 ===
export const ncAttachments = pgTable('nc_attachments', { /* polymorphic */ });
export const ncActivities = pgTable('nc_activities', { /* timeline */ });
```

### 2.3 분류체계 시드 데이터

L2 카테고리(시스템 기본):
- `DIM` 치수 (Dimensional)
- `APP` 외관 (Appearance)
- `FUNC` 기능 (Functional)
- `MAT` 재질 (Material)
- `PKG` 포장/라벨 (Packaging/Labeling)
- `DOC` 서류/COC (Documentation)
- `ETC` 기타 (Other)

L3는 시스템 기본 최소 + 조직이 자유 추가. 첫 운영 3개월 후 Pareto 보고 정제 예정.

---

## 3. 단계별 구현 로드맵

### Phase 1 — Capture & Containment (MVP, 2~3주)
**목표**: 부적합 발견 → 등록 → 봉쇄 → 처분 → 종결까지의 기본 플로우.

- [ ] 인증/조직/멤버 (APQPManager 패턴 복제)
- [ ] 마스터 관리 UI: Site, Customer, Supplier, Part, Process
- [ ] Internal NC 등록/조회/수정/종결
- [ ] Customer Complaint 등록/조회/수정/종결
- [ ] 봉쇄 정보 입력
- [ ] 처분 결정 (재작업/특채/폐기 등) + 결재 흐름(단순)
- [ ] 첨부파일 업로드
- [ ] 기본 리스트/상세/대시보드

### Phase 2 — CAPA & 8D (3~4주)
- [ ] CAPA 엔티티 + 8D 양식 UI
- [ ] 5Why / Fishbone / Is-IsNot 입력 도구
- [ ] 발생원인 vs 유출원인 분리 입력
- [ ] Action Items 관리 (담당자/기한/완료)
- [ ] CAPA를 NC/Complaint에서 생성/연결

### Phase 3 — Effectiveness & Horizontal (2주)
- [ ] 유효성 평가 일정 자동 생성 (예: Close 후 3개월)
- [ ] 재발 시 자동 reopen 또는 신규 NC 자동링크
- [ ] 수평전개 대상 등록 및 추적
- [ ] AuditSay와 연계 (audit finding → NC 생성)
- [ ] ChangeManager와 연계 (변경 검증 실패 → NC 생성)

### Phase 4 — Analytics & Reporting (2주)
- [ ] PPM 대시보드 (고객별/부품별/월별)
- [ ] COPQ 집계
- [ ] Pareto 분석 (L2/L3 분류별)
- [ ] SLA 준수율 (고객별)
- [ ] MTTR (Time-to-close) 평균
- [ ] 공급사 NC 스코어카드
- [ ] 8D 보고서 PDF export (고객 제출용)

### Phase 5 — Integration (도메인 통합 시점)
- [ ] 공통 도메인 + SSO 연결
- [ ] 자매 모듈과 단일 사이드바
- [ ] 통합 알림 센터

---

## 4. UI/UX 가이드

### 4.1 디자인 톤
- **AuditSay와 동일한 디자인 토큰** 사용 (색상, 폰트, 간격, 그림자)
- 사이드바: 자매 모듈 일관성 (좌측 고정, 모듈 스위처는 향후 통합 시 추가)
- 한국어 우선, 영어 토글 가능 (i18n 구조는 처음부터)

### 4.2 핵심 화면 목록 (Phase 1 기준)

| 화면 | 경로 |
|---|---|
| 대시보드 | `/dashboard` |
| 내부 부적합 리스트 | `/internal-nc` |
| 내부 부적합 신규 | `/internal-nc/new` |
| 내부 부적합 상세 | `/internal-nc/[id]` |
| 고객 클레임 리스트 | `/complaints` |
| 고객 클레임 신규 | `/complaints/new` |
| 고객 클레임 상세 | `/complaints/[id]` |
| 마스터 관리 | `/masters/{customers,suppliers,parts,processes,sites}` |
| 분류체계 관리 | `/masters/categories` |
| 조직/멤버 | `/settings/organization` |

### 4.3 등록 폼 UX 핵심
- **간소 모드 vs 상세 모드** 토글: 처음 신고 시에는 최소 5필드만(누가/언제/무엇이/어디서/얼마나), 이후 단계적으로 채움
- 필수항목은 단계(상태)별로 다름: open 단계엔 발견정보만, contained 단계엔 봉쇄정보 추가, etc.
- 자동 시퀀스 번호: 조직별 연도별 (예: NC-2025-0001)
- 첨부파일 드래그앤드롭

---

## 5. 처음 작업 시작 지침 (Claude Code에게)

### 5.1 첫 세션에 할 일
1. 사용자에게 **자매 모듈 레포 접근권한 또는 핵심 컴포넌트 export**를 요청
2. **APQPManager의 인증/조직/멤버 코드**를 받아 복제 시작점으로 사용
3. **AuditSay의 디자인 시스템 파일**(tailwind config, components, tokens) 확인
4. Neon DB: 신규 프로젝트 생성 vs 기존 공유 — 사용자 확인
5. 프로젝트 골격 생성:
   ```
   nc-manager/
     app/
     components/
     lib/
       db/         # Drizzle schema
       auth/       # 자매모듈 패턴
     drizzle/
     public/
   ```
6. Drizzle 스키마 작성 (위 2.2 기준) → 첫 마이그레이션
7. 인증 + 조직 + 멤버까지만 동작하는 첫 PR 만들고 사용자 확인

### 5.2 절대 하지 말 것
- 분류체계(L3)를 처음부터 100개씩 채워넣지 말 것 — 시드 최소화
- 8D 양식을 Phase 1에 넣지 말 것 — Phase 2까지 미룸
- 자매 모듈과 다른 디자인 톤·컴포넌트 사용 금지
- 폼 한 화면에 모든 필드 몰아넣기 금지 — 상태 단계별 진행

### 5.3 의사결정이 필요할 때 사용자에게 묻기
- DB 분리 vs 공유
- 모듈명 최종 확정 (nc-manager 확정)
- ORM 선택 (자매 모듈과 일치)
- Vercel 프로젝트명 / 임시 도메인
- 결재 흐름 깊이 (단순 승인자 1명 vs 다단계)

---

## 6. 향후 통합 체크리스트 (지금 코드에 심어둘 것)

- [ ] 모든 API 라우트 `/api/nc/*` prefix
- [ ] 환경변수로 도메인/앱이름 외부화
- [ ] DB 테이블 prefix `nc_*`
- [ ] 세션 쿠키 도메인 환경변수화
- [ ] 사이드바 네비게이션 컴포넌트는 추후 모듈 스위처로 교체 가능하게 분리
- [ ] 알림 시스템은 인터페이스로 추상화 (나중에 통합 알림 센터로 교체)

---

## 7. 참고 (질문 시 사용자에게 물어볼 키 항목)

1. 모듈명 최종 확정?
2. Neon DB: 신규 프로젝트 / 기존 공유?
3. 자매 모듈 레포 접근 가능 여부?
4. 첫 파일럿 고객(또는 라인) 있는가? 있다면 그쪽 분류체계·SLA를 시드로 우선 반영
5. 8D 양식: 고객사 지정 양식이 있는가, 표준 8D 사용해도 되는가?
6. 결재 흐름의 깊이 (1단계 / 2단계 / 다단계)?
7. 비용(COPQ) 입력 통화 단위 (KRW/USD 등)?

---

> **시작 명령어 예시 (Claude Code)**
> ```
> "위 NC-MANAGER_KICKOFF.md 를 읽고, 7번 항목 질문부터 사용자에게 물은 뒤,
>  Phase 1을 시작합시다. APQPManager의 인증/조직 코드를 가져와 골격을 세우고,
>  Drizzle 스키마는 2.2 기준으로 작성하세요."
> ```
