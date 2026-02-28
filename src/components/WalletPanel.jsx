import { useMemo, useState } from 'react';
import { BrowserProvider, formatEther, parseEther } from 'ethers';
import EthereumProvider from '@walletconnect/ethereum-provider';

const CHAIN_ID = Number(import.meta.env.VITE_CHAIN_ID || 11155111);

export default function WalletPanel() {
  const [provider, setProvider] = useState(null);
  const [account, setAccount] = useState('');
  const [amount, setAmount] = useState('0.01');
  const [status, setStatus] = useState('Connect a wallet to start.');

  const contractAddress = useMemo(() => import.meta.env.VITE_CONTRACT_ADDRESS || '', []);

  const contractAbi = [
    'function deposit() external payable',
    'function wager(uint256 amount) external',
    'function withdraw(uint256 amount) external',
    'function getPlayer(address player) external view returns (uint256 initialDeposit, uint256 balance, uint256 totalWagered, bool exists)'
  ];

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
  };

  const callContract = async (methodName) => {
    if (!provider || !contractAddress) {
      setStatus('Missing provider or VITE_CONTRACT_ADDRESS.');
      return;
    }

    const signer = await provider.getSigner();
    const contract = new (await import('ethers')).Contract(contractAddress, contractAbi, signer);

    try {
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
        setStatus(`Withdrawal sent: ${amount} ETH`);
      }

      const player = await contract.getPlayer(account);
      setStatus((prev) => `${prev}\nPlayer balance: ${formatEther(player.balance)} ETH | Wagered: ${formatEther(player.totalWagered)} ETH`);
    } catch (error) {
      setStatus(error.shortMessage || error.message || 'Transaction failed');
    }
  };

  return (
    <section className="wallet-panel">
      <h2>Wallet + Contract Panel</h2>
      <p className="tiny">Account: {account || 'Not connected'}</p>
      <div className="row">
        <button onClick={connectMetaMask}>Connect MetaMask</button>
        <button onClick={connectWalletConnect}>Connect WalletConnect</button>
      </div>
      <label>
        Amount (ETH)
        <input value={amount} onChange={(e) => setAmount(e.target.value)} />
      </label>
      <div className="row">
        <button onClick={() => callContract('deposit')}>Deposit</button>
        <button onClick={() => callContract('wager')}>Record Wager</button>
        <button onClick={() => callContract('withdraw')}>Withdraw</button>
      </div>
      <pre>{status}</pre>
    </section>
  );
}
