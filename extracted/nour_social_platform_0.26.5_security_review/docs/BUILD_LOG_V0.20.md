# Nūr V0.20.0 — Realtime Messaging

## Scope
- Socket.IO gateway on namespace `/ws` with cookie session auth.
- Join conversation rooms; broadcast `message:new` and `conversation:updated`.
- Messages page connects with socket.io-client and appends live messages.
- Dependencies: `@nestjs/websockets`, `@nestjs/platform-socket.io`, `socket.io`, `socket.io-client`.

## Verification
- Source wiring: PASS.
- Runtime socket test: NOT VERIFIED in this environment.
