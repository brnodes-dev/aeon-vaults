import React, { useState, useEffect } from 'react';
import { Lock, Unlock, Plus, Wallet, PiggyBank, Calendar, TrendingUp, X, Hourglass, AlertTriangle, Loader2, LogOut, Smartphone, Copy, CheckCircle2, Info, Database, ExternalLink } from 'lucide-react';
// For local use, install: npm install ethers
import { ethers } from 'ethers';

// --- IMPORTANT: INSTALL FIREBASE (npm install firebase) ---
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';

// --- FIREBASE CONFIGURATION ---
// Replace with your Console data if necessary
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBlk56YPxA-yfHCSOU8vN5dYd-PKMrn0TU",
  authDomain: "aeon-vaults.firebaseapp.com",
  projectId: "aeon-vaults",
  storageBucket: "aeon-vaults.firebasestorage.app",
  messagingSenderId: "326905237402",
  appId: "1:326905237402:web:877e6a448ab456d5107423"
};

// --- ARC NETWORK CONFIGURATION ---
const ARC_CONFIG = {
  chainId: 5042002,
  chainIdHex: '0x4cef52',
  rpcUrl: "https://rpc.testnet.arc.network",
  explorerUrl: "https://testnet.arcscan.app",
  chainName: "Arc Testnet",
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 }
};

export default function AeonVaults() {
  const [db, setDb] = useState(null);
  const [firebaseStatus, setFirebaseStatus] = useState('connecting'); 

  // --- INIT FIREBASE ---
  useEffect(() => {
    if (FIREBASE_CONFIG.apiKey !== "SUA_API_KEY") {
        try {
            const app = initializeApp(FIREBASE_CONFIG);
            const database = getFirestore(app);
            setDb(database);
            setFirebaseStatus('connected');
            console.log("🔥 Firebase connected (Waiting for operations...)");
        } catch (e) {
            console.error("❌ Error initializing Firebase:", e);
            setFirebaseStatus('error');
        }
    } else {
        console.warn("⚠️ Firebase not configured.");
        setFirebaseStatus('disabled');
    }
  }, []);

  // Official Addresses
  const CONTRACTS = {
    USDC: '0x3600000000000000000000000000000000000000',
    EURC: '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a',
    VAULT: '0xe41431E37A1f944c1812bc29c593A6040c7bd6c3'
  };

  const VAULT_ABI = [
    "function createVault(address _asset, uint256 _amount, uint256 _unlockDate) external",
    "function deposit(uint256 _vaultId, uint256 _amount) external",
    "function withdraw(uint256 _vaultId) external",
    "function emergencyWithdraw(uint256 _vaultId) external",
    "function getUserVaults(address _user) external view returns (tuple(uint256 id, address creator, address asset, uint256 amount, uint256 unlockDate, bool isWithdrawn)[])"
  ];

  const ERC20_ABI = [
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function allowance(address owner, address spender) external view returns (uint256)",
    "function decimals() view returns (uint8)"
  ];

  const PENALTY_THRESHOLD = 50.00;
  const FIXED_FEE = 50.00;
  const PERCENT_FEE = 0.10;

  const calculatePenalty = (amount) => {
    if (amount <= PENALTY_THRESHOLD) return amount * PERCENT_FEE;
    return FIXED_FEE;
  };

  // State
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [vaults, setVaults] = useState([]);
  const [isLoadingVaults, setIsLoadingVaults] = useState(false);
  
  const [wrongNetwork, setWrongNetwork] = useState(false);
  const [showMobileInstructions, setShowMobileInstructions] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const [newVaultName, setNewVaultName] = useState('');
  const [selectedAsset, setSelectedAsset] = useState('USDC');
  const [amount, setAmount] = useState('');
  const [targetDate, setTargetDate] = useState('');
  
  const [processingId, setProcessingId] = useState(null);
  const [processingStatus, setProcessingStatus] = useState('');
  const [showConfetti, setShowConfetti] = useState(false);

  const [depositVaultId, setDepositVaultId] = useState(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [emergencyVaultId, setEmergencyVaultId] = useState(null);

  const isAnyProcessing = processingId !== null;

  // --- UX HELPERS ---
  const showFeedback = (type, msg, duration = 4000) => {
      setFeedback({ type, message: msg });
      setTimeout(() => setFeedback(null), duration);
  };

  const copyUrl = () => {
      const url = window.location.href;
      if (navigator.clipboard && window.isSecureContext) {
          navigator.clipboard.writeText(url).then(() => showFeedback('success', 'Link copied!'));
      } else {
          try {
            const textArea = document.createElement("textarea");
            textArea.value = url;
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            showFeedback('success', 'Link copied!');
          } catch(e) {
            showFeedback('error', 'Failed to copy');
          }
      }
  };

  // --- NETWORK FUNCTIONS ---
  const switchNetwork = async () => {
    if(!window.ethereum) return;
    try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: ARC_CONFIG.chainIdHex }],
        });
        setWrongNetwork(false);
    } catch (switchError) {
        if (switchError.code === 4902 || switchError.code === -32603) {
            try {
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [{
                        chainId: ARC_CONFIG.chainIdHex,
                        chainName: ARC_CONFIG.chainName,
                        nativeCurrency: ARC_CONFIG.nativeCurrency,
                        rpcUrls: [ARC_CONFIG.rpcUrl],
                        blockExplorerUrls: [ARC_CONFIG.explorerUrl]
                    }],
                });
                setWrongNetwork(false);
            } catch (addError) { 
                console.error(addError);
                showFeedback('error', 'Failed to add network');
            }
        } else {
            showFeedback('error', 'Failed to switch network');
        }
    }
  };

  // --- INIT & CONNECT ---
  useEffect(() => {
    const init = async () => {
      const isConnected = localStorage.getItem('isWalletConnected') === 'true';
      if (typeof window !== 'undefined' && window.ethereum && isConnected) {
        try {
          const _provider = new ethers.BrowserProvider(window.ethereum);
          const accounts = await _provider.listAccounts(); 
          
          if (accounts.length > 0) {
            const _signer = await _provider.getSigner();
            const _account = await _signer.getAddress();
            
            const network = await _provider.getNetwork();
            if (Number(network.chainId) !== ARC_CONFIG.chainId) setWrongNetwork(true);

            setProvider(_provider);
            setSigner(_signer);
            setAccount(_account);
          } else {
            localStorage.removeItem('isWalletConnected');
          }
        } catch (err) {
          console.error("Init Error:", err);
        }
      }
    };
    init();

    if (window.ethereum) {
        window.ethereum.on('accountsChanged', (accs) => {
            if (accs.length === 0) disconnectWallet();
            else window.location.reload();
        });
        window.ethereum.on('chainChanged', () => window.location.reload());
    }
  }, []);

  useEffect(() => {
      if (account && signer) {
          fetchVaults(signer, account);
      }
  }, [db, account, signer]);

  const connectWallet = async () => {
    const isMobileDevice = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobileDevice && !window.ethereum) {
        setShowMobileInstructions(true);
        return;
    }

    if (window.ethereum) {
      try {
        const _provider = new ethers.BrowserProvider(window.ethereum);
        const network = await _provider.getNetwork();
        if (Number(network.chainId) !== ARC_CONFIG.chainId) {
            setWrongNetwork(true);
            try { await switchNetwork(); } catch(e) {
                return showFeedback('error', 'Wrong Network. Please switch to Arc.');
            } 
        }

        await _provider.send("eth_requestAccounts", []);
        const _signer = await _provider.getSigner();
        
        const message = `Welcome to Aeon Vaults!\n\nPlease sign this message to confirm ownership.\n\nTime: ${new Date().toLocaleString()}`;
        try {
            await _signer.signMessage(message);
        } catch (signErr) {
            if (signErr.code === 4001) throw new Error("Signature rejected");
            throw new Error("Failed to sign message");
        }

        const _account = await _signer.getAddress();
        localStorage.setItem('isWalletConnected', 'true');

        setProvider(_provider);
        setSigner(_signer);
        setAccount(_account);
        showFeedback('success', 'Wallet Connected!');
        setWrongNetwork(false);

      } catch (error) {
        let msg = "Connection failed";
        if (error.reason) msg = error.reason;
        else if (error.message && error.message.includes("user rejected")) msg = "User rejected request";
        showFeedback('error', msg);
      }
    } else {
      window.open("https://metamask.io/download/", "_blank");
    }
  };

  const disconnectWallet = () => {
    setAccount(null);
    setProvider(null);
    setSigner(null);
    setVaults([]);
    localStorage.removeItem('isWalletConnected');
    showFeedback('info', 'Wallet Disconnected');
  };

  // --- CONTRACT LOGIC AND DATA ---
  const fetchVaults = async (_signer, _account) => {
    if (!_signer) return;
    setIsLoadingVaults(true);
    try {
      const vaultContract = new ethers.Contract(CONTRACTS.VAULT, VAULT_ABI, _signer);
      const data = await vaultContract.getUserVaults(_account);
      
      const basicVaults = data.map(v => ({
          id: Number(v.id),
          rawAsset: v.asset,
          amount: Number(ethers.formatUnits(v.amount, 6)),
          unlockDate: Number(v.unlockDate) * 1000,
          isWithdrawn: v.isWithdrawn,
          creator: v.creator
      })).filter(v => !v.isWithdrawn);

      const enrichedVaults = await Promise.all(basicVaults.map(async (v) => {
          let displayName = `Vault #${v.id}`;
          let source = 'Default';

          // ATTEMPT 1: Firebase
          if (db) {
              try {
                  const docRef = doc(db, "users", _account, "vaults", v.id.toString());
                  const docSnap = await getDoc(docRef);
                  if (docSnap.exists() && docSnap.data().name) {
                      displayName = docSnap.data().name;
                      source = 'Firebase';
                  }
              } catch (err) {
                  // Silent on read error to avoid spamming console, critical error is on write
              }
          } 
          
          // ATTEMPT 2: LocalStorage
          if (displayName === `Vault #${v.id}`) {
              const localName = localStorage.getItem(`aeon_vault_name_${v.id}`);
              if (localName) {
                  displayName = localName;
                  source = 'LocalStorage';
              }
          }

          const assetSymbol = v.rawAsset.toLowerCase() === CONTRACTS.USDC.toLowerCase() ? 'USDC' : 'EURC';
          
          return {
              ...v,
              name: displayName,
              asset: assetSymbol,
              assetAddress: v.rawAsset,
              locked: v.unlockDate > Date.now(),
              source: source
          };
      }));
      
      setVaults(enrichedVaults);
    } catch (error) {
      console.error("Fetch Error:", error);
    } finally {
      setIsLoadingVaults(false);
    }
  };

  const createVault = async () => {
    if (!account || !amount || !targetDate) return;
    if (wrongNetwork) return showFeedback('error', 'Wrong Network');

    const unlockTimestamp = Math.floor(new Date(targetDate).getTime() / 1000);
    if (unlockTimestamp <= Math.floor(Date.now() / 1000)) return showFeedback('error', "Date must be in the future!");

    try {
      setProcessingId('CREATE');
      const tokenAddress = CONTRACTS[selectedAsset];
      const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
      const vaultContract = new ethers.Contract(CONTRACTS.VAULT, VAULT_ABI, signer);
      const amountWei = ethers.parseUnits(amount, 6);

      setProcessingStatus('Checking Allowance...');
      const allowance = await tokenContract.allowance(account, CONTRACTS.VAULT);
      
      if (allowance < amountWei) {
        setProcessingStatus(`Approving ${selectedAsset}...`);
        const txApprove = await tokenContract.approve(CONTRACTS.VAULT, amountWei);
        await txApprove.wait();
      }

      setProcessingStatus('Creating Vault...');
      const txCreate = await vaultContract.createVault(tokenAddress, amountWei, unlockTimestamp);
      await txCreate.wait();

      // --- SAVE NAME ---
      const updatedVaultsData = await vaultContract.getUserVaults(account);
      if (updatedVaultsData && updatedVaultsData.length > 0) {
        const newVaultId = Number(updatedVaultsData[updatedVaultsData.length - 1].id);
        
        if (newVaultName.trim()) {
            localStorage.setItem(`aeon_vault_name_${newVaultId}`, newVaultName); // Backup

            if (db) {
                try {
                    console.log(`Attempting to save vault #${newVaultId} to Firebase...`);
                    await setDoc(doc(db, "users", account, "vaults", newVaultId.toString()), {
                        name: newVaultName,
                        createdAt: new Date().toISOString()
                    });
                    console.log(`✅ Saved to Firebase successfully!`);
                } catch (e) {
                    console.error("❌ Error saving to Firebase:", e);
                    if (e.code === 'permission-denied') {
                        showFeedback('error', 'Firebase Permission Error: Check Console Rules!', 8000);
                    } else if (e.code === 'unavailable') {
                         showFeedback('error', 'Firebase Error: Check connection or npm install', 6000);
                    }
                }
            }
        }
      }

      setShowConfetti(true);
      showFeedback('success', 'Vault Created Successfully!');
      setTimeout(() => setShowConfetti(false), 3000);
      setNewVaultName('');
      setAmount('');
      setTargetDate('');
      await fetchVaults(signer, account);
    } catch (error) {
      console.error(error);
      showFeedback('error', "Transaction failed");
    } finally {
      setProcessingId(null);
      setProcessingStatus('');
    }
  };

  const addFundsToVault = async (id, assetAddress) => {
    if (!depositAmount) return;
    if (wrongNetwork) return showFeedback('error', 'Wrong Network');

    try {
      setProcessingId(id);
      const tokenContract = new ethers.Contract(assetAddress, ERC20_ABI, signer);
      const vaultContract = new ethers.Contract(CONTRACTS.VAULT, VAULT_ABI, signer);
      const amountWei = ethers.parseUnits(depositAmount, 6);

      setProcessingStatus('Approving...');
      const allowance = await tokenContract.allowance(account, CONTRACTS.VAULT);
      if (allowance < amountWei) {
        const txApprove = await tokenContract.approve(CONTRACTS.VAULT, amountWei);
        await txApprove.wait();
      }

      setProcessingStatus('Depositing...');
      const txDeposit = await vaultContract.deposit(id, amountWei);
      await txDeposit.wait();

      setDepositVaultId(null);
      setDepositAmount('');
      showFeedback('success', 'Funds Added!');
      await fetchVaults(signer, account);
    } catch (error) {
      console.error(error);
      showFeedback('error', "Deposit failed");
    } finally {
      setProcessingId(null);
      setProcessingStatus('');
    }
  };

  const withdrawVault = async (id) => {
    if (wrongNetwork) return showFeedback('error', 'Wrong Network');
    try {
      setProcessingId(id);
      setProcessingStatus('Withdrawing...');
      const vaultContract = new ethers.Contract(CONTRACTS.VAULT, VAULT_ABI, signer);
      const tx = await vaultContract.withdraw(id);
      await tx.wait();
      showFeedback('success', 'Withdrawal Complete!');
      await fetchVaults(signer, account);
    } catch (error) {
      console.error(error);
      showFeedback('error', "Withdrawal failed");
    } finally {
      setProcessingId(null);
      setProcessingStatus('');
    }
  };

  const emergencyWithdraw = async (id) => {
    if (wrongNetwork) return showFeedback('error', 'Wrong Network');
    try {
      setProcessingId(id);
      setProcessingStatus('Paying Penalty & Withdrawing...');
      const vaultContract = new ethers.Contract(CONTRACTS.VAULT, VAULT_ABI, signer);
      const tx = await vaultContract.emergencyWithdraw(id);
      await tx.wait();
      setEmergencyVaultId(null);
      showFeedback('success', 'Funds recovered');
      await fetchVaults(signer, account);
    } catch (error) {
      console.error(error);
      showFeedback('error', "Emergency withdraw failed");
    } finally {
      setProcessingId(null);
      setProcessingStatus('');
    }
  };

  // Helpers
  const formatDateDisplay = (timestamp) => new Date(timestamp).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
  const getDaysLeft = (unlockDate) => {
    const diff = unlockDate - Date.now();
    if (diff <= 0) return "Today";
    return `${Math.ceil(diff / (1000 * 60 * 60 * 24))} days`;
  };
  const todayStr = new Date().toISOString().split('T')[0];
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const i = setInterval(() => setNow(Date.now()), 60000); return () => clearInterval(i); }, []);

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 font-sans p-4 md:p-8 flex justify-center selection:bg-purple-500 selection:text-white pb-20 relative">
      
      {/* --- FIXED HEADER --- */}
      <nav className="fixed top-0 left-0 right-0 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md z-50 h-20">
        <div className="max-w-6xl mx-auto px-4 h-full flex items-center justify-between relative">
          
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-tr from-purple-500 to-pink-500 p-2 rounded-lg shadow-lg">
                <Hourglass className="w-6 h-6 text-white" />
            </div>
            <span className="font-bold text-2xl text-white tracking-tight">Aeon<span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">Vaults</span></span>
          </div>
          
          <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 items-center gap-2 bg-emerald-900/30 border border-emerald-500/30 px-4 py-1.5 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.3)]">
             <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_#34d399]"></div>
             <span className="text-emerald-400 text-xs font-bold tracking-widest uppercase">Live on Arc Testnet</span>
          </div>

          <div className="flex items-center gap-3">
             {account ? (
                 <div className="flex items-center gap-2">
                     <span className="px-4 py-2 rounded-full text-sm font-medium border border-slate-800 bg-slate-900 text-slate-300 font-mono hidden sm:block">
                        {account.substring(0,6)}...{account.substring(38)}
                     </span>
                     <button onClick={disconnectWallet} className="p-2 rounded-full text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors" title="Disconnect">
                        <LogOut size={20}/>
                     </button>
                 </div>
             ) : (
                 <button onClick={connectWallet} className="px-6 py-2.5 rounded-full text-sm font-bold bg-white text-slate-950 hover:bg-slate-200 shadow-lg transition-colors flex items-center gap-2">
                    <Wallet size={16}/> Connect Wallet
                 </button>
             )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 relative mt-24">
        
        {feedback && (
            <div className={`fixed top-24 right-4 px-6 py-4 rounded-xl border flex items-center gap-3 z-[100] shadow-2xl animate-in slide-in-from-right fade-in duration-300 ${feedback.type === 'success' ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200' : 'bg-red-950/90 border-red-500/50 text-red-200'}`}>
                {feedback.type === 'success' ? <CheckCircle2 size={20}/> : <Info size={20}/>}
                <span className="font-medium">{feedback.message}</span>
            </div>
        )}

        {showMobileInstructions && (
            <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                <div className="bg-zinc-900 border border-zinc-700 rounded-3xl p-6 w-full max-w-sm shadow-2xl relative text-center">
                    <button onClick={() => setShowMobileInstructions(false)} className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white"><X size={24} /></button>
                    <div className="bg-purple-500/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-purple-500/20"><Smartphone className="w-8 h-8 text-purple-400"/></div>
                    <h3 className="text-xl font-bold text-white mb-2">Connect Mobile Wallet</h3>
                    <p className="text-zinc-400 text-sm mb-6 leading-relaxed">Aeon Vaults works best inside your wallet's built-in browser (MetaMask, Rabby, etc).</p>
                    <button onClick={copyUrl} className="w-full py-4 bg-purple-600 hover:bg-purple-500 rounded-xl flex items-center justify-center gap-3 transition-all font-bold text-white shadow-lg shadow-purple-900/30"><Copy size={20}/> Copy Website Link</button>
                    <div className="mt-4 text-center text-xs text-zinc-500">1. Copy Link above<br/>2. Open MetaMask or Rabby App<br/>3. Paste in the internal Browser</div>
                </div>
            </div>
        )}

        {wrongNetwork && (
            <div className="lg:col-span-12 mb-2 p-6 bg-red-500/10 border border-red-500/30 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 animate-in slide-in-from-top-2">
                <div className="flex items-center gap-4 text-red-400">
                    <div className="p-3 bg-red-500/20 rounded-full"><AlertTriangle className="w-6 h-6"/></div>
                    <div><p className="font-bold text-lg">Wrong Network Detected</p><p className="text-sm opacity-80">Please switch to Arc Testnet to manage your vaults.</p></div>
                </div>
                <button onClick={switchNetwork} className="w-full md:w-auto bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-xl text-sm font-bold transition-colors shadow-lg shadow-red-900/20 flex items-center justify-center gap-2"><Plus size={16}/> Switch to Arc Testnet</button>
            </div>
        )}

        {/* Left Side: Form */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden group">
            {showConfetti && <div className="absolute inset-0 bg-purple-500/10 animate-pulse z-0"></div>}
            
            <h2 className="text-lg font-semibold mb-6 relative z-10 flex items-center gap-2">
              <Plus className="w-5 h-5 text-purple-500" />
              New Savings Goal
            </h2>
            
            <div className="space-y-5 relative z-10">
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setSelectedAsset('USDC')} className={`p-3 rounded-xl border flex items-center justify-center gap-2 transition-all ${selectedAsset === 'USDC' ? 'bg-blue-600/20 border-blue-500 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.2)]' : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'}`}><span className="font-bold">USDC</span></button>
                <button onClick={() => setSelectedAsset('EURC')} className={`p-3 rounded-xl border flex items-center justify-center gap-2 transition-all ${selectedAsset === 'EURC' ? 'bg-indigo-600/20 border-indigo-500 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.2)]' : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'}`}><span className="font-bold">EURC</span></button>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-500 ml-1 uppercase tracking-wider">Vault Name</label>
                <input type="text" value={newVaultName} onChange={(e) => setNewVaultName(e.target.value)} placeholder="e.g., New Car" className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 focus:outline-none focus:border-purple-500 transition-colors placeholder-slate-700 text-white"/>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-500 ml-1 uppercase tracking-wider">Initial Deposit</label>
                <div className="relative mt-1">
                  <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white font-mono focus:outline-none focus:border-purple-500 transition-colors placeholder-slate-700"/>
                  <span className="absolute right-4 top-3 text-slate-500 font-bold text-xs">{selectedAsset}</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-500 ml-1 uppercase tracking-wider flex items-center gap-1"><Calendar className="w-3 h-3" /> Unlock Date</label>
                <input type="date" min={todayStr} value={targetDate} onChange={(e) => setTargetDate(e.target.value)} className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-purple-500 color-scheme-dark"/>
                
                {/* --- PENALTY WARNING --- */}
                <div className="mt-3 p-3 bg-orange-500/10 border border-orange-500/20 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                    <AlertTriangle className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-orange-200/80 leading-relaxed font-medium">
                    <span className="text-orange-400 font-bold">Warning:</span> Early withdrawal incurs penalty fees. A 10% fee applies for amounts up to 50, and a fixed fee of 50 for amounts above 50.
                    </p>
                </div>
                {/* ----------------------- */}

              </div>

              <button onClick={createVault} disabled={isAnyProcessing || !account} className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 mt-2 transition-all shadow-lg ${isAnyProcessing || !account ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-900/20 active:scale-95'}`}>
                {processingId === 'CREATE' ? <><Loader2 className="w-4 h-4 animate-spin"/> {processingStatus}</> : !account ? 'Connect Wallet First' : 'Create Locked Vault'}
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Vault List */}
        <div className="lg:col-span-7 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2"><Lock className="w-5 h-5 text-purple-400" /> My Active Goals</h2>
            <div className="text-xs bg-slate-900 px-2 py-1 rounded border border-slate-800 text-slate-500 font-mono">Total Locked: ${vaults.reduce((acc, v) => acc + v.amount, 0).toFixed(2)}</div>
          </div>

          <div className="grid gap-4">
            {!account ? (
              <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-slate-800 rounded-2xl text-slate-500 bg-slate-900/30"><Wallet className="w-12 h-12 mb-3 opacity-20" /><p>Connect your wallet to view your vaults</p></div>
            ) : isLoadingVaults ? (
              <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-purple-500 animate-spin" /></div>
            ) : vaults.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-slate-800 rounded-2xl text-slate-500 bg-slate-900/50"><PiggyBank className="w-12 h-12 mb-3 opacity-20" /><p>No savings goals found</p><p className="text-sm text-slate-600 mt-1">Create your first vault to start saving.</p></div>
            ) : (
              vaults.map((vault) => {
                const isLocked = now < vault.unlockDate;
                const isDepositing = depositVaultId === vault.id;
                const isEmergency = emergencyVaultId === vault.id;
                const isThisProcessing = processingId === vault.id;
                const penalty = calculatePenalty(vault.amount);
                const netReceive = vault.amount - penalty;

                return (
                  <div key={vault.id} className={`relative rounded-2xl border transition-all overflow-visible ${isEmergency ? 'bg-red-500/5 border-red-500/50' : isLocked ? 'bg-slate-900 border-slate-800 hover:border-slate-700' : 'bg-purple-900/10 border-purple-500/30'}`}>
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-3 rounded-xl ${vault.asset === 'USDC' ? 'bg-blue-500/10 text-blue-400' : 'bg-indigo-500/10 text-indigo-400'}`}>
                            {isEmergency ? <AlertTriangle className="w-6 h-6 text-red-500" /> : <PiggyBank className="w-6 h-6" />}
                          </div>
                          <div>
                            <h3 className="font-bold text-lg text-white">{vault.name}</h3>
                            <div className="flex items-center gap-2 text-xs text-slate-400">
                                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {formatDateDisplay(vault.unlockDate)}</span>
                                {isLocked && <span className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-500">{getDaysLeft(vault.unlockDate)} days left</span>}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-slate-500 uppercase font-bold mb-0.5">Current Balance</div>
                          <div className="text-2xl font-mono font-bold text-white tracking-tight">{vault.asset === 'USDC' ? '$' : '€'}{vault.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-slate-800/50">
                        {isDepositing && (
                          <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-left-2">
                            <div className="flex items-center gap-2">
                              <input autoFocus type="number" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} placeholder="0.00" disabled={isAnyProcessing} className="flex-1 bg-slate-950 border border-purple-500/50 rounded-lg py-2 pl-3 pr-3 text-sm focus:outline-none text-white disabled:opacity-50" />
                              <button onClick={() => addFundsToVault(vault.id, vault.assetAddress)} disabled={isAnyProcessing} className="bg-purple-600 hover:bg-purple-500 text-white p-2 rounded-lg disabled:opacity-50 min-w-[40px] flex justify-center">{isThisProcessing ? <Loader2 className="w-4 h-4 animate-spin"/> : <TrendingUp className="w-4 h-4" />}</button>
                              <button onClick={() => { setDepositVaultId(null); setDepositAmount(''); }} disabled={isAnyProcessing} className="bg-slate-800 hover:bg-slate-700 text-slate-400 p-2 rounded-lg"><X className="w-4 h-4" /></button>
                            </div>
                            {isThisProcessing && <div className="text-[10px] text-purple-400 text-center animate-pulse">{processingStatus}</div>}
                          </div>
                        )}
                        {!isDepositing && isEmergency && (
                           <div className="animate-in fade-in zoom-in-95 bg-red-500/10 p-4 rounded-xl border border-red-500/20">
                              <h4 className="text-red-400 font-bold text-sm mb-2 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Emergency Early Withdrawal</h4>
                              <div className="text-xs text-slate-400 space-y-1 mb-4">
                                 <div className="flex justify-between"><span>Vault Balance:</span><span>{vault.amount.toFixed(2)} {vault.asset}</span></div>
                                 <div className="flex justify-between text-red-400"><span>Penalty Fee (to Admin):</span><span>- {penalty.toFixed(2)} {vault.asset}</span></div>
                                 <div className="flex justify-between border-t border-red-500/20 pt-1 font-bold text-white"><span>You Receive:</span><span>{netReceive > 0 ? netReceive.toFixed(2) : '0.00'} {vault.asset}</span></div>
                              </div>
                              <div className="flex gap-2">
                                 <button onClick={() => emergencyWithdraw(vault.id)} disabled={isAnyProcessing} className="flex-1 bg-red-600 hover:bg-red-500 text-white py-2 rounded-lg text-sm font-bold disabled:opacity-50 flex justify-center items-center gap-2">{isThisProcessing ? <><Loader2 className="w-3 h-3 animate-spin"/> Processing...</> : 'Confirm & Withdraw'}</button>
                                 <button onClick={() => setEmergencyVaultId(null)} disabled={isAnyProcessing} className="px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm">Cancel</button>
                              </div>
                           </div>
                        )}
                        {!isDepositing && !isEmergency && (
                          <div className="flex items-center gap-3">
                             {isLocked ? (
                                <>
                                  <div className="flex-1 flex flex-col justify-center">
                                     <div className="flex items-center gap-2 text-slate-400 text-xs font-medium"><Lock className="w-3.5 h-3.5 text-slate-500" /> Locked</div>
                                     <button onClick={() => setEmergencyVaultId(vault.id)} className="text-[10px] text-red-500/60 hover:text-red-400 hover:underline text-left mt-0.5 w-fit transition-colors">Need emergency funds?</button>
                                  </div>
                                  <button onClick={() => setDepositVaultId(vault.id)} disabled={isAnyProcessing} className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-bold rounded-lg transition-colors border border-slate-700 disabled:opacity-50"><Plus className="w-4 h-4 text-purple-500" /> Save More</button>
                                </>
                              ) : (
                                <button onClick={() => withdrawVault(vault.id)} disabled={isAnyProcessing} className="w-full py-2 px-4 bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold rounded-lg transition-colors shadow-lg active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50">{isThisProcessing ? <><Loader2 className="w-4 h-4 animate-spin"/> Processing...</> : <><Unlock className="w-4 h-4" /> Withdraw Total Balance</>}</button>
                              )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* STATUS FOOTER (UPDATED) */}
        <div className="fixed bottom-0 left-0 right-0 p-2 text-[10px] text-center text-slate-600 bg-[#020617]/90 backdrop-blur flex justify-center gap-4 z-50">
           <span>Network: {ARC_CONFIG.chainName}</span>
           <a 
             href="https://testnet.arcscan.app/address/0xe41431E37A1f944c1812bc29c593A6040c7bd6c3" 
             target="_blank" 
             rel="noopener noreferrer"
             className="hover:text-purple-400 transition-colors underline decoration-slate-700 hover:decoration-purple-400 flex items-center gap-1"
           >
              View Contract on ArcScan <ExternalLink size={10} />
           </a>
           <span className={`flex items-center gap-1 ${firebaseStatus === 'connected' ? 'text-emerald-500' : firebaseStatus === 'error' ? 'text-red-500' : 'text-slate-500'}`}>
              <Database size={10}/> {firebaseStatus === 'connected' ? 'Firebase Sync Active' : firebaseStatus === 'error' ? 'Sync Error (Check Console)' : 'Sync Disabled'}
           </span>
        </div>

      </div>
    </div>
  );
}
