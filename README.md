# 📅 Leave Management System (LMS)

The system streamlines **employee leave requests**, **HR approvals**, and **real-time leave tracking** while ensuring smooth user experience and secure authentication.

---

## 🚀 Problem Statement

Managing leaves manually through emails or spreadsheets often leads to confusion and errors. HR needs a centralized system to:

* Maintain employee records.
* Allow employees to apply for leaves.
* Enable HR/Admins to approve or reject requests.
* Track leave balances in real-time.

This MVP solves these problems with a structured, secure, and scalable LMS.

---

## ✨ Key Features

### 🔑 Authentication & Session

* Email/password login.
* JWT token issuance & verification.
* Change password & refresh token.
* Logout (client-side token discard).
* Protected routes based on **role** (Employee/HR/Admin).

### 📊 Dashboard

* Snapshot cards: pending approvals (HR), upcoming holidays, recent requests.
* Quick links for frequent actions.

### 🌱 Leaves (Employee)

* Apply for leave: leave type, date range, reason.
* Half-day leave option (morning/afternoon).
* View own leave requests with filters.
* Cancel pending requests.
* Track leave balances (total, used, remaining).
* Calendar view of personal leaves + public holidays.

### ✅ Approvals (HR/Admin)

* View all leave requests with filters (status/date/employee).
* Approve/Reject with optional rejection reason.
* Detailed request drawer with full context.

### 👥 Employees (HR)

* Paginated employee list with search and department filter.
* Create employee (auto-generate ID, hashed password).
* Update selective fields.
* Soft delete (deactivate) employees.
* View employee leave balances.

### 🏷 Leave Types (HR)

* Public GET for forms & display.
* Create/Update leave types with default days, color, description.
* Soft delete with safety checks.
* Color-coded UI consistency.


## 🛠 Tech Stack

* **Frontend:** React, TailwindCSS, Axios
* **Backend:** Node.js, Express.js
* **Database:** Postgres
* **Deployment:**
  * Frontend: [https://symplora.vercel.app/](https://symplora.vercel.app/)  
  * Backend: [https://symplora.onrender.com/](https://symplora.onrender.com/) 

