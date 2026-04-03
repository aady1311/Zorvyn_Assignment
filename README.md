# Zorvyn_Assignment

Base URL: http://localhost:3000
1. AUTH (Public — no token needed)
POST /api/auth/register

{
  "email": "user@example.com",
  "password": "Pass@1234",
  "name": "John Doe",
  "role": "viewer"
}


json
POST /api/auth/login

{
  "email": "admin@finance.dev",
  "password": "Admin@1234"
}


json
Copy the token from login response — add it to all protected requests as:
Header: Authorization: Bearer <token>

2. USERS (Admin token required)
GET /api/users
No body. Optional query params:

?role=admin&status=active&page=1&limit=10


POST /api/users

{
  "email": "newadmin@finance.dev",
  "password": "Admin@1234",
  "name": "New Admin",
  "role": "analyst"
}


json
GET /api/users/:id
No body. Replace :id with a user UUID.

PATCH /api/users/:id

{
  "name": "Updated Name",
  "role": "admin",
  "status": "inactive"
}


json
DELETE /api/users/:id
No body.

3. RECORDS (Auth required)
GET /api/records
No body. Optional query params:

?type=income&category=Salary&date_from=2025-11-01&date_to=2026-04-30&page=1&limit=10


POST /api/records (Analyst/Admin only)

{
  "amount": 3500.00,
  "type": "income",
  "category": "Freelance",
  "date": "2026-04-02",
  "notes": "Project payment"
}


json
GET /api/records/:id
No body.

PATCH /api/records/:id (Analyst/Admin only)

{
  "amount": 4000.00,
  "category": "Salary",
  "notes": "Updated note"
}


json
DELETE /api/records/:id (Analyst/Admin only)
No body. Soft delete — sets deleted_at.

4. DASHBOARD
GET /api/dashboard/summary
No body. Optional query params:

?date_from=2025-11-01&date_to=2026-04-30

