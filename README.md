# Verity

Describe a chip in plain English; an agent writes Verilog, tests it against a locked golden model, fixes its own bugs, then evolves smaller and faster versions. Entry for the Nebius x NVIDIA Global AI Hackathon.

## Layout

| Folder | What it is | Start here |
|---|---|---|
| `backend/` | Python FastAPI agent: orchestrator, Nemotron on Nebius Token Factory, Docker sandbox tools (Icarus, Verilator, cocotb, Yosys, OpenSTA, EQY), task packs, evals | `backend/README.md` |
| `frontend/` | Next.js static web app: replay of a recorded run, plus capped live runs against the backend | `frontend/README.md` |
| `docs/` | Product brief, design, UI spec and research. `docs/hackathon/` holds the original brief material | `docs/MEETING.md` |
| `.archify/` | User journey and plan diagrams | |

`REPORT.md` is the project record (status, decisions, change log).

## Run it

Frontend:

```
cd frontend
npm ci
npm run dev
```

Backend (Python 3.11+, Docker for the sandbox image):

```
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows; use source .venv/bin/activate elsewhere
pip install -e .[dev]
pytest -q
```

Copy `backend/.env.example` to `backend/.env` and add your Nebius key for live model runs. Keys never go in `frontend/`.
