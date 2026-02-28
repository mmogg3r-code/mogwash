# Neon Reel Casino (React + Smart Contract)

A modern slot-lobby style dApp inspired by multi-machine casino sites. It includes:
- Multi-page slot machine UI (each machine opens on its own route/page)
- Wallet connectivity for MetaMask and WalletConnect
- Solidity contract where deployer is admin and manages casino bankroll
- Player deposit, wager, withdrawal flow with a **20x initial deposit wagering requirement** before withdrawals

## 1) Project structure

- `src/` React front-end (Vite)
- `contracts/CasinoBank.sol` Solidity contract
- `.env.example` required front-end env variables

## 2) Local setup

```bash
npm install
cp .env.example .env
npm run dev
```

Open `http://localhost:5173`.

## 3) Deploy the smart contract

You can deploy with Remix quickly:

1. Open [https://remix.ethereum.org](https://remix.ethereum.org)
2. Create `CasinoBank.sol` and paste contents from `contracts/CasinoBank.sol`.
3. Compile with Solidity `0.8.24`.
4. In **Deploy & Run Transactions**, select **Injected Provider - MetaMask**.
5. Deploy. The wallet address that deploys becomes `admin` automatically.
6. Copy deployed contract address.

## 4) Configure frontend for deployed contract

Update `.env`:

```env
VITE_CONTRACT_ADDRESS=0x...deployedContract
VITE_CHAIN_ID=11155111
VITE_WALLETCONNECT_PROJECT_ID=your_wc_project_id
```

Get a WalletConnect project id at [https://cloud.walletconnect.com](https://cloud.walletconnect.com).

## 5) Build for production

```bash
npm run build
```

Static assets output to `dist/`.

## 6) Put it online on Hostinger

Because Hostinger supports React/Vite, you can deploy as static build or via Git integration.

### Option A: Upload static build
1. Run `npm run build` locally.
2. In Hostinger hPanel, open your site/public folder.
3. Upload the contents of `dist/`.
4. Ensure `.htaccess` supports SPA routing (so `/slot/...` resolves to `index.html`):

```apache
RewriteEngine On
RewriteBase /
RewriteRule ^index\.html$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]
```

### Option B: Hostinger Git deployment
1. Push this project to GitHub.
2. Connect repository in Hostinger deploy panel.
3. Set build command: `npm run build`.
4. Set publish directory: `dist`.
5. Add environment variables from `.env` in Hostinger dashboard.

## 7) Game flow and contract behavior

- **deposit()**: Player sends ETH to internal player balance.
- **wager(amount)**: Deducts player balance and increments total wagered.
- **withdraw(amount)**: Allowed only when `totalWagered >= initialDeposit * 20`.
- **settlePayout(player, amount)**: Admin credits winnings to player balance.
- **admin** is immutable and equals contract deployer address.

## 8) Notes for production hardening

- Add audited randomness source (e.g., Chainlink VRF or secure backend signer).
- Add server-side game result verification and anti-cheat controls.
- Add KYC/compliance checks based on jurisdictions.
- Run a full smart contract security audit before launch with real funds.
