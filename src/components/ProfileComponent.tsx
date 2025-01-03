import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createStore } from 'tinybase';
import { createLocalPersister } from 'tinybase/persisters/persister-browser';
import UserNet from './UserNet';
import { useSubdocument } from '../contexts/SubdocumentContext';
import { storeSubdocumentGUID } from '../utils/subdocumentUtils';

interface ProfileComponentProps {
  localWalletAddress: string | null;
  address: string | undefined;
}

interface FormData {
  sex: string;
  age: string;
  shoppingFrequency: string;
  interests: string[];
  shopping: string[];
}

const ProfileComponent: React.FC<ProfileComponentProps> = ({ localWalletAddress, address }) => {
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [copySuccess, setCopySuccess] = useState<string>('');
  const [showBackupPopup, setShowBackupPopup] = useState<boolean>(false);
  const [backupData, setBackupData] = useState({
    cityOfBirth: '',
    mothersFirstName: '',
    email: ''
  });
  const { subdocumentGUID, setSubdocumentGUID } = useSubdocument();
  const [showBackupChoicePopup, setShowBackupChoicePopup] = useState<boolean>(false);
  const [showImportPopup, setShowImportPopup] = useState<boolean>(false);
  const [formData, setFormData] = useState<FormData>({
    sex: '',
    age: '',
    shoppingFrequency: '',
    interests: [],
    shopping: []
  });

  useEffect(() => {
    const savedData = localStorage.getItem('userProfile');
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData);
        setFormData(parsedData);
      } catch (error) {
        console.error('Error loading profile data:', error);
      }
    }
  }, []);

  const saveToLocalStorage = (data: FormData) => {
    try {
      localStorage.setItem('userProfile', JSON.stringify(data));
    } catch (error) {
      console.error('Error saving profile data:', error);
    }
  };

  const handleSexChange = (sex: string) => {
    const newData = { ...formData, sex };
    setFormData(newData);
    saveToLocalStorage(newData);
  };

  const handleAgeChange = (age: string) => {
    const newData = { ...formData, age };
    setFormData(newData);
    saveToLocalStorage(newData);
  };

  const handleFrequencyChange = (freq: string) => {
    const newData = { ...formData, shoppingFrequency: freq };
    setFormData(newData);
    saveToLocalStorage(newData);
  };

  const handleInterestChange = (interest: string) => {
    const newInterests = formData.interests.includes(interest)
      ? formData.interests.filter(i => i !== interest)
      : [...formData.interests, interest];
    const newData = { ...formData, interests: newInterests };
    setFormData(newData);
    saveToLocalStorage(newData);
  };

  const handleShoppingChange = (category: string) => {
    const newShopping = formData.shopping.includes(category)
      ? formData.shopping.filter(i => i !== category)
      : [...formData.shopping, category];
    const newData = { ...formData, shopping: newShopping };
    setFormData(newData);
    saveToLocalStorage(newData);
  };

  useEffect(() => {
    const fetchUserProfile = async () => {
      const surveyStore = createStore();
      const surveyPersister = createLocalPersister(surveyStore, 'survey-responses');
      await surveyPersister.load();

      const surveyResponses = surveyStore.getTable('answeredQuestions') || {};

      const interests = [];
      if (surveyResponses['Are you interested in photography?']?.answer === 'Yes') {
        interests.push('Photography');
      }
      if (surveyResponses['Are you interested in sports?']?.answer === 'Yes') {
        interests.push('Sports');
      }

      const shoppingFrequency = surveyResponses['How often do you shop online?']?.answer || '';

      setUserProfile({
        interests,
        shoppingFrequency,
        surveyResponses,
      });
    };

    fetchUserProfile();
  }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopySuccess('Copied!');
      setTimeout(() => setCopySuccess(''), 2000);
    }, (err) => {
      console.error('Failed to copy text: ', err);
    });
  };

  const CopyButton = ({ text }: { text: string }) => (
    <button 
      onClick={() => copyToClipboard(text)}
      style={{
        backgroundColor: '#f05e23',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        padding: '4px 8px',
        fontSize: '0.9rem',
        cursor: 'pointer',
        marginLeft: '0.5rem',
      }}
    >
      Copy
    </button>
  );

  const handleBackupSync = () => {
    setShowBackupChoicePopup(true);
  };

  const handleBackupChoice = (hasBackup: boolean) => {
    setShowBackupChoicePopup(false);
    if (hasBackup) {
      setShowImportPopup(true);
    } else {
      setShowBackupPopup(true);
    }
  };

  const handleBackupInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setBackupData(prev => ({ ...prev, [name]: value }));
  };

  const handleImportSubmit = async () => {
    const guid = await generateGUID(backupData);
    console.log('Imported User Subdocument GUID:', guid);
    setSubdocumentGUID(guid);
    setShowImportPopup(false);
    setBackupData({
      cityOfBirth: '',
      mothersFirstName: '',
      email: ''
    });
  };

  const generateGUID = async (data: typeof backupData) => {
    const combinedString = `${data.cityOfBirth}+${data.mothersFirstName}+${data.email}`;
    const encoder = new TextEncoder();
    const encodedData = encoder.encode(combinedString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', encodedData);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleBackupSubmit = async () => {
    const guid = await generateGUID(backupData);
    console.log('User Subdocument GUID:', guid);
    setSubdocumentGUID(guid);
    storeSubdocumentGUID(guid);
    setShowBackupPopup(false);
    setBackupData({
      cityOfBirth: '',
      mothersFirstName: '',
      email: ''
    });
  };

  const toggleArrayItem = (array: string[], item: string) => {
    return array.includes(item) 
      ? array.filter(i => i !== item)
      : [...array, item];
  };

  const BackupChoicePopup = () => (
    <div style={popupOverlayStyle}>
      <div style={popupContentStyle}>
        <h3 style={{ color: '#f05e23', marginBottom: '1rem' }}>Backup/Sync</h3>
        <p style={{ marginBottom: '1rem' }}>Have you backed up previously?</p>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <button onClick={() => handleBackupChoice(true)} style={buttonStyle}>Yes</button>
          <button onClick={() => handleBackupChoice(false)} style={buttonStyle}>No</button>
        </div>
      </div>
    </div>
  );

  const ImportPopup = () => (
    <div style={popupOverlayStyle}>
      <div style={popupContentStyle}>
        <h3 style={{ color: '#f05e23', marginBottom: '1rem' }}>Import Backup</h3>
        <input
          type="text"
          name="cityOfBirth"
          placeholder="City of Birth"
          value={backupData.cityOfBirth}
          onChange={handleBackupInputChange}
          style={inputStyle}
        />
        <input
          type="text"
          name="mothersFirstName"
          placeholder="Mother's first name"
          value={backupData.mothersFirstName}
          onChange={handleBackupInputChange}
          style={inputStyle}
        />
        <input
          type="email"
          name="email"
          placeholder="E-mail address"
          value={backupData.email}
          onChange={handleBackupInputChange}
          style={inputStyle}
        />
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
          <button onClick={handleImportSubmit} style={{...buttonStyle, backgroundColor: '#f05e23', width: '100%'}}>Import</button>
        </div>
      </div>
    </div>
  );

  const BackupPopup = () => (
    <div style={popupOverlayStyle}>
      <div style={popupContentStyle}>
        <h3 style={{ color: '#f05e23', marginBottom: '1rem' }}>Create Backup</h3>
        <input
          type="text"
          name="cityOfBirth"
          placeholder="City of Birth"
          value={backupData.cityOfBirth}
          onChange={handleBackupInputChange}
          style={inputStyle}
        />
        <input
          type="text"
          name="mothersFirstName"
          placeholder="Mother's first name"
          value={backupData.mothersFirstName}
          onChange={handleBackupInputChange}
          style={inputStyle}
        />
        <input
          type="email"
          name="email"
          placeholder="E-mail address"
          value={backupData.email}
          onChange={handleBackupInputChange}
          style={inputStyle}
        />
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
          <button onClick={handleBackupSubmit} style={{...buttonStyle, backgroundColor: '#f05e23', width: '100%'}}>Backup</button>
        </div>
      </div>
    </div>
  );

  const popupOverlayStyle = {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000
  };

  const popupContentStyle = {
    backgroundColor: '#1A202C',
    padding: '2rem',
    borderRadius: '8px',
    width: '80%',
    maxWidth: '400px'
  };

  const inputStyle = {
    width: '100%',
    padding: '0.5rem',
    marginBottom: '1rem',
    backgroundColor: '#2D3748',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '4px'
  };

  const buttonStyle = {
    padding: '0.5rem 1rem',
    backgroundColor: '#4A5568',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
  };

  const formButtonStyle = {
    padding: '0.5rem 1rem',
    backgroundColor: '#1A1A1A',
    color: 'white',
    border: 'none',
    borderRadius: '999px',
    cursor: 'pointer',
    marginRight: '0.5rem',
    marginBottom: '0.5rem'
  };

  const selectedFormButtonStyle = {
    ...formButtonStyle,
    backgroundColor: '#f05e23'
  };

  return (
    <div style={{ padding: '1rem', backgroundColor: '#000000', minHeight: '100vh', color: '#FFFFFF' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
        <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', marginRight: '1rem' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 12H5" stroke="#f05e23" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 19L5 12L12 5" stroke="#f05e23" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <h2 style={{ color: '#f05e23', margin: 0 }}>User Profile</h2>
      </div>

      {localWalletAddress && (
        <div style={{ marginBottom: '1rem', fontSize: '1rem', color: '#A0AEC0', wordBreak: 'break-all' }}>
          <strong>Local Wallet:</strong> {localWalletAddress}
          <CopyButton text={localWalletAddress} />
        </div>
      )}

      <button 
        onClick={handleBackupSync}
        style={{
          backgroundColor: '#4A5568',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          padding: '8px 16px',
          fontSize: '0.9rem',
          cursor: 'pointer',
          marginBottom: '1rem',
          width: '100%',
        }}
      >
        Backup/Sync
      </button>

      {address && (
        <div style={{ marginBottom: '1rem', fontSize: '1rem', color: '#A0AEC0', wordBreak: 'break-all' }}>
          <strong>Connected Wallet:</strong> {address}
          <CopyButton text={address} />
        </div>
      )}

      {copySuccess && <div style={{ color: '#4CAF50', marginBottom: '1rem' }}>{copySuccess}</div>}

      <div style={{ marginTop: '1rem' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <p style={{ marginBottom: '0.5rem', fontSize: '0.875rem' }}>Sex</p>
          <div style={{ display: 'flex', flexWrap: 'wrap' }}>
            {['Male', 'Female'].map((sex) => (
              <button
                key={sex}
                onClick={() => handleSexChange(sex)}
                style={formData.sex === sex ? selectedFormButtonStyle : formButtonStyle}
              >
                {sex}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <p style={{ marginBottom: '0.5rem', fontSize: '0.875rem' }}>Age</p>
          <div style={{ display: 'flex', flexWrap: 'wrap' }}>
            {['14-18', '19-24', '24-30', '31-40', '41-50', '51-60'].map((age) => (
              <button
                key={age}
                onClick={() => handleAgeChange(age)}
                style={formData.age === age ? selectedFormButtonStyle : formButtonStyle}
              >
                {age}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <p style={{ marginBottom: '0.5rem', fontSize: '0.875rem' }}>How Frequent do You Shop Online</p>
          <div style={{ display: 'flex', flexWrap: 'wrap' }}>
            {['Never', 'Daily', 'Weekly', 'Monthly'].map((freq) => (
              <button
                key={freq}
                onClick={() => handleFrequencyChange(freq)}
                style={formData.shoppingFrequency === freq ? selectedFormButtonStyle : formButtonStyle}
              >
                {freq}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <p style={{ marginBottom: '0.5rem', fontSize: '0.875rem' }}>Interest</p>
          <div style={{ display: 'flex', flexWrap: 'wrap' }}>
            {['Tech', 'Cars', 'Cooking', 'Fashion', 'Games', 'Art', 'Movies', 'Sports', 'Photography', 'Food'].map((interest) => (
              <button
                key={interest}
                onClick={() => handleInterestChange(interest)}
                style={formData.interests.includes(interest) ? selectedFormButtonStyle : formButtonStyle}
              >
                {interest}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <p style={{ marginBottom: '0.5rem', fontSize: '0.875rem' }}>Shopping</p>
          <div style={{ display: 'flex', flexWrap: 'wrap' }}>
            {['Electronics', 'Gaming', 'Computing', 'Sporting Gear', 'Phones & Tablets', 'Appliance', 'Fashion'].map((category) => (
              <button
                key={category}
                onClick={() => handleShoppingChange(category)}
                style={formData.shopping.includes(category) ? selectedFormButtonStyle : formButtonStyle}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </div>

      {showBackupChoicePopup && <BackupChoicePopup />}
      {showImportPopup && <ImportPopup />}
      {showBackupPopup && <BackupPopup />}
      {subdocumentGUID && <UserNet />}
    </div>
  );
};

export default ProfileComponent;
