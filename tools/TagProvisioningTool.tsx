import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import NFCService from '../services/nfc';
import { encryptPayload, generateEncryptionKey } from '../utils/encryption';
import { supabase } from '../services/supabase';

interface Business {
  id: string;
  name: string;
  encryption_key: string;
}

const TagProvisioningTool = () => {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [branchNumber, setBranchNumber] = useState('1');
  const [tagUid, setTagUid] = useState('');
  const [loading, setLoading] = useState(false);
  const [nfcSupported, setNfcSupported] = useState(false);

  React.useEffect(() => {
    loadBusinesses();
    checkNFC();
  }, []);

  const checkNFC = async () => {
    const supported = await NFCService.isSupported();
    setNfcSupported(supported);
  };

  const loadBusinesses = async () => {
    try {
      const { data, error } = await supabase
        .from('businesses')
        .select('id, name, encryption_key')
        .order('name');

      if (error) throw error;
      setBusinesses(data || []);
    } catch (error) {
      console.error('Error loading businesses:', error);
      Alert.alert('Error', 'Failed to load businesses');
    }
  };

  const generateKeyForBusiness = async () => {
    if (!selectedBusiness) {
      Alert.alert('Error', 'Please select a business first');
      return;
    }

    try {
      const newKey = generateEncryptionKey();
      
      const { error } = await supabase
        .from('businesses')
        .update({ encryption_key: newKey })
        .eq('id', selectedBusiness.id);

      if (error) throw error;

      Alert.alert('Success', 'Encryption key generated for ' + selectedBusiness.name);
      await loadBusinesses();
    } catch (error) {
      console.error('Error generating key:', error);
      Alert.alert('Error', 'Failed to generate encryption key');
    }
  };

  const readNFCTagUid = async () => {
    if (!nfcSupported) {
      Alert.alert('NFC Not Supported', 'This device does not support NFC');
      return;
    }

    try {
      setLoading(true);
      await NFCService.startReading((tag) => {
        setTagUid(tag.uid);
        Alert.alert('Tag Read', `UID: ${tag.uid}`);
      });
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to read NFC tag');
    } finally {
      setLoading(false);
    }
  };

  const writeEncryptedTag = async () => {
    if (!selectedBusiness) {
      Alert.alert('Error', 'Please select a business');
      return;
    }

    if (!selectedBusiness.encryption_key) {
      Alert.alert('Error', 'Business has no encryption key. Generate one first.');
      return;
    }

    if (!tagUid) {
      Alert.alert('Error', 'Please read the tag UID first');
      return;
    }

    if (!nfcSupported) {
      Alert.alert('NFC Not Supported', 'This device does not support NFC');
      return;
    }

    try {
      setLoading(true);

      const payload = {
        business_id: selectedBusiness.id,
        branch_number: parseInt(branchNumber),
        timestamp: new Date().toISOString(),
      };

      const encrypted = encryptPayload(payload, selectedBusiness.encryption_key);

      const success = await NFCService.writeTag(encrypted);

      if (!success) {
        Alert.alert('Error', 'Failed to write to NFC tag');
        return;
      }

      const { error } = await supabase.from('nfc_tags').insert({
        uid: tagUid,
        business_id: selectedBusiness.id,
        branch_number: parseInt(branchNumber),
        is_active: true,
      });

      if (error) throw error;

      Alert.alert('Success', `NFC tag provisioned for ${selectedBusiness.name}`);
      setTagUid('');
      setBranchNumber('1');
    } catch (error: any) {
      console.error('Error writing tag:', error);
      Alert.alert('Error', error.message || 'Failed to provision tag');
    } finally {
      setLoading(false);
    }
  };

  const registerTagManually = async () => {
    if (!selectedBusiness) {
      Alert.alert('Error', 'Please select a business');
      return;
    }

    if (!tagUid.trim()) {
      Alert.alert('Error', 'Please enter a tag UID');
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase.from('nfc_tags').insert({
        uid: tagUid.trim(),
        business_id: selectedBusiness.id,
        branch_number: parseInt(branchNumber),
        is_active: true,
      });

      if (error) throw error;

      Alert.alert('Success', 'Tag registered in database');
      setTagUid('');
      setBranchNumber('1');
    } catch (error: any) {
      console.error('Error registering tag:', error);
      Alert.alert('Error', error.message || 'Failed to register tag');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <MaterialIcons name="nfc" size={48} color="#4CAF50" />
        <Text style={styles.title}>NFC Tag Provisioning Tool</Text>
        <Text style={styles.subtitle}>Configure secure NFC tags for merchants</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>1. Select Business</Text>
        {businesses.map((business) => (
          <TouchableOpacity
            key={business.id}
            style={[
              styles.businessCard,
              selectedBusiness?.id === business.id && styles.businessCardSelected,
            ]}
            onPress={() => setSelectedBusiness(business)}
          >
            <Text style={styles.businessName}>{business.name}</Text>
            {business.encryption_key && (
              <MaterialIcons name="lock" size={20} color="#4CAF50" />
            )}
          </TouchableOpacity>
        ))}
      </View>

      {selectedBusiness && (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>2. Encryption Key</Text>
            <Text style={styles.info}>
              {selectedBusiness.encryption_key
                ? '✓ Key exists'
                : '✗ No key set'}
            </Text>
            <TouchableOpacity style={styles.button} onPress={generateKeyForBusiness}>
              <Text style={styles.buttonText}>Generate New Key</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>3. Branch Number</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter branch number"
              keyboardType="numeric"
              value={branchNumber}
              onChangeText={setBranchNumber}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>4. Read Tag UID</Text>
            <Text style={styles.info}>Current UID: {tagUid || 'None'}</Text>
            <TouchableOpacity
              style={[styles.button, !nfcSupported && styles.buttonDisabled]}
              onPress={readNFCTagUid}
              disabled={!nfcSupported || loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.buttonText}>
                  {nfcSupported ? 'Read NFC Tag UID' : 'NFC Not Supported'}
                </Text>
              )}
            </TouchableOpacity>
            <Text style={styles.orText}>OR</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter UID manually"
              value={tagUid}
              onChangeText={setTagUid}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>5. Provision Tag</Text>
            <TouchableOpacity
              style={[styles.button, styles.buttonPrimary]}
              onPress={writeEncryptedTag}
              disabled={loading || !tagUid || !selectedBusiness.encryption_key}
            >
              <Text style={styles.buttonText}>Write Encrypted Tag</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.buttonSecondary]}
              onPress={registerTagManually}
              disabled={loading || !tagUid}
            >
              <Text style={styles.buttonText}>Register in Database Only</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#FFF',
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 12,
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  section: {
    backgroundColor: '#FFF',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  businessCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    marginBottom: 8,
  },
  businessCardSelected: {
    borderColor: '#4CAF50',
    backgroundColor: '#E8F5E9',
  },
  businessName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  info: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#FFF',
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#2196F3',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  buttonPrimary: {
    backgroundColor: '#4CAF50',
  },
  buttonSecondary: {
    backgroundColor: '#FF9800',
  },
  buttonDisabled: {
    backgroundColor: '#CCC',
  },
  buttonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  orText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 12,
    marginVertical: 8,
  },
});

export default TagProvisioningTool;
