# LeadPulse: Appendices

**Document type:** Supplementary reference (Second Review)  
**Product:** LeadPulse  
**Version:** 1.0  
**Date:** 27 April 2026  
**Related artifacts:** `01-Design-LeadPulse.md` through `05-Conclusion-LeadPulse.md`, `07-References-LeadPulse.md`, `08-Enhancement-Improvement-Log.md`

---

## Abstract

This document gathers **appendix material** for the LeadPulse documentation set: a **glossary** of terms and acronyms, a **map of project documents**, tables for **API versioning** and **environment variable pointers**, and a compact **requirement index** cross-referenced to the design document. It is not a substitute for the Design or Implementation reports; it supports quick lookup while writing, reviewing, or operating the system.

**Keywords:** glossary, document map, configuration index, requirements index.

---

## Table of Contents

- [Appendix A — Glossary and Acronyms](#appendix-a--glossary-and-acronyms)  
- [Appendix B — Documentation Map](#appendix-b--documentation-map)  
- [Appendix C — API and Versioning Conventions](#appendix-c--api-and-versioning-conventions)  
- [Appendix D — Environment and Configuration Pointers](#appendix-d--environment-and-configuration-pointers)  
- [Appendix E — Requirements Index (Design Cross-Reference)](#appendix-e--requirements-index-design-cross-reference)  
- [Appendix F — Repository Layout (High Level)](#appendix-f--repository-layout-high-level)  

---

## Appendix A — Glossary and Acronyms

| Term / acronym | Meaning |
|----------------|---------|
| **API** | Application Programming Interface; here, the FastAPI REST API under a versioned prefix (see Appendix C). |
| **BFF** | Backend-for-frontend pattern; the Next.js app calls the API and may use rewrites in development. |
| **CORS** | Cross-Origin Resource Sharing; configured on the API for split frontend/backend hosting. |
| **CRUD** | Create, read, update, delete operations on domain entities (e.g. leads). |
| **FR / NFR** | Functional / non-functional requirement identifiers in the design document. |
| **GBM** | Gradient boosting model; optional component in blended scoring (see design and ML sections). |
| **JWT** | JSON Web Token; used for `Authorization: Bearer` on protected routes. |
| **MVP** | Minimum viable product; scope reference for feature completeness vs. hardening. |
| **OpenAPI** | Machine-readable API description; FastAPI exposes `openapi.json` for the app. |
| **ORM** | Object-relational mapping; SQLAlchemy maps Python models to database tables. |
| **PII** | Personally identifiable information (e.g. email, phone). |
| **RBAC** | Role-based access control (`admin` vs `sales` in LeadPulse). |
| **REST** | Representational state transfer; HTTP resource style used by the API. |
| **SQLAlchemy** | Python ORM and SQL toolkit used for persistence. |
| **Triage** | Sales workflow of sorting leads by score, tier, or assignment. |
| **Webhook** | HTTP callback from an external system (e.g. ads or automation) into LeadPulse ingest endpoints. |
| **XAI** | Explainable AI; in LeadPulse, textual **reasons** alongside numeric scores. |

---

## Appendix B — Documentation Map

| File | Short description |
|------|-------------------|
| `docs/01-Design-LeadPulse.md` | System design, architecture, data model, security design, trade-offs. |
| `docs/02-Implementation-LeadPulse.md` | Code structure, pipeline, services, frontend wiring, limitations. |
| `docs/03-Testing-LeadPulse.md` | Test plan, cases, current evidence, risks, automation backlog. |
| `docs/04-Tools-and-Technologies-LeadPulse.md` | Stack inventory and justification. |
| `docs/05-Conclusion-LeadPulse.md` | Project conclusion and future work. |
| `docs/06-Appendices-LeadPulse.md` | This file — supplementary tables and indices. |
| `docs/07-References-LeadPulse.md` | Consolidated references and bibliography. |
| `docs/08-Enhancement-Improvement-Log.md` | Living change log with before-vs-after impact of enhancements and hardening updates. |
| `README.md` (repo root) | Setup, run commands, high-level product description, repo pointer. |

---

## Appendix C — API and Versioning Conventions

- **Versioned prefix:** REST resources are exposed under a configurable **v1** prefix (see `settings.API_V1_PREFIX` in the backend; typically `/api/v1`).  
- **OpenAPI / docs:** With the API running, interactive docs are available from FastAPI’s default documentation routes (commonly `/docs` and `/redoc` unless disabled). **JSON contract:** `GET {origin}/api/v1/openapi.json` when mounted at standard paths — confirm against your deployment.  
- **Health:** A health check endpoint is documented in the root `README` (e.g. `GET /health` on the API host).  
- **Authentication:** Protected routes expect `Authorization: Bearer <JWT>` except where explicitly public (certain health, public, verify, or tracking routes per implementation).

*Exact path names for documentation UIs are defined in `app.main` and may vary by configuration; verify against the running instance.*

---

## Appendix D — Environment and Configuration Pointers

Configuration is **twelve-factor** style: sensitive values belong in environment variables or host-specific secrets, not in Git.

| Location | Role |
|----------|------|
| `backend/.env.example` | Database URL, JWT, CORS, webhook secrets, optional provider keys. |
| `frontend/.env.example` | `NEXT_PUBLIC_API_URL` and optional dev proxy target for the API. |
| Host dashboards (e.g. Vercel, Render) | Production overrides for the same variable names. |

**Illustrative production notes (not exhaustive):**

- **CORS:** `CORS_ALLOW_ORIGINS` should list real frontend origins in production.  
- **API URL:** Frontend build must know the public API base (`NEXT_PUBLIC_API_URL`).  
- **Webhooks:** Meta and generic webhook secrets are documented in the design and `README` integration sections.

*Authoritative key names and comments remain in the `.env.example` files.*

---

## Appendix E — Requirements Index (Design Cross-Reference)

The design document **Section 3** lists functional and non-functional requirements. The table below is an **index** for navigation; full wording appears in `01-Design-LeadPulse.md`.

| ID | Category |
|----|----------|
| FR-1 — FR-6 | Functional (auth, leads, pipeline, scores, dashboard, public flows). |
| NFR-1 — NFR-3 | Non-functional (responsiveness, CORS, migrations / dev schema behavior). |

Test objectives **O-1 — O-6** in `03-Testing-LeadPulse.md` map to these at a high level; see **Section 5** of the testing document for traceability.

---

## Appendix F — Repository Layout (High Level)

| Path | Role |
|------|------|
| `backend/` | FastAPI application, models, services, ML helpers, `requirements.txt`. |
| `frontend/` | Next.js App Router, components, `package.json`, client libraries. |
| `docs/` | This documentation set. |

*Detailed file-level layout is in `02-Implementation-LeadPulse.md` (Section 2) and the root `README`.*

---

**End of Document 6 — Appendices**

*For citations, see `07-References-LeadPulse.md`.*
