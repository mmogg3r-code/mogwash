# Neon Reel Royale (Hostinger-ready React + Solidity)

A modern slot-lobby dApp inspired by classic casino machine sites, rebuilt with a stronger visual style and cleaner Web3 flow.

## What you get

- 🎰 Multi-machine lobby with dedicated page per slot (`/slot/:slotId`)
- ✨ Animated reel demo per machine (frontend)
- 💸 Slot page includes **Play with ETH** button (records `wager(amount)` on-chain before visual spin)
- 👛 Wallet support: MetaMask + WalletConnect
- 🏦 Solidity bankroll contract with admin = deployer
- 🔒 Withdrawal lock: players can withdraw only after wagering **20x initial deposit**
- ☁️ Hosting path compatible with Hostinger static hosting

## Stack

- Frontend: React + Vite + React Router + ethers
- Contract: Solidity (`contracts/CasinoBank.sol`)
- Deployment target: Hostinger static site (upload `dist/`)

---

## 1) Local development

```bash
npm install
cp .env.example .env
npm run dev
```

Open: `http://localhost:5173`

Required env values (`.env`):

```env
VITE_CONTRACT_ADDRESS=0xYourContractAddress
VITE_CHAIN_ID=11155111
VITE_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
```

If you don't set `VITE_CONTRACT_ADDRESS`, you can still paste the deployed address directly in the Wallet panel UI at runtime (it is saved in browser local storage).

---

## 2) Smart contract behavior

`contracts/CasinoBank.sol`:

- `admin` is set once in constructor to `msg.sender` (deployer)
- `deposit()` increases internal player balance
- `wager(amount)` deducts player balance and increases total wager + house reserve
- `withdraw(amount)` requires:
  - player exists
  - enough internal balance
  - `totalWagered >= initialDeposit * 20`
- `settlePayout(player, amount)` is admin-only (credit player winnings)
- `fundHouse()` admin-only funding

> Notes:
> - This contract tracks internal balances. Frontend gameplay is currently demo-only and should be replaced with secure game settlement logic before production use.

---

## 3) Deploy contract quickly (Remix)

1. Open https://remix.ethereum.org
2. Create file `CasinoBank.sol`
3. Paste code from `contracts/CasinoBank.sol`
4. Compile with Solidity `0.8.24`
5. In **Deploy & Run Transactions**, choose **Injected Provider - MetaMask**
6. Deploy and confirm transaction
7. Copy deployed contract address into `.env`

Wallet used for deployment becomes contract admin.

---

## 4) WalletConnect setup

1. Create project at https://cloud.walletconnect.com
2. Copy Project ID
3. Set `VITE_WALLETCONNECT_PROJECT_ID` in `.env`

---

## 5) Build for production

```bash
npm run build
```

Output folder: `dist/`

---

## 6) Put it online on Hostinger

### Option A — Upload static build

1. Build locally: `npm run build`
2. In Hostinger hPanel, open your domain public root
3. Upload all files inside `dist/`
4. Add `.htaccess` for SPA routing:

```apache
RewriteEngine On
RewriteBase /
RewriteRule ^index\.html$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]
```

### Option B — Git deployment

1. Push project to GitHub
2. Connect repo in Hostinger deployment panel
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Add env vars from `.env` inside Hostinger dashboard

---

## 7) Production hardening checklist

- Use verifiable randomness (Chainlink VRF or secure server-side signed outcomes)
- Add event indexing + analytics dashboard for dispute support
- Add per-jurisdiction legal/compliance controls
- Security-audit contract and deployment scripts before handling real funds
