import { useMemo, useState } from 'react';
import { BrowserProvider, Contract, formatEther, parseEther } from 'ethers';
import EthereumProvider from '@walletconnect/ethereum-provider';

const CHAIN_ID = Number(import.meta.env.VITE_CHAIN_ID || 11155111);

export default function WalletPanel() {
  const [provider, setProvider] = useState(null);
  const [account, setAccount] = useState('');
  const [amount, setAmount] = useState('0.01');
  const [status, setStatus] = useState('Connect wallet to use on-chain bankroll actions.');
  const [playerStats, setPlayerStats] = useState(null);

  const contractAddress = useMemo(() => import.meta.env.VITE_CONTRACT_ADDRESS || '', []);

  const contractAbi = [
    'function deposit() external payable',
    'function wager(uint256 amount) external',
    'function withdraw(uint256 amount) external',
    'function getPlayer(address player) external view returns (uint256 initialDeposit, uint256 balance, uint256 totalWagered, bool exists)'
  ];

  const loadPlayer = async (activeProvider = provider, activeAccount = account) => {
    if (!activeProvider || !activeAccount || !contractAddress) return;
    const signer = await activeProvider.getSigner();
    const contract = new Contract(contractAddress, contractAbi, signer);
    const player = await contract.getPlayer(activeAccount);
    setPlayerStats({
      initialDeposit: formatEther(player.initialDeposit),
      balance: formatEther(player.balance),
      wagered: formatEther(player.totalWagered),
      unlocked: Number(player.totalWagered) >= Number(player.initialDeposit) * 20
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
    const walletConnectProvider = await EthereumProvider.init({
      projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
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
    if (!provider || !contractAddress) {
      setStatus('Missing provider or VITE_CONTRACT_ADDRESS.');
      return;
    }

    try {
      const signer = await provider.getSigner();
      const contract = new Contract(contractAddress, contractAbi, signer);

      if (methodName === 'deposit') {
        const tx = await contract.deposit({ value: parseEther(amount) });
        await tx.wait();
        setStatus(`Deposit confirmed: ${amount} ETH`);
      }

      if (methodName === 'wager') {
        const tx = await contract.wager(parseEther(amount));
        await tx.wait();
        setStatus(`Wager recorded: ${amount} ETH`);
      }

      if (methodName === 'withdraw') {
        const tx = await contract.withdraw(parseEther(amount));
        await tx.wait();
        setStatus(`Withdrawal confirmed: ${amount} ETH`);
      }

      await loadPlayer();
    } catch (error) {
      setStatus(error.shortMessage || error.message || 'Transaction failed');
    }
  };

  return (
    <section className="wallet-panel">
      <div className="section-title-row">
        <h2>Wallet & Bankroll</h2>
        <span className="chain-pill">Chain ID: {CHAIN_ID}</span>
      </div>
      <p className="tiny">Connected account: {account || 'Not connected'}</p>

      <div className="row">
        <button onClick={connectMetaMask}>MetaMask</button>
        <button onClick={connectWalletConnect}>WalletConnect</button>
        <button onClick={() => loadPlayer()}>Refresh</button>
      </div>

      <label>
        Amount (ETH)
        <input value={amount} onChange={(e) => setAmount(e.target.value)} />
      </label>

      <div className="row">
        <button onClick={() => callContract('deposit')}>Deposit</button>
        <button onClick={() => callContract('wager')}>Wager</button>
        <button onClick={() => callContract('withdraw')}>Withdraw</button>
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
            <span>Withdraw Status</span>
            <strong>{playerStats.unlocked ? 'Unlocked ✅' : 'Locked (20x needed)'}</strong>
          </div>
        </div>
      )}

      <pre>{status}</pre>
    </section>
  );
}
