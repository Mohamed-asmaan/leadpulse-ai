# LeadPulse: References

**Document type:** Consolidated bibliography and link list (Second Review)  
**Product:** LeadPulse  
**Version:** 1.0  
**Date:** 26 April 2026  
**Related artifacts:** `01-Design-LeadPulse.md` through `06-Appendices-LeadPulse.md`

---

## Abstract

This document **centralizes references** cited or implied across the LeadPulse documentation set. Entries are grouped for readability: **standards and classic sources**, **primary framework documentation**, **persistence and data**, **machine learning**, **testing and quality**, **security and web platform**, and **project artifacts**. Instructors may require a specific citation style; where applicable, this list provides enough detail to reformat (APA, IEEE, etc.) without losing the source.

**Keywords:** bibliography, technical documentation, citations, further reading.

---

## Table of Contents

1. [Standards and Classic Sources](#1-standards-and-classic-sources)  
2. [Backend and API Frameworks](#2-backend-and-api-frameworks)  
3. [Frontend and Tooling](#3-frontend-and-tooling)  
4. [Persistence, Data, and HTTP](#4-persistence-data-and-http)  
5. [Machine Learning](#5-machine-learning)  
6. [Testing, Linting, and Quality](#6-testing-linting-and-quality)  
7. [Security, Cryptography, and Web Platform](#7-security-cryptography-and-web-platform)  
8. [Optional Third-Party Services (Documentation)](#8-optional-third-party-services-documentation)  
9. [Project and Repository Artifacts](#9-project-and-repository-artifacts)  

**Note:** URLs were valid at documentation time; official documentation may move. Prefer the project’s `requirements.txt` and `package.json` for **exact versions**.

---

## 1. Standards and Classic Sources

- Fielding, R. T. *Architectural Styles and the Design of Network-based Software Architectures* (PhD thesis, 2000). Foundational treatment of **REST** and network-based software architecture. [https://www.ics.uci.edu/~fielding/pubs/dissertation/top.htm](https://www.ics.uci.edu/~fielding/pubs/dissertation/top.htm)

- IEEE 829 and related software test documentation concepts (as adapted by course or institution); see your syllabus for the **required** citation for test plan / test case terminology.

---

## 2. Backend and API Frameworks

- **FastAPI** (Python web framework, OpenAPI integration). [https://fastapi.tiangolo.com/](https://fastapi.tiangolo.com/)  
- **Uvicorn** (ASGI server). [https://www.uvicorn.org/](https://www.uvicorn.org/)  
- **Pydantic** v2 (data validation, settings). [https://docs.pydantic.dev/](https://docs.pydantic.dev/)  
- **Pydantic Settings** (configuration from environment). [https://docs.pydantic.dev/latest/concepts/pydantic_settings/](https://docs.pydantic.dev/latest/concepts/pydantic_settings/)  
- **Starlette** (ASGI foundation used by FastAPI; advanced middleware usage). [https://www.starlette.io/](https://www.starlette.io/)

---

## 3. Frontend and Tooling

- **Next.js** (App Router, deployment, configuration). [https://nextjs.org/docs](https://nextjs.org/docs)  
- **React** (UI library; via Next.js). [https://react.dev/](https://react.dev/)  
- **Next.js ESLint** (lint configuration for App Router projects). [https://nextjs.org/docs/app/building-your-application/configuring/eslint](https://nextjs.org/docs/app/building-your-application/configuring/eslint)

---

## 4. Persistence, Data, and HTTP

- **SQLAlchemy** 2.x ORM and Core. [https://docs.sqlalchemy.org/](https://docs.sqlalchemy.org/)  
- **psycopg2** (PostgreSQL adapter; when using Postgres). [https://www.psycopg.org/](https://www.psycopg.org/)  
- **HTTPX** (HTTP client for Python). [https://www.python-httpx.org/](https://www.python-httpx.org/)  
- **email-validator** (email validation, typical FastAPI stack). [https://pypi.org/project/email-validator/](https://pypi.org/project/email-validator/)  

---

## 5. Machine Learning

- **scikit-learn** (user guide and API reference; used for optional blending / ML-related helpers in the product). [https://scikit-learn.org/stable/user_guide.html](https://scikit-learn.org/stable/user_guide.html)

---

## 6. Testing, Linting, and Quality

- **FastAPI testing** (TestClient, async test patterns). [https://fastapi.tiangolo.com/tutorial/testing/](https://fastapi.tiangolo.com/tutorial/testing/)  
- **pytest** (common choice for Python test automation — cited as future work in the testing document). [https://docs.pytest.org/](https://docs.pytest.org/)  

---

## 7. Security, Cryptography, and Web Platform

- **OWASP** materials on XSS, CORS, and secure session handling (general hardening; consult current OWASP Top 10 and cheat sheets). [https://owasp.org/](https://owasp.org/)  
- **JWT** and JOSE — implementation in LeadPulse uses `python-jose` patterns as described in the implementation document; see library docs on [PyPI](https://pypi.org/) for the version pinned in `requirements.txt`.

---

## 8. Optional Third-Party Services (Documentation)

These integrations are **optional** and configured via environment variables; consult vendor docs when enabling:

- **Meta for Developers** (webhooks, Lead Ads). [https://developers.facebook.com/](https://developers.facebook.com/)  
- **Resend**, **Twilio**, enrichment providers, etc. — refer to `backend/.env.example` and implementation services for the exact environment keys; use each vendor’s current API documentation for integration details.

---

## 9. Project and Repository Artifacts

- LeadPulse monorepo **README** (prerequisites, local run, deployment notes). Path: `README.md` (repository root).  
- **GitHub** project mirror (per root README): [https://github.com/Mohamed-asmaan/leadpulse-ai](https://github.com/Mohamed-asmaan/leadpulse-ai)  
- **OpenAPI** contract: `GET /api/v1/openapi.json` (or as mounted) from a running API instance.  
- **Dependency lockfiles / manifests:** `backend/requirements.txt`, `frontend/package.json` (and lockfile as present).  
- **Design, Implementation, Testing, Tools, Conclusion, Appendices:** `docs/01-` through `06-` in this folder.

---

**End of Document 7 — References**

*Citations in `01-` through `04-` may be duplicated here for convenience; this file is the single consolidated list for the set.*
