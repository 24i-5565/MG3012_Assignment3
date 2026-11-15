// FinTech Vault dApp: connects to the FinTechVault contract on Ganache through MetaMask.
// ABI and address come from contract-config.js, which `truffle migrate` generates.

const GANACHE_CHAIN_ID = 1337; // Ganache CLI default (Ganache desktop app uses 5777)
const GANACHE_RPC = "http://127.0.0.1:8545";

let web3;
let vault;
let account;

const $ = (id) => document.getElementById(id);
const writeButtons = ["depositBtn", "withdrawBtn", "noticeBtn", "refreshBtn"];

// ---------- helpers ----------
function setStatus(message, type = "info") {
  $("status").innerHTML = message;
  $("statusBox").className = "card status " + type;
}

function shortAddr(addr) {
  return addr ? addr.slice(0, 6) + "…" + addr.slice(-4) : "-";
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Pull the revert reason out of a web3 / MetaMask error
function errorReason(err) {
  const msg = (err && (err.data?.message || err.message)) || String(err);
  const match = msg.match(/revert(?:ed)?:?\s*([^"\n]+)/i);
  if (err && err.code === 4001) return "Transaction rejected in MetaMask.";
  return match ? match[1].trim() : msg;
}

// ---------- wallet connection ----------
async function connectWallet() {
  if (!window.ethereum) {
    setStatus("MetaMask not detected. Install MetaMask and open this page through <code>npx http-server frontend</code>.", "error");
    return;
  }
  if (!window.CONTRACT_CONFIG) {
    setStatus("contract-config.js is missing. Run <code>truffle migrate</code> first.", "error");
    return;
  }

  try {
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    account = accounts[0];
    web3 = new Web3(window.ethereum);

    await ensureGanacheNetwork();

    vault = new web3.eth.Contract(window.CONTRACT_CONFIG.abi, window.CONTRACT_CONFIG.address);

    const code = await web3.eth.getCode(window.CONTRACT_CONFIG.address);
    if (code === "0x") {
      setStatus("No contract found at the configured address on this network. Is Ganache running, and did you run <code>truffle migrate</code>?", "error");
      return;
    }

    $("account").textContent = account;
    $("contractAddr").textContent = window.CONTRACT_CONFIG.address;
    $("connectBtn").textContent = "Connected: " + shortAddr(account);
    writeButtons.forEach((id) => ($(id).disabled = false));

    setStatus("Wallet connected. You can now interact with the vault.", "success");
    await refreshAll();
  } catch (err) {
    setStatus("Connection failed: " + escapeHtml(errorReason(err)), "error");
  }
}

// Make sure MetaMask is on the local Ganache chain; offer to switch or add it if not.
async function ensureGanacheNetwork() {
  let chainId = Number(await web3.eth.getChainId());
  if (chainId !== GANACHE_CHAIN_ID) {
    const hexId = "0x" + GANACHE_CHAIN_ID.toString(16);
    try {
      await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: hexId }] });
    } catch (switchErr) {
      if (switchErr.code === 4902) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: hexId,
            chainName: "Ganache Local",
            rpcUrls: [GANACHE_RPC],
            nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
          }],
        });
      } else {
        throw switchErr;
      }
    }
    chainId = Number(await web3.eth.getChainId());
  }
  $("network").textContent = `Ganache Local (chain ID ${chainId})`;
}

// ---------- reads (.call) ----------
async function refreshAll() {
  if (!vault) return;
  try {
    const balance = await vault.methods.getMyBalance().call({ from: account });
    const stats = await vault.methods.getVaultStats().call();
    $("myBalance").textContent = balance;
    $("notice").textContent = stats[0];
    $("totalTx").textContent = stats[1];
    await loadHistory();
    await loadEvents();
  } catch (err) {
    setStatus("Could not read contract state: " + escapeHtml(errorReason(err)), "error");
  }
}

async function loadHistory() {
  const history = await vault.methods.getHistory().call();
  const body = $("historyBody");
  if (history.length === 0) {
    body.innerHTML = '<tr><td colspan="5" class="empty">No transactions yet.</td></tr>';
    return;
  }
  body.innerHTML = history
    .map((h, i) => ({ h, i }))
    .reverse()
    .map(({ h, i }) => {
      const time = new Date(Number(h.timestamp) * 1000).toLocaleString();
      const mine = h.user.toLowerCase() === account.toLowerCase() ? " (you)" : "";
      return `<tr>
        <td>${i + 1}</td>
        <td><span class="pill ${h.action.toLowerCase()}">${escapeHtml(h.action)}</span></td>
        <td>${h.action === "Notice" ? "-" : h.amount}</td>
        <td title="${h.user}">${shortAddr(h.user)}${mine}</td>
        <td>${time}</td>
      </tr>`;
    })
    .join("");
}

async function loadEvents() {
  const events = await vault.getPastEvents("allEvents", { fromBlock: 0, toBlock: "latest" });
  const list = $("eventLog");
  if (events.length === 0) {
    list.innerHTML = '<li class="empty">No events yet.</li>';
    return;
  }
  list.innerHTML = events
    .slice(-15)
    .reverse()
    .map((e) => {
      const v = e.returnValues;
      let detail = "";
      if (e.event === "FundsDeposited" || e.event === "FundsWithdrawn") {
        detail = `amount ${v.amount}, new balance ${v.newBalance}`;
      } else if (e.event === "NoticeUpdated") {
        detail = `"${escapeHtml(v.newNotice)}"`;
      }
      return `<li><strong>${e.event}</strong> by ${shortAddr(v.user)}: ${detail}
              <span class="muted">block #${e.blockNumber} · tx ${shortAddr(e.transactionHash)}</span></li>`;
    })
    .join("");
}

// ---------- writes (.send) ----------
async function sendTx(label, method) {
  writeButtons.forEach((id) => ($(id).disabled = true));
  try {
    // Dry-run with .call() first so a revert shows the contract's error message
    await method.call({ from: account });

    setStatus(`${label}: confirm the transaction in MetaMask…`, "pending");
    const receipt = await method.send({ from: account });

    setStatus(
      `${label} confirmed in block <strong>#${receipt.blockNumber}</strong><br>
       Tx hash: <code>${receipt.transactionHash}</code><br>
       Gas used: ${receipt.gasUsed}`,
      "success"
    );
    await refreshAll();
  } catch (err) {
    setStatus(`${label} failed: ${escapeHtml(errorReason(err))}`, "error");
  } finally {
    writeButtons.forEach((id) => ($(id).disabled = false));
  }
}

function readAmount(inputId) {
  const value = $(inputId).value.trim();
  if (!/^\d+$/.test(value) || value === "0") {
    setStatus("Please enter a whole number greater than zero.", "error");
    return null;
  }
  return value;
}

$("depositBtn").addEventListener("click", () => {
  const amount = readAmount("depositAmount");
  if (amount) sendTx(`Deposit of ${amount}`, vault.methods.depositFunds(amount));
});

$("withdrawBtn").addEventListener("click", () => {
  const amount = readAmount("withdrawAmount");
  if (amount) sendTx(`Withdrawal of ${amount}`, vault.methods.withdrawFunds(amount));
});

$("noticeBtn").addEventListener("click", () => {
  const text = $("noticeInput").value.trim();
  if (!text) return setStatus("Please enter a notice message.", "error");
  sendTx("Notice update", vault.methods.updateNotice(text));
});

$("refreshBtn").addEventListener("click", refreshAll);
$("connectBtn").addEventListener("click", connectWallet);

// React to account / network changes in MetaMask
if (window.ethereum) {
  window.ethereum.on("accountsChanged", () => connectWallet());
  window.ethereum.on("chainChanged", () => window.location.reload());
}

if (window.CONTRACT_CONFIG) {
  $("contractAddr").textContent = window.CONTRACT_CONFIG.address;
}
