import { useEffect, useMemo, useState } from 'react';
import { BrowserProvider, Contract, formatEther, parseEther } from 'ethers';
import EthereumProvider from '@walletconnect/ethereum-provider';

const CHAIN_ID = Number(import.meta.env.VITE_CHAIN_ID || 11155111);
const LOCAL_CONTRACT_KEY = 'neon_reel_contract_address';

function toFixedEth(value) {
  return Number(value || 0).toFixed(4);
}

export default function WalletPanel() {
  const [provider, setProvider] = useState(null);
  const [account, setAccount] = useState('');
  const [amount, setAmount] = useState('0.01');
  const [status, setStatus] = useState('Connect wallet to use on-chain bankroll actions.');
  const [playerStats, setPlayerStats] = useState(null);
  const [busy, setBusy] = useState(false);

  const envContractAddress = useMemo(() => import.meta.env.VITE_CONTRACT_ADDRESS || '', []);
  const [contractAddress, setContractAddress] = useState(() => {
    const persisted = localStorage.getItem(LOCAL_CONTRACT_KEY) || '';
    return persisted || envContractAddress;
  });

  const contractAbi = [
    'function deposit() external payable',
    'function wager(uint256 amount) external',
    'function withdraw(uint256 amount) external',
    'function getPlayer(address player) external view returns (uint256 initialDeposit, uint256 balance, uint256 totalWagered, bool exists)'
  ];

  useEffect(() => {
    const tryEagerConnect = async () => {
      if (!window.ethereum) return;
      try {
        const browserProvider = new BrowserProvider(window.ethereum);
        const accounts = await browserProvider.send('eth_accounts', []);
        if (!accounts?.length) return;
        const signer = await browserProvider.getSigner();
        const address = await signer.getAddress();
        setProvider(browserProvider);
        setAccount(address);
        setStatus('Wallet reconnected from browser session.');
      } catch {
        // silent fallback
      }
    };

    tryEagerConnect();
  }, []);

  useEffect(() => {
    if (contractAddress) {
      localStorage.setItem(LOCAL_CONTRACT_KEY, contractAddress);
      return;
    }
    localStorage.removeItem(LOCAL_CONTRACT_KEY);
  }, [contractAddress]);

  const loadPlayer = async (activeProvider = provider, activeAccount = account) => {
    if (!activeProvider || !activeAccount || !contractAddress) return;
    const signer = await activeProvider.getSigner();
    const contract = new Contract(contractAddress, contractAbi, signer);
    const player = await contract.getPlayer(activeAccount);

    const initialDeposit = Number(formatEther(player.initialDeposit));
    const totalWagered = Number(formatEther(player.totalWagered));
    const requiredWager = initialDeposit * 20;

    setPlayerStats({
      initialDeposit: toFixedEth(initialDeposit),
      balance: toFixedEth(formatEther(player.balance)),
      wagered: toFixedEth(totalWagered),
      requiredWager: toFixedEth(requiredWager),
      remainingToUnlock: toFixedEth(Math.max(requiredWager - totalWagered, 0)),
      unlocked: totalWagered >= requiredWager
    });
  };

  const connectMetaMask = async () => {
    if (!window.ethereum) {
      setStatus('MetaMask is not installed.');
      return;
    }

    const browserProvider = new BrowserProvider(window.ethereum);
    const signer = await browserProvider.getSigner();
    const address = await signer.getAddress();
    setProvider(browserProvider);
    setAccount(address);
    setStatus('Connected with MetaMask.');
    await loadPlayer(browserProvider, address);
  };

  const connectWalletConnect = async () => {
    const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || '';
    if (!projectId || projectId === 'YOUR_PROJECT_ID') {
      setStatus('Missing VITE_WALLETCONNECT_PROJECT_ID. Add it to .env first.');
      return;
    }

    const walletConnectProvider = await EthereumProvider.init({
      projectId,
      chains: [CHAIN_ID],
      showQrModal: true
    });

    await walletConnectProvider.enable();
    const browserProvider = new BrowserProvider(walletConnectProvider);
    const signer = await browserProvider.getSigner();
    const address = await signer.getAddress();
    setProvider(browserProvider);
    setAccount(address);
    setStatus('Connected with WalletConnect.');
    await loadPlayer(browserProvider, address);
  };

  const callContract = async (methodName) => {
    if (!contractAddress) {
      setStatus('Missing VITE_CONTRACT_ADDRESS in .env.');
      return;
    }

    if (!provider || !account) {
      setStatus('Wallet provider not connected. Please connect MetaMask or WalletConnect first.');
      return;
    }

    if (!amount || Number(amount) <= 0) {
      setStatus('Amount must be greater than 0.');
      return;
    }

    try {
      setBusy(true);
      const signer = await provider.getSigner();
      const contract = new Contract(contractAddress, contractAbi, signer);
      const parsedAmount = parseEther(amount);

      if (methodName === 'deposit') {
        const tx = await contract.deposit({ value: parsedAmount });
        await tx.wait();
        setStatus(`Deposit confirmed: ${amount} ETH`);
      }

      if (methodName === 'wager') {
        const tx = await contract.wager(parsedAmount);
        await tx.wait();
        setStatus(`Wager recorded: ${amount} ETH`);
      }

      if (methodName === 'withdraw') {
        const tx = await contract.withdraw(parsedAmount);
        await tx.wait();
        setStatus(`Withdrawal confirmed: ${amount} ETH`);
      }

      await loadPlayer();
    } catch (error) {
      setStatus(error.shortMessage || error.message || 'Transaction failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="wallet-panel">
      <div className="section-title-row">
        <h2>Wallet & Bankroll</h2>
        <span className="chain-pill">Chain ID: {CHAIN_ID}</span>
      </div>
      <p className="tiny">Connected account: {account || 'Not connected'}</p>
      <p className="tiny">Contract: {contractAddress || 'Set below or via VITE_CONTRACT_ADDRESS'}</p>

      <label>
        Contract Address
        <input
          placeholder="0x..."
          value={contractAddress}
          onChange={(e) => setContractAddress(e.target.value.trim())}
        />
      </label>

      <div className="row">
        <button onClick={connectMetaMask} disabled={busy}>MetaMask</button>
        <button onClick={connectWalletConnect} disabled={busy}>WalletConnect</button>
        <button onClick={() => loadPlayer()} disabled={busy || !provider}>Refresh</button>
      </div>

      <label>
        Amount (ETH)
        <input value={amount} onChange={(e) => setAmount(e.target.value)} />
      </label>

      <div className="row">
        <button onClick={() => callContract('deposit')} disabled={busy}>Deposit</button>
        <button onClick={() => callContract('wager')} disabled={busy}>Wager</button>
        <button onClick={() => callContract('withdraw')} disabled={busy}>Withdraw</button>
      </div>

      {playerStats && (
        <div className="stats-grid">
          <div>
            <span>Initial Deposit</span>
            <strong>{playerStats.initialDeposit} ETH</strong>
          </div>
          <div>
            <span>Balance</span>
            <strong>{playerStats.balance} ETH</strong>
          </div>
          <div>
            <span>Total Wagered</span>
            <strong>{playerStats.wagered} ETH</strong>
          </div>
          <div>
            <span>Required Wager</span>
            <strong>{playerStats.requiredWager} ETH</strong>
          </div>
          <div>
            <span>Remaining to Unlock</span>
            <strong>{playerStats.remainingToUnlock} ETH</strong>
          </div>
          <div>
            <span>Withdraw Status</span>
            <strong>{playerStats.unlocked ? 'Unlocked ✅' : 'Locked (20x needed)'}</strong>
          </div>
        </div>
      )}

      <pre>{status}</pre>
    </section>
  );
}
