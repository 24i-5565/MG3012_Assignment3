# FinTech Vault: Truffle and Ganache Deployment

**Course:** MG3012 Blockchain Technology for Business, Assignment 3
**Student:** Mir Rayyan Rabbani
**Roll Number:** 24i-5565
**Section:** FT-B
**Email:** i245565@isb.nu.edu.pk

---

## 1. Project Overview

This project extends Assignment 2 by moving the `FinTechVault` smart contract out of Remix and into a professional local development workflow built on the **Truffle Suite** and a **Ganache** local blockchain. The contract is compiled and deployed with Truffle migrations, verified with an automated test suite, and operated through a browser frontend that connects to the chain via **MetaMask** and **Web3.js**.

### Smart contract: `FinTechVault` (`contracts/SmartContract.sol`)

The contract maintains a per-address ledger of virtual funds and a public vault notice.

| # | Function | Type | Description |
|---|----------|------|-------------|
| 1 | `depositFunds(uint256 _amount)` | Write | Adds funds to the caller's balance (amount must be greater than zero). |
| 2 | `withdrawFunds(uint256 _amount)` | Write | Removes funds from the caller's balance (reverts on insufficient balance). |
| 3 | `updateNotice(string _newNotice)` | Write | Updates the public vault notice. |
| 4 | `getMyBalance()` | Read | Returns the caller's current balance. |
| 5 | `getVaultStats()` | Read | Returns the vault notice and the total transaction count. |
| 6 | `getHistory()` | Read | **Bonus:** returns the full on-chain transaction history. |

### Bonus features

- **Events:** `FundsDeposited`, `FundsWithdrawn` and `NoticeUpdated` are emitted on every state change and displayed live in the frontend's *Contract Events* panel.
- **On-chain transaction history:** every action is stored as a `TxRecord` (user, action, amount, timestamp) and shown in the frontend's *Transaction History* table.
- **Automated tests:** six Truffle/Mocha test cases in `test/FinTechVault.test.js`.
- **Automatic frontend configuration:** the migration script writes the deployed address and ABI to `frontend/contract-config.js`, so the frontend always targets the latest deployment.

---

## 2. Project Structure

```
MG3012_Assignment3/
├── contracts/
│   └── SmartContract.sol          # FinTechVault contract
├── migrations/
│   └── 1_deploy_contract.js       # Deploys FinTechVault and writes frontend config
├── frontend/
│   ├── index.html                 # dApp user interface
│   ├── script.js                  # Web3.js + MetaMask integration logic
│   ├── style.css                  # Styling
│   └── contract-config.js         # Auto-generated ABI + address (by truffle migrate)
├── test/
│   └── FinTechVault.test.js       # Automated contract tests
├── screenshots/                   # Compile, migrate and UI interaction evidence
├── truffle-config.js              # Network (Ganache) and compiler configuration
├── .gitignore
└── README.md
```

---

## 3. Prerequisites

| Tool | Version used | Installation |
|------|--------------|--------------|
| Node.js | v26.13.1 (LTS v18/v20 also supported) | https://nodejs.org |
| npm | 11.0.0 | Bundled with Node.js |
| Truffle | v5.11.5 (Solidity compiler 0.8.20) | `npm install -g truffle` |
| Ganache CLI | v7.9.2 | `npm install -g ganache` |
| MetaMask | Latest browser extension | https://metamask.io |

Verify the installation:

```bash
truffle version
ganache --version
```

> **Note:** On recent Node.js versions, Ganache prints a warning that "µWS is not compatible with your Node.js build" and falls back to a Node.js implementation. This warning is harmless and does not affect functionality.

---

## 4. Setup and Deployment (in order)

### Step 1: Start the local blockchain

Open a terminal in the project folder and keep it running:

```bash
ganache --wallet.deterministic --database.dbPath ./ganache-db --chain.chainId 1337
```

- RPC endpoint: `http://127.0.0.1:8545`, chain ID `1337`.
- `--wallet.deterministic` produces the same 10 funded test accounts on every run.
- `--database.dbPath` persists the chain, so deployments survive a Ganache restart.

### Step 2: Compile the contract

In a second terminal:

```bash
truffle compile
```

Expected output: `Compiled successfully using: solc: 0.8.20`.

### Step 3: Deploy the contract

```bash
truffle migrate
```

Expected output: a `contract address` for `FinTechVault`, followed by `Frontend config written to frontend/contract-config.js`.

To redeploy from scratch (for example after changing the contract or resetting Ganache):

```bash
truffle migrate --reset
```

### Configuration notes (`truffle-config.js`)

- The `development` network points to `127.0.0.1:8545` (use port `7545` for the Ganache desktop app).
- The compiler is pinned to Solidity `0.8.20` with `evmVersion: "paris"`, because Ganache v7 does not support the `PUSH0` opcode that newer EVM targets emit.
- `artifacts.require("FinTechVault")` in the migration uses the **contract name**, not the file name `SmartContract.sol`.

---

## 5. Running the Frontend

### Step 1: Configure MetaMask

1. Open MetaMask, go to **Settings → Networks → Add a network → Add a network manually**, and enter:
   - Network name: `Ganache Local`
   - RPC URL: `http://127.0.0.1:8545`
   - Chain ID: `1337`
   - Currency symbol: `ETH`
2. Import a Ganache account: **Account menu → Add account → Import account**, then paste a private key printed by Ganache at startup. With `--wallet.deterministic`, account (0) is:
   - Address: `0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1`
   - Private key: `0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d`

> These are publicly known Ganache test keys. Never send real funds to them or use them on a public network.

### Step 2: Serve the frontend

MetaMask does not inject into `file://` pages, so the frontend must be served over HTTP:

```bash
npx http-server frontend
```

Open `http://127.0.0.1:8080` in the browser where MetaMask is installed.

### Step 3: Use the dApp

1. Click **Connect MetaMask** and approve the connection. If MetaMask is on a different network, the dApp offers to switch to Ganache Local.
2. **Deposit Funds:** enter an amount, click *Deposit*, and confirm in MetaMask.
3. **Withdraw Funds:** enter an amount up to your balance, click *Withdraw*, and confirm.
4. **Update Notice:** enter a new message, click *Update*, and confirm.
5. After each transaction, the dashboard refreshes the balance, total transactions and notice, and shows the block number, transaction hash and gas used. The *Transaction History* and *Contract Events* panels list every action.

---

## 6. Testing

### Automated tests

With Ganache running:

```bash
truffle test
```

The suite deploys a fresh contract for each case and verifies:

1. The default notice and a zero transaction count on deployment.
2. A deposit updates the balance and emits `FundsDeposited`.
3. A zero deposit is rejected.
4. A withdrawal succeeds within the balance and an overdraft is rejected.
5. Balances are isolated per account.
6. Notice updates and the full transaction history are recorded correctly.

Result: **6 passing**.

### Manual testing through the dApp

| Test | Action | Expected result |
|------|--------|-----------------|
| Read state | Connect wallet | Balance `0`, total transactions `0`, default notice shown |
| Deposit | Deposit `100` | Balance `100`, total transactions `1`, `FundsDeposited` event listed |
| Withdraw | Withdraw `40` | Balance `60`, total transactions `2`, `FundsWithdrawn` event listed |
| Overdraft | Withdraw `1000` | Error message: *Insufficient vault balance*, no transaction sent |
| Invalid input | Deposit `0` | Validation message, no transaction sent |
| Notice | Update notice | New notice shown, `NoticeUpdated` event listed |
| Ganache | Check the Ganache terminal | Each transaction appears with its hash and block number |

---

## 7. Screenshots

The `screenshots/` folder contains:

| File | Shows |
|------|-------|
| `01_truffle_compile.png` | `truffle compile` output (solc 0.8.20) |
| `02_deployed_contract_address.png` | `truffle networks` showing the deployed `FinTechVault` address |
| `03_ui_before_transactions.png` | The dApp connected through MetaMask before any transaction |
| `04_metamask_confirmation.png` | The MetaMask transaction confirmation request |
| `05_after_deposit_100.png` | Balance 100 and 1 transaction after depositing 100 |
| `06_after_withdraw_40.png` | Balance 60 and 2 transactions after withdrawing 40 |
| `07_withdraw_1000_entered.png` | An overdraft amount entered before submitting |
| `08_deposit_zero_rejected.png` | Input validation rejecting a zero deposit |
| `09_overdraft_rejected.png` | The "Insufficient vault balance" error for an overdraft |
| `10_notice_history_events.png` | Notice update receipt, on-chain transaction history and contract events |
| `11_ganache_mined_transaction.png` | Ganache showing the mined transaction, gas used and block number |

---

## 8. Troubleshooting

| Problem | Solution |
|---------|----------|
| "No contract found at the configured address" | Ganache was restarted without `--database.dbPath`. Run `truffle migrate --reset`. |
| MetaMask "nonce too high" error | After resetting Ganache, open **MetaMask → Settings → Advanced → Clear activity tab data**. |
| MetaMask does not appear | Serve the frontend with `npx http-server frontend`; do not open `index.html` directly. |
| `truffle migrate` cannot connect | Make sure Ganache is running on port `8545`. |

---

## 9. Author

**Mir Rayyan Rabbani**
Roll Number: 24i-5565, Section FT-B
FAST-NUCES Islamabad
i245565@isb.nu.edu.pk
