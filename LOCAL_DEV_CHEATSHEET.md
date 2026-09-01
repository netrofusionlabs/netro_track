# NetroTrack Local Development Cheat Sheet

This guide contains the essential commands for running, tunneling, and testing the NetroTrack platform locally.

## 1. Tunnel to Production Databases (Optional)
If you need to query or interact with the live production databases from your local machine (e.g., using DBeaver, Prisma Studio, or RedisInsight), you can open secure SSH tunnels.

*Run these in separate terminal windows:*

```bash
# Tunnel Postgres (Available locally at 127.0.0.1:5433)
gcloud compute ssh nidhapathan45@netro-track-prod --project=netro-track-prod --zone=us-central1-a -- -N -L 5433:127.0.0.1:5432

# Tunnel Redis (Available locally at 127.0.0.1:6380)
gcloud compute ssh nidhapathan45@netro-track-prod --project=netro-track-prod --zone=us-central1-a -- -N -L 6380:127.0.0.1:6379
```

**Verify the tunnels are active:**
```bash
nc -vz 127.0.0.1 5433
nc -vz 127.0.0.1 6380
```

---

## 2. Run the Local Backend (Node.js/Prisma)
Run this if you want to test API changes locally before pushing to GitHub.

```bash
cd apps/backend
npm run dev
```

---

## 3. Run the Local Frontend (Angular)
Run this to start your local web application UI on `http://localhost:4200`.

```bash
cd apps/web
npm start
```

---

## 4. Switch Frontend API Target (`proxy.conf.json`)
If your Angular app is running locally, you can change which backend API it talks to without modifying the codebase architecture. 

Open `apps/web/proxy.conf.json` and change the `"target"`:

- **Talk to Local Backend:**
  ```json
  "target": "http://127.0.0.1:3000"
  ```
- **Talk to Test Environment Backend:**
  ```json
  "target": "https://netro-track-terraform-test-api.netrofusion.in"
  ```
- **Talk to Production Backend:**
  ```json
  "target": "https://netro-track-api.netrofusion.in"
  ```

> **Note:** Any time you edit the `proxy.conf.json` file, you must stop and restart the Angular server (`npm start`) for the changes to take effect!
