# API Reference

**Base URL:** `https://<your-server>/api`  
**Auth:** All protected routes require `Authorization: Bearer <token>` in the request header.  
**Content-Type:** `application/json` unless noted (KYC upload uses `multipart/form-data`).

---

## Table of Contents

1. [Authentication](#authentication)
2. [User Profile](#user-profile)
3. [KYC Verification](#kyc-verification)
4. [Wallet & Payments](#wallet--payments)
5. [Deposits](#deposits)
6. [Investments](#investments)
7. [Analytics & Holdings](#analytics--holdings)
8. [AI Assistant](#ai-assistant)
9. [Learning](#learning)
10. [Rewards & Achievements](#rewards--achievements)
11. [Admin — KYC Review](#admin--kyc-review)
12. [Admin — Platform Fees](#admin--platform-fees)

---

## Authentication

### Register

**POST** `/api/auth/register`  
Creates a new user account and returns a JWT.

> Rate-limited: 40 requests / 15 min per IP.

**Request body**

| Field | Type | Required |
|---|---|---|
| `email` | string | Yes |
| `password` | string | Yes |
| `full_name` | string | No |
| `phone` | string | No |
| `sharia_mode` | boolean | No |

**Example response**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "full_name": "Ahmed Ali",
    "phone": "+201001234567",
    "role": "user",
    "kyc_status": "not_submitted",
    "sharia_mode": false,
    "wallet_balance": 0
  }
}
```

---

### Login

**POST** `/api/auth/login`  
Authenticates a user and returns a JWT.

> Rate-limited: 40 requests / 15 min per IP.

**Request body**

| Field | Type | Required |
|---|---|---|
| `email` | string | Yes |
| `password` | string | Yes |

**Example response**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "full_name": "Ahmed Ali",
    "role": "user",
    "kyc_status": "approved",
    "wallet_balance": 5000
  }
}
```

---

## User Profile

### Get Profile

**GET** `/api/auth/me`  
Returns the authenticated user's profile.

> Auth required.

**Example response**

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "full_name": "Ahmed Ali",
    "phone": "+201001234567",
    "role": "user",
    "kyc_status": "approved",
    "sharia_mode": false,
    "wallet_balance": 5000
  }
}
```

---

### Update Profile

**PATCH** `/api/auth/me`  
Updates the authenticated user's profile fields.

> Auth required.

**Request body** (all fields optional)

| Field | Type |
|---|---|
| `full_name` | string |
| `phone` | string |
| `sharia_mode` | boolean |

**Example response**

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "full_name": "Ahmed Mohamed",
    "phone": "+201009876543",
    "sharia_mode": true
  }
}
```

---

### Delete Account

**DELETE** `/api/auth/account`  
Soft-deletes the authenticated user's account.

> Auth required. Fails if user has pending deposits, active investments, or held funds.

**Example response**

```json
{ "ok": true }
```

---

## KYC Verification

### Submit KYC Documents

**POST** `/api/kyc/submit`  
Uploads identity documents for KYC review.

> Auth required. Content-Type: `multipart/form-data`.

**Form fields**

| Field | Type | Required | Notes |
|---|---|---|---|
| `national_id_front` | file | Yes | JPEG, PNG, WebP, or PDF — max 5 MB |
| `national_id_back` | file | Yes | JPEG, PNG, WebP, or PDF — max 5 MB |
| `selfie` | file | Yes | JPEG, PNG, WebP, or PDF — max 5 MB |
| `address_proof` | file | No | JPEG, PNG, WebP, or PDF — max 5 MB |

**Example response**

```json
{
  "ok": true,
  "submission_id": "uuid"
}
```

---

### Get KYC Status

**GET** `/api/kyc/status`  
Returns the current user's KYC status.

> Auth required.

**Example response**

```json
{
  "kyc_status": "pending",
  "kyc_rejection_reason": null,
  "latest_submission": {
    "id": "uuid",
    "status": "pending",
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

`kyc_status` values: `not_submitted` | `pending` | `under_review` | `approved` | `rejected`

---

## Wallet & Payments

### Fund Wallet

**POST** `/api/payments/fund`  
Credits the user's wallet directly (card payments).

> Auth required.

**Request body**

| Field | Type | Required |
|---|---|---|
| `amount` | number | Yes |
| `method` | string | No |

**Example response**

```json
{
  "wallet_balance": 5200
}
```

---

### Withdraw Funds

**POST** `/api/payments/withdraw`  
Withdraws funds from the user's wallet (platform fee applies).

> Auth required.

**Request body**

| Field | Type | Required |
|---|---|---|
| `amount` | number | Yes |

**Example response**

```json
{
  "wallet_balance": 3800,
  "fee_amount": 12.5,
  "net_amount": 987.5
}
```

---

### Transaction History

**GET** `/api/payments/history`  
Returns the last 100 wallet transactions (deposits and withdrawals).

> Auth required.

**Example response**

```json
{
  "transactions": [
    {
      "id": "uuid",
      "type": "deposit",
      "gross_amount": 1000,
      "fee_amount": 20,
      "net_amount": 980,
      "created_at": "2024-01-15T10:30:00Z"
    },
    {
      "id": "uuid",
      "type": "withdrawal",
      "gross_amount": 500,
      "fee_amount": 5,
      "net_amount": 495,
      "created_at": "2024-01-14T09:00:00Z"
    }
  ]
}
```

---

## Deposits

### Create Deposit

**POST** `/api/deposits/`  
Creates a new deposit record and initiates the funding flow.

> Auth required.

**Request body**

| Field | Type | Required | Notes |
|---|---|---|---|
| `method` | string | Yes | `instapay` \| `bank` \| `card` |
| `amount` | number | Yes | Card deposits capped at 20,000 EGP |

**Example response**

```json
{
  "id": "uuid",
  "reference_code": "INVC1234567",
  "status": "pending",
  "created_at": "2024-01-15T10:30:00Z",
  "amount": 1000,
  "fee_amount": 20,
  "net_amount": 980,
  "method": "card"
}
```

> **Card deposits** are credited immediately. **Instapay / Bank** deposits stay `pending` until admin credits them.

---

### List Deposits

**GET** `/api/deposits/`  
Returns the user's last 10 deposits.

> Auth required.

**Example response**

```json
{
  "deposits": [
    {
      "id": "uuid",
      "reference_code": "INVI7654321",
      "method": "instapay",
      "status": "pending",
      "amount": 2000,
      "fee_amount": 0,
      "net_amount": 2000,
      "created_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

---

### Get Single Deposit

**GET** `/api/deposits/:id`  
Returns details for one deposit belonging to the authenticated user.

> Auth required.

**Example response**

```json
{
  "deposit": {
    "id": "uuid",
    "reference_code": "INVB9876543",
    "method": "bank",
    "status": "pending",
    "amount": 5000,
    "fee_amount": 0,
    "net_amount": 5000,
    "user_confirmed_sent": false,
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

---

### Confirm Deposit Sent

**PATCH** `/api/deposits/:id/confirm-sent`  
Marks a pending deposit as sent by the user (for bank/instapay flows).

> Auth required.

**Example response**

```json
{
  "ok": true,
  "deposit": {
    "id": "uuid",
    "status": "pending",
    "user_confirmed_sent": true
  }
}
```

---

## Investments

### List Available Investments

**GET** `/api/investments/`  
Returns all active investment products.

> Auth required.

**Query parameters**

| Param | Type | Description |
|---|---|---|
| `sharia` | `1` | If present, filters to halal-only investments |

**Example response**

```json
{
  "investments": [
    {
      "id": "uuid",
      "name": "Growth Portfolio",
      "category": "stocks",
      "min_investment": 500,
      "expected_return_low": 8,
      "expected_return_high": 15,
      "risk_level": "high",
      "is_halal": false,
      "description": "Diversified equity exposure"
    }
  ]
}
```

---

### Robo-Advisor Allocation

**POST** `/api/investments/robo`  
Generates a rule-based portfolio allocation. No login required.

**Request body**

| Field | Type | Required | Notes |
|---|---|---|---|
| `goal` | string | Yes | e.g. `"grow"`, `"preserve"` |
| `horizon` | string | Yes | e.g. `"short"`, `"long"` |
| `risk` | string | Yes | e.g. `"low"`, `"medium"`, `"high"` |
| `isSharia` | boolean | No | Returns halal-compliant allocation if true |

**Example response**

```json
{
  "allocation": {
    "stocks": 45,
    "baskets": 25,
    "bonds": 15,
    "gold": 15
  },
  "label": "Growth — Long Horizon",
  "explanation": "Aggressive growth allocation with heavy equity exposure.",
  "expected_return": "8–15%",
  "risk_level": "high"
}
```

---

### Apply Investment

**POST** `/api/investments/apply`  
Creates an investment portfolio and deducts the amount (+ fee) from the wallet.

> Auth required.

**Request body**

| Field | Type | Required |
|---|---|---|
| `amount` | number | Yes |
| `allocation` | object | Yes — `{ stocks, baskets, bonds, gold }` (values are percentages summing to 100) |
| `reasoning` | string | No |
| `is_sharia` | boolean | No |
| `name` | string | No |

**Example response**

```json
{
  "portfolio": {
    "id": "uuid",
    "name": "My Portfolio",
    "allocation": { "stocks": 40, "baskets": 20, "bonds": 30, "gold": 10 },
    "status": "active",
    "created_at": "2024-01-15T10:30:00Z"
  },
  "wallet_balance": 3500,
  "fee_amount": 25
}
```

---

### List Investment Positions

**GET** `/api/investments/positions`  
Returns all active portfolios for the authenticated user.

> Auth required.

**Example response**

```json
{
  "positions": [
    {
      "id": "uuid",
      "name": "My Portfolio",
      "allocation": { "stocks": 40, "baskets": 20, "bonds": 30, "gold": 10 },
      "is_sharia": false,
      "status": "active",
      "created_at": "2024-01-15T10:30:00Z",
      "amount": 1000,
      "fee_amount": 10
    }
  ]
}
```

---

### Exit Investment Position

**POST** `/api/investments/:id/exit`  
Closes an investment position and returns funds to the wallet.

> Auth required.

**Example response**

```json
{
  "wallet_balance": 4520,
  "amount": 1040,
  "transaction_id": "uuid"
}
```

---

## Analytics & Holdings

### Investment Catalog (Benchmarks)

**GET** `/api/analytics/catalog`  
Returns investment category benchmarks with 30-day price series.

> Auth required.

**Example response**

```json
{
  "catalog": [
    {
      "id": "stocks",
      "slug": "stocks",
      "title": "Equities",
      "category": "stocks",
      "min_investment": 500,
      "expected_return_low": 8,
      "expected_return_high": 15,
      "risk_level": "high",
      "is_halal": false,
      "mtd_pct": 2.4,
      "volatility_label": "High",
      "series_30d": [102.1, 103.5, 101.8, 104.2]
    }
  ]
}
```

---

### Portfolio Holdings & Performance

**GET** `/api/analytics/holdings`  
Returns the user's total portfolio performance and per-bucket breakdown.

> Auth required.

**Example response**

```json
{
  "total_invested_egp": 10000,
  "total_current_value_egp": 10850,
  "total_return_pct": 8.5,
  "bucket_breakdown": [
    {
      "key": "stocks",
      "amount_egp": 4000,
      "pct_of_invested": 40,
      "invested_egp": 4000,
      "current_value_egp": 4380,
      "return_pct": 9.5
    }
  ],
  "portfolios": [
    {
      "id": "uuid",
      "name": "My Portfolio",
      "allocation": { "stocks": 40, "baskets": 20, "bonds": 30, "gold": 10 },
      "amount": 10000
    }
  ]
}
```

---

## AI Assistant

### Chat with Investment Assistant

**POST** `/api/assistant/chat`  
Sends a message to the AI investment assistant (powered by Groq / llama-3.3-70b). Returns advice and optionally a portfolio allocation.

> Auth required.

**Request body**

| Field | Type | Required | Notes |
|---|---|---|---|
| `messages` | array | Yes | Array of `{ role: "user" \| "assistant", content: string }` |
| `userProfile` | object | No | Optional context (e.g. `{ sharia_mode: true }`) |

**Example request**

```json
{
  "messages": [
    { "role": "user", "content": "I want to grow my savings over 5 years with medium risk." }
  ],
  "userProfile": { "sharia_mode": false }
}
```

**Example response**

```json
{
  "message": "Based on your goals, here is a balanced growth portfolio...",
  "allocation": {
    "stocks": 40,
    "baskets": 20,
    "bonds": 30,
    "gold": 10
  },
  "reasoning": "Medium-risk, 5-year horizon favors a balanced equity/bond mix.",
  "isSharia": false
}
```

> `allocation` and `reasoning` are only present when the assistant recommends a specific portfolio split.

---

## Learning

### List Modules

**GET** `/api/learning/modules`  
Returns all learning modules with the user's progress.

> Auth required.

**Example response**

```json
{
  "modules": [
    {
      "id": "uuid",
      "title": "Investing Basics",
      "description": "Learn the fundamentals of investing.",
      "lesson_count": 5,
      "completed_lessons": 3,
      "progress_pct": 60
    }
  ]
}
```

---

### Get Module Details

**GET** `/api/learning/modules/:id`  
Returns a module with all its lessons and the user's completion status for each.

> Auth required. `:id` can be the module UUID or its slug.

**Example response**

```json
{
  "module": {
    "id": "uuid",
    "title": "Investing Basics",
    "description": "Learn the fundamentals."
  },
  "lessons": [
    {
      "id": "uuid",
      "title": "What is a Stock?",
      "content": "...",
      "order": 1,
      "quiz": { "questions": [] },
      "completed": true
    }
  ]
}
```

---

### Mark Lesson Complete

**POST** `/api/learning/progress`  
Marks a lesson as completed for the authenticated user.

> Auth required.

**Request body**

| Field | Type | Required |
|---|---|---|
| `lesson_id` | string (UUID) | Yes |

**Example response**

```json
{ "ok": true }
```

---

### Submit Quiz

**POST** `/api/learning/quiz`  
Submits quiz answers for a lesson. Score ≥ 60% passes.

> Auth required.

**Request body**

| Field | Type | Required |
|---|---|---|
| `lesson_id` | string (UUID) | Yes |
| `answers` | array | Yes — array of answer values |

**Example response**

```json
{
  "score": 80,
  "passed": true,
  "certificate_issued": true
}
```

---

## Rewards & Achievements

### List Achievements

**GET** `/api/rewards/`  
Returns all achievements the user has earned, newest first.

> Auth required.

**Example response**

```json
{
  "achievements": [
    {
      "id": "uuid",
      "type": "first_investment",
      "title": "First Investment!",
      "description": "You made your first investment.",
      "earned_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

---

### Check for New Achievements

**POST** `/api/rewards/check`  
Manually triggers the achievement evaluation engine and returns any newly unlocked achievements.

> Auth required.

**Example response**

```json
{
  "achievements": [
    {
      "id": "uuid",
      "type": "kyc_approved",
      "title": "Verified!",
      "earned_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

---

## Admin — KYC Review

> All admin endpoints require the authenticated user to have `role: "admin"`.

### List Pending KYC Submissions

**GET** `/api/admin/kyc`  
Returns all KYC submissions with status `pending` or `under_review`.

> Auth required + Admin role.

**Example response**

```json
{
  "submissions": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "status": "pending",
      "created_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

---

### Approve KYC

**POST** `/api/admin/kyc/approve`  
Approves a user's KYC submission.

> Auth required + Admin role.

**Request body**

| Field | Type | Required |
|---|---|---|
| `userId` | string (UUID) | Yes |

**Example response**

```json
{ "ok": true }
```

---

### Reject KYC

**POST** `/api/admin/kyc/reject`  
Rejects a user's KYC submission with a reason.

> Auth required + Admin role.

**Request body**

| Field | Type | Required |
|---|---|---|
| `userId` | string (UUID) | Yes |
| `reason` | string | Yes |

**Example response**

```json
{ "ok": true }
```

---

## Admin — Platform Fees

### Fee Revenue Summary

**GET** `/api/payments/admin/fees`  
Returns a breakdown of platform fee revenue.

> Auth required + Admin role.

**Query parameters**

| Param | Values | Description |
|---|---|---|
| `period` | `all` \| `day` \| `month` | Time window (defaults to `all`) |

**Example response**

```json
{
  "total": 4250.75,
  "by_type": {
    "withdrawal": 1200.5,
    "investment": 3050.25
  },
  "breakdown": [
    {
      "date": "2024-01-15",
      "type": "investment",
      "amount": 25
    }
  ]
}
```

---

## Error Responses

All endpoints return errors in a consistent shape:

```json
{
  "error": "Human-readable error message"
}
```

| Status | Meaning |
|---|---|
| `400` | Bad request — missing or invalid fields |
| `401` | Unauthorized — missing or invalid token |
| `403` | Forbidden — insufficient role (admin required) |
| `404` | Resource not found |
| `409` | Conflict — duplicate record |
| `429` | Rate limit exceeded |
| `500` | Internal server error |

---

## Auth Header Quick Reference

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Tokens are valid for **7 days**. After expiry, the user must log in again to get a new token.
