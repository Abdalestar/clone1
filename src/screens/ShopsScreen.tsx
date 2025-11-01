import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { COLORS, SIZES, CATEGORIES } from '../utils/constants';
import { getAllBusinesses, createStampCard } from '../services/stamps';
import { getCurrentUser } from '../services/auth';
import { Business } from '../types';
import BusinessCard from '../components/BusinessCard';
import { DOHA_CENTER } from '../utils/qatarBusinesses';

const ShopsScreen = () => {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [filteredBusinesses, setFilteredBusinesses] = useState<Business[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(DOHA_CENTER);

  useEffect(() => {
    loadBusinesses();
    getUserLocation();
  }, []);

  useEffect(() => {
    filterBusinesses();
  }, [searchQuery, selectedCategory, businesses]);

  const getUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        setUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      }
    } catch (error) {
      console.log('Location error:', error);
    }
  };

  const loadBusinesses = async () => {
    try {
      const data = await getAllBusinesses();
      setBusinesses(data);
      setFilteredBusinesses(data);
    } catch (error) {
      console.error('Error loading businesses:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterBusinesses = () => {
    let filtered = businesses;

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(b => b.category === selectedCategory);
    }

    // Filter by search
    if (searchQuery) {
      filtered = filtered.filter(b =>
        b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.category.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredBusinesses(filtered);
  };

  const handleAddCard = async (business: Business) => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        Alert.alert('Error', 'Please log in to add cards');
        return;
      }

      const { data, error } = await createStampCard(user.id, business.id);
      if (error) {
        Alert.alert('Error', error);
      } else {
        Alert.alert(
          'Success',
          `Card added for ${business.name}! Start collecting stamps.`,
          [{ text: 'OK', onPress: () => setSelectedBusiness(null) }]
        );
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const getCategoryIcon = (category: string) => {
    const cat = CATEGORIES.find(c => c.value === category);
    return cat?.icon || 'store';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={20} color={COLORS.gray} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search businesses..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={COLORS.gray}
        />
        <TouchableOpacity
          onPress={() => setViewMode(viewMode === 'map' ? 'list' : 'map')}
          style={styles.viewToggle}
        >
          <MaterialIcons
            name={viewMode === 'map' ? 'list' : 'map'}
            size={24}
            color={COLORS.primary}
          />
        </TouchableOpacity>
      </View>

      {/* Category Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={styles.categoryContainer}
      >
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.value}
            style={[
              styles.categoryChip,
              selectedCategory === cat.value && styles.categoryChipActive,
            ]}
            onPress={() => setSelectedCategory(cat.value)}
          >
            <MaterialIcons
              name={cat.icon as any}
              size={18}
              color={selectedCategory === cat.value ? COLORS.white : COLORS.primary}
            />
            <Text
              style={[
                styles.categoryText,
                selectedCategory === cat.value && styles.categoryTextActive,
              ]}
            >
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Map or List View */}
      {viewMode === 'map' ? (
        <MapView
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          initialRegion={{
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
            latitudeDelta: 0.15,
            longitudeDelta: 0.15,
          }}
          showsUserLocation
          showsMyLocationButton
        >
          {filteredBusinesses.map((business) => (
            <Marker
              key={business.id}
              coordinate={{
                latitude: business.latitude,
                longitude: business.longitude,
              }}
              onPress={() => setSelectedBusiness(business)}
            >
              <View style={styles.markerContainer}>
                <MaterialIcons
                  name={getCategoryIcon(business.category) as any}
                  size={24}
                  color={COLORS.white}
                />
              </View>
            </Marker>
          ))}
        </MapView>
      ) : (
        <ScrollView style={styles.listContainer}>
          <Text style={styles.resultCount}>
            {filteredBusinesses.length} businesses found
          </Text>
          {filteredBusinesses.map((business) => (
            <BusinessCard
              key={business.id}
              business={business}
              onPress={() => setSelectedBusiness(business)}
            />
          ))}
          <View style={{ height: 20 }} />
        </ScrollView>
      )}

      {/* Business Detail Modal */}
      <Modal
        visible={selectedBusiness !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedBusiness(null)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setSelectedBusiness(null)}
            >
              <MaterialIcons name="close" size={24} color={COLORS.dark} />
            </TouchableOpacity>

            {selectedBusiness && (
              <>
                <View style={styles.modalHeader}>
                  <View style={styles.modalIcon}>
                    <MaterialIcons
                      name={getCategoryIcon(selectedBusiness.category) as any}
                      size={40}
                      color={COLORS.primary}
                    />
                  </View>
                  <Text style={styles.modalTitle}>{selectedBusiness.name}</Text>
                  <Text style={styles.modalCategory}>
                    {selectedBusiness.category}
                  </Text>
                </View>

                <View style={styles.modalBody}>
                  <View style={styles.modalRow}>
                    <MaterialIcons name="star" size={20} color={COLORS.warning} />
                    <Text style={styles.modalText}>
                      {selectedBusiness.rating} Rating
                    </Text>
                  </View>

                  <View style={styles.modalRow}>
                    <MaterialIcons name="place" size={20} color={COLORS.primary} />
                    <Text style={styles.modalText}>{selectedBusiness.address}</Text>
                  </View>

                  <View style={styles.modalRow}>
                    <MaterialIcons name="description" size={20} color={COLORS.gray} />
                    <Text style={styles.modalText}>
                      {selectedBusiness.description}
                    </Text>
                  </View>

                  <View style={styles.rewardBox}>
                    <MaterialIcons name="card-giftcard" size={24} color={COLORS.success} />
                    <View style={{ flex: 1, marginLeft: SIZES.md }}>
                      <Text style={styles.rewardLabel}>Reward</Text>
                      <Text style={styles.rewardText}>
                        Collect {selectedBusiness.stamps_required} stamps
                      </Text>
                      <Text style={styles.rewardDescription}>
                        {selectedBusiness.reward_description}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.scanInfo}>
                    <Text style={styles.scanInfoTitle}>How to collect stamps:</Text>
                    <View style={styles.scanMethod}>
                      <MaterialIcons name="nfc" size={20} color={COLORS.secondary} />
                      <Text style={styles.scanMethodText}>Tap your phone (NFC)</Text>
                    </View>
                    <View style={styles.scanMethod}>
                      <MaterialIcons name="qr-code-scanner" size={20} color={COLORS.primary} />
                      <Text style={styles.scanMethodText}>Scan QR code</Text>
                    </View>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.addCardButton}
                  onPress={() => handleAddCard(selectedBusiness)}
                  data-testid="add-card-button"
                >
                  <MaterialIcons name="add-circle" size={24} color={COLORS.white} />
                  <Text style={styles.addCardButtonText}>Add Card</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    margin: SIZES.md,
    paddingHorizontal: SIZES.md,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    height: 48,
    fontSize: 16,
    marginLeft: SIZES.sm,
    color: COLORS.dark,
  },
  viewToggle: {
    padding: SIZES.xs,
  },
  categoryScroll: {
    maxHeight: 60,
  },
  categoryContainer: {
    paddingHorizontal: SIZES.md,
    paddingBottom: SIZES.sm,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderRadius: 20,
    marginRight: SIZES.sm,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  categoryChipActive: {
    backgroundColor: COLORS.primary,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
    marginLeft: 6,
  },
  categoryTextActive: {
    color: COLORS.white,
  },
  map: {
    flex: 1,
  },
  markerContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  listContainer: {
    flex: 1,
  },
  resultCount: {
    fontSize: 14,
    color: COLORS.gray,
    marginHorizontal: SIZES.lg,
    marginVertical: SIZES.sm,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: SIZES.xl,
    maxHeight: '80%',
  },
  closeButton: {
    position: 'absolute',
    top: SIZES.md,
    right: SIZES.md,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.light,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: SIZES.lg,
  },
  modalIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.light,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SIZES.md,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.dark,
    textAlign: 'center',
  },
  modalCategory: {
    fontSize: 14,
    color: COLORS.primary,
    textTransform: 'capitalize',
    marginTop: 4,
  },
  modalBody: {
    marginBottom: SIZES.lg,
  },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.md,
  },
  modalText: {
    fontSize: 14,
    color: COLORS.dark,
    marginLeft: SIZES.sm,
    flex: 1,
  },
  rewardBox: {
    flexDirection: 'row',
    backgroundColor: '#E8F5E9',
    padding: SIZES.md,
    borderRadius: 12,
    marginVertical: SIZES.md,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.success,
  },
  rewardLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.success,
    textTransform: 'uppercase',
  },
  rewardText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.dark,
    marginTop: 4,
  },
  rewardDescription: {
    fontSize: 14,
    color: COLORS.darkGray,
    marginTop: 2,
  },
  scanInfo: {
    backgroundColor: COLORS.light,
    padding: SIZES.md,
    borderRadius: 12,
    marginTop: SIZES.sm,
  },
  scanInfoTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.dark,
    marginBottom: SIZES.sm,
  },
  scanMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SIZES.xs,
  },
  scanMethodText: {
    fontSize: 13,
    color: COLORS.darkGray,
    marginLeft: SIZES.sm,
  },
  addCardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    padding: SIZES.lg,
    borderRadius: 12,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  addCardButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: SIZES.sm,
  },
});

export default ShopsScreen;
