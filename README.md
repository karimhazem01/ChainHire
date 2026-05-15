# ChainHire — Decentralized Freelance Marketplace

> **Work without borders. Trust without compromise.**

A trustless freelance marketplace built on Ethereum blockchain where clients post jobs, freelancers apply, and payments are governed entirely by smart contract escrow — no middleman, no hidden fees, no central authority.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Running the Project Locally](#running-the-project-locally)
- [Smart Contract](#smart-contract)
- [Deployment to Sepolia](#deployment-to-sepolia)
- [Running Tests](#running-tests)
- [Environment Variables](#environment-variables)
- [Contract Address](#contract-address)
- [Video Demonstration](#video-demonstration)
- [Team](#team)

---

## Overview

ChainHire combines a traditional MERN stack with Ethereum smart contracts to create a decentralized freelance marketplace:

- **Clients** post jobs with ETH budgets and deadlines
- **Freelancers** apply with cover messages
- **Client accepts** → ETH is locked in smart contract escrow
- **Work is delivered** → Client approves → ETH released automatically (99% to freelancer, 1% platform fee)
- **Disputes** → Full refund to client
- **Messaging** → End-to-end encrypted using Ethereum wallet keys (EthCrypto)
- **Reputation** → Stored immutably on-chain per wallet address

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite |
| Backend | Node.js + Express |
| Database | MongoDB Atlas |
| Blockchain | Ethereum Sepolia Testnet |
| Smart Contract | Solidity 0.8.24 |
| Dev Framework | Hardhat v2.28.0 |
| Wallet | MetaMask |
| Web3 Library | ethers.js |
| Real-time | Socket.io |
| Encryption | EthCrypto |
| RPC Provider | Alchemy |

---

## Project Structure

```
ChainHire/
├── contracts/
│   └── FreelanceEscrow.sol        # Main escrow smart contract
├── scripts/
│   └── deploy.js                  # Hardhat deployment script
├── test/
│   └── FreelanceEscrow.test.js    # 19 unit tests
├── frontend/
│   ├── src/
│   │   ├── components/            # React components
│   │   ├── contracts/
│   │   │   └── FreelanceEscrow.json  # Contract ABI
│   │   ├── services/
│   │   │   └── api.js             # Backend API calls
│   │   └── utils/
│   │       └── web3.js            # ethers.js + contract setup
│   └── package.json
├── backend/
│   ├── models/
│   │   ├── User.js
│   │   ├── Job.js
│   │   ├── Application.js
│   │   └── Message.js
│   ├── routes/
│   │   ├── userRoutes.js
│   │   ├── jobRoutes.js
│   │   ├── applicationRoutes.js
│   │   └── messageRoutes.js
│   └── server.js
├── hardhat.config.js
├── .env                           # Environment variables (not committed)
├── .gitignore
└── README.md
```

---

## Prerequisites

Make sure you have the following installed before running the project:

- **Node.js** v22.13.0 or higher → [nodejs.org](https://nodejs.org)
- **npm** v8+
- **MetaMask** browser extension → [metamask.io](https://metamask.io)
- **MongoDB Atlas** account (free) → [mongodb.com/atlas](https://mongodb.com/atlas)
- **Alchemy** account (free) → [alchemy.com](https://alchemy.com)
- **Git**

---

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/karimhazem01/ChainHire.git
cd chainhire
```

### 2. Install root dependencies (Hardhat + blockchain tools)

```bash
npm install
```

### 3. Install backend dependencies

```bash
cd backend
npm install
cd ..
```

Backend installs: `express`, `mongoose`, `cors`, `dotenv`, `socket.io`

### 4. Install frontend dependencies

```bash
cd frontend
npm install
cd ..
```

Frontend installs: `react`, `react-router-dom`, `ethers`, `axios`, `socket.io-client`, `eth-crypto`, `@metamask/eth-sig-util`, `react-hot-toast`

---

## Environment Variables

### Root `.env` (for Hardhat deployment)

Create a `.env` file in the **project root**:

```env
RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_API_KEY
PRIVATE_KEY=YOUR_METAMASK_PRIVATE_KEY
```

> ⚠️ **Never commit your `.env` file. It is listed in `.gitignore`.**
> ⚠️ Use a dedicated development wallet. Never use a wallet holding real funds.

### Backend `.env`

Create a `.env` file inside the `backend/` folder:

```env
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/chainhire
PORT=5000
```

---

## Running the Project Locally

You need **three terminals** running simultaneously.

### Terminal 1 — Start the Backend

```bash
cd backend
node server.js
```

Expected output:
```
Server is running on port 5000
Connected to MongoDB
```

### Terminal 2 — Start the Frontend

```bash
cd frontend
npm run dev
```

Expected output:
```
VITE v5.x.x  ready in xxx ms
➜  Local:   http://localhost:5173/
```

### Terminal 3 — (Optional) Hardhat local node for local testing

```bash
npx hardhat node
```

Open your browser and go to: **http://localhost:5173**

---

## Smart Contract

The `FreelanceEscrow.sol` contract is located in `contracts/FreelanceEscrow.sol`.

### Key Functions

| Function | Who Can Call | Description |
|---|---|---|
| `fundJob(jobId, freelancer, deadline)` | Client | Locks ETH in escrow when accepting a freelancer |
| `approveDelivery(jobId)` | Client | Releases 99% ETH to freelancer, 1% to platform |
| `cancelJob(jobId)` | Client | Full ETH refund to client |
| `raiseDispute(jobId)` | Client | Locks funds, changes status to Disputed |
| `acceptDispute(jobId)` | Freelancer | Accepts dispute — full refund to client |
| `getJob(jobId)` | Anyone | Returns on-chain job details |
| `getReputation(wallet)` | Anyone | Returns points, completed jobs, total earned |
| `updateFee(newFee)` | Owner only | Updates platform fee (max 5%) |

### Security Features

- ✅ Custom ReentrancyGuard (no OpenZeppelin dependency)
- ✅ Checks-Effects-Interactions pattern on all ETH transfers
- ✅ Role-based access control via custom modifiers
- ✅ Immutable owner address
- ✅ Platform fee capped at 5%
- ✅ Direct ETH transfer rejection via `receive()` and `fallback()`

### Compile the Contract

```bash
npx hardhat compile
```

---

## Deployment to Sepolia

### Step 1 — Get Sepolia ETH

Go to [cloud.google.com/application/web3/faucet/ethereum/sepolia](https://cloud.google.com/application/web3/faucet/ethereum/sepolia) and request free Sepolia ETH for your wallet.

### Step 2 — Configure environment

Make sure your root `.env` has valid `RPC_URL` and `PRIVATE_KEY` values.

### Step 3 — Deploy

```bash
npx hardhat run scripts/deploy.js --network sepolia
```

Expected output:
```
Deploying contract...
RPC URL: Found
Private Key: Found
Signers count: 1
Deploying with account: 0xYourWalletAddress
Contract deployed to: 0xNewContractAddress
```

### Step 4 — Update contract address

Copy the deployed contract address and update `CONTRACT_ADDRESS` in `frontend/src/utils/web3.js`:

```js
export const CONTRACT_ADDRESS = "0xYourNewContractAddress";
```

### Step 5 — Update ABI

Copy the newly generated ABI file:

```
From: artifacts/contracts/FreelanceEscrow.sol/FreelanceEscrow.json
To:   contracts/FreelanceEscrow.json
```

### Step 6 — Verify on Etherscan

Check your deployment at:
```
https://sepolia.etherscan.io/address/0xYourContractAddress
```

---

## Running Tests

```bash
npx hardhat test
```

Expected output:
```
FreelanceEscrow
  Happy Path
    ✔ Should fund a job and lock ETH in escrow
    ✔ Should approve delivery, pay freelancer 99% and owner 1%
    ✔ Should give freelancer 10 reputation points after completed job
    ✔ Should refund client fully when job is cancelled
    ✔ Should refund client fully when dispute is raised
  Edge Cases
    ✔ Should reject funding with 0 ETH
    ✔ Should reject funding the same job twice
    ✔ Should reject client being their own freelancer
    ✔ Should reject deadline in the past
    ✔ Should reject non-client trying to approve delivery
    ✔ Should reject non-client trying to cancel job
    ✔ Should reject approving a non-existent job
    ✔ Should reject approving an already completed job
    ✔ Should reject non-owner updating fee
    ✔ Should reject fee above 5%
    ✔ Should reject direct ETH transfer to contract
  Reputation System
    ✔ Should accumulate reputation across multiple completed jobs
    ✔ Should not give reputation on cancelled job
    ✔ (acceptDispute test)

19 passing
```

To run tests with gas report:

```bash
REPORT_GAS=true npx hardhat test
```

---

## Contract Address

| Network | Address |
|---|---|
| Ethereum Sepolia Testnet | `0xEA8CF05A1423cAEBC394016fAD7941d610FC826e` |
| Ethereum Mainnet | Not yet deployed |

View on Etherscan: [sepolia.etherscan.io/address/0xEA8CF05A1423cAEBC394016fAD7941d610FC826e](https://sepolia.etherscan.io/address/0xEA8CF05A1423cAEBC394016fAD7941d610FC826e)

---

## Video Demonstration

📹 **[Watch the Full Demo on YouTube]([https://www.youtube.com/watch?v=o28QV9cgGKU])**

The video covers:
- Overview of the ChainHire blockchain idea
- Live walkthrough: wallet connect → post job → apply → accept → MetaMask escrow funding → approve delivery
- On-chain verification via Sepolia Etherscan

---

## Important Notes

- This project is deployed on **Sepolia Testnet** — do not use real ETH
- The smart contract has **not been professionally audited** — use at your own risk
- Never share your MetaMask private key with anyone
- MetaMask must be set to **Sepolia network** for all blockchain features to work

---

*© 2026 ChainHire. Built with ❤️ on Ethereum.*
