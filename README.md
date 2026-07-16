# 🌐 IP Subnetting Calculator & Address Architect

An elegant, highly interactive, client-side **FLSM (Fixed Length Subnet Masking)** and **VLSM (Variable Length Subnet Masking)** IP Subnetting Calculator built with React, Vite, Tailwind CSS, and TypeScript. 

Perfect for network engineers, systems administrators, and academic students, this tool lets you design classless network topologies visually and generate presentation-ready network allocations.

---

## ✨ Key Features

- **📶 Dual Subnetting Strategies:**
  - **FLSM Mode:** Equally slice a classless CIDR parent network based on a target number of subnets or a fixed usable host count.
  - **VLSM Mode:** Allocate subnets dynamically based on discrete host requirements, sorting from largest to smallest to avoid overlap and maximize efficiency.
- **🎨 Interactive Visual Allocation Map:**
  - Custom-drawn **SVG block-level map** representation of your contiguous address space.
  - Responsive pan and zoom controls (`+` / `-` / `Reset`).
  - Interactive hover tooltips showing precise network, broadcast, CIDR, and status details.
  - Striped pattern indicator for unallocated/free space.
- **📊 Advanced Calculated Subnets List:**
  - Robust table detailing **Subnet Name, Network IP, Prefix/Mask, Usable Range, Broadcast IP, and Host Capacity**.
  - Dynamic **text search** across all fields.
  - Interactive **column sorting** (Name, IP, Mask Prefix, and Host Capacity).
  - Quick-filters to segment "Large subnets" versus "Small subnets".
  - One-click clipboard copy utility per subnet.
- **📈 IP Utilization Dashboard:**
  - Real-time tracker for **Total Parent IPs, Allocated IPs, Available Left, and Percentage Utilization**.
  - Warning panels for capacity exhausted or network overflows when requirements exceed the parent space.
- **📥 Production Exports:**
  - **Download CSV:** Instant spreadsheet-ready export of your subnet calculations.
  - **Download PDF:** High-quality presentation-ready layout summarizing your parent network, utilization stats, and final allocation table.
- **🌌 Ultra-Polished Cosmic Dark Theme:**
  - A modern, high-contrast dark visual identity built with slate/deep indigo accents and JetBrains Mono display typography.

---

## 🛠️ Technology Stack

- **Framework:** React 18 (TypeScript)
- **Build Tool:** Vite
- **Styling:** Tailwind CSS
- **Icons:** Lucide React
- **Animations:** Framer Motion (imported as `motion/react`)
- **CI/CD:** GitHub Actions for automated GitHub Pages deployment

---

## 🚀 Getting Started

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) (v18 or higher) and `npm` (or `bun`) installed.

### Installation

1. Clone or download the repository files:
   ```bash
   git clone <your-repository-url>
   cd subnetting-calculator
   ```

2. Install the project dependencies:
   ```bash
   npm install
   # or if using Bun:
   bun install
   ```

3. Start the local development server:
   ```bash
   npm run dev
   # or if using Bun:
   bun dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

---

## 📦 Deployment to GitHub Pages

The repository comes pre-packaged with a fully-configured **GitHub Actions Workflow** (`.github/workflows/deploy.yml`) that automates deployments to GitHub Pages on every push to the `main` or `master` branch.

### Quick Setup:
1. Push this project to your personal GitHub repository.
2. Go to **Settings** > **Pages** inside your repository.
3. Under **Build and deployment**, change the **Source** dropdown to **GitHub Actions**.
4. Push a commit to your branch, or trigger the workflow manually under the **Actions** tab.
5. Your application will be live at `https://<username>.github.io/<repository-name>/`!

---

## 📝 Academic Guidelines

When calculating VLSM allocations manually, always remember:
- Sort your subnets by size (largest host count requirement first) to allocate the largest blocks at the lowest available boundary.
- Always account for **2 overhead IPs** per subnet (1 for the Subnet Network ID, and 1 for the Subnet Broadcast Address).
- Use CIDR prefix sizes (`/30` for standard WAN links, `/24` for standard 254-host LANs, etc.).

---

This project is developed by Johann Fernandez using Google AI Studio. This project is open-source and available under the MIT License. All calculations run strictly client-side; no personal network information is ever collected or stored.
