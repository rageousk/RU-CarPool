# RU-CarPool · UniRide

**A full-stack carpooling application built as a Computing & Informatics Senior Capstone at Rowan University.**

RU-CarPool, branded **UniRide** in the interface, helps students coordinate shared rides through separate rider and driver dashboards. Riders create trip requests with pickup and destination details; drivers browse available requests, accept rides, and mark trips complete.

The team project brings together React interfaces, Google Maps integrations, an Express REST API, and Supabase authentication and data storage.

> **Project status:** Academic prototype. The repository contains the core ride-request and driver-acceptance workflows, with some unfinished screens and integrations. Local operation requires external services and a compatible Supabase database schema; database migrations are not included.

## Features

- **Rider dashboard:** Create requests with pickup and destination locations, departure time, passenger count, and notes. View current requests, assigned-driver details, and completed or cancelled rides.
- **Driver dashboard:** Browse open requests, accept rides, view current trips, and mark accepted trips complete. Drivers cannot accept their own requests.
- **Maps and trip estimates:** Address autocomplete, browser geolocation, route visualization, distance calculation, and passenger-count-based cost estimates. Estimates are informational; the app does not process payments.
- **Authentication:** Email/password registration and login through Supabase Auth, session persistence, and protected dashboard routes. Google and Microsoft sign-in options require provider configuration.
- **Profiles:** Edit contact information and maintain a driver profile with vehicle details.
- **State and feedback:** React Context coordinates driver ride data; dashboards provide refresh controls and loading, error, and empty states.

## Technology

| Area | Technologies |
| --- | --- |
| Frontend | React 18, JavaScript/JSX, React Router, CSS |
| State management | React Context, React hooks, browser storage |
| Backend | Node.js, Express 5, REST endpoints |
| Authentication and database | Supabase Auth, Supabase PostgreSQL |
| Location services | Google Maps JavaScript API, Places autocomplete, directions, geocoding, distance calculations |
| Development tools | Vite, ESLint, nodemon, Git |

## How the application works

1. A user signs in and opens the **Rider** dashboard.
2. The rider selects locations and submits a request. The Express API saves it in `ride_demands` with an `open` status.
3. A user with an enabled driver profile opens the **Driver** dashboard and accepts an available request. The API creates a record in `ride_claims` and marks the request `claimed`.
4. The rider can view the assigned driver's details. The driver can mark the trip complete, updating the claim and request to `completed`.

The frontend uses Supabase for authentication and passes bearer tokens to protected Express endpoints. The backend accesses application tables through its server-side Supabase client. Driver request lists refresh through polling and manual refresh controls.

## Repository guide

| Path | Purpose |
| --- | --- |
| [`frontend/src/pages`](frontend/src/pages) | Home, authentication, dashboard, profile routing, and About page |
| [`frontend/src/components`](frontend/src/components) | Rider and driver interfaces, maps, forms, ride lists, and profile settings |
| [`frontend/src/context/RideContext.jsx`](frontend/src/context/RideContext.jsx) | Driver request, current-ride, and history state |
| [`frontend/src/lib/supabaseClient.js`](frontend/src/lib/supabaseClient.js) | Browser authentication client |
| [`backend/server.js`](backend/server.js) | Express setup, CORS configuration, and route registration |
| [`backend/routes`](backend/routes) | Authentication, profiles, ride requests, ride claims, and administration endpoints |
| [`backend/lib/supabase.js`](backend/lib/supabase.js) | Server-side Supabase clients |

## Local setup

### Prerequisites

- Git, npm, and **Node.js 22.12 or newer**.
- A Supabase project with authentication configured and the application's database schema available.
- Your own Google Maps browser API key with the services used by the app enabled and appropriate application/API restrictions.

### 1. Clone and install

```bash
git clone https://github.com/rageousk/RU-CarPool.git
cd RU-CarPool/backend
npm ci
cd ../frontend
npm ci
```

The frontend and backend have separate dependencies and scripts. Run commands from the relevant subdirectory.

### 2. Prepare Supabase

**This repository does not contain database migrations, table-creation SQL, or seed data.** Obtain a compatible schema export from the project team before attempting the complete workflow. Creating an empty Supabase project alone is insufficient.

The application code expects these tables in the public schema:

| Table | Purpose and relationships expected by the code |
| --- | --- |
| `users` | Application profiles associated with Supabase Auth user IDs, including contact information and driver/admin flags |
| `driver` | Driver and vehicle information, with a unique `user_id` used for profile upserts |
| `ride_demands` | Rider requests, locations and coordinates, departure time, passenger count, estimate, notes, and status |
| `ride_claims` | Driver assignments and statuses; a relationship to `ride_demands` is required for nested queries |

This table list describes the code's dependencies; it is not a complete schema definition. Column types, defaults, constraints, relationships, and access policies must match the original database.

For local authentication, configure the Supabase Site URL as `http://localhost:5173` and allow the redirect URLs used by the application: `http://localhost:5173`, `http://localhost:5173/dashboard`, and `http://localhost:5173/reset-password`. Email/password signup expects email confirmation. Enable Google and Azure/Microsoft providers only if you intend to use those sign-in options.

The email/password forms validate `@rowan.edu` and `@students.rowan.edu` addresses in the browser. This validation is not enforced across every backend or OAuth entry point.

### 3. Configure environment variables

Create `backend/.env`:

```dotenv
PORT=5050
FRONTEND_ORIGIN=http://localhost:5173
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
SUPABASE_REDIRECT_URL=http://localhost:5173/reset-password
```

Create `frontend/.env.local`:

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
VITE_API_URL=http://localhost:5050
```

Use the same Supabase project for both applications. Keep the service-role key on the backend only; never place it in a `VITE_` variable or commit it. Create your own local configuration rather than reusing environment backup files in the repository.

### 4. Configure Google Maps

The current Maps loader is a script tag in [`frontend/index.html`](frontend/index.html). Replace its existing `key=` value with your own browser API key, preserving `libraries=places`.

The code uses Places autocomplete, `DirectionsService`, `Geocoder`, and `DistanceMatrixService`. Ensure your Google Cloud project supports the APIs used by these integrations. Setting `VITE_GOOGLE_MAPS_API_KEY` alone does **not** configure the current script loader.

### 5. Start both applications

From `backend`, in one terminal:

```bash
npm run dev
```

From `frontend`, in another terminal:

```bash
npm run dev -- --port 5173 --strictPort
```

Open [the local frontend](http://localhost:5173). The backend runs at `http://localhost:5050`; [its health endpoint](http://localhost:5050/api/health) confirms the API process is responding, but does not test database connectivity.

The Vite development server proxies relative `/api` requests to port `5050`. If changing ports, update the proxy, `VITE_API_URL`, and backend `FRONTEND_ORIGIN` together. Restart the development servers after configuration changes.

### 6. Exercise the core workflow

With the database and external services configured, use two separate test accounts and browser sessions:

1. Sign up, confirm email, and log in as a rider.
2. In the Rider dashboard, select **Request Carpool**, choose pickup and destination locations, and create a future request.
3. In the second account, enable and save a driver profile under Settings.
4. Switch to the Driver dashboard, refresh **Requested Rides**, and accept the request.
5. Refresh the rider's current rides to inspect the assignment. In the driver's current rides, mark the trip complete and check both histories.

Use the dashboard for persisted ride requests. The landing-page modals provide location/route previews and sign-in prompts; they do not save rides themselves.

## Development commands

| Directory | Command | Purpose |
| --- | --- | --- |
| `frontend` | `npm run dev` | Start Vite development server |
| `frontend` | `npm run build` | Generate frontend production assets |
| `frontend` | `npm run lint` | Run ESLint |
| `frontend` | `npm run preview` | Preview built assets locally |
| `backend` | `npm run dev` | Start API with nodemon |
| `backend` | `npm start` | Start API with Node.js |

The `/api` proxy is configured for Vite development. A deployed frontend or build preview needs appropriate API routing for relative requests as well as the correct build-time environment variables.

## Current limitations

- **Incomplete screens:** Schedule, Messages, Help, and the driver's Home screen are placeholders. The standalone admin component is not registered as an application route.
- **Password flows:** The Settings password-change form calls an endpoint that is not implemented. The separate reset-password flow needs further validation, including its React hook usage and redirect/session handling.
- **Ride updates:** Lists use polling/manual refresh. Declining an unclaimed request in the driver dashboard is stored locally in the browser. Expired unclaimed requests are cancelled when the rider's current-rides screen loads, rather than by a background scheduler.
- **Deployment readiness:** Database migrations and automated workflow tests are absent. Server-side validation, authorization, and concurrent ride-acceptance behavior need further review before use with real users.

### Verification

Checked on September 21, 2026 against `main` at commit [`30ce20e`](https://github.com/rageousk/RU-CarPool/commit/30ce20eb323617702d25b8f868b81abb94e4f987), using Node.js 24.19.0:

| Check | Result |
| --- | --- |
| Frontend dependency installation | Passed with `npm ci --ignore-scripts` |
| Frontend production build | Passed; Vite reported a large-chunk warning |
| Frontend ESLint | 59 errors and 5 warnings, mostly unused variables, plus React hook and Fast Refresh issues |
| Backend JavaScript syntax | All 8 application files passed `node --check` |
| Live authentication, ride flows, and Maps | Not exercised against configured external services |

A successful build does not verify the live workflows. The backend `npm test` script is a placeholder, and this checkout contains no automated application test suite.

## Team

Credits reflect the project's [About page](frontend/src/pages/AboutPage.jsx).

| Team member | Project role |
| --- | --- |
| Sahil Kamboj | Project Lead & Frontend Developer |
| Nerissa Bautista | UI/UX Designer & Frontend Developer |
| Lokesh Pullakandam | Lead Backend Developer & Database Architect |
| Justin Khan | Backend Developer & API Integration Specialist |

Built collaboratively for the **Computing & Informatics Senior Capstone at Rowan University**. See the [commit history](https://github.com/rageousk/RU-CarPool/commits/main/) for recorded contributions.
