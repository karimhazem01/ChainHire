import React, { useState, useEffect, useCallback } from 'react';
import { connectWallet as web3Connect } from '../utils/web3';
import { authLogin, getUserProfile } from '../services/api';
import { AuthContext } from './AuthContextCore';

export const AuthProvider = ({ children }) => {
    const [account, setAccount] = useState(localStorage.getItem('walletAddress') || '');
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(!!localStorage.getItem('walletAddress')); // true if returning user, false if new guest
    const [isWrongNetwork, setIsWrongNetwork] = useState(false);

    const SEPOLIA_CHAIN_ID = '0xaa36a7'; // 11155111

    const checkNetwork = useCallback(async () => {
        if (window.ethereum) {
            const chainId = await window.ethereum.request({ method: 'eth_chainId' });
            setIsWrongNetwork(chainId !== SEPOLIA_CHAIN_ID);
        }
    }, []);

    const syncUser = useCallback(async (walletAddr) => {
        if (!walletAddr) {
            setUser(null);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const { user: backendUser } = await getUserProfile(walletAddr);
            setUser(backendUser);
            if (backendUser) {
                localStorage.setItem('role', backendUser.role);
                localStorage.setItem('currentUser', JSON.stringify({
                    userId: backendUser._id,
                    role: backendUser.role,
                    walletAddress: backendUser.walletAddress
                }));
            }
        } catch (error) {
            console.error("Failed to sync user with backend:", error);
            setUser(null);
            localStorage.removeItem('role');
            localStorage.removeItem('currentUser');
        } finally {
            setLoading(false);
        }
    }, []);

    const login = async (role) => {
        if (!account) throw new Error("Wallet not connected");
        
        setLoading(true);
        try {
            // Request public key from MetaMask for encryption
            let publicKey = null;
            try {
                publicKey = await window.ethereum.request({
                    method: 'eth_getEncryptionPublicKey',
                    params: [account],
                });
            } catch (err) {
                console.error("User denied public key request", err);
                throw new Error("You must share your encryption public key to use the messaging feature.");
            }

            const { user: backendUser } = await authLogin(account, 'Anonymous User', role, publicKey);
            setUser(backendUser);
            localStorage.setItem('role', backendUser.role);
            localStorage.setItem('currentUser', JSON.stringify({
                userId: backendUser._id,
                role: backendUser.role,
                walletAddress: backendUser.walletAddress
            }));
            return backendUser;
        } catch (error) {
            console.error("Login failed:", error);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const logout = () => {
        setAccount('');
        setUser(null);
        localStorage.removeItem('walletAddress');
        localStorage.removeItem('role');
        localStorage.removeItem('currentUser');
        window.dispatchEvent(new Event('storage'));
    };

    const connect = async () => {
        setLoading(true);
        try {
            const { address } = await web3Connect();
            const addr = address.toLowerCase();
            setAccount(addr);
            localStorage.setItem('walletAddress', addr);
            await syncUser(addr);
            window.dispatchEvent(new Event('storage'));
        } catch (error) {
            console.error("Connection failed:", error);
            setLoading(false);
            throw error;
        }
    };

    useEffect(() => {
        const init = async () => {
            if (window.ethereum) {
                setLoading(true);
                try {
                    await checkNetwork();
                    const accounts = await window.ethereum.request({ method: 'eth_accounts' });
                    if (accounts.length > 0) {
                        const addr = accounts[0].toLowerCase();
                        setAccount(addr);
                        localStorage.setItem('walletAddress', addr);
                        await syncUser(addr);
                    } else {
                        setAccount('');
                        setUser(null);
                        localStorage.removeItem('walletAddress');
                        localStorage.removeItem('role');
                        localStorage.removeItem('currentUser');
                        setLoading(false);
                    }
                } catch (err) {
                    console.error("Failed to check eth_accounts:", err);
                    setLoading(false);
                }

                window.ethereum.on('accountsChanged', () => {
                    logout();
                    window.location.href = '/';
                });

                window.ethereum.on('chainChanged', () => {
                    window.location.reload();
                });
            } else {
                setLoading(false);
            }
        };

        init();
    }, [syncUser, checkNetwork]);

    const value = {
        account,
        user,
        setUser,
        loading,
        connect,
        login,
        logout,
        syncUser,
        isWrongNetwork
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
