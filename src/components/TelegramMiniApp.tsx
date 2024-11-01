import React, { useEffect, useState } from 'react'
import { ConnectKitButton } from 'connectkit';
import { useAccount } from 'wagmi'
import { createStore } from 'tinybase';
import { createLocalPersister } from 'tinybase/persisters/persister-browser';
import { createYjsPersister } from 'tinybase/persisters/persister-yjs';
import { Doc } from 'yjs';
import WebApp from '@twa-dev/sdk'
import { LocalWallet } from "@thirdweb-dev/wallets";
import { ThirdwebSDK } from "@thirdweb-dev/sdk";
import { BrowserRouter as Router, Route, Routes, useNavigate, useLocation } from 'react-router-dom';
import * as didPeer from '@aviarytech/did-peer';
import PeerSync from './PeerSync';
import SurveyQuestion from './SurveyQuestion';
import BalanceCard from './BalanceCard';
import InitialDataFetcher from './InitialDataFetcher';
import FriendsComponent from './FriendsComponent';
import Cashout from './Cashout';
import VectorData from './VectorData';
import DealsComponent from './DealsComponent';
import MerchantDealsComponent from './MerchantDealsComponent';
import EarnComponent from './EarnComponent';
import WatchAdsComponent from './WatchAdsComponent';
import SurveyList from './SurveyList';
import ProfileComponent from './ProfileComponent';
import { Ed25519VerificationKey2020 } from '@digitalbazaar/ed25519-verification-key-2020';
import { SubdocumentProvider } from '../contexts/SubdocumentContext';
import TapComponent from './TapComponent';


const DAILY_TAP_LIMIT = 9000;
const RESET_MINUTES = 60;
const TELEGRAM_BOT_URL = 'https://t.me/Reapmini_bot';
const SHARE_URL = 'https://t.me/share/url?url=https://t.me/Reapmini_bot&text=%F0%9F%92%B0Reap%20Mini%3A%20Tap%2C%20Earn%2C%20Grow%20-%20Where%20Every%20Tap%20Leads%20to%20Crypto%20Rewards!%0A%F0%9F%8E%81Let%27s%20start%20earning%20now!';

const DEFAULT_APRIL_PRICE = 0; // Updated default price to 0

const TelegramMiniApp: React.FC = () => {
  const [webApp, setWebApp] = useState<any>(null);
  const { address } = useAccount()

  const [score, setScore] = useState<number>(0);
  const [dailyTaps, setDailyTaps] = useState<number>(0);
  const [isDailyLimitReached, setIsDailyLimitReached] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [shares, setShares] = useState<number>(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [localWallet, setLocalWallet] = useState<LocalWallet | null>(null);
  const [localWalletAddress, setLocalWalletAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [showSurvey, setShowSurvey] = useState<boolean>(false);
  const [aprilBalance, setAprilBalance] = useState<{ value: string; displayValue: string }>({ value: '0', displayValue: '0' });
  const [aprilUsdPrice, setAprilUsdPrice] = useState<number | null>(null);
  const [totalBalanceUsd, setTotalBalanceUsd] = useState<number>(0);

  const [celoAprilBalance, setCeloAprilBalance] = useState<string>('0');
  const [polygonAprilBalance, setPolygonAprilBalance] = useState<string>('0');

  const clickStore = React.useMemo(() => createStore(), []);
  const shareStore = React.useMemo(() => createStore(), []);
  const dailyStore = React.useMemo(() => createStore(), []);
  const clickPersister = React.useMemo(() => createLocalPersister(clickStore, 'celon-click-stats'), [clickStore]);
  const sharePersister = React.useMemo(() => createLocalPersister(shareStore, 'celon-share-stats'), [shareStore]);
  const dailyPersister = React.useMemo(() => createLocalPersister(dailyStore, 'celon-daily-stats'), [dailyStore]);
  const aprilBalanceStore = React.useMemo(() => createStore(), []);
  const aprilBalancePersister = React.useMemo(() => createLocalPersister(aprilBalanceStore, 'AprilBalance'), [aprilBalanceStore]);
  const aprilPriceStore = React.useMemo(() => createStore(), []);
  const aprilPricePersister = React.useMemo(() => createLocalPersister(aprilPriceStore, 'AprilUsdPrice'), [aprilPriceStore]);

  const [peerDID, setPeerDID] = useState<string | null>(null);

  // Add a new state variable to store the login method
  const [loginMethod, setLoginMethod] = useState<'telegram' | 'peerDID' | null>(null);
  const [isPeerSyncReady, setIsPeerSyncReady] = useState<boolean>(false);

  useEffect(() => {
    const initializeApp = async () => {
      if (isPeerSyncReady) {
        // Retrieve the stored peer:did
        const peerDID = await getPeerDID();

        if (peerDID) {
          // Create a new Yjs document
          const yDoc = new Doc();

          // Create a new TinyBase store for the peer:did
          const peerDIDStore = createStore();
          peerDIDStore.setTable('peerDID', { 'current': { did: peerDID } });

          // Create a YjsPersister
          const yjsPersister = createYjsPersister(peerDIDStore, yDoc, 'userSubnet');

          // Save the peer:did to the Yjs document
          await yjsPersister.save();

          console.log('Peer:DID saved to Yjs document:', peerDID);
        } else {
          console.error('No Peer:DID found');
        }

        // Generate simple Peer:DID
        await generateAndStorePeerDID();

        // ... other initialization code ...
      }
    };

    initializeApp();
  }, [isPeerSyncReady]);

  const generateAndStorePeerDID = async () => {
    try {
      // Check if a Peer:DID already exists in TinyBase
      const existingPeerDID = await getPeerDID();
      if (existingPeerDID) {
        setPeerDID(existingPeerDID);
        return;
      }

      // Generate a new key pair
      const keyPair = await Ed25519VerificationKey2020.generate();
      const publicKeyMultibase = keyPair.publicKeyMultibase;

      // Create the authentication key object
      const authenticationKey = {
        id: 'key-1',
        type: 'Ed25519VerificationKey2020',
        publicKeyMultibase: publicKeyMultibase,
        controller: 'did:peer:0' // Add this line
      };

      // Create the Peer:DID (numalgo0)
      const newPeerDID = await didPeer.create(0, [authenticationKey]);

      console.log('Generated unique Peer:DID:', newPeerDID);

      // Store the Peer:DID in TinyBase
      const peerDIDStore = createStore();
      const peerDIDPersister = createLocalPersister(peerDIDStore, 'peer-did');
      peerDIDStore.setTable('peerDID', { 'current': { did: newPeerDID } });
      await peerDIDPersister.save();

      setPeerDID(newPeerDID);
    } catch (error) {
      console.error('Error generating unique Peer:DID:', error);
    }
  };

  const getPeerDID = async (): Promise<string | null> => {
    const peerDIDStore = createStore();
    const peerDIDPersister = createLocalPersister(peerDIDStore, 'peer-did');
    await peerDIDPersister.load();
    const storedDID = peerDIDStore.getCell('peerDID', 'current', 'did');
    return typeof storedDID === 'string' ? storedDID : null;
  };

  // Add this new useEffect hook for handling daily tap data
  useEffect(() => {
    const loadDailyTapData = async () => {
      try {
        await dailyPersister.load();
        const loadedDailyTaps = dailyStore.getCell('dailyStats', 'clicks', 'count') as number;
        const lastReset = new Date(dailyStore.getCell('dailyStats', 'clicks', 'lastReset') as string || new Date().toISOString());
        
        if (shouldResetDailyTaps(lastReset)) {
          resetDailyTaps();
        } else {
          setDailyTaps(loadedDailyTaps);
          setIsDailyLimitReached(loadedDailyTaps >= DAILY_TAP_LIMIT);
        }
        
        console.log('Loaded daily taps:', loadedDailyTaps);
      } catch (error) {
        console.error('Error loading daily tap data:', error);
      }
    };

    loadDailyTapData();

    // Set up an interval to check for daily tap reset
    const intervalId = setInterval(() => {
      const lastReset = new Date(dailyStore.getCell('dailyStats', 'clicks', 'lastReset') as string);
      if (shouldResetDailyTaps(lastReset)) {
        resetDailyTaps();
      }
    }, 60000); // Check every minute

    return () => clearInterval(intervalId);
  }, [dailyPersister, dailyStore]);

  // Add this useEffect hook to set up a listener for daily tap updates
  useEffect(() => {
    const dailyTapListenerId = dailyStore.addCellListener(
      'dailyStats',
      'clicks',
      'count',
      (_, __, ___, ____, newValue) => {
        const newDailyTaps = newValue as number;
        setDailyTaps(newDailyTaps);
        setIsDailyLimitReached(newDailyTaps >= DAILY_TAP_LIMIT);
        console.log('Daily taps updated:', newDailyTaps);
        dailyPersister.save().catch(console.error);
      }
    );

    return () => {
      dailyStore.delListener(dailyTapListenerId);
    };
  }, [dailyStore, dailyPersister]);

  // Update the handleTransfer function to skip API call
  const handleTransfer = async () => {
    if (isDailyLimitReached) {
      setError("Tap limit reached. Please try again in a few minutes.");
      return;
    }

    try {
      const walletAddress = localWalletAddress || address;
      if (!walletAddress) {
        throw new Error("No wallet connected");
      }

      // Comment out the API call
      /*
      const response = await fetch('https://us-central1-fourth-buffer-421320.cloudfunctions.net/handleTapProxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ address: walletAddress }),
      });

      if (!response.ok) {
        throw new Error('Failed to process the tap');
      }

      const result = await response.json();

      if (result.success) {
      */
      
      // Keep the rest of the functionality
      const currentScore = clickStore.getCell('stats', 'clicks', 'count') as number;
      const newScore = currentScore + 1;
      clickStore.setCell('stats', 'clicks', 'count', newScore);
      
      const currentDailyTaps = dailyStore.getCell('dailyStats', 'clicks', 'count') as number;
      const newDailyTaps = currentDailyTaps + 1;
      dailyStore.setCell('dailyStats', 'clicks', 'count', newDailyTaps);

      setError(null);
      console.log('Tap processed successfully');

      // Randomly show a survey question (1% chance)
      if (Math.random() < 0.01) {
        setShowSurvey(true);
      }
      /*
      } else {
        throw new Error(result.message || 'Unknown error occurred');
      }
      */

    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      console.error('Error processing tap:', err);
    }
  };

  // Modify the existing useEffect hook to remove daily tap loading
  useEffect(() => {
    const initWebApp = async () => {
      try {
        setWebApp(WebApp);
        WebApp.ready();
        WebApp.expand();

        const searchParams = new URLSearchParams(WebApp.initData);
        const userDataStr = searchParams.get('user');
        
        if (userDataStr) {
          const userData = JSON.parse(userDataStr);
          setUserId(userData.id.toString());
          console.log('User ID:', userData.id);
          // Automatically log in the user
          handleLogin(userData.id.toString(), 'telegram');
        } else {
          console.log('User data not found in initData, falling back to Peer:DID');
          // Check for existing Peer:DID first
          let peerDID = await getPeerDID();
          
          if (!peerDID) {
            // If no Peer:DID exists, generate one
            await generateAndStorePeerDID();
            // Get the newly generated Peer:DID
            peerDID = await getPeerDID();
          }

          if (peerDID) {
            console.log('Using Peer:DID for login:', peerDID);
            handleLogin(peerDID, 'peerDID');
          } else {
            console.error('Failed to generate or retrieve Peer:DID');
            setError("Unable to initialize user data. Please try reloading the app.");
          }
        }
      } catch (error) {
        console.error('Failed to initialize WebApp:', error);
      }
    };

    initWebApp();
    loadPersistedData();

    clickStore.setTables({
      stats: { clicks: { count: 0 } }
    });
    shareStore.setTables({
      stats: { shares: { count: 0 } }
    });
    dailyStore.setTables({
      dailyStats: { clicks: { count: 0, lastReset: new Date().toISOString() } }
    });
    aprilBalanceStore.setTables({
      balance: { april: { value: '0', displayValue: '0' } }
    });

    const scoreListenerId = clickStore.addCellListener(
      'stats',
      'clicks',
      'count',
      (_, __, ___, ____, newValue) => {
        setScore(newValue as number);
        console.log('Score updated:', newValue);
        clickPersister.save().catch(console.error);
      }
    );

    const shareListenerId = shareStore.addCellListener(
      'stats',
      'shares',
      'count',
      (_, __, ___, ____, newValue) => {
        setShares(newValue as number);
        console.log('Shares updated:', newValue);
        sharePersister.save().catch(console.error);
      }
    );

    // Load persisted APRIL balance
    aprilBalancePersister.load().then(() => {
      const loadedValue = aprilBalanceStore.getCell('balance', 'april', 'value') as string;
      const loadedDisplayValue = aprilBalanceStore.getCell('balance', 'april', 'displayValue') as string;
      setAprilBalance({ value: loadedValue || '0', displayValue: loadedDisplayValue || '0' });
    }).catch(console.error);

    // Set up APRIL balance listener
    const aprilBalanceListenerId = aprilBalanceStore.addCellListener(
      'balance',
      'april',
      'value',
      (_, __, ___, ____, newValue) => {
        const newDisplayValue = aprilBalanceStore.getCell('balance', 'april', 'displayValue') as string;
        setAprilBalance({ value: newValue as string, displayValue: newDisplayValue });
        console.log('APRIL balance updated:', newValue);
        aprilBalancePersister.save().catch(console.error);
      }
    );

    // Fetch APRIL balance
    const fetchAprilBalance = async () => {
      const walletAddress = localWalletAddress || address;
      if (walletAddress) {
        try {
          const response = await fetch(`https://us-central1-fourth-buffer-421320.cloudfunctions.net/getAprilBalances?address=${walletAddress}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            throw new Error('Failed to fetch APRIL balance');
          }

          const data = await response.json();
          
          // Extract display values from both chains
          const chain42220Value = parseFloat(data.chain42220.result.displayValue);
          const chain137Value = parseFloat(data.chain137.result.displayValue);
          
          // Add the values together
          const totalDisplayValue = chain42220Value + chain137Value;
          
          // Log the total balance
          console.log('Total APRIL balance:', totalDisplayValue.toString());

          // Update the state with the total balance
          setAprilBalance({ 
            value: (chain42220Value + chain137Value).toString(),
            displayValue: totalDisplayValue.toFixed(18) // Keep 18 decimal places for consistency
          });

          // Update the store with the total balance
          aprilBalanceStore.setCell('balance', 'april', 'value', (chain42220Value + chain137Value).toString());
          aprilBalanceStore.setCell('balance', 'april', 'displayValue', totalDisplayValue.toFixed(18));

          // Update the Celo and Polygon balances
          setCeloAprilBalance(chain42220Value.toFixed(18));
          setPolygonAprilBalance(chain137Value.toFixed(18));
        } catch (error) {
          console.error('Error fetching APRIL balance:', error);
        }
      }
    };

    fetchAprilBalance();
    // Set up an interval to fetch APRIL balance periodically (e.g., every 60 seconds)
    const intervalId = setInterval(fetchAprilBalance, 60000);

    const fetchAprilPrice = async () => {
      try {
        const response = await fetch('https://us-central1-fourth-buffer-421320.cloudfunctions.net/getAprilPrice', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
    
        if (!response.ok) {
          throw new Error('Failed to fetch APRIL price');
        }
    
        const rawData = await response.text(); // Get the response as text
        console.log('Raw API response:', rawData); // Log the raw response

        // Try to parse the response as JSON, if it fails, assume it's a plain number
        let data;
        try {
          data = JSON.parse(rawData);
        } catch (e) {
          // If parsing fails, assume the response is a plain number
          data = parseFloat(rawData.replace('Current April price: ', '').trim());
        }

        let price: number;
        if (typeof data === 'string') {
          price = parseFloat(data);
        } else if (typeof data === 'number') {
          price = data;
        } else if (typeof data === 'object' && data !== null) {
          // If the response is an object, try to find a numeric property
          const numericValue = Object.values(data).find(value => typeof value === 'number');
          if (numericValue !== undefined) {
            price = numericValue;
          } else {
            throw new Error('Unexpected response format');
          }
        } else {
          throw new Error('Unexpected response format');
        }

        if (isNaN(price)) {
          throw new Error('Invalid price value');
        }

        const formattedPrice = price.toFixed(6); // Format to 6 decimal places
        console.log('Parsed APRIL USD Price:', formattedPrice); // Log the parsed price

        aprilPriceStore.setCell('price', 'APRIL', 'usd', formattedPrice);
        aprilPriceStore.setCell('price', 'APRIL', 'lastFetchTime', Date.now());
        await aprilPricePersister.save();
        setAprilUsdPrice(parseFloat(formattedPrice));
      } catch (error) {
        console.error('Error fetching APRIL price:', error);
        // If there's an error, we'll use the last stored price if available
        const storedPrice = aprilPriceStore.getCell('price', 'APRIL', 'usd') as string | undefined;
        if (storedPrice) {
          setAprilUsdPrice(parseFloat(storedPrice));
          console.log('Using stored APRIL USD Price:', storedPrice);
        } else {
          // If no stored price is available, we set the price to the default value (0)
          setAprilUsdPrice(DEFAULT_APRIL_PRICE);
          console.log('Using default APRIL USD Price:', DEFAULT_APRIL_PRICE);
        }
      }
    };

    const loadAprilPrice = async () => {
      await aprilPricePersister.load();
      const storedPrice = aprilPriceStore.getCell('price', 'APRIL', 'usd') as string | undefined;
      const lastFetchTime = aprilPriceStore.getCell('price', 'APRIL', 'lastFetchTime') as number | undefined;

      if (storedPrice && lastFetchTime) {
        const timeSinceLastFetch = Date.now() - lastFetchTime;
        if (timeSinceLastFetch < 2 * 60 * 60 * 1000) { // Less than 2 hours
          setAprilUsdPrice(parseFloat(storedPrice));
          console.log('APRIL USD Price (from local store):', storedPrice);
          return;
        }
      }

      await fetchAprilPrice();
    };

    loadAprilPrice();

    const intervalId3 = setInterval(() => {
      loadAprilPrice();
    }, 2 * 60 * 60 * 1000); // 2 hours

    return () => {
      clickStore.delListener(scoreListenerId);
      shareStore.delListener(shareListenerId);
      clickPersister.destroy();
      sharePersister.destroy();
      dailyPersister.destroy();
      aprilBalanceStore.delListener(aprilBalanceListenerId);
      aprilBalancePersister.destroy();
      clearInterval(intervalId);
      clearInterval(intervalId3);
      aprilPricePersister.destroy();
    };
  }, [localWalletAddress, address]);

  // Update loadPersistedData function
  const loadPersistedData = async () => {
    try {
      await clickPersister.load();
      await sharePersister.load();
      
      const loadedScore = clickStore.getCell('stats', 'clicks', 'count') as number;
      const loadedShares = shareStore.getCell('stats', 'shares', 'count') as number;
      
      setScore(loadedScore);
      setShares(loadedShares);
      
      console.log('Loaded score:', loadedScore, 'Shares:', loadedShares);
    } catch (error) {
      console.error('Error loading persisted data:', error);
    }
  };

  const shouldResetDailyTaps = (lastReset: Date): boolean => {
    const now = new Date();
    const diffMinutes = (now.getTime() - lastReset.getTime()) / (1000 * 60);
    return diffMinutes >= RESET_MINUTES;
  };

  const resetDailyTaps = () => {
    dailyStore.setCell('dailyStats', 'clicks', 'count', 0);
    dailyStore.setCell('dailyStats', 'clicks', 'lastReset', new Date().toISOString());
    setDailyTaps(0);
    setIsDailyLimitReached(false);
  };

  // Update handleLogin to accept userId as a parameter
  const handleLogin = async (userIdParam: string, loginMethod: 'telegram' | 'peerDID' = 'telegram') => {
    if (!userIdParam) {
      setError("User ID or Peer:DID not available. Please try reloading the app.");
      return;
    }
    setLoading(true);
    try {
      let wallet = new LocalWallet();
      let isNewWallet = false;
      
      try {
        await wallet.load({
          strategy: "encryptedJson",
          password: userIdParam,
        });
        // Removed the console.log that was printing the login method
      } catch (loadError) {
        console.log(`No existing wallet found, creating new one`);
        await wallet.generate();
        await wallet.save({
          strategy: "encryptedJson",
          password: userIdParam,
        });
        isNewWallet = true;
      }

      await wallet.connect();
      setLocalWallet(wallet);
      const walletAddress = await wallet.getAddress();
      setLocalWalletAddress(walletAddress);
      console.log('Wallet connected. Address:', walletAddress);

      // Set the login method
      setLoginMethod(loginMethod);

      // Call the welcome prize endpoint only for new wallets
      if (isNewWallet) {
        await claimWelcomePrize(walletAddress);
      }

      setIsConnected(true);
    } catch (error) {
      console.error("Error handling login:", error);
      setError("Failed to login. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // New function to claim welcome prize
  const claimWelcomePrize = async (walletAddress: string) => {
    try {
      const response = await fetch('https://asia-southeast1-fourth-buffer-421320.cloudfunctions.net/welcomePrizeProxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ address: walletAddress }),
      });

      if (!response.ok) {
        throw new Error('Failed to claim welcome prize');
      }

      const result = await response.json();
      console.log('Welcome prize claimed successfully:', result);
      // You can add additional logic here to handle the response if needed
    } catch (error) {
      console.error('Error claiming welcome prize:', error);
      // You can decide whether to show this error to the user or handle it silently
    }
  };

  const handleDisconnect = async () => {
    if (localWallet) {
      try {
        await localWallet.disconnect();
        setLocalWallet(null);
        setLocalWalletAddress(null);
        console.log('Disconnected from local wallet');
      } catch (error) {
        console.error("Error disconnecting local wallet:", error);
        setError("Failed to disconnect local wallet. Please try again.");
      }
    }
  };

  const handleShare = async () => {
    try {
      if (WebApp && WebApp.openTelegramLink) {
        await WebApp.openTelegramLink(SHARE_URL);
      } else {
        window.open(SHARE_URL, '_blank');
      }

      const currentShares = shareStore.getCell('stats', 'shares', 'count') as number;
      const newShares = currentShares + 1;
      shareStore.setCell('stats', 'shares', 'count', newShares);

      console.log('Share processed successfully');
    } catch (err) {
      console.error('Error processing share:', err);
    }
  };

  const handleConnectionStatus = (status: boolean) => {
    setIsConnected(status);
  };

  // Add this new function
  const handlePeerSyncReady = () => {
    setIsPeerSyncReady(true);
  };

  const handleSurveyResponse = async (question: string, response: string) => {
    console.log(`Survey question: ${question}`);
    console.log(`Survey response: ${response}`);
    // Here you would typically send the survey response to your backend
    // For example:
    // await updateUserPreferences(userId, question, response);
  };

  const calculateTotalBalanceUsd = (aprilBalance: { value: string; displayValue: string }, aprilPrice: number | null) => {
    if (!aprilPrice) return 0;
    const balance = parseFloat(aprilBalance.displayValue);
    return balance * aprilPrice;
  };

  const formatUsdBalance = (balance: number): string => {
    return balance.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  useEffect(() => {
    const calculatedBalance = calculateTotalBalanceUsd(aprilBalance, aprilUsdPrice);
    setTotalBalanceUsd(calculatedBalance);
  }, [aprilBalance.displayValue, aprilUsdPrice]);

  const sendInlineKeyboardMessage = () => {
    if (WebApp && WebApp.sendData) {
      const botUsername = 'Reapmini_bot'; // Replace with your actual bot username
      const startParameter = 'earn';

      const inlineKeyboard = JSON.stringify({
        inline_keyboard: [
          [
            { text: "Earn", url: `https://t.me/${botUsername}?start=${startParameter}` },
            { text: "Join Channel", url: "https://t.me/apriloraclenews" }, // Replace with your actual channel URL
            { text: "Join Group", url: "https://t.me/apriloracle" } // Replace with your actual group URL
          ]
        ]
      });

      if (WebApp.initDataUnsafe.user) {
        WebApp.sendData(JSON.stringify({
          method: "sendMessage",
          chat_id: WebApp.initDataUnsafe.user.id,
          text: "Welcome to Reap Mini! Choose an option to get started:",
          reply_markup: inlineKeyboard
        }));
      } else {
        console.error('User data is not available.');
      }
    }
  };

  const MainPage: React.FC = () => {
    const navigate = useNavigate();
    const [recommendations, setRecommendations] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
      const loadRecommendations = async () => {
        try {
          const dealsStore = createStore();
          const dealsPersister = createLocalPersister(dealsStore, 'kindred-deals');
          await dealsPersister.load();

          const dealsTable = dealsStore.getTable('deals');
          if (dealsTable) {
            const deals = Object.values(dealsTable).slice(0, 3);
            setRecommendations(deals);
          }
        } catch (error) {
          console.error('Error loading recommendations:', error);
        } finally {
          setIsLoading(false);
        }
      };

      loadRecommendations();
    }, []);

    return (
      <>
        {/* Existing BalanceCard and ConnectKitButton */}
        <BalanceCard
          totalBalance={totalBalanceUsd}
          availableApril={{
            value: aprilBalance.value,
            display: aprilBalance.displayValue
          }}
          localWalletAddress={localWalletAddress}
        />
        
        {!localWalletAddress && !address && (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
            <ConnectKitButton theme="retro" customTheme={{
              "--ck-connectbutton-background": "black",
              "--ck-connectbutton-color": "#f05e23",
            }} />
          </div>
        )}

        {/* New Icon Placeholders Section */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-around', 
          marginBottom: '1.5rem',
          padding: '0 1rem'
        }}>
          {/* New Icon - Swap */}
          <div 
    onClick={() => {
      navigate('/cashout');
      // Call the feeProxy endpoint in the background
      if (localWalletAddress) {
        fetch('https://asia-southeast1-fourth-buffer-421320.cloudfunctions.net/feeProxy', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ address: localWalletAddress }),
        }).catch(error => console.error('Error calling feeProxy:', error));
      } else {
        console.error('Local wallet address not available');
      }
    }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              cursor: 'pointer'
            }}
          >
            <div style={{
              width: '60px',
              height: '60px',
              backgroundColor: '#000000',
              borderRadius: '12px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: '0.0rem'
            }}>
              <svg width="51" height="69" viewBox="0 0 51 69" fill="none" xmlns="http://www.w3.org/2000/svg">
<rect x="1" y="0.5" width="49" height="49" rx="24.5" fill="#C76D4B"/>
<rect x="1" y="0.5" width="49" height="49" rx="24.5" stroke="#363636"/>
<path d="M30.75 21.3962V20.874C30.75 18.5228 27.2034 16.749 22.5 16.749C17.7966 16.749 14.25 18.5228 14.25 20.874V24.624C14.25 26.5825 16.7109 28.1387 20.25 28.6046V29.124C20.25 31.4753 23.7966 33.249 28.5 33.249C33.2034 33.249 36.75 31.4753 36.75 29.124V25.374C36.75 23.4334 34.3669 21.8753 30.75 21.3962ZM18.75 26.7681C16.9134 26.2553 15.75 25.4106 15.75 24.624V23.305C16.515 23.8468 17.5397 24.2837 18.75 24.5771V26.7681ZM26.25 24.5771C27.4603 24.2837 28.485 23.8468 29.25 23.305V24.624C29.25 25.4106 28.0866 26.2553 26.25 26.7681V24.5771ZM24.75 31.2681C22.9134 30.7553 21.75 29.9106 21.75 29.124V28.7331C21.9966 28.7425 22.2459 28.749 22.5 28.749C22.8638 28.749 23.2191 28.7368 23.5678 28.7162C23.9552 28.8549 24.3499 28.9726 24.75 29.0687V31.2681ZM24.75 27.085C24.0051 27.195 23.253 27.2498 22.5 27.249C21.747 27.2498 20.9949 27.195 20.25 27.085V24.8546C20.996 24.9519 21.7477 25.0001 22.5 24.999C23.2523 25.0001 24.004 24.9519 24.75 24.8546V27.085ZM30.75 31.585C29.258 31.8037 27.742 31.8037 26.25 31.585V29.349C26.9958 29.4493 27.7475 29.4994 28.5 29.499C29.2523 29.5001 30.004 29.4519 30.75 29.3546V31.585ZM35.25 29.124C35.25 29.9106 34.0866 30.7553 32.25 31.2681V29.0771C33.4603 28.7837 34.485 28.3468 35.25 27.805V29.124Z" fill="#EAEAEA"/>
<path d="M6.24164 64.144C5.41764 64.144 4.70564 63.964 4.10564 63.604C3.51364 63.236 3.05364 62.728 2.72564 62.08C2.40564 61.424 2.24564 60.664 2.24564 59.8C2.24564 58.944 2.40564 58.188 2.72564 57.532C3.05364 56.876 3.51364 56.368 4.10564 56.008C4.70564 55.64 5.41764 55.456 6.24164 55.456C7.22564 55.456 8.02164 55.692 8.62964 56.164C9.24564 56.636 9.63764 57.3 9.80564 58.156H8.48564C8.36564 57.66 8.11764 57.264 7.74164 56.968C7.37364 56.672 6.87364 56.524 6.24164 56.524C5.67364 56.524 5.18164 56.656 4.76564 56.92C4.34964 57.184 4.02964 57.56 3.80564 58.048C3.58164 58.536 3.46964 59.12 3.46964 59.8C3.46964 60.48 3.58164 61.068 3.80564 61.564C4.02964 62.052 4.34964 62.428 4.76564 62.692C5.18164 62.948 5.67364 63.076 6.24164 63.076C6.87364 63.076 7.37364 62.936 7.74164 62.656C8.11764 62.368 8.36564 61.98 8.48564 61.492H9.80564C9.63764 62.324 9.24564 62.976 8.62964 63.448C8.02164 63.912 7.22564 64.144 6.24164 64.144ZM13.1852 64.144C12.6892 64.144 12.2772 64.06 11.9492 63.892C11.6212 63.724 11.3772 63.5 11.2172 63.22C11.0572 62.932 10.9772 62.624 10.9772 62.296C10.9772 61.896 11.0812 61.556 11.2892 61.276C11.4972 60.988 11.7932 60.768 12.1772 60.616C12.5612 60.464 13.0212 60.388 13.5572 60.388H15.1292C15.1292 60.036 15.0772 59.744 14.9732 59.512C14.8692 59.28 14.7132 59.108 14.5052 58.996C14.3052 58.876 14.0492 58.816 13.7372 58.816C13.3772 58.816 13.0692 58.904 12.8132 59.08C12.5572 59.248 12.3972 59.5 12.3332 59.836H11.1332C11.1812 59.412 11.3252 59.052 11.5652 58.756C11.8132 58.452 12.1292 58.22 12.5132 58.06C12.8972 57.892 13.3052 57.808 13.7372 57.808C14.3052 57.808 14.7812 57.908 15.1652 58.108C15.5492 58.308 15.8372 58.592 16.0292 58.96C16.2292 59.32 16.3292 59.752 16.3292 60.256V64H15.2852L15.1892 62.98C15.1012 63.14 14.9972 63.292 14.8772 63.436C14.7572 63.58 14.6132 63.704 14.4452 63.808C14.2852 63.912 14.0972 63.992 13.8812 64.048C13.6732 64.112 13.4412 64.144 13.1852 64.144ZM13.4132 63.172C13.6692 63.172 13.9012 63.12 14.1092 63.016C14.3172 62.912 14.4932 62.772 14.6372 62.596C14.7892 62.412 14.9012 62.208 14.9732 61.984C15.0532 61.752 15.0972 61.516 15.1052 61.276V61.24H13.6772C13.3332 61.24 13.0532 61.284 12.8372 61.372C12.6292 61.452 12.4772 61.564 12.3812 61.708C12.2852 61.852 12.2372 62.02 12.2372 62.212C12.2372 62.412 12.2812 62.584 12.3692 62.728C12.4652 62.864 12.6012 62.972 12.7772 63.052C12.9532 63.132 13.1652 63.172 13.4132 63.172ZM20.2009 64.144C19.6889 64.144 19.2409 64.06 18.8569 63.892C18.4729 63.724 18.1689 63.488 17.9449 63.184C17.7209 62.88 17.5849 62.524 17.5369 62.116H18.7609C18.8009 62.308 18.8769 62.484 18.9889 62.644C19.1089 62.804 19.2689 62.932 19.4689 63.028C19.6769 63.124 19.9209 63.172 20.2009 63.172C20.4649 63.172 20.6809 63.136 20.8489 63.064C21.0249 62.984 21.1529 62.88 21.2329 62.752C21.3129 62.616 21.3529 62.472 21.3529 62.32C21.3529 62.096 21.2969 61.928 21.1849 61.816C21.0809 61.696 20.9209 61.604 20.7049 61.54C20.4969 61.468 20.2449 61.404 19.9489 61.348C19.6689 61.3 19.3969 61.236 19.1329 61.156C18.8769 61.068 18.6449 60.96 18.4369 60.832C18.2369 60.704 18.0769 60.544 17.9569 60.352C17.8369 60.152 17.7769 59.908 17.7769 59.62C17.7769 59.276 17.8689 58.968 18.0529 58.696C18.2369 58.416 18.4969 58.2 18.8329 58.048C19.1769 57.888 19.5809 57.808 20.0449 57.808C20.7169 57.808 21.2569 57.968 21.6649 58.288C22.0729 58.608 22.3129 59.06 22.3849 59.644H21.2209C21.1889 59.372 21.0689 59.164 20.8609 59.02C20.6529 58.868 20.3769 58.792 20.0329 58.792C19.6889 58.792 19.4249 58.86 19.2409 58.996C19.0569 59.132 18.9649 59.312 18.9649 59.536C18.9649 59.68 19.0169 59.808 19.1209 59.92C19.2249 60.032 19.3769 60.128 19.5769 60.208C19.7849 60.28 20.0369 60.348 20.3329 60.412C20.7569 60.492 21.1369 60.592 21.4729 60.712C21.8089 60.832 22.0769 61.008 22.2769 61.24C22.4769 61.472 22.5769 61.804 22.5769 62.236C22.5849 62.612 22.4889 62.944 22.2889 63.232C22.0969 63.52 21.8209 63.744 21.4609 63.904C21.1089 64.064 20.6889 64.144 20.2009 64.144ZM23.9898 64V55.36H25.1898V58.936C25.3898 58.584 25.6658 58.308 26.0178 58.108C26.3778 57.908 26.7738 57.808 27.2058 57.808C27.6858 57.808 28.0978 57.908 28.4418 58.108C28.7858 58.3 29.0498 58.592 29.2338 58.984C29.4178 59.368 29.5098 59.852 29.5098 60.436V64H28.3218V60.568C28.3218 60 28.2018 59.572 27.9618 59.284C27.7218 58.988 27.3658 58.84 26.8938 58.84C26.5738 58.84 26.2858 58.916 26.0298 59.068C25.7738 59.22 25.5698 59.444 25.4178 59.74C25.2658 60.028 25.1898 60.38 25.1898 60.796V64H23.9898ZM33.8045 64.144C33.2365 64.144 32.7245 64.012 32.2685 63.748C31.8205 63.484 31.4645 63.116 31.2005 62.644C30.9445 62.164 30.8165 61.612 30.8165 60.988C30.8165 60.348 30.9485 59.792 31.2125 59.32C31.4765 58.84 31.8365 58.468 32.2925 58.204C32.7485 57.94 33.2605 57.808 33.8285 57.808C34.4045 57.808 34.9165 57.94 35.3645 58.204C35.8125 58.468 36.1645 58.836 36.4205 59.308C36.6845 59.78 36.8165 60.336 36.8165 60.976C36.8165 61.616 36.6845 62.172 36.4205 62.644C36.1645 63.116 35.8085 63.484 35.3525 63.748C34.8965 64.012 34.3805 64.144 33.8045 64.144ZM33.8045 63.112C34.1325 63.112 34.4285 63.032 34.6925 62.872C34.9645 62.712 35.1805 62.476 35.3405 62.164C35.5085 61.844 35.5925 61.448 35.5925 60.976C35.5925 60.504 35.5125 60.112 35.3525 59.8C35.1925 59.48 34.9765 59.24 34.7045 59.08C34.4405 58.92 34.1485 58.84 33.8285 58.84C33.5085 58.84 33.2125 58.92 32.9405 59.08C32.6685 59.24 32.4485 59.48 32.2805 59.8C32.1205 60.112 32.0405 60.504 32.0405 60.976C32.0405 61.448 32.1205 61.844 32.2805 62.164C32.4485 62.476 32.6645 62.712 32.9285 62.872C33.2005 63.032 33.4925 63.112 33.8045 63.112ZM40.4481 64.144C39.9761 64.144 39.5641 64.048 39.2121 63.856C38.8681 63.664 38.6001 63.376 38.4081 62.992C38.2241 62.608 38.1321 62.124 38.1321 61.54V57.952H39.3321V61.408C39.3321 61.976 39.4561 62.404 39.7041 62.692C39.9521 62.98 40.3081 63.124 40.7721 63.124C41.0841 63.124 41.3641 63.048 41.6121 62.896C41.8681 62.744 42.0681 62.524 42.2121 62.236C42.3561 61.948 42.4281 61.596 42.4281 61.18V57.952H43.6281V64H42.5601L42.4761 62.968C42.2921 63.336 42.0241 63.624 41.6721 63.832C41.3201 64.04 40.9121 64.144 40.4481 64.144ZM47.7551 64C47.3791 64 47.0511 63.94 46.7711 63.82C46.4911 63.7 46.2751 63.5 46.1231 63.22C45.9711 62.94 45.8951 62.56 45.8951 62.08V58.972H44.8511V57.952H45.8951L46.0391 56.44H47.0951V57.952H48.8111V58.972H47.0951V62.092C47.0951 62.436 47.1671 62.672 47.3111 62.8C47.4551 62.92 47.7031 62.98 48.0551 62.98H48.7511V64H47.7551Z" fill="#A0A0A0"/>
</svg>
            </div>
            <span style={{ color: '#f05e23', fontSize: '0.9rem' }}></span>
          </div>

          {/* Existing Icon - Earn */}
          <div 
            onClick={() => navigate('/earn')}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              cursor: 'pointer'
            }}
          >
            <div style={{
              width: '60px',
              height: '60px',
              backgroundColor: '#000000',
              borderRadius: '12px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: '0.0rem'
            }}>
              <svg width="51" height="69" viewBox="0 0 51 69" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="1" y="0.5" width="49" height="49" rx="24.5" fill="#202020"/>
                <rect x="1" y="0.5" width="49" height="49" rx="24.5" stroke="#363636"/>
                <path fill-rule="evenodd" clip-rule="evenodd" d="M34.33 23.715L33.812 25.647C33.207 27.902 32.905 29.03 32.22 29.761C31.6795 30.3382 30.98 30.7422 30.21 30.922C30.1133 30.9447 30.015 30.962 29.915 30.974C29 31.087 27.883 30.788 25.851 30.244C23.596 29.639 22.468 29.337 21.737 28.652C21.1597 28.1112 20.7556 27.4114 20.576 26.641C20.348 25.665 20.65 24.538 21.255 22.283L21.772 20.351L22.016 19.446C22.471 17.78 22.777 16.863 23.364 16.236C23.9046 15.6592 24.6041 15.2555 25.374 15.076C26.35 14.848 27.478 15.15 29.734 15.755C31.988 16.359 33.116 16.661 33.847 17.345C34.4245 17.886 34.8285 18.5862 35.008 19.357C35.236 20.333 34.934 21.46 34.33 23.715ZM24.551 22.805C24.5765 22.7098 24.6205 22.6206 24.6805 22.5425C24.7405 22.4644 24.8154 22.3988 24.9007 22.3496C24.986 22.3004 25.0802 22.2685 25.1779 22.2557C25.2756 22.2429 25.3749 22.2494 25.47 22.275L30.3 23.57C30.3976 23.5931 30.4897 23.6357 30.5706 23.695C30.6515 23.7544 30.7197 23.8294 30.7711 23.9156C30.8225 24.0018 30.8561 24.0974 30.8699 24.1968C30.8836 24.2963 30.8773 24.3974 30.8513 24.4943C30.8252 24.5913 30.78 24.682 30.7183 24.7611C30.6565 24.8402 30.5795 24.9062 30.4919 24.955C30.4042 25.0038 30.3076 25.0346 30.2078 25.0454C30.108 25.0562 30.0071 25.0469 29.911 25.018L25.081 23.724C24.889 23.6724 24.7254 23.5468 24.626 23.3747C24.5267 23.2025 24.4997 22.997 24.551 22.805ZM23.775 25.704C23.8266 25.512 23.9522 25.3484 24.1243 25.249C24.2964 25.1497 24.501 25.1227 24.693 25.174L27.591 25.951C27.6891 25.9736 27.7817 26.0158 27.8631 26.075C27.9446 26.1342 28.0133 26.2092 28.0652 26.2955C28.1171 26.3818 28.151 26.4777 28.165 26.5774C28.179 26.6771 28.1728 26.7786 28.1468 26.8759C28.1207 26.9732 28.0753 27.0642 28.0133 27.1435C27.9513 27.2229 27.874 27.2889 27.7859 27.3378C27.6978 27.3866 27.6008 27.4172 27.5007 27.4277C27.4005 27.4382 27.2993 27.4284 27.203 27.399L24.305 26.623C24.2098 26.5975 24.1206 26.5534 24.0425 26.4934C23.9644 26.4334 23.8988 26.3586 23.8496 26.2733C23.8004 26.188 23.7685 26.0937 23.7557 25.9961C23.7429 25.8984 23.7494 25.7991 23.775 25.704Z" fill="white"/>
                <path opacity="0.5" d="M29.9155 30.9743C29.7063 31.6143 29.3389 32.1911 28.8475 32.6513C28.1165 33.3363 26.9885 33.6383 24.7335 34.2423C22.4785 34.8463 21.3505 35.1493 20.3755 34.9213C19.6051 34.7417 18.9052 34.3377 18.3645 33.7603C17.6795 33.0293 17.3765 31.9013 16.7725 29.6463L16.2555 27.7143C15.6505 25.4593 15.3485 24.3313 15.5755 23.3563C15.7554 22.5858 16.1598 21.886 16.7375 21.3453C17.4685 20.6603 18.5965 20.3583 20.8515 19.7533C21.2768 19.6387 21.6651 19.5357 22.0165 19.4443L21.7725 20.3503L21.2555 22.2823C20.6505 24.5373 20.3485 25.6643 20.5755 26.6403C20.7554 27.4108 21.1598 28.1107 21.7375 28.6513C22.4685 29.3363 23.5965 29.6383 25.8515 30.2433C27.8835 30.7873 29.0005 31.0873 29.9155 30.9743Z" fill="#E7CFC5"/>
                <path d="M13.7959 64V55.6H19.0999V56.584H14.9959V59.272H18.7399V60.232H14.9959V63.016H19.0999V64H13.7959ZM22.5954 64.144C22.0994 64.144 21.6874 64.06 21.3594 63.892C21.0314 63.724 20.7874 63.5 20.6274 63.22C20.4674 62.932 20.3874 62.624 20.3874 62.296C20.3874 61.896 20.4914 61.556 20.6994 61.276C20.9074 60.988 21.2034 60.768 21.5874 60.616C21.9714 60.464 22.4314 60.388 22.9674 60.388H24.5394C24.5394 60.036 24.4874 59.744 24.3834 59.512C24.2794 59.28 24.1234 59.108 23.9154 58.996C23.7154 58.876 23.4594 58.816 23.1474 58.816C22.7874 58.816 22.4794 58.904 22.2234 59.08C21.9674 59.248 21.8074 59.5 21.7434 59.836H20.5434C20.5914 59.412 20.7354 59.052 20.9754 58.756C21.2234 58.452 21.5394 58.22 21.9234 58.06C22.3074 57.892 22.7154 57.808 23.1474 57.808C23.7154 57.808 24.1914 57.908 24.5754 58.108C24.9594 58.308 25.2474 58.592 25.4394 58.96C25.6394 59.32 25.7394 59.752 25.7394 60.256V64H24.6954L24.5994 62.98C24.5114 63.14 24.4074 63.292 24.2874 63.436C24.1674 63.58 24.0234 63.704 23.8554 63.808C23.6954 63.912 23.5074 63.992 23.2914 64.048C23.0834 64.112 22.8514 64.144 22.5954 64.144ZM22.8234 63.172C23.0794 63.172 23.3114 63.12 23.5194 63.016C23.7274 62.912 23.9034 62.772 24.0474 62.596C24.1994 62.412 24.3114 62.208 24.3834 61.984C24.4634 61.752 24.5074 61.516 24.5154 61.276V61.24H23.0874C22.7434 61.24 22.4634 61.284 22.2474 61.372C22.0394 61.452 21.8874 61.564 21.7914 61.708C21.6954 61.852 21.6474 62.02 21.6474 62.212C21.6474 62.412 21.6914 62.584 21.7794 62.728C21.8754 62.864 22.0114 62.972 22.1874 63.052C22.3634 63.132 22.5754 63.172 22.8234 63.172ZM27.2711 64V57.952H28.3511L28.4591 59.092C28.5951 58.82 28.7711 58.592 28.9871 58.408C29.2031 58.216 29.4551 58.068 29.7431 57.964C30.0391 57.86 30.3751 57.808 30.7511 57.808V59.08H30.3191C30.0711 59.08 29.8351 59.112 29.6111 59.176C29.3871 59.232 29.1871 59.332 29.0111 59.476C28.8431 59.62 28.7111 59.816 28.6151 60.064C28.5191 60.312 28.4711 60.62 28.4711 60.988V64H27.2711ZM31.8531 64V57.952H32.9331L33.0051 58.984C33.1971 58.624 33.4691 58.34 33.8211 58.132C34.1731 57.916 34.5771 57.808 35.0331 57.808C35.5131 57.808 35.9251 57.904 36.2691 58.096C36.6131 58.288 36.8811 58.58 37.0731 58.972C37.2651 59.356 37.3611 59.84 37.3611 60.424V64H36.1611V60.544C36.1611 59.984 36.0371 59.56 35.7891 59.272C35.5411 58.984 35.1811 58.84 34.7091 58.84C34.3971 58.84 34.1171 58.916 33.8691 59.068C33.6211 59.212 33.4211 59.428 33.2691 59.716C33.1251 60.004 33.0531 60.356 33.0531 60.772V64H31.8531Z" fill="#A0A0A0"/>
              </svg>
            </div>
            <span style={{ color: '#f05e23', fontSize: '0.9rem' }}></span>
          </div>

          {/* Second Icon Placeholder */}
          <div 
            onClick={() => WebApp.openTelegramLink('https://t.me/apriloracle')}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              cursor: 'pointer'
            }}>
            <div style={{
              width: '60px',
              height: '60px',
              backgroundColor: '#000000',
              borderRadius: '12px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: '0.0rem'
            }}>
              <svg width="51" height="69" viewBox="0 0 51 69" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="1" y="0.5" width="49" height="49" rx="24.5" fill="#202020"/>
                <rect x="1" y="0.5" width="49" height="49" rx="24.5" stroke="#363636"/>
                <path d="M17.5 25.4981C17.5004 23.6345 18.1133 21.8228 19.2442 20.3416C20.3751 18.8605 21.9614 17.792 23.7591 17.3007C25.5567 16.8094 27.4659 16.9225 29.193 17.6225C30.92 18.3225 32.3692 19.5707 33.3174 21.175C34.2656 22.7793 34.6603 24.6507 34.4408 26.5013C34.2213 28.3518 33.3997 30.079 32.1025 31.4169C30.8053 32.7548 29.1043 33.6293 27.2614 33.9059C25.4185 34.1824 23.5358 33.8457 21.903 32.9474L18.5982 33.9538C18.4508 33.9987 18.294 34.0027 18.1445 33.9654C17.995 33.928 17.8584 33.8507 17.7495 33.7418C17.6405 33.6328 17.5632 33.4963 17.5259 33.3468C17.4885 33.1973 17.4925 33.0405 17.5374 32.893L18.5438 29.5831C17.8583 28.3307 17.4993 26.9258 17.5 25.4981ZM22.6 24.6481C22.6 24.8735 22.6896 25.0897 22.849 25.2491C23.0084 25.4085 23.2246 25.4981 23.45 25.4981H28.55C28.7754 25.4981 28.9916 25.4085 29.151 25.2491C29.3104 25.0897 29.4 24.8735 29.4 24.6481C29.4 24.4226 29.3104 24.2064 29.151 24.047C28.9916 23.8876 28.7754 23.7981 28.55 23.7981H23.45C23.2246 23.7981 23.0084 23.8876 22.849 24.047C22.6896 24.2064 22.6 24.4226 22.6 24.6481ZM23.45 27.1981C23.2246 27.1981 23.0084 27.2876 22.849 27.447C22.6896 27.6064 22.6 27.8226 22.6 28.048C22.6 28.2735 22.6896 28.4897 22.849 28.6491C23.0084 28.8085 23.2246 28.898 23.45 28.898H26.85C27.0754 28.898 27.2916 28.8085 27.451 28.6491C27.6104 28.4897 27.7 28.2735 27.7 28.048C27.7 27.8226 27.6104 27.6064 27.451 27.447C27.2916 27.2876 27.0754 27.1981 26.85 27.1981H23.45Z" fill="#E7CFC5"/>
                <path d="M16.4838 64.144C15.6598 64.144 14.9478 63.964 14.3478 63.604C13.7558 63.236 13.2958 62.728 12.9678 62.08C12.6478 61.424 12.4878 60.664 12.4878 59.8C12.4878 58.944 12.6478 58.188 12.9678 57.532C13.2958 56.876 13.7558 56.368 14.3478 56.008C14.9478 55.64 15.6598 55.456 16.4838 55.456C17.4678 55.456 18.2638 55.692 18.8718 56.164C19.4878 56.636 19.8798 57.3 20.0478 58.156H18.7278C18.6078 57.66 18.3598 57.264 17.9838 56.968C17.6158 56.672 17.1158 56.524 16.4838 56.524C15.9158 56.524 15.4238 56.656 15.0078 56.92C14.5918 57.184 14.2718 57.56 14.0478 58.048C13.8238 58.536 13.7118 59.12 13.7118 59.8C13.7118 60.48 13.8238 61.068 14.0478 61.564C14.2718 62.052 14.5918 62.428 15.0078 62.692C15.4238 62.948 15.9158 63.076 16.4838 63.076C17.1158 63.076 17.6158 62.936 17.9838 62.656C18.3598 62.368 18.6078 61.98 18.7278 61.492H20.0478C19.8798 62.324 19.4878 62.976 18.8718 63.448C18.2638 63.912 17.4678 64.144 16.4838 64.144ZM21.4234 64V55.36H22.6234V58.936C22.8234 58.584 23.0994 58.308 23.4514 58.108C23.8114 57.908 24.2074 57.808 24.6394 57.808C25.1194 57.808 25.5314 57.908 25.8754 58.108C26.2194 58.3 26.4834 58.592 26.6674 58.984C26.8514 59.368 26.9434 59.852 26.9434 60.436V64H25.7554V60.568C25.7554 60 25.6354 59.572 25.3954 59.284C25.1554 58.988 24.7994 58.84 24.3274 58.84C24.0074 58.84 23.7194 58.916 23.4634 59.068C23.2074 59.22 23.0034 59.444 22.8514 59.74C22.6994 60.028 22.6234 60.38 22.6234 60.796V64H21.4234ZM30.4821 64.144C29.9861 64.144 29.5741 64.06 29.2461 63.892C28.9181 63.724 28.6741 63.5 28.5141 63.22C28.3541 62.932 28.2741 62.624 28.2741 62.296C28.2741 61.896 28.3781 61.556 28.5861 61.276C28.7941 60.988 29.0901 60.768 29.4741 60.616C29.8581 60.464 30.3181 60.388 30.8541 60.388H32.4261C32.4261 60.036 32.3741 59.744 32.2701 59.512C32.1661 59.28 32.0101 59.108 31.8021 58.996C31.6021 58.876 31.3461 58.816 31.0341 58.816C30.6741 58.816 30.3661 58.904 30.1101 59.08C29.8541 59.248 29.6941 59.5 29.6301 59.836H28.4301C28.4781 59.412 28.6221 59.052 28.8621 58.756C29.1101 58.452 29.4261 58.22 29.8101 58.06C30.1941 57.892 30.6021 57.808 31.0341 57.808C31.6021 57.808 32.0781 57.908 32.4621 58.108C32.8461 58.308 33.1341 58.592 33.3261 58.96C33.5261 59.32 33.6261 59.752 33.6261 60.256V64H32.5821L32.4861 62.98C32.3981 63.14 32.2941 63.292 32.1741 63.436C32.0541 63.58 31.9101 63.704 31.7421 63.808C31.5821 63.912 31.3941 63.992 31.1781 64.048C30.9701 64.112 30.7381 64.144 30.4821 64.144ZM30.7101 63.172C30.9661 63.172 31.1981 63.12 31.4061 63.016C31.6141 62.912 31.7901 62.772 31.9341 62.596C32.0861 62.412 32.1981 62.208 32.2701 61.984C32.3501 61.752 32.3941 61.516 32.4021 61.276V61.24H30.9741C30.6301 61.24 30.3501 61.284 30.1341 61.372C29.9261 61.452 29.7741 61.564 29.6781 61.708C29.5821 61.852 29.5341 62.02 29.5341 62.212C29.5341 62.412 29.5781 62.584 29.6661 62.728C29.7621 62.864 29.8981 62.972 30.0741 63.052C30.2501 63.132 30.4621 63.172 30.7101 63.172ZM37.5129 64C37.1369 64 36.8089 63.94 36.5289 63.82C36.2489 63.7 36.0329 63.5 35.8809 63.22C35.7289 62.94 35.6529 62.56 35.6529 62.08V58.972H34.6089V57.952H35.6529L35.7969 56.44H36.8529V57.952H38.5689V58.972H36.8529V62.092C36.8529 62.436 36.9249 62.672 37.0689 62.8C37.2129 62.92 37.4609 62.98 37.8129 62.98H38.5089V64H37.5129Z" fill="#A0A0A0"/>
              </svg>
            </div>
            <span style={{ color: '#f05e23', fontSize: '0.9rem' }}></span>
          </div>
        </div>

        {/* Existing Recommended Deals Section */}
        <div style={{ padding: '0 1rem' }}>
          <h3 style={{ color: '#f05e23', marginBottom: '1rem' }}>Deals</h3>
          
          {isLoading ? (
            <p style={{ color: '#A0AEC0' }}>Loading deals...</p>
          ) : recommendations.length > 0 ? (
            <div>
              {recommendations.map((deal: any, index) => (
                <div 
                  key={deal.id || index}
                  style={{ 
                    marginBottom: '1rem',
                    backgroundColor: '#1A202C',
                    borderRadius: '8px',
                    padding: '1rem',
                    cursor: 'pointer'
                  }}
                  onClick={() => navigate(`/merchant-deals/${encodeURIComponent(deal.merchantName)}`)}
                >
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{ 
                      backgroundColor: 'white',
                      padding: '0.5rem',
                      borderRadius: '4px',
                      marginRight: '1rem',
                      width: '50px',
                      height: '50px',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center'
                    }}>
                      <img 
                        src={deal.logoAbsoluteUrl || deal.logo}
                        alt={`${deal.merchantName} logo`}
                        style={{ 
                          maxWidth: '100%',
                          maxHeight: '100%',
                          objectFit: 'contain'
                        }}
                      />
                    </div>
                    <div>
                      <p style={{ 
                        color: '#f05e23',
                        fontWeight: 'bold',
                        marginBottom: '0.25rem'
                      }}>
                        {deal.merchantName}
                      </p>
                      <p style={{ 
                        color: '#A0AEC0',
                        fontSize: '0.9rem'
                      }}>
                        {deal.cashbackType}: {deal.cashback}{deal.currency}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              
              <button
                onClick={() => navigate('/deals')}
                style={{
                  width: '100%',
                  backgroundColor: '#f05e23',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.75rem',
                  marginTop: '1rem',
                  cursor: 'pointer',
                  fontSize: '1rem'
                }}
              >
                View More Deals
              </button>
            </div>
          ) : (
            <p style={{ color: '#A0AEC0' }}>Please reload app to see your deals.</p>
          )}
        </div>

        {showSurvey && (
          <SurveyQuestion
            onResponse={handleSurveyResponse}
            onClose={() => setShowSurvey(false)}
          />
        )}
      </>
    );
  };

  const Navigation: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
  
    return (
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#000000',
        display: 'flex',
        justifyContent: 'space-around',
        padding: '0.5rem 0',
        borderTop: '1px solid #333333'
      }}>
        {/* Home button */}
        <button
          onClick={() => navigate('/')}
          style={{
            background: 'none',
            border: 'none',
            color: location.pathname === '/' ? '#f05e23' : '#fff',
            fontSize: '12px',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            paddingTop: '4px',
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 21V13C15 12.7348 14.8946 12.4804 14.7071 12.2929C14.5196 12.1054 14.2652 12 14 12H10C9.73478 12 9.48043 12.1054 9.29289 12.2929C9.10536 12.4804 9 12.7348 9 13V21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M3 9.99997C2.99993 9.70904 3.06333 9.42159 3.18579 9.15768C3.30824 8.89378 3.4868 8.65976 3.709 8.47197L10.709 2.47297C11.07 2.16788 11.5274 2.00049 12 2.00049C12.4726 2.00049 12.93 2.16788 13.291 2.47297L20.291 8.47197C20.5132 8.65976 20.6918 8.89378 20.8142 9.15768C20.9367 9.42159 21.0001 9.70904 21 9.99997V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V9.99997Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span style={{ marginTop: '2px' }}>Home</span>
        </button>
  
        {/* Deals button */}
        <button
          onClick={() => navigate('/tap')}
          style={{
            background: 'none',
            border: 'none',
            color: location.pathname === '/tap' ? '#f05e23' : '#fff',
            fontSize: '12px',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            paddingTop: '4px',
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M13 6C13 4.93913 12.5786 3.92172 11.8284 3.17157C11.0783 2.42143 10.0609 2 9 2C7.93913 2 6.92172 2.42143 6.17157 3.17157C5.42143 3.92172 5 4.93913 5 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M10.318 8.92118V6.36418C10.3084 6.00895 10.1605 5.6715 9.90583 5.42365C9.65117 5.17579 9.30984 5.03711 8.95448 5.03711C8.59912 5.03711 8.25779 5.17579 8.00313 5.42365C7.74848 5.6715 7.6006 6.00895 7.59098 6.36418V14.2562L6.11798 12.8002C5.96455 12.6495 5.78138 12.5325 5.58017 12.4565C5.37897 12.3806 5.16414 12.3475 4.94941 12.3592C4.73467 12.371 4.52475 12.4274 4.33304 12.5248C4.14133 12.6223 3.97204 12.7586 3.83598 12.9252C3.62389 13.1861 3.50564 13.5108 3.5002 13.847C3.49476 14.1832 3.60245 14.5115 3.80598 14.7792L6.53798 18.3742C7.15798 19.1902 7.46798 19.5982 7.83998 19.9152C8.40998 20.3992 9.08998 20.7352 9.82398 20.8952C10.304 20.9992 10.821 20.9992 11.854 20.9992C13.824 20.9992 14.809 20.9992 15.593 20.7022C16.1835 20.48 16.7206 20.136 17.1696 19.6928C17.6185 19.2495 17.9692 18.7168 18.199 18.1292C18.5 17.3552 18.5 16.3822 18.5 14.4382V12.2252C18.4969 11.7986 18.3424 11.3869 18.064 11.0637C17.7856 10.7404 17.4014 10.5265 16.98 10.4602L16.67 10.4102C16.5606 10.3912 16.4484 10.3962 16.3411 10.4249C16.2338 10.4536 16.1341 10.5052 16.0488 10.5763C15.9634 10.6473 15.8946 10.7361 15.847 10.8364C15.7993 10.9367 15.7741 11.0462 15.773 11.1572M10.318 8.92118L10.843 8.66218C11.096 8.53718 11.378 8.45718 11.653 8.52218C12.0472 8.61295 12.3992 8.83414 12.6521 9.14995C12.9049 9.46575 13.0437 9.85765 13.046 10.2622M10.318 8.92118V11.1572M15.773 11.1572C15.773 10.1692 14.959 9.36718 13.955 9.36718C13.453 9.36718 13.046 9.76818 13.046 10.2622M15.773 11.1572V12.0522M13.046 10.2622V11.1572" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span style={{ marginTop: '2px' }}>Tap</span>
        </button>
  
        {/* Earn button */}
        <button
          onClick={() => navigate('/earn')}
          style={{
            background: 'none',
            border: 'none',
            color: location.pathname === '/earn' ? '#f05e23' : '#fff',
            fontSize: '12px',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            paddingTop: '4px',
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M11.25 7.84692C10.314 8.10292 9.75 8.82192 9.75 9.49992C9.75 10.1779 10.314 10.8969 11.25 11.1519V7.84692ZM12.75 12.8479V16.1519C13.686 15.8969 14.25 15.1779 14.25 14.4999C14.25 13.8219 13.686 13.1029 12.75 12.8479Z" fill="currentColor"/>
            <path fill-rule="evenodd" clip-rule="evenodd" d="M22 12C22 17.523 17.523 22 12 22C6.477 22 2 17.523 2 12C2 6.477 6.477 2 12 2C17.523 2 22 6.477 22 12ZM12 5.25C12.1989 5.25 12.3897 5.32902 12.5303 5.46967C12.671 5.61032 12.75 5.80109 12.75 6V6.317C14.38 6.609 15.75 7.834 15.75 9.5C15.75 9.69891 15.671 9.88968 15.5303 10.0303C15.3897 10.171 15.1989 10.25 15 10.25C14.8011 10.25 14.6103 10.171 14.4697 10.0303C14.329 9.88968 14.25 9.69891 14.25 9.5C14.25 8.822 13.686 8.103 12.75 7.847V11.317C14.38 11.609 15.75 12.834 15.75 14.5C15.75 16.166 14.38 17.391 12.75 17.683V18C12.75 18.1989 12.671 18.3897 12.5303 18.5303C12.3897 18.671 12.1989 18.75 12 18.75C11.8011 18.75 11.6103 18.671 11.4697 18.5303C11.329 18.3897 11.25 18.1989 11.25 18V17.683C9.62 17.391 8.25 16.166 8.25 14.5C8.25 14.3011 8.32902 14.1103 8.46967 13.9697C8.61032 13.829 8.80109 13.75 9 13.75C9.19891 13.75 9.38968 13.829 9.53033 13.9697C9.67098 14.1103 9.75 14.3011 9.75 14.5C9.75 15.178 10.314 15.897 11.25 16.152V12.683C9.62 12.391 8.25 11.166 8.25 9.5C8.25 7.834 9.62 6.609 11.25 6.317V6C11.25 5.80109 11.329 5.61032 11.4697 5.46967C11.6103 5.32902 11.8011 5.25 12 5.25Z" fill="currentColor"/>
          </svg>
          <span style={{ marginTop: '2px' }}>Earn</span>
        </button>
  
        {/* Friends button */}
        <button
          onClick={() => navigate('/friends')}
          style={{
            background: 'none',
            border: 'none',
            color: location.pathname === '/friends' ? '#f05e23' : '#fff',
            fontSize: '12px',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            paddingTop: '4px',
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12Z" stroke="currentColor" stroke-width="2"/>
            <path d="M17.0001 22H5.26606C4.98244 22.0001 4.70206 21.9398 4.44351 21.8232C4.18496 21.7066 3.95416 21.5364 3.76644 21.3238C3.57871 21.1112 3.43835 20.8611 3.35467 20.5901C3.27098 20.3191 3.24589 20.0334 3.28106 19.752L3.67106 16.628C3.76176 15.9022 4.11448 15.2346 4.66289 14.7506C5.21131 14.2667 5.91764 13.9997 6.64906 14H7.00006M19.0001 14V18M17.0001 16H21.0001" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span style={{ marginTop: '2px' }}>Friends</span>
        </button>
  
        {/* Profile button */}
        <button
          onClick={() => navigate('/profile')}
          style={{
            background: 'none',
            border: 'none',
            color: location.pathname === '/profile' ? '#f05e23' : '#fff',
            fontSize: '12px',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            paddingTop: '4px',
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2 12C2 7.757 2 5.636 3.464 4.318C4.93 3 7.286 3 12 3C16.714 3 19.071 3 20.535 4.318C21.999 5.636 22 7.758 22 12C22 16.242 22 18.364 20.535 19.682C19.072 21 16.714 21 12 21C7.286 21 4.929 21 3.464 19.682C1.999 18.364 2 16.242 2 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M6 16H10M14 8H18M14 12H18M14 16H18M8.4 8H7.6C6.846 8 6.469 8 6.234 8.234C6 8.47 6 8.846 6 9.6V10.4C6 11.154 6 11.531 6.234 11.766C6.47 12 6.846 12 7.6 12H8.4C9.154 12 9.531 12 9.766 11.766C10 11.53 10 11.154 10 10.4V9.6C10 8.846 10 8.469 9.766 8.234C9.53 8 9.154 8 8.4 8Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span style={{ marginTop: '2px' }}>Profile</span>
        </button>
      </div>
    );
  };

  return (
    <Router>
      <div style={{ backgroundColor: '#000000', color: '#FFFFFF', padding: '1rem', maxWidth: '28rem', margin: '0 auto', fontFamily: 'sans-serif', minHeight: '100vh', position: 'relative' }}>
        {/* Connection status icon */}
        <div 
          style={{
            position: 'absolute',
            top: '1rem',
            left: '1rem',
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            transition: 'background-color 0.3s ease',
          }}
          title={isConnected ? 'Connected to sync server' : 'Disconnected from sync server'}
        />

        <InitialDataFetcher />
        <PeerSync 
          onConnectionStatus={handleConnectionStatus}
          onReady={handlePeerSyncReady}
        />
        

        <Routes>
          <Route path="/" element={<MainPage />} />
          <Route path="/tap" element={
            <TapComponent
              score={score}
              dailyTaps={dailyTaps}
              isDailyLimitReached={isDailyLimitReached}
              localWalletAddress={localWalletAddress}
              address={address}
              handleTransfer={handleTransfer}
              error={error}
            />
          } />
          <Route path="/friends" element={<FriendsComponent />} />
          <Route path="/cashout" element={
            localWallet ? (
              <Cashout 
                localWallet={localWallet}
                aprilTokenAddress="0x18719D2e1e57A1A64708e4550fF3DEF9d1074621"
                celoAprilBalance={celoAprilBalance}
                polygonAprilBalance={polygonAprilBalance}
              />
            ) : (
              <div>Please connect your wallet to access the Cashout feature.</div>
            )
          } />
          <Route path="/deals" element={<DealsComponent />} />
          <Route path="/merchant-deals/:merchantName" element={<MerchantDealsComponent localWalletAddress={localWalletAddress} address={address} />} />
          <Route path="/earn" element={<EarnComponent />} />
          <Route path="/watch-ads" element={<WatchAdsComponent />} />
          <Route path="/surveys" element={<SurveyList localWalletAddress={localWalletAddress} address={address} />} />
          <Route path="/profile" element={<ProfileComponent localWalletAddress={localWalletAddress} address={address} />} />
        </Routes>

        <Navigation />
        <VectorData />
      </div>
    </Router>
  )
}

export default TelegramMiniApp
