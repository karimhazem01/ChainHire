import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { encrypt } from '@metamask/eth-sig-util';
import { toast } from 'react-hot-toast';
import { getMessages, sendMessage, markMessagesAsRead, updateUserProfile } from '../../services/api';

const ChatModal = ({ isOpen, onClose, jobId, jobTitle, currentUser, otherUser, applicationStatus }) => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [isDecrypting, setIsDecrypting] = useState(false);
    const scrollRef = useRef(null);
    const socketRef = useRef(null);

    const roomId = [jobId, currentUser._id, otherUser._id].sort().join('_');

    // Persistent storage for decrypted messages (Decrypt Once, Read Forever)
    const STORAGE_KEY = `chainhire_chat_cache_${currentUser.walletAddress.toLowerCase()}`;
    
    // Local state for decrypted contents to trigger re-renders
    const [decryptedMap, setDecryptedMap] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
        } catch {
            return {};
        }
    });

    // Update localStorage whenever decryptedMap changes
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(decryptedMap));
    }, [decryptedMap, STORAGE_KEY]);

    const decryptMessage = async (encryptedData, messageId) => {
        if (!messageId) return encryptedData;

        try {
            // Check state/cache first
            if (decryptedMap[messageId]) {
                return decryptedMap[messageId];
            }

            // Check if it's already plain text
            if (typeof encryptedData !== 'string' || !encryptedData.includes('ciphertext')) {
                return encryptedData;
            }

            // MetaMask eth_decrypt expects a HEX string of the JSON
            const msgParams = window.Buffer.from(encryptedData, 'utf8').toString('hex');
            
            const result = await window.ethereum.request({
                method: 'eth_decrypt',
                params: ['0x' + msgParams, currentUser.walletAddress],
            });

            // Store in state (which will trigger useEffect to save to localStorage)
            setDecryptedMap(prev => ({ ...prev, [messageId]: result }));

            return result;
        } catch (err) {
            console.error('Decryption failed:', err);
            if (err.code === 4001) {
                toast.error('Decryption denied by user.');
            } else {
                toast.error('Unable to decrypt message.');
            }
            return null;
        }
    };

    const handleManualDecrypt = async (msgId, content) => {
        await decryptMessage(content, msgId);
    };

    useEffect(() => {
        if (!isOpen) return;

        // Initialize Socket
        socketRef.current = io('http://localhost:5000');
        socketRef.current.emit('join_room', roomId);

        socketRef.current.on('receive_message', (data) => {
            if (data.roomId === roomId) {
                setMessages(prev => {
                    if (prev.some(m => m._id === data.message._id)) return prev;
                    return [...prev, data.message];
                });

                markMessagesAsRead(jobId, currentUser._id, otherUser._id).then(() => {
                    socketRef.current.emit('messages_read', { userId: currentUser._id, jobId });
                }).catch(console.error);
            }
        });

        // Load History
        const loadHistory = async () => {
            try {
                const res = await getMessages(jobId, currentUser._id, otherUser._id);
                const rawMessages = res.messages || [];
                setMessages(rawMessages);

                await markMessagesAsRead(jobId, currentUser._id, otherUser._id);
                socketRef.current.emit('messages_read', { userId: currentUser._id, jobId });
            } catch (err) {
                console.error('Failed to load chat history:', err);
            } finally {
                setIsLoading(false);
            }
        };

        loadHistory();

        return () => {
            if (socketRef.current) socketRef.current.disconnect();
        };
    }, [isOpen, jobId, currentUser._id, otherUser._id, roomId]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, decryptedMap]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || isSending) return;

        if (!otherUser.publicKey) {
            toast.error("The recipient hasn't shared their public key yet.");
            return;
        }

        setIsSending(true);
        try {
            const encrypted = encrypt({
                publicKey: otherUser.publicKey,
                data: newMessage.trim(),
                version: 'x25519-xsalsa20-poly1305',
            });
            
            const encryptedString = JSON.stringify(encrypted);

            const messageData = {
                senderId: currentUser._id,
                receiverId: otherUser._id,
                jobId,
                content: encryptedString
            };

            const res = await sendMessage(messageData);
            
            // CRITICAL FIX: Store the plain text locally so the SENDER can always read it
            if (res.message?._id) {
                setDecryptedMap(prev => ({ ...prev, [res.message._id]: newMessage.trim() }));
            }

            setMessages(prev => [...prev, res.message]);
            setNewMessage('');
            
            socketRef.current.emit('send_message', {
                roomId,
                message: res.message,
                receiverId: otherUser._id
            });
        } catch (err) {
            toast.error("Sending failed: " + err.message);
        } finally {
            setIsSending(false);
        }
    };

    if (!isOpen) return null;

    const isLocked = applicationStatus === 'Rejected';
    const isFreelancer = currentUser.role === 'freelancer';
    const canInitiate = !isFreelancer || messages.some(m => m.senderId === otherUser._id);

    const renderMessageContent = (msg) => {
        const decryptedContent = decryptedMap[msg._id];
        
        // 1. If we have it in our persistent cache (sent by us or previously decrypted)
        if (decryptedContent) {
            return <p>{decryptedContent}</p>;
        }

        // 2. If it's already plain text (historical)
        if (typeof msg.content !== 'string' || !msg.content.includes('ciphertext')) {
            return <p>{msg.content}</p>;
        }

        // 3. Otherwise, show the Decrypt button for the Receiver
        return (
            <div className="encrypted-placeholder">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', opacity: 0.7 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                    <span style={{ fontSize: '0.75rem' }}>Encrypted Message</span>
                </div>
                <button 
                    className="btn-decrypt-mini" 
                    onClick={() => handleManualDecrypt(msg._id, msg.content)}
                >
                    Decrypt Message
                </button>
            </div>
        );
    };

    return (
        <div className="modal-overlay chat-modal-overlay">
            <div className="glass-panel chat-container fade-in-down">
                <div className="chat-header">
                    <div className="chat-header-info">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <h3>{jobTitle}</h3>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5" title="End-to-End Encrypted"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                        </div>
                        <p className="text-muted small">Secure chat with {otherUser.name}</p>
                    </div>
                    <button className="icon-btn" onClick={onClose}>✕</button>
                </div>

                {isLocked && (
                    <div className="chat-lock-banner">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                        <span>This conversation is closed</span>
                    </div>
                )}

                {!canInitiate && !isLocked && (
                    <div className="chat-lock-banner info">
                        <span>Freelancers cannot initiate contact. Waiting for client to message first...</span>
                    </div>
                )}

                <div className="chat-messages" ref={scrollRef}>
                    {isLoading ? (
                        <div className="text-center py-4">Loading messages...</div>
                    ) : messages.length === 0 ? (
                        <div className="text-center py-4 text-muted">No messages yet. Start the conversation!</div>
                    ) : (
                        messages.map((msg, index) => (
                            <div key={index} className={`message-wrapper ${msg.senderId === currentUser._id ? 'own' : 'other'}`}>
                                <div className="message-bubble">
                                    {renderMessageContent(msg)}
                                    <span className="message-time">
                                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <form className="chat-input-area" onSubmit={handleSend}>
                    <input 
                        type="text" 
                        placeholder={isLocked ? "Conversation locked" : canInitiate ? "Type a message..." : "Waiting for client..."}
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        disabled={isLocked || !canInitiate || isSending}
                    />
                    <button type="submit" className="btn-glow" disabled={isLocked || !canInitiate || isSending || !newMessage.trim()}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                    </button>
                </form>
            </div>
        </div>
    );
};


export default ChatModal;
