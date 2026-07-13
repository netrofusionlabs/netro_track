# API Design Standards

> **Purpose:** Define REST API conventions, response format, and design rules.
> **Dependencies:** [Backend Overview](backend-overview.md)

---

## URL Convention

```
{method} /api/v1/{resource}
{method} /api/v1/{resource}/{id}
{method} /api/v1/{resource}/{id}/{sub-resource}
```

- Resources are plural, kebab-case: `/customer-visits`, `/product-sales`
- IDs are UUIDs in the URL path
- Query parameters for filtering, sorting, pagination

---

## Standard Response Format

### Success
```json
{
  "success": true,
  "message": "Attendance recorded successfully",
  "data": { },
  "meta": { "timestamp": "2025-01-15T10:30:00Z", "requestId": "req_abc123" }
}
```

### Error
```json
{
  "success": false,
  "message": "Validation failed",
  "error": { "code": "VALIDATION_ERROR", "details": [{ "field": "latitude", "message": "Required" }] },
  "meta": { "timestamp": "2025-01-15T10:30:00Z", "requestId": "req_abc123" }
}
```

### Paginated
```json
{
  "success": true,
  "data": [],
  "pagination": { "page": 1, "pageSize": 20, "totalItems": 150, "totalPages": 8, "hasNext": true, "hasPrevious": false }
}
```

---

## HTTP Methods

| Method | Usage | Example |
|--------|-------|---------|
| GET | Retrieve resource(s) | `GET /api/v1/attendance` |
| POST | Create resource | `POST /api/v1/attendance/punch-in` |
| PUT | Full update | `PUT /api/v1/employees/{id}` |
| PATCH | Partial update | `PATCH /api/v1/employees/{id}` |
| DELETE | Soft delete | `DELETE /api/v1/employees/{id}` |

---

## Status Codes

| Code | Usage |
|:----:|-------|
| 200 | Success (GET, PUT, PATCH) |
| 201 | Created (POST) |
| 204 | No Content (DELETE) |
| 400 | Validation / bad request |
| 401 | Unauthenticated |
| 403 | Forbidden (wrong role / wrong company) |
| 404 | Not found |
| 409 | Conflict (duplicate) |
| 429 | Rate limited |
| 500 | Internal server error |

---

## Pagination

### Offset-based (default for lists)
```
GET /api/v1/employees?page=1&pageSize=20&sortBy=createdAt&sortOrder=desc
```

### Cursor-based (for GPS timeline)
```
GET /api/v1/tracking/route?userId={id}&date={date}&cursor={lastId}&limit=100
```

---

## Filtering & Sorting

```
GET /api/v1/attendance?date=2025-01-15&status=WORKING
GET /api/v1/employees?branchId={id}&departmentId={id}&status=ACTIVE
GET /api/v1/customer-visits?startDate=2025-01-01&endDate=2025-01-31&sortBy=createdAt&sortOrder=desc
```

---

## Rate Limiting

| Endpoint Category | Limit | Window |
|-------------------|:-----:|:------:|
| Auth (login, MPIN) | 5 | 1 minute |
| GPS batch sync | 60 | 1 minute |
| General API | 100 | 1 minute |
| Report generation | 10 | 1 minute |
| Upload signed URL | 30 | 1 minute |
