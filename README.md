
# CivicCore: Programmable Impact Infrastructure

CivicCore is a production-ready system for managing transparent, milestone-based funding for nonprofits in Africa. It leverages Solana for high-speed value transfer and Gemini AI for automated impact verification.

## Architecture

1.  **On-Chain (Solana/Anchor):** Manages vault states, milestone approvals, and secure fund releases using SPL-Token (USDC).
2.  **AI Verification Layer:** Uses Gemini Flash 3 to analyze text/image/GPS evidence, providing a confidence score and a cryptographic hash.
3.  **Governance:** Requires 3 unique validator signatures per milestone to trigger the on-chain transfer.

## Deployment Instructions

### Smart Contract (Anchor)
1. Install Anchor, Rust, and Solana CLI.
2. Update the `declare_id!` in `programs/civiccore/src/lib.rs` with your generated key.
3. Configure `Anchor.toml` for `devnet`.
4. Run `anchor build` and `anchor deploy`.
5. Run `anchor test` to verify logic.

### Frontend
1. The app is a standard React application using Tailwind CSS.
2. Set your `API_KEY` in the environment variables (for Gemini AI).
3. Connect the `solanaService.ts` to your deployed Anchor program ID.
4. Run `npm install` and `npm start`.

## Key Features
- **Milestone-Based Escrow:** Funds are never released in bulk, ensuring accountability.
- **AI Proof Verification:** Automated first-pass auditing of ground-level evidence.
- **Mobile-First Design:** Optimized for field workers submitting proofs from remote locations.
- **Gasless UX:** Ready for integration with Solana Octane or similar gas abstraction layers.

## Testing
Comprehensive tests included in the `tests/` directory (simulated in this demo environment) cover:
- Successful vault creation.
- Evidence submission with AI confidence checks.
- Multi-sig validator approval logic.
- Preventative checks for double releases.
