import { ethers } from 'ethers';
import FreelanceEscrow from '../contracts/FreelanceEscrow.json';

// Make sure to replace this with the deployed contract address on Sepolia
// We will set this when the contract is deployed.
export const CONTRACT_ADDRESS = "0x8984b218395eE9B8275cfF85E79BD0F38DB1A423";

export const getWeb3Provider = () => {
  if (window.ethereum) {
    return new ethers.BrowserProvider(window.ethereum);
  } else {
    throw new Error('MetaMask is not installed');
  }
};

export const getContract = async (signerOrProvider) => {
  return new ethers.Contract(CONTRACT_ADDRESS, FreelanceEscrow.abi, signerOrProvider);
};

export const switchToSepolia = async () => {
  if (!window.ethereum) return;
  const SEPOLIA_CHAIN_ID = '0xaa36a7';
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: SEPOLIA_CHAIN_ID }],
    });
  } catch (switchError) {
    // This error code indicates that the chain has not been added to MetaMask.
    if (switchError.code === 4902) {
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: SEPOLIA_CHAIN_ID,
              chainName: 'Sepolia Test Network',
              nativeCurrency: { name: 'Sepolia ETH', symbol: 'ETH', decimals: 18 },
              rpcUrls: ['https://sepolia.infura.io/v3/'], // Placeholder, MetaMask usually has it
              blockExplorerUrls: ['https://sepolia.etherscan.io'],
            },
          ],
        });
      } catch (addError) {
        console.error("Failed to add Sepolia network:", addError);
      }
    }
    console.error("Failed to switch to Sepolia network:", switchError);
  }
};

export const connectWallet = async () => {
  if (!window.ethereum) throw new Error('MetaMask is not installed');
  
  const provider = new ethers.BrowserProvider(window.ethereum);
  const accounts = await provider.send('eth_requestAccounts', []);
  const signer = await provider.getSigner();
  
  return {
    address: accounts[0],
    signer,
    provider
  };
};
