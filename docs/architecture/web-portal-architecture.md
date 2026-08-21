# Web Portal Architecture (Angular)

> **Purpose:** Outline the architecture, structure, and design patterns of the responsive Angular web portal.
> **Scope:** Multi-role admin panels, attendance logs, visit trackers, sales logs, inspections portals, and API integration (excluding GPS live location).
> **Dependencies:** [System Architecture](system-architecture.md), [Application Architecture](application-architecture.md)

---

## 1. Project Organization

The web portal is located inside the `apps/web` workspace directory and is structured using standalone Angular components:

```
apps/web/
├── src/
│   ├── app/
│   │   ├── core/
│   │   │   ├── guards/
│   │   │   │   └── auth.guard.ts           # Route guards for session validation & roles
│   │   │   └── services/
│   │   │       └── api.service.ts          # Central HTTP client, authentication state
│   │   ├── features/
│   │   │   ├── attendance/                 # Shift punch action console & history
│   │   │   ├── companies/                  # Tenant organizations CRUD (Super Admin)
│   │   │   ├── customers/                  # Customers & Retail partner listings
│   │   │   ├── dashboard/                  # Unified multi-role statistics overview
│   │   │   ├── employees/                  # Employee directory management
│   │   │   ├── inspections/                # Field checklists & audit logs
│   │   │   ├── layout/                     # Responsive sidebar/bottom-nav wrapper
│   │   │   ├── login/                      # Password / MPIN login forms
│   │   │   ├── products/                   # Catalog listing & item settings
│   │   │   ├── profile/                    # User details & MPIN updates
│   │   │   └── reports/                    # Aggregated reports and log filters
│   │   ├── app.config.ts                   # Application configuration & providers
│   │   └── app.routes.ts                   # Standalone routes mapping
│   ├── index.html                          # Loads Inter typography
│   └── styles.css                          # Global HSL glassmorphism styling
```

---

## 2. API Integration & Authentication

The web portal interacts directly with the Express REST API. 

- **Token Storage:** Authenticated sessions persist via JWT storage in `localStorage`.
- **Interceptors:** The `ApiService` injects the `Authorization: Bearer <token>` header dynamically into all outgoing requests.
- **Multi-Tenancy:** In accordance with the system architecture, `companyId` is not sent in HTTP bodies or URLs; the backend `tenantMiddleware` automatically derives `companyId` from the decrypted JWT payload.

---

## 3. Responsive Layout & Aesthetics

To wow users and provide a premium, application-grade experience on both desktops and mobile devices, the interface implements:

1. **Responsive Shell:**
   - **Desktop Layout:** Sidebar navigation with full navigation control and current user status profile banner.
   - **Mobile Layout:** Collapsible sidebar drawer with a clean mobile bottom navigation bar providing quick shortcuts to core tools (Dashboard, Attendance, Visits, Sales, and Profile).
2. **Glassmorphism Styling:** Card blocks built using `backdrop-filter: blur(12px)` and subtle transparent border borders (`rgba(255, 255, 255, 0.05)`).
3. **Harmonious Palette:** The system uses curated Dark Mode HSL colors (`hsl(222, 24%, 8%)` background with electric-blue active indicators).
4. **SVG Visuals:** High-performance, styleable vector icons are used inline across all navigation buttons, preventing asset loading gaps.

---

## 4. Role-based Route Protection

The `authGuard` inspects routes against the current user's authenticated role. Permissions mapped to components:

| Route | Path | Allowed Roles |
|---|---|---|
| Dashboard | `/dashboard` | `SUPER_ADMIN`, `COMPANY_ADMIN`, `HR`, `MANAGER`, `EMPLOYEE` |
| Companies | `/companies` | `SUPER_ADMIN` |
| Employees | `/employees` | `SUPER_ADMIN`, `COMPANY_ADMIN`, `HR`, `MANAGER` |
| Customers | `/customers` | `SUPER_ADMIN`, `COMPANY_ADMIN`, `HR`, `MANAGER`, `EMPLOYEE` |
| Products | `/products` | `SUPER_ADMIN`, `COMPANY_ADMIN`, `HR`, `MANAGER`, `EMPLOYEE` |
| Attendance | `/attendance` | `COMPANY_ADMIN`, `HR`, `MANAGER`, `EMPLOYEE` |
| Visits | `/visits` | `COMPANY_ADMIN`, `HR`, `MANAGER`, `EMPLOYEE` |
| Sales | `/sales` | `COMPANY_ADMIN`, `HR`, `MANAGER`, `EMPLOYEE` |
| Inspections | `/inspections` | `COMPANY_ADMIN`, `HR`, `MANAGER`, `EMPLOYEE` |
| Reports | `/reports` | `COMPANY_ADMIN`, `HR`, `MANAGER` |
| Profile | `/profile` | `SUPER_ADMIN`, `COMPANY_ADMIN`, `HR`, `MANAGER`, `EMPLOYEE` |
