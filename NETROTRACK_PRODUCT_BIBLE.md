Perfect. I think this is going to save you **months** of redesign later.

We're going to create something that startups and product companies normally spend weeks preparing.

# NetroTrack Product Bible

**Version:** Final
**Author:** NetroFusion Labs
**Product:** NetroTrack

---

# PART 1

# NETROTRACK PRODUCT BIBLE

## Product Vision, Business Requirements & Functional Specification

---

# 1. Product Overview

## Product Name

**NetroTrack**

## Tagline

**Track. Manage. Perform.**

---

## About NetroTrack

NetroTrack is a cloud-based, mobile-first Field Workforce Management Platform that enables organizations to digitize and manage their complete field workforce from a single application.

The platform provides real-time visibility into employee attendance, live GPS tracking, customer visits, inspections, product sales, employee productivity, and business operations.

Instead of using multiple applications for attendance, employee tracking, customer visits, reporting, and field inspections, NetroTrack consolidates everything into one unified platform.

The application is designed as a **Multi-Tenant SaaS Platform**, allowing multiple organizations to use the same platform while ensuring complete data isolation and security.

---

# 2. Vision

To become the most trusted Field Workforce Management Platform that enables organizations to efficiently manage their employees, improve productivity, increase transparency, and simplify field operations through modern mobile technology.

---

# 3. Mission

To simplify field workforce management by providing organizations with a secure, scalable, mobile-first platform that digitizes attendance, GPS tracking, customer engagement, inspections, sales, and reporting.

---

# 4. Product Objectives

NetroTrack aims to replace multiple disconnected systems with one integrated platform.

The primary objectives are:

* Digitize employee attendance.
* Provide real-time employee location tracking.
* Verify customer visits using GPS and images.
* Record field inspections.
* Record product sales and orders.
* Provide management dashboards.
* Improve employee accountability.
* Generate meaningful reports.
* Reduce paperwork.
* Improve decision-making through analytics.

---

# 5. Target Industries

NetroTrack should not be built specifically for agriculture.

It should be configurable to support any organization with field employees.

Primary industries include:

* Agriculture
* Seed Companies
* Fertilizer Companies
* FMCG
* Pharmaceutical Sales
* Medical Representatives
* Construction
* Utility Companies
* Telecom
* Insurance
* Logistics
* Warehousing
* Service Engineers
* Survey Agencies
* Manufacturing
* Government Field Officers

---

# 6. Business Problem

Organizations face several operational challenges:

* Employees mark attendance but cannot be verified.
* Managers do not know the real location of field employees.
* Customer visits cannot be validated.
* Reporting is manual.
* Sales data is delayed.
* Field inspections are recorded on paper.
* Multiple applications are used for different activities.
* Managers lack real-time visibility.

---

# 7. Solution

NetroTrack solves these challenges by offering:

* Mobile attendance
* Background GPS tracking
* Customer visit verification
* Selfie verification
* Image capture
* Live manager dashboard
* Product sales recording
* Inspection recording
* Automated reporting
* Centralized data management

---

# 8. Product Philosophy

NetroTrack should always be:

* Mobile First
* Simple
* Fast
* Enterprise Grade
* Secure
* Scalable
* Offline Capable
* Battery Optimized
* Easy to Learn
* Easy to Deploy

---

# 9. Core Features

## Authentication

* Employee Login
* MPIN Login
* Biometric Login
* Device Registration
* Single Device Access
* Password Reset
* MPIN Reset

---

## Attendance

* Punch In
* Punch Out
* Working Hours
* Attendance History
* Daily Attendance
* Monthly Attendance
* Late Login
* Early Logout

---

## Live Tracking

* Background GPS Tracking
* Foreground Tracking
* Live Employee Location
* Route Playback
* Distance Calculation
* Working Area Monitoring
* Battery Status
* GPS Accuracy
* Last Seen

---

## Customer Visits

* Create Visit
* GPS Capture
* Selfie Capture
* Customer Photo
* Notes
* Products Discussed
* Visit Duration

---

## Product Sales

* Customer
* Dealer
* Product
* Quantity
* Price
* Remarks

---

## Inspection

* Farm
* Site
* Crop
* Observation
* Recommendation
* Photos
* GPS

---

## Reports

* Attendance
* GPS
* Route
* Distance
* Visits
* Sales
* Inspection
* Productivity

---

# 10. Product Type

NetroTrack is designed as a commercial SaaS platform.

One platform.

Multiple companies.

Each company has its own:

* Employees
* Managers
* Reports
* Data
* Branding (future)
* Subscription

---

# 11. User Roles

There are four user roles.

## Super Admin

Owns the entire platform.

Responsibilities:

* Create Companies
* Edit Companies
* Suspend Companies
* Activate Companies
* Create Client Admins
* Create Managers
* Create Users
* Platform Dashboard
* Subscription Management
* Billing (future)
* Platform Analytics
* Global Reports

---

## Client Admin

Represents an organization.

Responsibilities:

* Company Profile
* Branches
* Departments
* Designations
* Managers
* Users
* Reports
* Attendance Dashboard
* Company Settings

---

## Client Manager

Responsible for a team.

Responsibilities:

* Team Dashboard
* Live Team Tracking
* Attendance
* Visits
* Sales
* Inspections
* Team Reports
* Productivity

Managers should only see employees assigned to them.

---

## Client User

Field Employee.

Responsibilities:

* Login
* MPIN
* Punch In
* Punch Out
* Live Tracking
* Customer Visit
* Sales
* Inspection
* Profile
* History

---

# 12. Employee Daily Workflow

The typical workday should look like this:

1. Employee opens the app.
2. Logs in using MPIN or biometric.
3. Views dashboard.
4. Performs Punch In.
5. Background GPS tracking starts automatically.
6. Travels to customer locations.
7. Creates customer visits with GPS, photos, and notes.
8. Records product sales if applicable.
9. Records inspections if applicable.
10. Continues GPS tracking throughout the workday.
11. Reviews daily activity.
12. Performs Punch Out.
13. Tracking stops and attendance is finalized.

---

# 13. Manager Workflow

A manager can:

* View live team status.
* See which employees are currently working.
* View employee locations on a map.
* View attendance.
* Review customer visits.
* Review sales.
* Review inspections.
* View productivity reports.

Managers should never see data belonging to another company.

---

# 14. Client Admin Workflow

Client Admins can:

* Create managers.
* Create employees.
* Edit employees.
* Reset MPINs.
* View company reports.
* Configure company settings.
* Manage departments and branches.

---

# 15. Super Admin Workflow

The platform owner can:

* Onboard companies.
* Activate or deactivate companies.
* Manage subscriptions.
* View platform usage.
* Create any user.
* View global analytics.

---

# 16. Business Rules

* Every employee belongs to exactly one company.
* Every manager belongs to exactly one company.
* A company cannot access another company's data.
* Attendance begins only after Punch In.
* GPS tracking starts automatically after Punch In.
* GPS tracking stops immediately after Punch Out.
* Customer visits require GPS coordinates.
* Every visit must include a timestamp.
* Images should be optional or mandatory based on company settings (future).
* Only one active session per user.
* One registered device per user by default.
* Offline actions must sync automatically when connectivity returns.
* Every major action must be recorded in an audit log.

Excellent. This is where we start defining NetroTrack like an enterprise product.

This document should never change frequently. It becomes the **technical foundation** for the project.

---

# NETROTRACK PRODUCT BIBLE

# PART 2

# Technical Architecture & Engineering Standards

---

# 17. Technology Philosophy

NetroTrack is a commercial SaaS platform.

The architecture must be:

* Enterprise Ready
* Modular
* Scalable
* Secure
* Offline First
* API First
* Mobile First
* Cloud Native
* Multi Tenant
* Future Ready

The architecture should support future expansion without major refactoring.

---

# 18. Final Technology Stack

## Mobile

Framework

* React Native CLI

Language

* TypeScript

Navigation

* React Navigation

State Management

* Zustand

Server State

* TanStack Query

HTTP Client

* Axios

Forms

* React Hook Form

Validation

* Zod

Animations

* Reanimated

Maps

* React Native Maps

Camera

* Vision Camera

Secure Storage

* MMKV

Image Picker

* React Native Image Picker

Push Notifications

* Firebase Cloud Messaging

Authentication

* JWT
* Refresh Token
* MPIN
* Biometric Login

---

## Backend

Runtime

* Node.js

Framework

* Express.js

Language

* TypeScript

ORM

* Prisma

Realtime

* Socket.IO

Validation

* Zod

Authentication

* JWT

Password Encryption

* Argon2

Logging

* Pino

---

## Database

PostgreSQL

Hosted on

Neon

Reasons

* Managed
* Automatic Backup
* Branching
* High Availability
* Prisma Support
* Strong Reporting
* ACID Compliance

---

## Storage

Cloudflare R2

Purpose

* Selfie Images
* Customer Photos
* Inspection Photos
* Company Logos
* Product Images

Never store images inside PostgreSQL.

Only image URLs should be stored.

---

## Hosting

AWS EC2

Operating System

Ubuntu LTS

Reverse Proxy

Nginx

Process Manager

PM2

Deployment

GitHub Actions

---

## Maps

Google Maps Platform

Services

* Maps SDK
* Geocoding
* Reverse Geocoding
* Directions API (future)

---

## Push Notifications

Firebase Cloud Messaging

Notifications include

* Attendance Reminder
* Task Assigned
* Company Announcement
* Manager Notification
* Subscription Reminder

---

# 19. System Architecture

```text
                 React Native App
                         │
               HTTPS + Socket.IO
                         │
                  Cloudflare DNS
                         │
                      Nginx
                         │
              Node.js Express API
                         │
     ┌────────────┬─────────────┬────────────┐
     │            │             │
 PostgreSQL    Cloudflare R2    Firebase
   (Neon)         Images           FCM
```

---

# 20. Application Architecture

The application should follow a layered architecture.

Presentation Layer

↓

Business Layer

↓

Service Layer

↓

Repository Layer

↓

Database

Every feature should remain isolated.

Example

Attendance

Tracking

Visits

Sales

Inspection

Notifications

should not depend directly on each other.

---

# 21. Multi Tenant Strategy

Every organization is called a Tenant.

Every business record must belong to a company.

Examples

Company A

Employees

Attendance

Visits

Sales

Reports

Company B

Employees

Attendance

Visits

Sales

Reports

Data must never mix.

Every business table must include

companyId

---

# 22. Authentication Strategy

First Login

Employee ID

↓

Password

↓

Register Device

↓

Create MPIN

↓

Enable Biometrics

↓

Dashboard

Daily Login

MPIN

↓

Biometric

↓

Dashboard

Security Rules

Only one active device.

Multiple device support may become configurable in future.

---

# 23. Authorization

Role Based Access Control

Four Roles

Super Admin

Client Admin

Client Manager

Client User

Every API must verify

Authentication

AND

Authorization

Never trust the client application.

---

# 24. Background GPS Tracking

This is the most critical feature.

Tracking begins automatically after Punch In.

Tracking ends after Punch Out.

Tracking should continue

* Screen Locked
* Background
* User switches apps

Tracking interval

30 Seconds

Each record

Latitude

Longitude

Accuracy

Speed

Heading

Timestamp

Battery Percentage

Network Status

GPS Provider

---

# 25. Offline First Strategy

Field employees often work in villages.

Internet connectivity is unreliable.

The application must continue working.

Attendance

GPS

Visits

Sales

Inspection

should work offline.

When internet becomes available,

automatic synchronization should begin.

User should never manually sync.

---

# 26. Image Upload Strategy

Images should not pass through the API as large payloads.

Recommended Flow

Mobile requests upload authorization.

↓

Backend generates signed upload request.

↓

Mobile uploads directly to Cloudflare R2.

↓

Image URL is returned.

↓

Image URL is stored in PostgreSQL.

Benefits

Faster uploads

Lower server load

Lower bandwidth usage

Better scalability

---

# 27. Realtime Architecture

Managers should see employee locations live.

Technology

Socket.IO

Employee

↓

GPS

↓

Backend

↓

Socket

↓

Manager

Location updates should be lightweight.

Do not send images through sockets.

Only metadata.

---

# 28. Performance Requirements

App launch

Less than 3 seconds

API Response

Less than 500 ms

Login

Less than 2 seconds

Attendance

Instant

GPS Update

Every 30 seconds

Image Upload

Optimized

Cold Start

Minimal

---

# 29. Scalability Goals

Version One

Support

100 Companies

10,000 Employees

2,000 Concurrent Active Users

Future

10,000 Companies

500,000 Employees

50,000 Concurrent Users

Architecture should allow horizontal scaling.

---

# 30. Security Standards

HTTPS Only

JWT Authentication

Refresh Tokens

MPIN

Biometric Login

Encrypted Storage

Password Hashing

Audit Logging

Rate Limiting

Input Validation

Secure Headers

Role Based Access

Company Isolation

---

# 31. Error Handling

Every API should return

Success

Message

Data

Error Code

Timestamp

Never expose internal errors.

All unexpected exceptions must be logged.

---

# 32. Logging Strategy

Every request should be logged.

Track

User Login

Attendance

GPS Sync

Image Upload

Visit Creation

Sales

Inspection

API Errors

Authentication Failures

---

# 33. Monitoring

Future Integration

Grafana

Prometheus

Loki

Health Endpoints

Server Monitoring

Database Monitoring

Storage Monitoring

---

# 34. Deployment Strategy

Development

↓

GitHub

↓

GitHub Actions

↓

AWS EC2

↓

PM2 Restart

↓

Application Live

No manual deployments.

---

# 35. Backup Strategy

Database

Automatic Backup

Neon

Images

Cloudflare R2

Code

GitHub

Environment Variables

AWS Secrets Manager (Future)

---

# 36. Disaster Recovery

If EC2 fails

Launch another EC2

Deploy latest build

Connect to Neon

Connect to Cloudflare R2

Application becomes operational again

---

# 37. API Principles

REST APIs

Consistent naming

Versioning

/api/v1

Standard response format

Proper status codes

Pagination

Filtering

Searching

Sorting

No breaking changes

---

# 38. Engineering Principles

Follow

SOLID

DRY

KISS

YAGNI

Feature First Architecture

Single Responsibility

Dependency Injection (where useful)

Clean Code

Readable Code

Maintainable Code

---

# 39. Coding Standards

TypeScript Strict Mode

ESLint

Prettier

Conventional Commits

Semantic Versioning

Reusable Components

No Hardcoded Strings

Environment Variables

Meaningful Naming

Small Functions

Comprehensive Error Handling

---

# 40. Product Quality Standards

Every feature must satisfy:

* Functional correctness
* Security
* Performance
* Offline capability
* Accessibility where practical
* Maintainability
* Scalability
* Testability

No feature should be merged unless it meets these standards.

---

# Final Technical Principles

NetroTrack should always be developed with the mindset that it is a **commercial SaaS platform**, not a one-off client application. Every technical decision should support future growth, additional modules, more customers, and higher user volumes without requiring a major architectural rewrite.

Excellent. This is the most important part.

**Part 3** is where NetroTrack stops being "an idea" and becomes a **real product specification**.

This is the document I would give to every developer joining the project.

---

# NETROTRACK PRODUCT BIBLE

# PART 3

# Product Standards, UI/UX Guidelines & AI Development Rules

---

# 41. Product Design Philosophy

NetroTrack should never feel like a traditional ERP.

The application should feel like

* WhatsApp
* Google Maps
* Uber Driver
* Google Keep

Simple.

Minimal.

Fast.

Professional.

Every screen should help the employee complete work in the fewest possible steps.

---

# 42. Design Principles

Every screen must satisfy:

* Simple
* Clean
* Minimal
* Modern
* Enterprise Grade
* One Hand Usage
* Easy Navigation
* Large Touch Targets
* Fast Loading
* Offline Friendly

Avoid unnecessary popups.

Avoid too many nested screens.

---

# 43. Navigation Structure

The application should use role-based navigation.

After login:

```
Splash

↓

Authentication

↓

Load User

↓

Identify Role

↓

Load Role Dashboard
```

---

### Client User

Bottom Navigation

```
Home

Map

+

History

Profile
```

The center **+** button opens a quick action menu:

* New Visit
* Product Sale
* Inspection

---

### Client Manager

Bottom Navigation

```
Dashboard

Team

Map

Reports

Profile
```

---

### Client Admin

Bottom Navigation

```
Dashboard

Employees

Reports

Company

Profile
```

---

### Super Admin

Bottom Navigation

```
Dashboard

Companies

Users

Reports

Settings
```

---

# 44. Dashboard

Every role has a different dashboard.

## Client User Dashboard

Display:

* Welcome
* Attendance Status
* Punch In / Punch Out
* Working Hours
* Today's Distance
* Today's Visits
* Today's Sales
* Today's Inspections
* Notifications

---

## Client Manager Dashboard

Display:

* Employees Working
* Employees Offline
* Present Employees
* Absent Employees
* Live Employees
* Today's Visits
* Today's Sales
* Team Productivity

---

## Client Admin Dashboard

Display:

* Company Overview
* Employee Count
* Attendance Summary
* Active Employees
* Reports
* Company Announcements

---

## Super Admin Dashboard

Display:

* Total Companies
* Total Employees
* Active Companies
* Active Users
* Platform Health
* Subscription Summary

---

# 45. Attendance Module

Employee taps:

```
Punch In
```

Immediately:

* Attendance starts
* GPS tracking starts
* Working hours start
* Live status becomes "Working"

Punch Out:

* Attendance ends
* GPS tracking stops
* Working hours calculated

---

# 46. GPS Tracking

Tracking starts automatically.

No manual action.

Capture every 30 seconds:

* Latitude
* Longitude
* Accuracy
* Speed
* Heading
* Timestamp
* Battery %
* Network Type

Managers see location in near real time.

---

# 47. Customer Visit Flow

```
Employee

↓

Reach Customer

↓

Tap +

↓

New Visit

↓

Capture

Customer

Village

GPS

Selfie

Images

Notes

↓

Submit

↓

Continue Tracking
```

Visit should require GPS.

---

# 48. Product Sales Flow

```
New Sale

↓

Select Customer

↓

Select Product

↓

Quantity

↓

Price

↓

Remarks

↓

Submit
```

---

# 49. Inspection Flow

```
Inspection

↓

Farm / Site

↓

Category

↓

Observation

↓

Recommendation

↓

Images

↓

GPS

↓

Submit
```

---

# 50. Reports

Employee

* Attendance History
* Visit History
* Sales History
* Inspection History

Manager

* Team Attendance
* Team Visits
* Team Sales
* Productivity

Admin

* Company Reports
* Attendance
* Working Hours
* Employee Performance

Super Admin

* Platform Analytics
* Company Usage
* Subscription Metrics

---

# 51. Notifications

Types:

Attendance Reminder

Daily Summary

Task Assigned

Manager Announcement

Company Announcement

Subscription Reminder

Future:

Geofence Alert

Low Battery Alert

Offline Alert

---

# 52. Offline Behaviour

If internet is unavailable:

* Attendance still works
* GPS is queued
* Visits are saved locally
* Sales are saved locally
* Inspections are saved locally

When internet returns:

Everything syncs automatically.

User intervention should not be required.

---

# 53. Error Handling

Every error should have:

* Friendly message
* Retry option
* Automatic logging

Never expose internal technical errors.

---

# 54. Accessibility

Use readable font sizes.

Support dark mode in future.

Support landscape where needed.

Use consistent spacing.

---

# 55. Coding Philosophy

Every module should be independent.

Never write business logic directly in screens.

Keep components reusable.

Prefer composition over duplication.

Write code that another developer can understand after one year.

---

# 56. AI Development Instructions

This project will be developed with AI assistance.

Every AI-generated implementation must follow these rules:

* Do not introduce new libraries unless approved.
* Follow the approved technology stack.
* Respect the multi-tenant architecture.
* Keep APIs backward compatible.
* Write production-quality code.
* Prefer maintainability over cleverness.
* Generate unit-testable code.
* Use meaningful names.
* Avoid hardcoded values.
* Handle loading, error, and offline states.
* Keep modules loosely coupled.
* Follow existing folder structure and coding conventions.

---

# 57. Future Modules

The architecture should allow adding:

* Task Assignment
* Expense Management
* Leave Management
* Route Planning
* Geo Fencing
* ERP Integration
* CRM Integration
* WhatsApp Integration
* Face Recognition Attendance
* Voice Notes
* White Label Support
* Subscription Billing
* AI Insights
* Predictive Analytics

without major architectural changes.

---

# 58. Release Roadmap

### Phase 1 (MVP)

* Authentication
* MPIN
* Attendance
* GPS Tracking
* Customer Visits

### Phase 2

* Sales
* Inspection
* Reports
* Push Notifications

### Phase 3

* Tasks
* Offline Enhancements
* Productivity Dashboard

### Phase 4

* White Label
* Billing
* ERP Integration
* AI Features

---

# 59. Success Criteria

NetroTrack is successful when:

* Employees can complete their daily work using only the mobile app.
* Managers have real-time visibility into field operations.
* Client admins can manage their workforce without external tools.
* Super admins can onboard and manage multiple companies.
* The platform scales to support thousands of organizations and hundreds of thousands of users.

---

# 60. Final Vision Statement

NetroTrack is not a GPS tracking app.

It is a **Field Workforce Management Platform**.

The objective is to become the single application that organizations use to manage every aspect of their field workforce—from attendance and live tracking to customer engagement, inspections, reporting, and analytics.

Every design and engineering decision should support that long-term vision.

---

# ✅ NetroTrack Product Bible Complete

With Parts 1, 2, and 3, you now have a strong foundation covering:

* Product vision and business goals
* User roles and workflows
* Functional and non-functional requirements
* Technical architecture and standards
* Security and scalability
* UI/UX philosophy
* Engineering guidelines
* AI development rules
* Product roadmap

One final recommendation: create a file named **`NETROTRACK_PRODUCT_BIBLE.md`** in the root of your repository and copy these three parts into it. Treat it as the authoritative specification. Before asking Antigravity Opus to implement any feature, provide or reference this document so every generated component, API, and screen stays aligned with the same product vision and architectural standards.
